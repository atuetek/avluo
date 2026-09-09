import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsAdmin,
  bearer,
} from './e2e-harness';

describe('E2E Events', () => {
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

  it('creates event, lists, RSVPs, cancels', async () => {
    const { token } = await authAsAyse(ctx);
    const startsAt = new Date(Date.now() + 86400000).toISOString();

    const created = await request(ctx.app.getHttpServer())
      .post('/api/events')
      .set(bearer(token))
      .send({
        title: 'Nachbarschaftsfest',
        description: 'Im Innenhof',
        location: 'Hof',
        startsAt,
      })
      .expect(201);

    expect(created.body.title).toBe('Nachbarschaftsfest');
    expect(ctx.prisma.__store.notifications.some((n: any) => n.type === 'event')).toBe(
      true,
    );

    const list = await request(ctx.app.getHttpServer())
      .get('/api/events')
      .set(bearer(token))
      .expect(200);
    expect(list.body.events.length).toBeGreaterThanOrEqual(1);

    const one = await request(ctx.app.getHttpServer())
      .get(`/api/events/${created.body.id}`)
      .set(bearer(token))
      .expect(200);
    expect(one.body.id).toBe(created.body.id);

    await request(ctx.app.getHttpServer())
      .post(`/api/events/${created.body.id}/rsvp`)
      .set(bearer(token))
      .send({ status: 'GOING' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`/api/events/${created.body.id}/rsvp`)
      .set(bearer(token))
      .send({ status: 'MAYBE' })
      .expect(200);

    const admin = await authAsAdmin(ctx);
    await request(ctx.app.getHttpServer())
      .patch(`/api/events/${created.body.id}/cancel`)
      .set(bearer(admin.token))
      .expect(200);
  });

  it('rejects invalid RSVP status', async () => {
    const { token } = await authAsAyse(ctx);
    const created = await request(ctx.app.getHttpServer())
      .post('/api/events')
      .set(bearer(token))
      .send({
        title: 'Test',
        description: 'x',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/events/${created.body.id}/rsvp`)
      .set(bearer(token))
      .send({ status: 'YES' })
      .expect(400);
  });
});
