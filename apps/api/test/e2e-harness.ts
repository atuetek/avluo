import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMemoryStore } from './memory-prisma';
import { TENANT, USER_ADMIN, USER_AYSE, USER_MEHMET, MEMBER_ADMIN, MEMBER_AYSE, MEMBER_MEHMET } from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { otpStore, rateLimitStore } = require('../src/modules/auth/auth.controller');

export type E2EContext = {
  app: INestApplication;
  prisma: ReturnType<typeof createMemoryStore>;
  jwt: JwtService;
};

export async function createE2EApp(): Promise<E2EContext> {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret-32-chars-minimum!!';
  process.env.DEFAULT_TENANT_ID = TENANT.id;
  process.env.NODE_ENV = 'test';

  const prisma = createMemoryStore();

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  const jwt = moduleRef.get(JwtService);
  return { app, prisma, jwt };
}

export function resetAuthStores() {
  otpStore.clear();
  rateLimitStore.clear();
}

export function tenantHeaders(extra: Record<string, string> = {}) {
  return { 'x-dev-tenant': TENANT.slug, ...extra };
}

export async function loginAs(
  ctx: E2EContext,
  phone: string,
): Promise<{ token: string; body: any }> {
  const send = await request(ctx.app.getHttpServer())
    .post('/api/auth/send-otp')
    .set(tenantHeaders())
    .send({ phone })
    .expect(200);

  const code = send.body.debugOtp;
  const verify = await request(ctx.app.getHttpServer())
    .post('/api/auth/verify-otp')
    .set(tenantHeaders())
    .send({ phone, code })
    .expect(200);

  return { token: verify.body.token, body: verify.body };
}

export async function authAsAdmin(ctx: E2EContext) {
  return loginAs(ctx, USER_ADMIN.phone);
}

export async function authAsAyse(ctx: E2EContext) {
  return loginAs(ctx, USER_AYSE.phone);
}

export async function authAsMehmet(ctx: E2EContext) {
  return loginAs(ctx, USER_MEHMET.phone);
}

export function bearer(token: string) {
  return {
    ...tenantHeaders(),
    Authorization: `Bearer ${token}`,
  };
}

export {
  TENANT,
  USER_ADMIN,
  USER_AYSE,
  USER_MEHMET,
  MEMBER_ADMIN,
  MEMBER_AYSE,
  MEMBER_MEHMET,
};
