import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  bearer,
  tenantHeaders,
} from './e2e-harness';

describe('E2E Media', () => {
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

  it('rejects missing file', async () => {
    const { token } = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/media/upload')
      .set(bearer(token))
      .expect(400);
  });

  it('requires auth', async () => {
    // Ohne JWT liefert requireTenantContext 400 (Member-Context fehlt)
    await request(ctx.app.getHttpServer())
      .post('/api/media/upload')
      .set(tenantHeaders())
      .attach('file', Buffer.from('x'), 'x.txt')
      .expect(400);
  });
});
