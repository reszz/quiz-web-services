import { HttpStatus, Injectable } from "@nestjs/common";
import { parseId } from "../common/time.util.js";
import { fail } from "../common/response.js";


export const FIELD_STATUSES = ['AVAILABLE', 'MAINTENANCE'] as const;
export type fieldStatus = (typeof FIELD_STATUSES)[number];
type FieldInput = Omit<Field, 'id' | 'status'> & {status?: fieldStatus}

export interface Field {
    id: number;
    name: string;
    sportType: string;
    pricePerHour: number;
    status: fieldStatus;
}


@Injectable()
export class FieldsService {
  // "Database" sementara: cukup array di memori. Hilang saat server restart.
  private fields: Field[] = [
    { id: 1, name: 'Futsal Arena A', sportType: 'futsal', pricePerHour: 150000, status: 'AVAILABLE' },
    { id: 2, name: 'Badminton Court 1', sportType: 'badminton', pricePerHour: 60000, status: 'AVAILABLE' },
    { id: 3, name: 'Basket Indoor', sportType: 'basket', pricePerHour: 120000, status: 'AVAILABLE' },
    { id: 4, name: 'Mini Soccer', sportType: 'mini soccer', pricePerHour: 250000, status: 'AVAILABLE' },
    { id: 5, name: 'Tenis Court', sportType: 'tenis', pricePerHour: 90000, status: 'MAINTENANCE' },
  ];
  private nextId = Math.max(0, ...this.fields.map((f) => f.id)) + 1;

  findAll(query: any = {}): Field[]{
    let result = [...this.fields];
    if (query.sportType) {
        result = result.filter(
            (f) => f.sportType.toLowerCase() === String(query.sportType).toLowerCase(),
        );
    }
    if (query.status){
        result = result.filter((f) => f.status === String(query.status).toUpperCase());
    }
    return result;
  }

  findOne(rawId: any): Field {
    const id = parseId(rawId);
    if (id === null ) fail(HttpStatus.BAD_REQUEST, 'ID Lapangan harus berupa angka positif');
    const field = this.fields.find((f) => f.id === id);
    if (!field) fail(HttpStatus.NOT_FOUND, 'Lapangan dengan id ${id} tidak ditemukan');
    return field;
  }

  create(body: any): Field{
    const clean = this.validate(body,  false);
    const field: Field = {
        id: this.nextId++,
        name: clean.name,
        sportType: clean.sportType,
        pricePerHour: clean.pricePerHour,
        status: clean.status ?? 'AVAILABLE',
    };
    this.fields.push(field);
    return field;
  }

  replace(rawId: any, body: any): Field{
    const field = this.findOne(rawId);
    const clean = this.validate(body, false);
    field.name = clean.name;
    field.sportType = clean.sportType;
    field.pricePerHour = clean.pricePerHour;
    field.status = clean.status ?? 'AVAILABLE';
    return field;
  }

  update(rawId: any, body: any): Field{
    const field = this.findOne(rawId);
    const clean = this.validate(body, true);
    Object.assign(field, clean);
    return field;
  }

  remove(rawId: any): Field {
    const field = this.findOne(rawId);
    this.fields = this.fields.filter((f) => f.id !== field.id);
    return field;
  }
    private validate(body: any, partial: false): FieldInput;
    private validate(body: any, partial: true): Partial<FieldInput>;
    private validate(body: any, partial: boolean): any {
    const errors: string[] = [];
    const out: Partial<Field> = {};
    if (!body || typeof body !== 'object' || Array.isArray(body)){
        fail(HttpStatus.BAD_REQUEST, 'Request body harus berupa object json');
    }
    if (body.name !== undefined || !partial ){
        if (typeof body.name !== 'string' || !body.name.trim()){
            errors.push('name wajib diisi (string)');
        }
        else out.name = body.name.trim();
    }
    
    if (body.sportType !== undefined || !partial) {
      if (typeof body.sportType !== 'string' || !body.sportType.trim()) errors.push('sportType wajib diisi (string)');
      else out.sportType = body.sportType.trim().toLowerCase();
    }
    if (body.pricePerHour !== undefined || !partial) {
      if (typeof body.pricePerHour !== 'number' || !(body.pricePerHour > 0)) errors.push('pricePerHour wajib berupa angka > 0');
      else out.pricePerHour = body.pricePerHour;
    }
    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase();
      if (!FIELD_STATUSES.includes(s as fieldStatus)) errors.push(`status harus salah satu dari: ${FIELD_STATUSES.join(', ')}`);
      else out.status = s as fieldStatus;
    }
    if (partial && Object.keys(body).length === 0) errors.push('Tidak ada data yang diubah');

    if (errors.length) fail(HttpStatus.BAD_REQUEST, 'Validasi gagal', { errors });
    return out;
  }
}
  


