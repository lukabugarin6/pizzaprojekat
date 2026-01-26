// src/restaurant/restaurant.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantSettings } from './restaurant-settings.entity';
import { RestaurantWorkingHours } from './restaurant-working-hours.entity';
import { RestaurantOverride } from './restaurant-override.entity';
import { RestaurantAdminController } from './restaurant-admin.controller';
import { RestaurantAdminService } from './restaurant-admin.service';
import { RestaurantService } from './restaurant.service';
import { RestaurantPublicController } from './restaurant.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestaurantSettings,
      RestaurantWorkingHours,
      RestaurantOverride,
    ]),
  ],
  controllers: [RestaurantPublicController, RestaurantAdminController],
  providers: [RestaurantService, RestaurantAdminService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
