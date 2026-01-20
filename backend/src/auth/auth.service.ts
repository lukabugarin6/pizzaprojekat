// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validacija za LocalStrategy
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Login endpoint
   */
  async login(user: Omit<User, 'password'>) {
    const payload = {
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
