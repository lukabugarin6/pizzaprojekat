import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { WebAuthnCredential as WebAuthnCredentialEntity } from '../users/webauthn-credential.entity';

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { WebAuthnCredential } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

// --- helpers ---
const base64urlToBuffer = (b64url: string): Buffer => {
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
};

const uint8ToBase64url = (u8: Uint8Array): string => {
  const base64 = Buffer.from(u8).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

// ✅ critical: return Uint8Array<ArrayBuffer> (not Buffer / ArrayBufferLike)
const base64urlToUint8Array = (b64url: string): Uint8Array<ArrayBuffer> => {
  const buf = base64urlToBuffer(b64url);
  const copy = Uint8Array.from(buf); // allocates a fresh ArrayBuffer-backed Uint8Array
  return copy as unknown as Uint8Array<ArrayBuffer>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(WebAuthnCredentialEntity)
    private readonly creds: Repository<WebAuthnCredentialEntity>,
  ) {}

  private rpName() {
    return this.cfg.get<string>('WEBAUTHN_RP_NAME')!;
  }
  private rpID() {
    return this.cfg.get<string>('WEBAUTHN_RP_ID')!;
  }
  private origin() {
    return this.cfg.get<string>('WEBAUTHN_ORIGIN')!;
  }

  private toUserIDBytes(userId: string) {
    return isoUint8Array.fromUTF8String(userId);
  }

  async registrationOptions(email: string, name?: string) {
    if (!email) throw new BadRequestException('email is required');

    let user = await this.users.findOne({
      where: { email },
      relations: ['credentials'],
    });

    if (!user) {
      user = await this.users.save(
        this.users.create({ email, name: name ?? null }),
      );
      user.credentials = [];
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName(),
      rpID: this.rpID(),

      // ✅ must be Uint8Array
      userID: this.toUserIDBytes(user.id),

      userName: user.email,
      userDisplayName: user.name ?? user.email,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },

      // ✅ v10+: id is base64url string
      excludeCredentials: (user.credentials ?? []).map((c: any) => ({
        id: c.credentialId,
      })),
    });

    user.webauthnChallenge = options.challenge;
    user.challengeExpiresAt = new Date(Date.now() + 60_000);
    await this.users.save(user);

    return options;
  }

  async verifyRegistration(email: string, response: any) {
    const user = await this.users.findOne({
      where: { email },
      relations: ['credentials'],
    });
    if (!user) throw new BadRequestException('User not found');
    if (!user.webauthnChallenge || !user.challengeExpiresAt)
      throw new BadRequestException('No challenge in progress');
    if (user.challengeExpiresAt.getTime() < Date.now())
      throw new BadRequestException('Challenge expired');

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin: this.origin(),
      expectedRPID: this.rpID(),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Registration verification failed');
    }

    // ✅ NEW API: registrationInfo.credential
    const regInfo = verification.registrationInfo;
    const credential = regInfo.credential; // WebAuthnCredential

    const credentialId = credential.id; // base64url string
    const publicKey = uint8ToBase64url(credential.publicKey); // store as base64url
    const counter = credential.counter;

    await this.creds.save(
      this.creds.create({
        userId: user.id,
        credentialId,
        publicKey,
        counter,
      }),
    );

    user.webauthnChallenge = null;
    user.challengeExpiresAt = null;
    await this.users.save(user);

    return { success: true };
  }

  async authenticationOptions(email: string) {
    const user = await this.users.findOne({
      where: { email },
      relations: ['credentials'],
    });
    if (!user) throw new BadRequestException('User not found');
    if (!user.credentials?.length)
      throw new BadRequestException('No passkeys registered');

    const options = await generateAuthenticationOptions({
      rpID: this.rpID(),
      timeout: 60000,
      userVerification: 'required',

      // ✅ v10+: id is base64url string
      allowCredentials: user.credentials.map((c: any) => ({
        id: c.credentialId,
      })),
    });

    user.webauthnChallenge = options.challenge;
    user.challengeExpiresAt = new Date(Date.now() + 60_000);
    await this.users.save(user);

    return options;
  }

  async verifyAuthentication(email: string, response: any) {
    const user = await this.users.findOne({
      where: { email },
      relations: ['credentials'],
    });
    if (!user) throw new BadRequestException('User not found');
    if (!user.webauthnChallenge || !user.challengeExpiresAt)
      throw new BadRequestException('No challenge in progress');
    if (user.challengeExpiresAt.getTime() < Date.now())
      throw new BadRequestException('Challenge expired');

    const credentialId = response?.id; // base64url string
    const cred = user.credentials.find(
      (c: any) => c.credentialId === credentialId,
    );
    if (!cred) throw new BadRequestException('Unknown credential');

    // ✅ `publicKey` must be Uint8Array<ArrayBuffer>
    const credential: WebAuthnCredential = {
      id: cred.credentialId,
      publicKey: base64urlToUint8Array(cred.publicKey),
      counter: cred.counter,
    };

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin: this.origin(),
      expectedRPID: this.rpID(),
      requireUserVerification: true,
      credential,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      throw new BadRequestException('Authentication verification failed');
    }

    cred.counter = verification.authenticationInfo.newCounter;
    await this.creds.save(cred);

    user.webauthnChallenge = null;
    user.challengeExpiresAt = null;
    await this.users.save(user);

    const access_token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { success: true, access_token };
  }
}
