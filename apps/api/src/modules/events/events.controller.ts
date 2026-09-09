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
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from '../notifications/notifications.service';

class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  maxAttendees?: number;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  lang?: 'tr-TR' | 'en-US' | 'de-DE';
}

class RsvpDto {
  @IsIn(['GOING', 'MAYBE', 'NOT_GOING'])
  status!: 'GOING' | 'MAYBE' | 'NOT_GOING';
}

@Controller('api/events')
export class EventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('upcoming') upcoming?: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const where: any = { tenantId: tenant.id };
    if (upcoming !== 'false') {
      where.startsAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      where.isCancelled = false;
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        rsvps: {
          where: { memberId: tenant.memberId },
          select: { status: true },
        },
      },
    });

    return {
      events: events.map((e) => ({
        ...e,
        myRsvp: e.rsvps[0]?.status || null,
        rsvps: undefined,
      })),
    };
  }

  @Get(':id')
  async getOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        rsvps: {
          include: {
            member: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event nicht gefunden');
    const myRsvp =
      event.rsvps.find((r) => r.memberId === tenant.memberId)?.status || null;
    return { ...event, myRsvp };
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEventDto) {
    const tenant = this.jwt.requireTenantContext(req);
    const startsAt = new Date(dto.startsAt);
    if (isNaN(startsAt.getTime())) {
      throw new BadRequestException('startsAt ungültig');
    }

    const event = await this.prisma.event.create({
      data: {
        tenantId: tenant.id,
        organizerId: tenant.memberId!,
        title: dto.title.trim(),
        description: dto.description.trim(),
        location: dto.location,
        startsAt,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        maxAttendees: dto.maxAttendees,
        lang: dto.lang || 'tr-TR',
      },
      include: {
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const members = await this.prisma.member.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        id: { not: tenant.memberId },
      },
      select: { id: true },
    });
    await this.notifications.notifyMany(
      tenant.id,
      members.map((m) => m.id),
      {
        type: 'event',
        title: 'Neue Veranstaltung',
        body: event.title,
        refType: 'event',
        refId: event.id,
      },
    );

    return { ...event, myRsvp: null };
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  async cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!event) throw new NotFoundException('Event nicht gefunden');
    const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'SUPER_ADMIN';
    if (event.organizerId !== tenant.memberId && !isAdmin) {
      throw new ForbiddenException('Keine Berechtigung');
    }
    return this.prisma.event.update({
      where: { id },
      data: { isCancelled: true },
    });
  }

  @Post(':id/rsvp')
  @HttpCode(200)
  async rsvp(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RsvpDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId: tenant.id, isCancelled: false },
    });
    if (!event) throw new NotFoundException('Event nicht gefunden');

    const existing = await this.prisma.eventRsvp.findUnique({
      where: {
        tenantId_eventId_memberId: {
          tenantId: tenant.id,
          eventId: id,
          memberId: tenant.memberId!,
        },
      },
    });

    const wasGoing = existing?.status === 'GOING';
    const willGoing = dto.status === 'GOING';

    if (
      willGoing &&
      !wasGoing &&
      event.maxAttendees &&
      event.rsvpCount >= event.maxAttendees
    ) {
      throw new BadRequestException('Event ist voll');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.eventRsvp.upsert({
        where: {
          tenantId_eventId_memberId: {
            tenantId: tenant.id,
            eventId: id,
            memberId: tenant.memberId!,
          },
        },
        create: {
          tenantId: tenant.id,
          eventId: id,
          memberId: tenant.memberId!,
          status: dto.status,
        },
        update: { status: dto.status },
      });
      let delta = 0;
      if (willGoing && !wasGoing) delta = 1;
      if (!willGoing && wasGoing) delta = -1;
      if (delta !== 0) {
        await tx.event.update({
          where: { id },
          data: { rsvpCount: { increment: delta } },
        });
      }
    });

    return { status: dto.status };
  }
}
