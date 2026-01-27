// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductVariant } from '../products/product-variant.entity';

import { OrdersGateway } from './orders.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { OrdersMailListener } from './orders-mail.listener';
import { MailModule } from 'src/mail/mail.module';

import { RestaurantSettings } from '../restaurant/restaurant-settings.entity';
import { RestaurantWorkingHours } from '../restaurant/restaurant-working-hours.entity';
import { RestaurantOverride } from '../restaurant/restaurant-override.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ProductVariant,
      RestaurantSettings,
      RestaurantWorkingHours,
      RestaurantOverride,
    ]),
    AuthModule,
    MailModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, OrdersGateway, OrdersMailListener],
})
export class OrdersModule {}
