// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { PushToken } from 'src/push-tokens/push-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PushToken])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // ⬅️ BITNO za AuthModule
})
export class UsersModule {}
