import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { fail, ok } from "../common/response.js";
import { FieldsService } from "./fields.service.js";
import { BookingsService } from "../bookings/bookings.service.js";

@Controller('fields')
export class FieldsController {
    constructor(
        private readonly fieldsService: FieldsService,
        private readonly bookingsService: BookingsService,
    ) {}

    @Get()
    findAll(@Query() query: any){
        const data = this.fieldsService.findAll(query);
        return ok('Daftar lapangan', data, {total: data.length});
    }

    @Get(':id')
    findOne(@Param('id') id: string){
        return ok('Detail lapangan', this.fieldsService.findOne(id));
    }

    @Get(':id/availability')
    availability(@Param('id') id: string, @Query('date') date:string){
        return ok('Ketersediaan lapangan', this.bookingsService.getAvailability(id, date));
    }

    @Post()
    create(@Body() body: any){
        return ok('Lapangan berhasil dibuat', this.fieldsService.create(body));
    }

    @Put(':id')
    replace(@Param('id') id: string, @Body() body: any){
        return ok('Lapangan berhasil diganti', this.fieldsService.replace(id, body));
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return ok('Lapangan berhasil diperbarui', this.fieldsService.update(id, body));
    }

    @Delete(':id')
    remove(@Param(':id') id: string){
        const field = this.fieldsService.findOne(id);
        if (this.bookingsService.hasActiveBooking(field.id)){
            fail(
                HttpStatus.CONFLICT,
                'Lapangan tidak bisa dihapus karena masih memiliki reservasi berstatus BOOKED',
            );
        }
        return ok('Lapangan berhasil dihapus', this.fieldsService.remove(id));
    }
}