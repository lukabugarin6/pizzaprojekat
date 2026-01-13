import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/webauthn')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register/options')
  registerOptions(@Body() body: { email: string; name?: string }) {
    return this.auth.registrationOptions(body.email, body.name);
  }

  @Post('register/verify')
  registerVerify(@Body() body: { email: string; response: any }) {
    return this.auth.verifyRegistration(body.email, body.response);
  }

  @Post('login/options')
  loginOptions(@Body() body: { email: string }) {
    return this.auth.authenticationOptions(body.email);
  }

  @Post('login/verify')
  loginVerify(@Body() body: { email: string; response: any }) {
    return this.auth.verifyAuthentication(body.email, body.response);
  }
}
