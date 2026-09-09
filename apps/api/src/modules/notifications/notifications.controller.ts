import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly jwt: JwtVerifier,
  ) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const limit = Math.min(parseInt(limitStr || '30', 10) || 30, 100);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);
    return this.notifications.list(
      tenant.id,
      tenant.memberId!,
      limit,
      offset,
    );
  }

  @Patch('read-all')
  @HttpCode(200)
  async markAllRead(@Req() req: AuthenticatedRequest) {
    const tenant = this.jwt.requireTenantContext(req);
    return this.notifications.markRead(tenant.id, tenant.memberId!);
  }

  @Patch(':id/read')
  @HttpCode(200)
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    if (!id) throw new BadRequestException('id erforderlich');
    return this.notifications.markRead(tenant.id, tenant.memberId!, id);
  }
}
