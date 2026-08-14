// AuthenticatedRequest: Express-Request mit Tenant-Context (von TenantMiddleware gesetzt)
// und User-Context (von JWT)

import { Request } from 'express';
import { MemberRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    name: string;
    plan: 'FREE' | 'STANDARD' | 'PREMIUM';
    defaultLang: string;
    memberId?: string;
    role?: MemberRole;
  };
  userId?: string;
}