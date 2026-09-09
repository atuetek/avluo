import request from 'supertest';
import { createE2EApp, E2EContext, resetAuthStores } from './e2e-harness';

describe('E2E Health', () => {
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

  it('GET /health', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('avluo-api');
  });

  it('GET /health/live', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.database).toBe('connected');
  });

  it('GET /health/db', async () => {
    await request(ctx.app.getHttpServer()).get('/health/db').expect(200);
  });
});
