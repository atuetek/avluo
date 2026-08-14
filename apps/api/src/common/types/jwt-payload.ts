// JwtPayload – Form der JWT-Claims in Avluo
//
// Wird vom Auth-Endpoint signiert und von Middleware/Controller verifiziert.

export interface JwtPayload {
  sub: string; // userId
  tid: string; // tenantId
  role?: 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUARD';
  iat?: number;
  exp?: number;
}