import { Module } from '@nestjs/common';
import { FieldsController } from './fields/fields.controller.js';
import { FieldsService } from './fields/fields.service.js';
import { BookingsController } from './bookings/bookings.controller.js';
import { BookingsService } from './bookings/bookings.service.js';
import { UsersController } from './users/users.controller.js';

@Module({
  controllers: [FieldsController, BookingsController, UsersController],
  providers: [FieldsService, BookingsService],
})
export class AppModule {}