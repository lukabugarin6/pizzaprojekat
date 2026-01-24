import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

import { Role } from '../common/enums/role.enum';

// pretpostavka: imaš neki JwtAuthGuard
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ---- PUBLIC (guest) ----

  @Post('orders')
  create(@Body() dto: CreateOrderDto, @Headers('accept-language') al?: string) {
    return this.ordersService.create(dto, al);
  }

  // web proverava status preko publicCode + token
  @Get('orders/:publicCode')
  getStatus(
    @Param('publicCode') publicCode: string,
    @Query('token') token: string,
  ) {
    return this.ordersService.getPublicStatus(publicCode, token);
  }

  // ---- ADMIN ----

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Post('admin/orders/:id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.accept(id, dto, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @Post('admin/orders/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.reject(id, dto, req.user);
  }
}
