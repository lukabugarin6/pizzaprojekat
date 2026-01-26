import { Controller, Get } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';

@Controller('public/restaurant')
export class RestaurantPublicController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('hours')
  async getHours() {
    // returns: name, weekly schedule, active override, isOpenNow
    return this.restaurantService.getEffectiveHoursForToday();
  }
}
