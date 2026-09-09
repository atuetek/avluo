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
  Req,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from '../notifications/notifications.service';

class CreateEmergencyDto {
  @IsIn(['EARTHQUAKE', 'FIRE', 'MEDICAL', 'SECURITY', 'INTRUDER', 'OTHER'])
  type!: 'EARTHQUAKE' | 'FIRE' | 'MEDICAL' | 'SECURITY' | 'INTRUDER' | 'OTHER';

  @IsOptional()
  @IsIn(['CRITICAL', 'HIGH', 'MEDIUM'])
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM';

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

class AckDto {
  @IsIn(['SAFE', 'NEED_HELP'])
  status!: 'SAFE' | 'NEED_HELP';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('api/emergency')
export class EmergencyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async listActive(@Req() req: AuthenticatedRequest) {
    const tenant = this.jwt.requireTenantContext(req);
    const alerts = await this.prisma.emergencyAlert.findMany({
      where: { tenantId: tenant.id, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        triggeredByMember: {
          select: { id: true, displayName: true },
        },
        acks: {
          where: { memberId: tenant.memberId },
          select: { status: true, note: true },
        },
      },
    });
    return {
      alerts: alerts.map((a) => ({
        ...a,
        myAck: a.acks[0] || null,
        acks: undefined,
      })),
    };
  }

  @Get(':id')
  async getOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const alert = await this.prisma.emergencyAlert.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        triggeredByMember: {
          select: { id: true, displayName: true },
        },
        acks: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true,
                houseNumber: true,
                blockName: true,
              },
            },
          },
        },
      },
    });
    if (!alert) throw new NotFoundException('Alert nicht gefunden');
    const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      return {
        ...alert,
        myAck: alert.acks.find((a) => a.memberId === tenant.memberId) || null,
        acks: undefined,
      };
    }
    return alert;
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEmergencyDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const members = await this.prisma.member.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true },
    });

    const alert = await this.prisma.emergencyAlert.create({
      data: {
        tenantId: tenant.id,
        triggeredBy: tenant.memberId!,
        type: dto.type,
        severity: dto.severity || 'HIGH',
        title: dto.title.trim(),
        message: dto.message.trim(),
        location: dto.location,
        recipients: members.length,
        pushSent: true,
      },
    });

    await this.notifications.notifyMany(
      tenant.id,
      members.map((m) => m.id).filter((id) => id !== tenant.memberId),
      {
        type: 'sos',
        title: `SOS: ${alert.title}`,
        body: alert.message,
        refType: 'emergency',
        refId: alert.id,
      },
    );

    return alert;
  }

  @Post(':id/ack')
  @HttpCode(200)
  async ack(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AckDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const alert = await this.prisma.emergencyAlert.findFirst({
      where: { id, tenantId: tenant.id, resolvedAt: null },
    });
    if (!alert) throw new NotFoundException('Alert nicht gefunden');

    const existing = await this.prisma.emergencyAck.findUnique({
      where: {
        tenantId_alertId_memberId: {
          tenantId: tenant.id,
          alertId: id,
          memberId: tenant.memberId!,
        },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.emergencyAck.upsert({
        where: {
          tenantId_alertId_memberId: {
            tenantId: tenant.id,
            alertId: id,
            memberId: tenant.memberId!,
          },
        },
        create: {
          tenantId: tenant.id,
          alertId: id,
          memberId: tenant.memberId!,
          status: dto.status,
          note: dto.note,
        },
        update: { status: dto.status, note: dto.note },
      });
      if (!existing) {
        await tx.emergencyAlert.update({
          where: { id },
          data: { acknowledgedCount: { increment: 1 } },
        });
      }
    });

    return { status: dto.status };
  }

  @Patch(':id/resolve')
  @HttpCode(200)
  async resolve(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'SUPER_ADMIN';
    if (!isAdmin) throw new ForbiddenException('Nur Admins');
    const alert = await this.prisma.emergencyAlert.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!alert) throw new NotFoundException('Alert nicht gefunden');
    return this.prisma.emergencyAlert.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }
}
