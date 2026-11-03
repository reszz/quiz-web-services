import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { ok } from '../common/response.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // GET /bookings?fieldId=1&date=2026-11-05&status=BOOKED
  @Get()
  findAll(@Query() query: any) {
    const data = this.bookingsService.findAll(query);
    return ok('Daftar reservasi', data, { total: data.length });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return ok('Detail reservasi', this.bookingsService.findOne(id));
  }

  @Post() // status default: 201 Created
  create(@Body() body: any) {
    return ok('Reservasi berhasil dibuat', this.bookingsService.create(body));
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: any) {
    return ok('Reservasi berhasil diganti', this.bookingsService.update(id, body, false));
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return ok('Reservasi berhasil dibatalkan', this.bookingsService.cancel(id));
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return ok('Reservasi ditandai selesai', this.bookingsService.complete(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return ok('Reservasi berhasil diperbarui', this.bookingsService.update(id, body, true));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return ok('Reservasi berhasil dihapus', this.bookingsService.remove(id));
  }
}