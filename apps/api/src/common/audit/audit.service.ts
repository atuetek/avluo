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
    // TODO: Phase 2 - in Audit-Log-Tabelle schreiben
    // Phase 1: console.log reicht
    if (process.env.NODE_ENV !== 'test') {
      console.log('[AUDIT]', JSON.stringify({
        ...params,
        timestamp: new Date().toISOString(),
      }));
    }
  }
}
