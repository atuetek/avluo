// src/common/tenant/tenant.middleware.ts
//
// Phase 1 (Szenario A): Multi-Tenant-Isolation auf HTTP-Layer
//
// Verantwortlich für:
// 1. Subdomain → tenant_id Resolution
// 2. JWT-Validierung mit tenant_id-Claim
// 3. PostgreSQL SET LOCAL app.tenant_id vor jedem Request
// 4. Audit-Log bei Cross-Tenant-Versuchen
//
// NICHT zuständig für:
// - Auth (kommt von AuthMiddleware davor)
// - Permission-Checks (kommt in den Guards)

import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  plan: 'FREE' | 'STANDARD' | 'PREMIUM';
  defaultLang: string;
  memberId?: string; // current user's membership in this tenant
  role?: 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUARD';
}

// Express-Request erweitern
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      userId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // ========================================
    // 1. Subdomain extrahieren
    // ========================================
    const tenantSlug = this.extractSubdomain(req);
    if (!tenantSlug) {
      throw new BadRequestException(
        'Subdomain fehlt. Avluo muss via Subdomain aufgerufen werden (z.B. akici-mah.avluo.app).',
      );
    }

    // ========================================
    // 2. Tenant aus DB laden
    // ========================================
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        plan: true,
        defaultLang: true,
        status: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException(`Siedlung "${tenantSlug}" existiert nicht.`);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Diese Siedlung ist ${tenant.status.toLowerCase()}.`,
      );
    }

    // ========================================
    // 3. JWT validieren
    // ========================================
    const authHeader = req.headers.authorization;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      try {
        const payload = await this.jwt.verifyAsync<{
          sub: string;
          tid: string; // tenant_id im JWT
        }>(token);

        userId = payload.sub;

        // KRITISCH: tenant_id im JWT MUSS zur aufgerufenen Subdomain passen
        // → Verhindert Token-Reuse über Tenants hinweg
        if (payload.tid !== tenant.id) {
          await this.audit.log({
            tenantId: tenant.id,
            userId,
            action: 'auth.cross_tenant_token_reuse',
            metadata: {
              jwtTenantId: payload.tid,
              requestedTenant: tenant.id,
              jwtSubdomain: req.headers.host,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
          throw new ForbiddenException(
            'Token ist für eine andere Siedlung ausgestellt.',
          );
        }
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        throw new UnauthorizedException('Token ungültig oder abgelaufen.');
      }
    }

    // ========================================
    // 4. Member-Lookup (optional – nicht alle Endpoints brauchen Auth)
    // ========================================
    let memberContext: Pick<TenantContext, 'memberId' | 'role'> | undefined;

    if (userId) {
      const member = await this.prisma.member.findUnique({
        where: {
          tenantId_userId: { tenantId: tenant.id, userId },
        },
        select: { id: true, role: true, isActive: true },
      });

      if (member && !member.isActive) {
        throw new ForbiddenException(
          'Dein Konto in dieser Siedlung ist deaktiviert.',
        );
      }

      if (member) {
        memberContext = { memberId: member.id, role: member.role };
      }
    }

    // ========================================
    // 5. PostgreSQL: SET LOCAL app.tenant_id
    // ========================================
    // In NestJS mit Prisma: Wir nutzen eine Transaction oder
    // $extends mit RLS-Support. Hier: SET LOCAL auf Connection.
    //
    // WICHTIG: Prisma-Connection-Pooling verlangt, dass SET LOCAL
    // im selben Transaction-Block läuft wie die Query.
    // → Wird vom PrismaService via $transaction gehandhabt.

    // Markiere Request mit Tenant-Context für spätere Handler
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      defaultLang: tenant.defaultLang,
      ...memberContext,
    };
    req.userId = userId;

    next();
  }

  /**
   * Subdomain aus Host-Header extrahieren.
   *
   * Beispiele:
   *   akici-mah.avluo.app    → "akici-mah"
   *   akici-mah.localhost    → "akici-mah"
   *   avluo.app              → null (root, ungültig)
   *   localhost:3000         → null (dev fallback)
   */
  private extractSubdomain(req: Request): string | null {
    const host = req.headers.host || '';
    const hostname = host.split(':')[0]; // Port raus

    // Dev-Mode: localhost ohne Subdomain
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Dev: Subdomain via Custom-Header überschreibbar
      const devSubdomain = req.headers['x-dev-tenant'] as string;
      return devSubdomain || 'demo'; // Pilot-Tenant
    }

    // Production: akici-mah.avluo.app
    const parts = hostname.split('.');
    if (parts.length < 3) return null;

    const subdomain = parts[0];
    // Reservierte Subdomains ausschließen
    if (['www', 'api', 'admin', 'console', 'app'].includes(subdomain)) {
      return null;
    }

    return subdomain;
  }
}
