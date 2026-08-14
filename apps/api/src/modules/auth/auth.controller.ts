// AuthController: SMS-OTP-basierter Login
//
// Phase 1 (Szenario A):
// - POST /api/auth/send-otp: SMS-OTP senden (oder User-Onboarding)
// - POST /api/auth/verify-otp: Phone + Code → JWT + User-Info
//
// Dev-Mode: OTP-Code wird in API-Response zurückgegeben (debugOtp)
// Production: SMS via Netgsm (TR-Lokaltarif, Mock im Test)

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Phone-Regex: E.164 Format (+ gefolgt von 7-15 Ziffern)
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

// Rate-Limit: Max 3 OTP-Requests pro 5 Minuten pro Phone
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// In-Memory OTP-Store (Phase 1, später Redis)
interface OtpRecord {
  code: string;
  expiresAt: number;
}
export const otpStore = new Map<string, OtpRecord>();

// Rate-Limit-Store
export const rateLimitStore = new Map<string, number[]>();

// SMS-Service (dev: loggen, prod: Netgsm)
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    // Phase 1: nur loggen
    this.logger.log(`📱 SMS to ${phone}: "Avluo-Login: Code ${code}"`);
  }
}

// DTOs
class SendOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone muss im E.164-Format sein (z.B. +905551234567)' })
  phone!: string;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  locale?: 'tr-TR' | 'en-US' | 'de-DE';
}

class VerifyOtpDto {
  @IsString()
  @Matches(PHONE_REGEX)
  phone!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
  ) {}

  /**
   * POST /api/auth/send-otp
   * SMS-OTP senden. User wird on-the-fly angelegt wenn noch nicht vorhanden.
   */
  @Post('send-otp')
  @HttpCode(200)
  async sendOtp(@Body() dto: SendOtpDto) {
    // Rate-Limit prüfen
    this.checkRateLimit(dto.phone);

    // User suchen oder erstellen
    let user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });

    if (!user) {
      // User-Onboarding
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          phoneVerified: false,
          locale: dto.locale || 'tr-TR',
        },
      });
    }

    // 6-stelligen OTP-Code generieren
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 Min gültig
    otpStore.set(dto.phone, { code, expiresAt });

    // SMS senden (Phase 1: nur loggen)
    await this.sms.sendOtp(dto.phone, code);

    // Dev-Mode: OTP in Response zurückgeben (für Tests)
    // In Production: entfernen
    return {
      sent: true,
      debugOtp: code,
    };
  }

  /**
   * POST /api/auth/verify-otp
   * OTP prüfen, JWT ausstellen, User+Member-Info zurückgeben.
   */
  @Post('verify-otp')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const otpRecord = otpStore.get(dto.phone);
    if (!otpRecord) {
      throw new UnauthorizedException('Kein OTP für diese Nummer angefordert.');
    }
    if (otpRecord.expiresAt < Date.now()) {
      otpStore.delete(dto.phone);
      throw new UnauthorizedException('OTP ist abgelaufen. Bitte neu anfordern.');
    }
    if (otpRecord.code !== dto.code) {
      throw new UnauthorizedException('OTP-Code ist falsch.');
    }

    // OTP verbrauchen
    otpStore.delete(dto.phone);

    // User laden
    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new BadRequestException('User nicht gefunden.');
    }

    // Phone als verifiziert markieren (idempotent)
    if (!user.phoneVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    // TODO(Phase 2): Tenant aus Request-Body oder Subdomain-Header lesen.
    // Aktuell: DEFAULT_TENANT_ID aus ENV (für Pilot-Setup Yeşiltepe).
    // Sicherheit: In Production darf dieser Endpoint NICHT ohne Tenant-Validation sein,
    // sonst könnte sich ein User in jeden Tenant einloggen.
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

    return {
      token,
      user: { id: user.id, phone: user.phone, locale: user.locale },
      member: member
        ? { id: member.id, tenantId: member.tenantId, role: member.role }
        : null,
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private checkRateLimit(phone: string): void {
    const now = Date.now();
    const timestamps = rateLimitStore.get(phone) || [];

    // Alte Timestamps außerhalb des Fensters entfernen
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= RATE_LIMIT_MAX) {
      throw new HttpException(
        `Zu viele OTP-Anfragen. Bitte ${Math.ceil(
          (RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000,
        )}s warten.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    rateLimitStore.set(phone, recent);
  }
}