import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsMehmet,
  bearer,
} from './e2e-harness';

describe('E2E Notifications', () => {
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

  it('lists notifications and marks read', async () => {
    const a = await authAsAyse(ctx);
    const m = await authAsMehmet(ctx);

    const post = await request(ctx.app.getHttpServer())
      .post('/api/posts')
      .set(bearer(a.token))
      .send({ content: 'Notify me' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/like`)
      .set(bearer(m.token))
      .expect(200);

    const list = await request(ctx.app.getHttpServer())
      .get('/api/notifications')
      .set(bearer(a.token))
      .expect(200);

    expect(list.body.unread).toBeGreaterThanOrEqual(1);
    expect(list.body.notifications.length).toBeGreaterThanOrEqual(1);

    const id = list.body.notifications[0].id;
    await request(ctx.app.getHttpServer())
      .patch(`/api/notifications/${id}/read`)
      .set(bearer(a.token))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set(bearer(a.token))
      .expect(200);

    const after = await request(ctx.app.getHttpServer())
      .get('/api/notifications')
      .set(bearer(a.token))
      .expect(200);
    expect(after.body.unread).toBe(0);
  });
});
