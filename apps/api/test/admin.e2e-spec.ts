import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsAdmin,
  bearer,
  MEMBER_AYSE,
} from './e2e-harness';

describe('E2E Admin', () => {
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

  it('forbids member access', async () => {
    const { token } = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .get('/api/admin/members')
      .set(bearer(token))
      .expect(403);
  });

  it('lists members, updates role, creates invite, audits, moderates', async () => {
    const admin = await authAsAdmin(ctx);
    const member = await authAsAyse(ctx);

    const members = await request(ctx.app.getHttpServer())
      .get('/api/admin/members')
      .set(bearer(admin.token))
      .expect(200);
    expect(members.body.total).toBeGreaterThanOrEqual(3);

    await request(ctx.app.getHttpServer())
      .patch(`/api/admin/members/${MEMBER_AYSE.id}`)
      .set(bearer(admin.token))
      .send({ role: 'ADMIN' })
      .expect(200);

    const invite = await request(ctx.app.getHttpServer())
      .post('/api/admin/invites')
      .set(bearer(admin.token))
      .send({ houseNumber: 'C-9' })
      .expect(201);
    expect(invite.body.code).toBeTruthy();

    const invites = await request(ctx.app.getHttpServer())
      .get('/api/admin/invites')
      .set(bearer(admin.token))
      .expect(200);
    expect(invites.body.invites.length).toBeGreaterThanOrEqual(1);

    const post = await request(ctx.app.getHttpServer())
      .post('/api/posts')
      .set(bearer(member.token))
      .send({ content: 'Moderate me' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/admin/posts/${post.body.id}/moderate`)
      .set(bearer(admin.token))
      .send({ isHidden: true, hiddenReason: 'spam', isPinned: false })
      .expect(200);

    const audit = await request(ctx.app.getHttpServer())
      .get('/api/admin/audit')
      .set(bearer(admin.token))
      .expect(200);
    expect(audit.body.logs.length).toBeGreaterThanOrEqual(1);

    const sos = await request(ctx.app.getHttpServer())
      .post('/api/emergency')
      .set(bearer(member.token))
      .send({ type: 'OTHER', title: 'SOS', message: 'help' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/api/emergency/${sos.body.id}/ack`)
      .set(bearer(member.token))
      .send({ status: 'SAFE' })
      .expect(200);

    const acks = await request(ctx.app.getHttpServer())
      .get(`/api/admin/emergency/${sos.body.id}/acks`)
      .set(bearer(admin.token))
      .expect(200);
    expect(acks.body.acks.length).toBeGreaterThanOrEqual(1);
  });
});
