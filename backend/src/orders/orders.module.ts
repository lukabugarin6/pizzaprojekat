import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, ProductVariant])],
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
