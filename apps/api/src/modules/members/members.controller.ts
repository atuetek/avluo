// MembersController: GET /api/members/me, GET /api/members, PATCH /api/members/me
//
// Phase 1 (Szenario A):
// - GET /api/members/me: aktuelles Profil des eingeloggten Users
// - GET /api/members: paginierte Liste aller Members des Tenants
// - PATCH /api/members/me: Profil-Felder updaten (NICHT Rolle, tenantId, etc.)
//
// Multi-Tenant-Sicherheit:
// - tenant_id kommt aus req.tenant (von TenantMiddleware gesetzt)
// - User-Identität kommt aus JWT (von JwtVerifier verifiziert)
// - User kann nur sein eigenes Profil updaten (memberId aus req.tenant, NICHT aus Body)
// - forbidNonWhitelisted ValidationPipe wirft 400 bei verbotenen Feldern (role, tenantId)

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

interface ListMembersQuery {
  limit?: string;
  offset?: string;
  blockName?: string;
  q?: string;
}

// Update-DTO mit class-validator-Dekoratoren
// Damit wirft forbidNonWhitelisted 400 bei verbotenen Feldern (role, tenantId, etc.)
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  blockName?: string;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  preferredLang?: 'tr-TR' | 'en-US' | 'de-DE';

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;
}

@Controller('api/members')
export class MembersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
  ) {}

  /**
   * GET /api/members/me
   * Aktuelles Profil des eingeloggten Users im aktuellen Tenant.
   */
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    const payload = await this.jwt.verifyFromRequest(req);

    const member = await this.prisma.member.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tid,
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'Du bist kein Mitglied dieser Siedlung.',
      );
    }

    return this.serializeMember(member);
  }

  /**
   * GET /api/members
   * Liste aller Members des Tenants, paginiert.
   *
   * Sicherheit:
   * - tenant_id kommt aus req.tenant, NICHT aus Query
   * - max limit = 100 (DOS-Schutz)
   * - RLS in DB verifiziert dass nur eigene Tenant-Members gelesen werden
   */
  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListMembersQuery,
  ) {
    const tenant = this.jwt.requireTenantContext(req);

    const limit = parseInt(query.limit || '20', 10) || 20;
    const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);

    // Hard limit: DOS-Schutz
    if (limit > 100) {
      throw new BadRequestException(
        'limit darf maximal 100 sein (DOS-Schutz).',
      );
    }
    if (limit < 1) {
      throw new BadRequestException('limit muss >= 1 sein.');
    }

    const where: any = { tenantId: tenant.id };

    if (query.blockName) {
      where.blockName = query.blockName;
    }
    if (query.q) {
      where.displayName = { contains: query.q, mode: 'insensitive' };
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: [{ blockName: 'asc' }, { houseNumber: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      members: members.map((m: any) => this.serializeMember(m)),
      total,
      limit,
      offset,
    };
  }

  /**
   * PATCH /api/members/me
   * Profil-Felder des eingeloggten Users updaten.
   *
   * Sicherheit:
   * - Nur whitelisted Felder (displayName, houseNumber, blockName, preferredLang, avatarUrl)
   * - verbotene Felder (role, tenantId) → 400 (forbidNonWhitelisted)
   * - User kann nur sein eigenes Profil updaten (memberId aus req.tenant)
   */
  @Patch('me')
  @HttpCode(200)
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMemberDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);

    const definedFields = Object.values(dto).filter((v) => v !== undefined);
    if (definedFields.length === 0) {
      throw new BadRequestException(
        'Mindestens ein Feld muss zum Update gegeben werden.',
      );
    }

    const updated = await this.prisma.member.update({
      where: { id: tenant.memberId },
      data: dto,
    });

    return this.serializeMember(updated);
  }

  private serializeMember(m: any) {
    const { user, ...rest } = m;
    return rest;
  }
}