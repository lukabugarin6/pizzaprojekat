import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * SUPERUSER -> create ADMIN
   * POST /users/admins
   */
  @Post('admins')
  @Roles(Role.SUPERUSER)
  createAdmin(@Request() req, @Body() dto: CreateUserDto) {
    return this.usersService.createAdmin(req.user, dto);
  }

  /**
   * ADMIN or SUPERUSER -> create USER
   * POST /users
   */
  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  createUser(@Request() req, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(req.user, dto);
  }

  /**
   * GET /users/me
   */
  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  /**
   * GET /users
   * SUPERUSER -> vidi sve korisnike
   */
  @Get()
  @Roles(Role.SUPERUSER)
  getAllUsers() {
    return this.usersService.findAll();
  }
}
