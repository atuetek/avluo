// src/prisma/prisma.service.ts
//
// Erweitert PrismaService um RLS-Support: Jede Query läuft in einer
// Transaction, die SET LOCAL app.tenant_id aufruft.
//
// Wiederverwendbar mit organize4u / sm-display (gleicher Pattern).

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantStore {
  tenantId: string;
  userId?: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // AsyncLocalStorage: Jeder Request hat eigenen Tenant-Kontext
  private readonly tenantStorage = new AsyncLocalStorage<TenantStore>();

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Führe eine Operation im Tenant-Kontext aus.
   * SET LOCAL app.tenant_id wird automatisch in einer Transaction gesetzt.
   */
  async withTenant<T>(
    tenantId: string,
    userId: string | undefined,
    operation: (tx: Omit<this, '$connect' | '$disconnect'>) => Promise<T>,
  ): Promise<T> {
    return this.tenantStorage.run({ tenantId, userId }, async () => {
      return this.$transaction(async (tx) => {
        // SET LOCAL gilt nur für die Dauer dieser Transaction
        await tx.$executeRawUnsafe(
          `SET LOCAL app.tenant_id = '${tenantId}';`,
        );
        if (userId) {
          await tx.$executeRawUnsafe(
            `SET LOCAL app.user_id = '${userId}';`,
          );
        }
        return operation(tx as any);
      });
    });
  }

  /**
   * Platform-weite Operationen (kein Tenant-Kontext).
   * NUR für: Signup, Tenant-Onboarding, Billing, Analytics-Aggregation.
   */
  async withPlatform<T>(
    operation: (tx: Omit<this, '$connect' | '$disconnect'>) => Promise<T>,
  ): Promise<T> {
    return this.tenantStorage.run({ tenantId: '', userId: undefined }, async () => {
      return this.$transaction(async (tx) => {
        // tenant_id bleibt NULL → RLS-Policies erlauben nur platform-weite Tabellen
        await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '';`);
        return operation(tx as any);
      });
    });
  }

  /**
   * Aktueller Tenant-Kontext (für Logging, etc.)
   */
  getCurrentTenantId(): string | undefined {
    return this.tenantStorage.getStore()?.tenantId || undefined;
  }
}
