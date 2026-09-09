import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  tenantHeaders,
  USER_AYSE,
  TENANT,
} from './e2e-harness';

describe('E2E Auth', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    resetAuthStores();
    ctx.prisma.__reset();
  });

  it('send-otp + verify-otp returns JWT and member', async () => {
    const send = await request(ctx.app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone: USER_AYSE.phone })
      .expect(200);

    expect(send.body.sent).toBe(true);
    expect(send.body.debugOtp).toMatch(/^\d{6}$/);

    const verify = await request(ctx.app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phone: USER_AYSE.phone, code: send.body.debugOtp })
      .expect(200);

    expect(verify.body.token).toBeTruthy();
    expect(verify.body.user.id).toBe(USER_AYSE.id);
    expect(verify.body.member.tenantId).toBe(TENANT.id);

    const payload = await ctx.jwt.verifyAsync(verify.body.token);
    expect(payload.sub).toBe(USER_AYSE.id);
    expect(payload.tid).toBe(TENANT.id);
  });

  it('rejects invalid OTP', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone: USER_AYSE.phone })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phone: USER_AYSE.phone, code: '000000' })
      .expect(401);
  });

  it('rejects invalid phone format', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone: '05551234567' })
      .expect(400);
  });

  it('onboards unknown phone', async () => {
    const phone = '+905559999999';
    const send = await request(ctx.app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone, locale: 'de-DE' })
      .expect(200);

    expect(ctx.prisma.user.create).toHaveBeenCalled();

    await request(ctx.app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ phone, code: send.body.debugOtp })
      .expect(200);
  });

  it('rate-limits OTP after 3 requests', async () => {
    for (let i = 0; i < 3; i++) {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: USER_AYSE.phone })
        .expect(200);
    }
    await request(ctx.app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone: USER_AYSE.phone })
      .expect(429);
  });

  it('passkey status requires auth', async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/auth/passkey/status')
      .set(tenantHeaders())
      .expect(401);
  });
});
