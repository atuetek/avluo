import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport,
} from '@simplewebauthn/server';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = 'Avluo';
const origin =
  process.env.WEBAUTHN_ORIGIN ||
  process.env.APP_BASE_URL ||
  'http://localhost:4200';

const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

class RegisterVerifyDto {
  @IsObject()
  response!: RegistrationResponseJSON;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

class AuthOptionsDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

class AuthVerifyDto {
  @IsString()
  userId!: string;

  @IsObject()
  response!: AuthenticationResponseJSON;
}

@Controller('api/auth/passkey')
export class PasskeyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly jwtVerifier: JwtVerifier,
  ) {}

  @Post('register/options')
  @HttpCode(200)
  async registerOptions(@Req() req: AuthenticatedRequest) {
    const payload = await this.jwtVerifier.verifyFromRequest(req);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new BadRequestException('User nicht gefunden');

    const existing = await this.prisma.webAuthnCredential.findMany({
      where: { userId: user.id },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.phone || user.email || user.id,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: this.parseTransports(c.transports),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    challengeStore.set(user.id, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return options;
  }

  @Post('register/verify')
  @HttpCode(200)
  async registerVerify(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterVerifyDto,
  ) {
    const payload = await this.jwtVerifier.verifyFromRequest(req);
    const stored = challengeStore.get(payload.sub);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('Challenge abgelaufen');
    }

    const verification = await verifyRegistrationResponse({
      response: dto.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('Passkey-Registrierung fehlgeschlagen');
    }

    const info = verification.registrationInfo;
    const credentialID = info.credential.id;
    const publicKey = Buffer.from(info.credential.publicKey).toString('base64url');

    await this.prisma.webAuthnCredential.create({
      data: {
        userId: payload.sub,
        credentialId: credentialID,
        publicKey,
        counter: BigInt(info.credential.counter || 0),
        transports: dto.response.response?.transports?.join(',') || null,
        deviceName: dto.deviceName || info.credentialDeviceType || 'Passkey',
      },
    });

    challengeStore.delete(payload.sub);
    return { verified: true, backedUp: info.credentialBackedUp };
  }

  @Post('authenticate/options')
  @HttpCode(200)
  async authOptions(@Body() dto: AuthOptionsDto) {
    let allowCredentials:
      | { id: string; transports?: AuthenticatorTransport[] }[]
      | undefined;

    if (dto.userId) {
      const creds = await this.prisma.webAuthnCredential.findMany({
        where: { userId: dto.userId },
      });
      allowCredentials = creds.map((c) => ({
        id: c.credentialId,
        transports: this.parseTransports(c.transports),
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const key = dto.userId || `anon:${options.challenge}`;
    challengeStore.set(key, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return { ...options, challengeKey: key };
  }

  @Post('authenticate/verify')
  @HttpCode(200)
  async authVerify(@Body() dto: AuthVerifyDto) {
    const stored = challengeStore.get(dto.userId);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('Challenge abgelaufen');
    }

    const cred = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId: dto.response.id },
    });
    if (!cred || cred.userId !== dto.userId) {
      throw new UnauthorizedException('Unbekanntes Passkey');
    }

    const verification = await verifyAuthenticationResponse({
      response: dto.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialId,
        publicKey: Buffer.from(cred.publicKey, 'base64url'),
        counter: Number(cred.counter),
        transports: this.parseTransports(cred.transports),
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey ungültig');
    }

    await this.prisma.webAuthnCredential.update({
      where: { id: cred.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('User nicht gefunden');

    const tenantId =
      process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, tenantId },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      tid: tenantId,
      role: member?.role,
    });

    challengeStore.delete(dto.userId);
    return {
      token,
      user: { id: user.id, phone: user.phone, locale: user.locale },
      member: member
        ? { id: member.id, tenantId: member.tenantId, role: member.role }
        : null,
    };
  }

  @Get('status')
  async status(@Req() req: AuthenticatedRequest) {
    const payload = await this.jwtVerifier.verifyFromRequest(req);
    const count = await this.prisma.webAuthnCredential.count({
      where: { userId: payload.sub },
    });
    return { enrolled: count > 0, count };
  }

  private parseTransports(
    value?: string | null,
  ): AuthenticatorTransport[] | undefined {
    if (!value) return undefined;
    return value.split(',') as AuthenticatorTransport[];
  }
}
