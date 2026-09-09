import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId?: string;
    userId?: string;
    action: string;
    resource?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        '[AUDIT]',
        JSON.stringify({ ...params, timestamp: new Date().toISOString() }),
      );
    }
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId || null,
          userId: params.userId || null,
          action: params.action,
          resource: params.resource || null,
          metadata: params.metadata ?? undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err) {
      // Never fail the request because of audit write
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[AUDIT] write failed', err);
      }
    }
  }
}
