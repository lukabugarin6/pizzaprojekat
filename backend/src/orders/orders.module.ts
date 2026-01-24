import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { OrdersAdminController } from './orders.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, ProductVariant])],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, RolesGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
