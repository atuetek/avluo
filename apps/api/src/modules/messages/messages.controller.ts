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
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from '../notifications/notifications.service';

class StartDmDto {
  @IsUUID()
  memberId!: string;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  lang?: 'tr-TR' | 'en-US' | 'de-DE';
}

@Controller('api/messages')
export class MessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('conversations')
  async listConversations(@Req() req: AuthenticatedRequest) {
    const tenant = this.jwt.requireTenantContext(req);
    const memberships = await this.prisma.memberConversation.findMany({
      where: { memberId: tenant.memberId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                member: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                    houseNumber: true,
                  },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    return {
      conversations: memberships
        .filter((m) => m.conversation.tenantId === tenant.id)
        .filter((m) => m.conversation.type === 'DIRECT')
        .map((m) => {
          const other = m.conversation.members.find(
            (x) => x.memberId !== tenant.memberId,
          )?.member;
          const last = m.conversation.messages[0] || null;
          const unread =
            last &&
            (!m.lastReadAt || last.createdAt > m.lastReadAt) &&
            last.senderId !== tenant.memberId;
          return {
            id: m.conversation.id,
            type: m.conversation.type,
            lastMessageAt: m.conversation.lastMessageAt,
            lastMessage: last,
            otherMember: other,
            lastReadAt: m.lastReadAt,
            unread: !!unread,
          };
        }),
    };
  }

  @Post('conversations')
  async startOrGet(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartDmDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    if (dto.memberId === tenant.memberId) {
      throw new BadRequestException('Keine DM mit sich selbst');
    }

    const other = await this.prisma.member.findFirst({
      where: {
        id: dto.memberId,
        tenantId: tenant.id,
        isActive: true,
      },
    });
    if (!other) throw new NotFoundException('Mitglied nicht gefunden');

    // Find existing DIRECT conversation between the two
    const existing = await this.prisma.conversation.findMany({
      where: {
        tenantId: tenant.id,
        type: 'DIRECT',
        members: { some: { memberId: tenant.memberId } },
      },
      include: { members: true },
    });
    const match = existing.find((c) => {
      const ids = c.members.map((m) => m.memberId).sort();
      const want = [tenant.memberId!, dto.memberId].sort();
      return ids.length === 2 && ids[0] === want[0] && ids[1] === want[1];
    });
    if (match) return { id: match.id, created: false };

    const created = await this.prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        type: 'DIRECT',
        members: {
          create: [
            { memberId: tenant.memberId! },
            { memberId: dto.memberId },
          ],
        },
      },
    });
    return { id: created.id, created: true };
  }

  @Get('conversations/:id')
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('since') since?: string,
    @Query('limit') limitStr?: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    await this.requireMembership(id, tenant);
    const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 100);
    const where: any = {
      tenantId: tenant.id,
      conversationId: id,
      isDeleted: false,
    };
    if (since) {
      const d = new Date(since);
      if (isNaN(d.getTime())) throw new BadRequestException('since ungültig');
      where.createdAt = { gt: d };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    return { messages };
  }

  @Post('conversations/:id')
  async send(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const membership = await this.requireMembership(id, tenant);

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          tenantId: tenant.id,
          conversationId: id,
          senderId: tenant.memberId!,
          content: dto.content.trim(),
          lang: dto.lang || 'tr-TR',
        },
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });
      await tx.conversation.update({
        where: { id },
        data: { lastMessageAt: msg.createdAt },
      });
      await tx.memberConversation.update({
        where: { id: membership.id },
        data: { lastReadAt: msg.createdAt },
      });
      return msg;
    });

    const peers = await this.prisma.memberConversation.findMany({
      where: { conversationId: id, memberId: { not: tenant.memberId } },
    });
    const me = await this.prisma.member.findUnique({
      where: { id: tenant.memberId },
    });
    await this.notifications.notifyMany(
      tenant.id,
      peers.map((p) => p.memberId),
      {
        type: 'dm',
        title: 'Neue Nachricht',
        body: `${me?.displayName || 'Jemand'}: ${dto.content.slice(0, 80)}`,
        refType: 'conversation',
        refId: id,
      },
    );

    return message;
  }

  @Patch('conversations/:id/read')
  @HttpCode(200)
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const membership = await this.requireMembership(id, tenant);
    await this.prisma.memberConversation.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  private async requireMembership(
    conversationId: string,
    tenant: { id: string; memberId?: string },
  ) {
    const membership = await this.prisma.memberConversation.findFirst({
      where: { conversationId, memberId: tenant.memberId },
      include: { conversation: true },
    });
    if (
      !membership ||
      membership.conversation.tenantId !== tenant.id ||
      membership.conversation.type !== 'DIRECT'
    ) {
      throw new ForbiddenException('Kein Zugriff auf diese Conversation');
    }
    return membership;
  }
}
