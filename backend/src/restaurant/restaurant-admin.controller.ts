// src/restaurant/restaurant-admin.controller.ts
import { Body, Controller, Delete, Param, Put, Post } from '@nestjs/common';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import { CreateOverrideDto } from './dto/create-override.dto';

// placeholders (use yours)
import { UseGuards } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RestaurantAdminService } from './restaurant-admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // or OWNER
@Controller('admin/restaurant')
export class RestaurantAdminController {
  constructor(private readonly adminService: RestaurantAdminService) {}

  @Put('settings')
  updateSettings(@Body() dto: UpdateRestaurantSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Put('weekly-hours')
  setWeeklyHours(@Body() dto: SetWeeklyHoursDto) {
    return this.adminService.setWeeklyHours(dto);
  }

  @Post('overrides')
  createOverride(@Body() dto: CreateOverrideDto) {
    return this.adminService.createOverride(dto);
  }

  @Delete('overrides/:id')
  deleteOverride(@Param('id') id: string) {
    return this.adminService.deleteOverride(id);
  }
}
