import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type NotificationType = 'comment' | 'like' | 'dm' | 'event' | 'sos';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    tenantId: string;
    memberId: string;
    type: NotificationType;
    title: string;
    body: string;
    refType?: string;
    refId?: string;
  }) {
    // Don't notify yourself
    return this.prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        memberId: params.memberId,
        type: params.type,
        title: params.title,
        body: params.body,
        refType: params.refType,
        refId: params.refId,
      },
    });
  }

  async notifyMany(
    tenantId: string,
    memberIds: string[],
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      refType?: string;
      refId?: string;
    },
  ) {
    if (memberIds.length === 0) return { count: 0 };
    const data = memberIds.map((memberId) => ({
      tenantId,
      memberId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      refType: payload.refType,
      refId: payload.refId,
    }));
    return this.prisma.notification.createMany({ data });
  }

  async list(tenantId: string, memberId: string, limit = 30, offset = 0) {
    const where = { tenantId, memberId };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { notifications: items, total, unread, limit, offset };
  }

  async markRead(tenantId: string, memberId: string, id?: string) {
    if (id) {
      await this.prisma.notification.updateMany({
        where: { id, tenantId, memberId, readAt: null },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }
    await this.prisma.notification.updateMany({
      where: { tenantId, memberId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
