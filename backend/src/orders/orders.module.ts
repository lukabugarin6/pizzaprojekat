import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductVariant } from '../products/product-variant.entity';

import { OrdersGateway } from './orders.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { OrdersMailListener } from './orders-mail.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ProductVariant]),
    AuthModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, OrdersGateway, OrdersMailListener],
})
export class OrdersModule {}
