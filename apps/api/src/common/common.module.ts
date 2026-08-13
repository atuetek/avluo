// CommonModule: Stellt PrismaService + AuditService für alle Feature-Module bereit
//
// Vorher war PrismaService nur in AppModule registriert. Feature-Module wie AuthModule
// sahen den Service nicht und konnten ihn nicht injecten. CommonModule löst das.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class CommonModule {}