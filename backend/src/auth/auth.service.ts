// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _pw, ...result } = user;
    return result;
  }

  private async signTokens(user: SafeUser) {
    const payload = { sub: user.id, role: user.role };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: 15 * 60,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: 7 * 24 * 60 * 60,
    });
    return { access_token, refresh_token };
  }

  private async storeRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(userId, hash);
  }

  async login(user: SafeUser) {
    const tokens = await this.signTokens(user);

    // ✅ upiši hash refresh tokena u bazu
    await this.storeRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * ✅ Refresh flow:
   * 1) verify refresh JWT (signature/exp)
   * 2) compare sa hash-om u bazi
   * 3) rotacija: izdaj nove tokene + snimi novi refresh hash
   */
  async refreshTokens(refreshToken: string) {
    let payload: { sub: number; role: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { password: _pw, ...safeUser } = user;
    const tokens = await this.signTokens(safeUser as SafeUser);

    // ✅ rotacija refresh tokena
    await this.storeRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { ok: true };
  }
}
