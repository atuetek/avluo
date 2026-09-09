import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — process is up (K8s livenessProbe) */
  @Get('live')
  live() {
    return { status: 'ok', service: 'avluo-api' };
  }

  /** Readiness — DB reachable (K8s readinessProbe) */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (err) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        error: String(err),
      });
    }
  }

  @Get()
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'avluo-api',
    };
  }

  @Get('db')
  async dbHealth() {
    return this.ready();
  }
}
