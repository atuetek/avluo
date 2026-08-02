import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (err) {
      return { status: 'error', database: 'disconnected', error: String(err) };
    }
  }
}
