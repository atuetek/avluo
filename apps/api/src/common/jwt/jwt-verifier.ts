// JwtVerifier – Helper zum Verifizieren von JWT-Tokens aus dem Request
//
// Wird vom MembersController (und später PostsController, MessagesController, etc.)
// benutzt um die JWT-Claims aus dem Authorization-Header zu lesen.

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtPayload } from '../types/jwt-payload';

@Injectable()
export class JwtVerifier {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Liest JWT aus Authorization-Header und gibt Payload zurück.
   *
   * @throws UnauthorizedException wenn kein Header
   * @throws UnauthorizedException wenn Token ungültig/abgelaufen
   */
  async verifyFromRequest(req: AuthenticatedRequest): Promise<JwtPayload> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein Authorization-Header.');
    }
    const token = auth.slice(7);

    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen.');
    }
  }

  /**
   * Stellt sicher, dass req.tenant (von TenantMiddleware) gesetzt ist
   * UND dass ein Member eingeloggt ist.
   */
  requireTenantContext(req: AuthenticatedRequest) {
    if (!req.tenant?.id) {
      throw new BadRequestException('Tenant-Context fehlt.');
    }
    if (!req.tenant.memberId) {
      throw new BadRequestException(
        'Member-Context fehlt. Du bist nicht eingeloggt.',
      );
    }
    return req.tenant;
  }
}