import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { OrdersService } from './orders.service';
import { Role } from '../common/enums/role.enum';
import { AdminListOrdersDto } from './dto/admin-list.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('orders/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERUSER)
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Query() q: AdminListOrdersDto) {
    return this.ordersService.adminList(q);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptOrderDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.ordersService.adminAccept(id, dto, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.ordersService.adminReject(id, dto, userId);
  }
}
