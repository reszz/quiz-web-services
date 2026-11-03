import { Controller, Get, Param, Query } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service.js';
import { ok } from '../common/response.js';

@Controller('users')
export class UsersController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAllUsers(){
    const map =  new Map<string, { userId: string; customerName: string; totalBookings: number }>();

    for (const b of this.bookingsService.findAll()){
        const user = map.get(b.userId);
        if (user){
            user.totalBookings++;
            user.customerName = b.customerName;
        } else {
            map.set(b.userId, {
                userId: b.userId,
                customerName: b.customerName,
                totalBookings: 1,
            });
        }
    }
    const data = [...map.values()];
    return ok('Daftar user', data, {total: data.length});
  }
  // GET /users/:userId/bookings?status=BOOKED
  @Get(':userId/bookings')
  findBookings(@Param('userId') userId: string, @Query() query: any) {
    const data = this.bookingsService.findByUser(userId, query);
    return ok(`Reservasi milik ${userId}`, data, { total: data.length });
  }
}