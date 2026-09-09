import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsMehmet,
  bearer,
  MEMBER_MEHMET,
} from './e2e-harness';

describe('E2E Messages', () => {
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

  it('starts DM, sends message, lists conversations, marks read', async () => {
    const a = await authAsAyse(ctx);
    const m = await authAsMehmet(ctx);

    const start = await request(ctx.app.getHttpServer())
      .post('/api/messages/conversations')
      .set(bearer(a.token))
      .send({ memberId: MEMBER_MEHMET.id })
      .expect(201);

    expect(start.body.id).toBeTruthy();
    const convId = start.body.id;

    // idempotent re-open
    const again = await request(ctx.app.getHttpServer())
      .post('/api/messages/conversations')
      .set(bearer(a.token))
      .send({ memberId: MEMBER_MEHMET.id })
      .expect(201);
    expect(again.body.id).toBe(convId);
    expect(again.body.created).toBe(false);

    await request(ctx.app.getHttpServer())
      .post(`/api/messages/conversations/${convId}`)
      .set(bearer(a.token))
      .send({ content: 'Merhaba Mehmet' })
      .expect(201);

    const msgs = await request(ctx.app.getHttpServer())
      .get(`/api/messages/conversations/${convId}`)
      .set(bearer(m.token))
      .expect(200);
    expect(msgs.body.messages).toHaveLength(1);
    expect(msgs.body.messages[0].content).toBe('Merhaba Mehmet');

    const list = await request(ctx.app.getHttpServer())
      .get('/api/messages/conversations')
      .set(bearer(m.token))
      .expect(200);
    expect(list.body.conversations.some((c: any) => c.id === convId)).toBe(true);

    await request(ctx.app.getHttpServer())
      .patch(`/api/messages/conversations/${convId}/read`)
      .set(bearer(m.token))
      .expect(200);

    expect(ctx.prisma.__store.notifications.some((n: any) => n.type === 'dm')).toBe(
      true,
    );
  });

  it('forbids DM with self', async () => {
    const a = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/messages/conversations')
      .set(bearer(a.token))
      .send({ memberId: a.body.member.id })
      .expect(400);
  });
});
