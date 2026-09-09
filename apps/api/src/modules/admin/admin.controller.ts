import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { AuditService } from '../../common/audit/audit.service';

class UpdateMemberAdminDto {
  @IsOptional()
  @IsIn(['MEMBER', 'ADMIN', 'SUPER_ADMIN', 'GUARD'])
  role?: 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUARD';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  houseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;
}

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
    private readonly audit: AuditService,
  ) {}

  private requireAdmin(req: AuthenticatedRequest) {
    const tenant = this.jwt.requireTenantContext(req);
    if (tenant.role !== 'ADMIN' && tenant.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Nur Yönetim');
    }
    return tenant;
  }

  @Get('members')
  async members(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('q') q?: string,
  ) {
    const tenant = this.requireAdmin(req);
    const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 100);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);
    const where: any = { tenantId: tenant.id };
    if (q) where.displayName = { contains: q, mode: 'insensitive' };
    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.member.count({ where }),
    ]);
    return { members, total, limit, offset };
  }

  @Patch('members/:id')
  @HttpCode(200)
  async updateMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberAdminDto,
  ) {
    const tenant = this.requireAdmin(req);
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!member) throw new NotFoundException('Member nicht gefunden');
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Keine Felder');
    }
    const updated = await this.prisma.member.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      tenantId: tenant.id,
      userId: req.userId,
      action: 'admin.member.update',
      resource: `member:${id}`,
      metadata: dto,
    });
    return updated;
  }

  @Get('emergency/:id/acks')
  async emergencyAcks(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.requireAdmin(req);
    const alert = await this.prisma.emergencyAlert.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        acks: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true,
                houseNumber: true,
                blockName: true,
                phone: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!alert) throw new NotFoundException('Alert nicht gefunden');
    return alert;
  }

  @Get('audit')
  async auditLog(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limitStr?: string,
    @Query('action') action?: string,
  ) {
    const tenant = this.requireAdmin(req);
    const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 100);
    const where: any = { tenantId: tenant.id };
    if (action) where.action = action;
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { logs };
  }

  @Post('invites')
  async createInvite(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInviteDto,
  ) {
    const tenant = this.requireAdmin(req);
    const code =
      dto.code?.trim().toUpperCase() ||
      `YSL-${randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.invite.create({
      data: {
        tenantId: tenant.id,
        code,
        houseNumber: dto.houseNumber,
        phone: dto.phone,
        email: dto.email,
        expiresAt,
      },
    });
    await this.audit.log({
      tenantId: tenant.id,
      userId: req.userId,
      action: 'admin.invite.create',
      resource: `invite:${invite.id}`,
      metadata: { code },
    });
    return invite;
  }

  @Get('invites')
  async listInvites(@Req() req: AuthenticatedRequest) {
    const tenant = this.requireAdmin(req);
    const invites = await this.prisma.invite.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { invites };
  }

  @Post('posts/:id/moderate')
  @HttpCode(200)
  async moderatePost(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      isHidden?: boolean;
      isPinned?: boolean;
      isAnnouncement?: boolean;
      hiddenReason?: string;
    },
  ) {
    const tenant = this.requireAdmin(req);
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('Post nicht gefunden');

    const data: any = {};
    if (body.isHidden !== undefined) {
      data.isHidden = body.isHidden;
      data.hiddenReason = body.hiddenReason || null;
      data.hiddenBy = body.isHidden ? tenant.memberId : null;
    }
    if (body.isPinned !== undefined) {
      data.isPinned = body.isPinned;
      data.pinnedAt = body.isPinned ? new Date() : null;
    }
    if (body.isAnnouncement !== undefined) {
      data.isAnnouncement = body.isAnnouncement;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Keine Felder');
    }

    const updated = await this.prisma.post.update({ where: { id }, data });
    await this.audit.log({
      tenantId: tenant.id,
      userId: req.userId,
      action: 'admin.post.moderate',
      resource: `post:${id}`,
      metadata: data,
    });
    return updated;
  }
}
