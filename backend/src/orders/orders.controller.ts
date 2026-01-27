// src/orders/orders.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('orders')
@Throttle({ default: { ttl: 60, limit: 5 } })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ---- PUBLIC (guest) ----
  // POST /orders
  @Post()
  create(@Body() dto: CreateOrderDto, @Headers('accept-language') al?: string) {
    return this.ordersService.create(dto, al);
  }

  // GET /orders/:publicCode?token=...
  @Get(':publicCode')
  getStatus(
    @Param('publicCode') publicCode: string,
    @Query('token') token: string,
  ) {
    return this.ordersService.getPublicStatus(publicCode, token);
  }
}
