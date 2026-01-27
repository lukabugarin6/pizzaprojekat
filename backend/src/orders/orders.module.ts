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
import { ExpoPushService } from 'src/notifications/expo-push.service';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';

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
    UsersModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [
    OrdersService,
    OrdersGateway,
    OrdersMailListener,
    ExpoPushService,
  ],
})
export class OrdersModule {}
