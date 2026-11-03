import { HttpStatus, Injectable } from '@nestjs/common';
import { FieldsService } from '../fields/fields.service.js';
import { fail } from '../common/response.js';
import {
  CLOSE_TIME,
  OPEN_TIME,
  isOverlap,
  isValidDate,
  isValidTime,
  parseId,
  toHHmm,
  toMinutes,
} from '../common/time.util.js';

export const BOOKING_STATUSES = ['BOOKED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: number;
  userId: string;
  fieldId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  customerName: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

@Injectable()
export class BookingsService {
  private bookings: Booking[] = [];
  private nextId = 1;

  constructor(private readonly fieldsService: FieldsService) {}

  // ---------- READ ----------

  findAll(query: any = {}): Booking[] {
    let result = [...this.bookings];
    if (query.fieldId !== undefined) {
      const fid = parseId(query.fieldId);
      if (fid === null) fail(HttpStatus.BAD_REQUEST, 'fieldId harus berupa angka positif');
      result = result.filter((b) => b.fieldId === fid);
    }
    if (query.date !== undefined) {
      if (!isValidDate(query.date)) fail(HttpStatus.BAD_REQUEST, 'date harus berformat YYYY-MM-DD');
      result = result.filter((b) => b.date === query.date);
    }
    if (query.status !== undefined) {
      const s = String(query.status).toUpperCase();
      if (!BOOKING_STATUSES.includes(s as BookingStatus)) {
        fail(HttpStatus.BAD_REQUEST, `status harus salah satu dari: ${BOOKING_STATUSES.join(', ')}`);
      }
      result = result.filter((b) => b.status === s);
    }
    return result;
  }

  findOne(rawId: any): Booking {
    const id = parseId(rawId);
    if (id === null) fail(HttpStatus.BAD_REQUEST, 'ID reservasi harus berupa angka positif');
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) fail(HttpStatus.NOT_FOUND, `Reservasi dengan id ${id} tidak ditemukan`);
    return booking;
  }

  findByUser(userId: string, query: any = {}): Booking[] {
    const key = String(userId).trim().toLowerCase();
    let result = this.bookings.filter((b) => b.userId === key);
    if (query.status !== undefined) {
      const s = String(query.status).toUpperCase();
      if (!BOOKING_STATUSES.includes(s as BookingStatus)) {
        fail(HttpStatus.BAD_REQUEST, `status harus salah satu dari: ${BOOKING_STATUSES.join(', ')}`);
      }
      result = result.filter((b) => b.status === s);
    }
    return result;
  }

  getAvailability(rawFieldId: any, date: any) {
    const field = this.fieldsService.findOne(rawFieldId);
    if (date === undefined) fail(HttpStatus.BAD_REQUEST, 'Query parameter date wajib diisi (YYYY-MM-DD)');
    if (!isValidDate(date)) fail(HttpStatus.BAD_REQUEST, 'date harus berformat YYYY-MM-DD yang valid');

    // Hanya reservasi non-CANCELLED yang dianggap memakai slot.
    const booked = this.bookings
      .filter((b) => b.fieldId === field.id && b.date === date && b.status !== 'CANCELLED')
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const availableSlots: { startTime: string; endTime: string }[] = [];
    if (field.status === 'AVAILABLE') {
      let cursor = toMinutes(OPEN_TIME);
      const close = toMinutes(CLOSE_TIME);
      for (const b of booked) {
        const s = toMinutes(b.startTime);
        const e = toMinutes(b.endTime);
        if (s > cursor) availableSlots.push({ startTime: toHHmm(cursor), endTime: toHHmm(s) });
        cursor = Math.max(cursor, e);
      }
      if (cursor < close) availableSlots.push({ startTime: toHHmm(cursor), endTime: toHHmm(close) });
    }

    return {
      field: { id: field.id, name: field.name, status: field.status },
      date,
      operatingHours: { open: OPEN_TIME, close: CLOSE_TIME },
      bookedSlots: booked.map((b) => ({
        bookingId: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
      })),
      availableSlots,
    };
  }

  hasActiveBooking(fieldId: number): boolean {
    return this.bookings.some((b) => b.fieldId === fieldId && b.status === 'BOOKED');
  }

  // ---------- CREATE ----------

  create(body: any): Booking {
    const data = this.validate(body, false);
    const field = this.fieldsService.findOne(data.fieldId); // 404 jika tidak ada
    this.assertFieldBookable(field.status);
    this.assertNoConflict(data.fieldId, data.date, data.startTime, data.endTime);

    const now = new Date().toISOString();
    const booking: Booking = {
      id: this.nextId++,
      userId: data.userId,
      fieldId: data.fieldId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      customerName: data.customerName,
      totalPrice: this.calcPrice(field.pricePerHour, data.startTime, data.endTime),
      status: 'BOOKED',
      createdAt: now,
      updatedAt: now,
    };
    this.bookings.push(booking);
    return booking;
  }

  // ---------- UPDATE ----------

  /** PUT (partial=false): semua data wajib. PATCH (partial=true): kirim yang berubah saja. */
  update(rawId: any, body: any, partial: boolean): Booking {
    const booking = this.findOne(rawId);
    if (booking.status !== 'BOOKED') {
      fail(HttpStatus.CONFLICT, `Reservasi berstatus ${booking.status} tidak bisa diubah`);
    }
    const merged = partial ? { ...booking, ...(body ?? {}) } : body;
    const data = this.validate(merged, false);
    const field = this.fieldsService.findOne(data.fieldId);
    this.assertFieldBookable(field.status);
    this.assertNoConflict(data.fieldId, data.date, data.startTime, data.endTime, booking.id);

    Object.assign(booking, {
      userId: data.userId,
      fieldId: data.fieldId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      customerName: data.customerName,
      totalPrice: this.calcPrice(field.pricePerHour, data.startTime, data.endTime),
      updatedAt: new Date().toISOString(),
    });
    return booking;
  }

  cancel(rawId: any): Booking {
    const booking = this.findOne(rawId);
    if (booking.status === 'CANCELLED') {
      fail(HttpStatus.CONFLICT, `Reservasi dengan id ${booking.id} sudah dibatalkan sebelumnya`);
    }
    if (booking.status === 'COMPLETED') {
      fail(HttpStatus.CONFLICT, 'Reservasi yang sudah selesai (COMPLETED) tidak bisa dibatalkan');
    }
    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date().toISOString();
    booking.updatedAt = booking.cancelledAt;
    return booking;
  }

  complete(rawId: any): Booking {
    const booking = this.findOne(rawId);
    if (booking.status !== 'BOOKED') {
      fail(HttpStatus.CONFLICT, `Hanya reservasi BOOKED yang bisa diselesaikan (status saat ini: ${booking.status})`);
    }
    booking.status = 'COMPLETED';
    booking.updatedAt = new Date().toISOString();
    return booking;
  }

  // ---------- DELETE ----------

  remove(rawId: any): Booking {
    const booking = this.findOne(rawId);
    this.bookings = this.bookings.filter((b) => b.id !== booking.id);
    return booking;
  }

  // ---------- HELPER ----------

  private validate(body: any, _partial: boolean) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      fail(HttpStatus.BAD_REQUEST, 'Request body harus berupa object JSON');
    }
    const errors: string[] = [];

    const fieldId = parseId(body.fieldId);
    if (fieldId === null) errors.push('fieldId wajib berupa angka positif');

    if (!isValidDate(body.date)) errors.push('date wajib berformat YYYY-MM-DD yang valid');
    if (!isValidTime(body.startTime)) errors.push('startTime wajib berformat HH:mm (00:00-23:59)');
    if (!isValidTime(body.endTime)) errors.push('endTime wajib berformat HH:mm (00:00-23:59)');

    if (typeof body.customerName !== 'string' || !body.customerName.trim()) {
      errors.push('customerName wajib diisi (string)');
    }

    if (isValidTime(body.startTime) && isValidTime(body.endTime)) {
      const s = toMinutes(body.startTime);
      const e = toMinutes(body.endTime);
      if (s >= e) errors.push('endTime harus lebih besar dari startTime');
      else if (s < toMinutes(OPEN_TIME) || e > toMinutes(CLOSE_TIME)) {
        errors.push(`Jam operasional ${OPEN_TIME}-${CLOSE_TIME}`);
      }
    }

    if (errors.length) fail(HttpStatus.BAD_REQUEST, 'Validasi gagal', { errors });

    const customerName = body.customerName.trim();
    // userId opsional: jika tidak dikirim, pakai nama customer sebagai penanda pengguna.
    const userId = String(body.userId ?? customerName).trim().toLowerCase();

    return {
      fieldId: fieldId as number,
      date: body.date as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      customerName,
      userId,
    };
  }

  private assertFieldBookable(status: string) {
    if (status !== 'AVAILABLE') {
      fail(HttpStatus.UNPROCESSABLE_ENTITY, 'Lapangan sedang tidak bisa dipesan (MAINTENANCE)');
    }
  }

  /** Slot bentrok jika ada reservasi non-CANCELLED di lapangan + tanggal yang sama dengan jam tumpang tindih. */
  private assertNoConflict(fieldId: number, date: string, start: string, end: string, ignoreId?: number) {
    const s = toMinutes(start);
    const e = toMinutes(end);
    const clash = this.bookings.find(
      (b) =>
        b.id !== ignoreId &&
        b.fieldId === fieldId &&
        b.date === date &&
        b.status !== 'CANCELLED' &&
        isOverlap(s, e, toMinutes(b.startTime), toMinutes(b.endTime)),
    );
    if (clash) {
      fail(HttpStatus.CONFLICT, 'Jadwal bentrok dengan reservasi lain', {
        conflictWith: {
          bookingId: clash.id,
          date: clash.date,
          startTime: clash.startTime,
          endTime: clash.endTime,
        },
      });
    }
  }

  private calcPrice(pricePerHour: number, start: string, end: string): number {
    const hours = (toMinutes(end) - toMinutes(start)) / 60;
    return Math.round(pricePerHour * hours);
  }
}