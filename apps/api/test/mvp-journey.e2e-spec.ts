/**
 * Full MVP happy-path journey across modules (single session narrative).
 */
import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsMehmet,
  authAsAdmin,
  bearer,
  MEMBER_MEHMET,
} from './e2e-harness';

describe('E2E MVP Journey', () => {
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

  it('covers auth → post → social → dm → event → sos → admin', async () => {
    await request(ctx.app.getHttpServer()).get('/health/ready').expect(200);

    const ayse = await authAsAyse(ctx);
    const mehmet = await authAsMehmet(ctx);
    const admin = await authAsAdmin(ctx);

    // Profile
    await request(ctx.app.getHttpServer())
      .patch('/api/members/me')
      .set(bearer(ayse.token))
      .send({ displayName: 'Ayşe Journey' })
      .expect(200);

    // Search
    const search = await request(ctx.app.getHttpServer())
      .get('/api/members')
      .query({ q: 'Mehmet' })
      .set(bearer(ayse.token))
      .expect(200);
    expect(search.body.members[0].id).toBe(MEMBER_MEHMET.id);

    // Post + engage
    const post = await request(ctx.app.getHttpServer())
      .post('/api/posts')
      .set(bearer(ayse.token))
      .send({ content: 'Journey post' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/like`)
      .set(bearer(mehmet.token))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/comments`)
      .set(bearer(mehmet.token))
      .send({ content: 'Nice!' })
      .expect(201);

    // DM
    const dm = await request(ctx.app.getHttpServer())
      .post('/api/messages/conversations')
      .set(bearer(ayse.token))
      .send({ memberId: MEMBER_MEHMET.id })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/messages/conversations/${dm.body.id}`)
      .set(bearer(ayse.token))
      .send({ content: 'Hallo!' })
      .expect(201);

    // Event + RSVP
    const event = await request(ctx.app.getHttpServer())
      .post('/api/events')
      .set(bearer(admin.token))
      .send({
        title: 'Journey Event',
        description: 'Meet',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/events/${event.body.id}/rsvp`)
      .set(bearer(ayse.token))
      .send({ status: 'GOING' })
      .expect(200);

    // SOS + Ack
    const sos = await request(ctx.app.getHttpServer())
      .post('/api/emergency')
      .set(bearer(ayse.token))
      .send({
        type: 'EARTHQUAKE',
        title: 'Sarsıntı',
        message: 'Hissedildi',
        severity: 'HIGH',
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/emergency/${sos.body.id}/ack`)
      .set(bearer(mehmet.token))
      .send({ status: 'SAFE' })
      .expect(200);

    // Notifications for Ayşe
    const notif = await request(ctx.app.getHttpServer())
      .get('/api/notifications')
      .set(bearer(ayse.token))
      .expect(200);
    expect(notif.body.notifications.length).toBeGreaterThanOrEqual(1);

    // Admin
    await request(ctx.app.getHttpServer())
      .get(`/api/admin/emergency/${sos.body.id}/acks`)
      .set(bearer(admin.token))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post('/api/admin/invites')
      .set(bearer(admin.token))
      .send({ houseNumber: 'Z-1' })
      .expect(201);
  });
});
