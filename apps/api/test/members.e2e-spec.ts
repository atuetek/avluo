import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsAdmin,
  bearer,
  MEMBER_AYSE,
  MEMBER_MEHMET,
} from './e2e-harness';

describe('E2E Members', () => {
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

  it('GET /api/members/me', async () => {
    const { token } = await authAsAyse(ctx);
    const res = await request(ctx.app.getHttpServer())
      .get('/api/members/me')
      .set(bearer(token))
      .expect(200);
    expect(res.body.id).toBe(MEMBER_AYSE.id);
    expect(res.body.displayName).toBe('Ayşe Yılmaz');
  });

  it('GET /api/members lists tenant members', async () => {
    const { token } = await authAsAyse(ctx);
    const res = await request(ctx.app.getHttpServer())
      .get('/api/members')
      .set(bearer(token))
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.members.every((m: any) => m.tenantId === MEMBER_AYSE.tenantId)).toBe(
      true,
    );
  });

  it('GET /api/members?q= searches by name', async () => {
    const { token } = await authAsAyse(ctx);
    const res = await request(ctx.app.getHttpServer())
      .get('/api/members')
      .query({ q: 'Mehmet' })
      .set(bearer(token))
      .expect(200);
    expect(res.body.members.some((m: any) => m.id === MEMBER_MEHMET.id)).toBe(true);
  });

  it('GET /api/members?blockName= filters block', async () => {
    const { token } = await authAsAyse(ctx);
    const res = await request(ctx.app.getHttpServer())
      .get('/api/members')
      .query({ blockName: 'Block B' })
      .set(bearer(token))
      .expect(200);
    expect(res.body.members.every((m: any) => m.blockName === 'Block B')).toBe(true);
  });

  it('PATCH /api/members/me updates profile', async () => {
    const { token } = await authAsAyse(ctx);
    const res = await request(ctx.app.getHttpServer())
      .patch('/api/members/me')
      .set(bearer(token))
      .send({ displayName: 'Ayşe Updated', preferredLang: 'de-DE' })
      .expect(200);
    expect(res.body.displayName).toBe('Ayşe Updated');
    expect(res.body.preferredLang).toBe('de-DE');
  });

  it('PATCH rejects role escalation', async () => {
    const { token } = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .patch('/api/members/me')
      .set(bearer(token))
      .send({ role: 'ADMIN' })
      .expect(400);
  });

  it('requires auth', async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/members/me')
      .set({ 'x-dev-tenant': 'yesiltepe' })
      .expect(401);
  });
});
