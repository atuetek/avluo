// MembersController: GET /api/members/me
//
// Phase 1 minimal:
// - Liest JWT-Claims (tenant_id, user_id) aus Request
// - Lädt Member aus DB mit tenant_id + user_id
// - 401 wenn kein JWT, 403 wenn kein Member-Eintrag im Tenant

import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

interface JwtPayload {
  sub: string; // userId
  tid: string; // tenantId
}

@Controller('api/members')
export class MembersController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async me(@Req() req: Request) {
    // 1. JWT aus Authorization-Header extrahieren
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein Authorization-Header.');
    }
    const token = auth.slice(7);

    // 2. JWT verifizieren (Phase 1: kein echter AuthGuard, sondern inline)
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen.');
    }

    // 3. Member im Tenant suchen
    const memberRow = await this.prisma.member.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tid,
      },
    });

    // 4. Wenn keine Member-Zeile → 403
    if (!memberRow) {
      throw new ForbiddenException(
        'Du bist kein Mitglied dieser Siedlung.',
      );
    }

    // 5. Member zurückgeben (User-Objekt raus, falls es dabei wäre)
    const { user, ...member } = memberRow as any;
    return member;
  }
}