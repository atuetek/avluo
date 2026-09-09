import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  bearer,
  TENANT,
} from './e2e-harness';
import { OTHER_TENANT, MEMBER_OTHER } from './fixtures';

describe('E2E Tenant Isolation', () => {
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

  it('rejects JWT issued for other tenant on yesiltepe host', async () => {
    const { token } = await authAsAyse(ctx);

    // Craft token for OTHER tenant but call yesiltepe
    const badToken = await ctx.jwt.signAsync({
      sub: MEMBER_OTHER.userId,
      tid: OTHER_TENANT.id,
      role: 'MEMBER',
    });

    await request(ctx.app.getHttpServer())
      .get('/api/members/me')
      .set({
        'x-dev-tenant': TENANT.slug,
        Authorization: `Bearer ${badToken}`,
      })
      .expect(403);
  });

  it('unknown tenant slug fails', async () => {
    const { token } = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .get('/api/posts')
      .set({
        'x-dev-tenant': 'does-not-exist',
        Authorization: `Bearer ${token}`,
      })
      .expect(400);
  });
});
