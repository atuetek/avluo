import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsMehmet,
  authAsAdmin,
  bearer,
} from './e2e-harness';

describe('E2E Emergency', () => {
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

  it('creates SOS, lists active, acks SAFE/NEED_HELP, admin resolves', async () => {
    const a = await authAsAyse(ctx);
    const m = await authAsMehmet(ctx);
    const admin = await authAsAdmin(ctx);

    const created = await request(ctx.app.getHttpServer())
      .post('/api/emergency')
      .set(bearer(a.token))
      .send({
        type: 'FIRE',
        severity: 'CRITICAL',
        title: 'Feuer Block A',
        message: 'Rauch im Treppenhaus',
        location: 'A-Eingang',
      })
      .expect(201);

    expect(created.body.type).toBe('FIRE');
    expect(created.body.recipients).toBeGreaterThanOrEqual(3);
    expect(ctx.prisma.__store.notifications.some((n: any) => n.type === 'sos')).toBe(
      true,
    );

    const list = await request(ctx.app.getHttpServer())
      .get('/api/emergency')
      .set(bearer(m.token))
      .expect(200);
    expect(list.body.alerts.some((x: any) => x.id === created.body.id)).toBe(true);

    await request(ctx.app.getHttpServer())
      .post(`/api/emergency/${created.body.id}/ack`)
      .set(bearer(m.token))
      .send({ status: 'SAFE' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`/api/emergency/${created.body.id}/ack`)
      .set(bearer(a.token))
      .send({ status: 'NEED_HELP', note: '3. Stock' })
      .expect(200);

    const detail = await request(ctx.app.getHttpServer())
      .get(`/api/emergency/${created.body.id}`)
      .set(bearer(admin.token))
      .expect(200);
    expect(detail.body.acks.length).toBeGreaterThanOrEqual(2);

    await request(ctx.app.getHttpServer())
      .patch(`/api/emergency/${created.body.id}/resolve`)
      .set(bearer(admin.token))
      .expect(200);
  });

  it('member cannot resolve', async () => {
    const a = await authAsAyse(ctx);
    const created = await request(ctx.app.getHttpServer())
      .post('/api/emergency')
      .set(bearer(a.token))
      .send({
        type: 'OTHER',
        title: 'Test',
        message: 'x',
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .patch(`/api/emergency/${created.body.id}/resolve`)
      .set(bearer(a.token))
      .expect(403);
  });
});
