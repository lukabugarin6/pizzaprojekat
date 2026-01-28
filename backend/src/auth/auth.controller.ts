// src/auth/auth.controller.ts
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // ✅ refresh token endpoint
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshTokens(body.refresh_token);
  }

  // ✅ logout (mora da bude auth-ovan access tokenom)
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.user.sub); // sub je iz JWT payload-a
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/push-token')
  async savePushToken(@Request() req, @Body('token') token: string) {
    await this.authService.savePushToken(req.user.sub, token);
    return { ok: true };
  }
}
