import request from 'supertest';
import {
  createE2EApp,
  E2EContext,
  resetAuthStores,
  authAsAyse,
  authAsMehmet,
  authAsAdmin,
  bearer,
  MEMBER_AYSE,
} from './e2e-harness';

describe('E2E Posts', () => {
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

  async function createPost(token: string, content = 'Merhaba Yeşiltepe') {
    return request(ctx.app.getHttpServer())
      .post('/api/posts')
      .set(bearer(token))
      .send({ content })
      .expect(201);
  }

  it('creates, lists, gets post', async () => {
    const { token } = await authAsAyse(ctx);
    const created = await createPost(token);
    expect(created.body.content).toBe('Merhaba Yeşiltepe');
    expect(created.body.authorId).toBe(MEMBER_AYSE.id);

    const list = await request(ctx.app.getHttpServer())
      .get('/api/posts')
      .set(bearer(token))
      .expect(200);
    expect(list.body.posts.length).toBeGreaterThanOrEqual(1);

    const one = await request(ctx.app.getHttpServer())
      .get(`/api/posts/${created.body.id}`)
      .set(bearer(token))
      .expect(200);
    expect(one.body.id).toBe(created.body.id);
  });

  it('supports since polling filter', async () => {
    const { token } = await authAsAyse(ctx);
    await createPost(token, 'old');
    const since = new Date(Date.now() + 1000).toISOString();
    const res = await request(ctx.app.getHttpServer())
      .get('/api/posts')
      .query({ since })
      .set(bearer(token))
      .expect(200);
    expect(res.body.posts).toHaveLength(0);
  });

  it('likes and unlikes', async () => {
    const { token } = await authAsAyse(ctx);
    const post = await createPost(token);
    const like = await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/like`)
      .set(bearer(token))
      .expect(200);
    expect(like.body.liked).toBe(true);

    const unlike = await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/like`)
      .set(bearer(token))
      .expect(200);
    expect(unlike.body.liked).toBe(false);
  });

  it('comments and lists comments', async () => {
    const a = await authAsAyse(ctx);
    const m = await authAsMehmet(ctx);
    const post = await createPost(a.token);
    await request(ctx.app.getHttpServer())
      .post(`/api/posts/${post.body.id}/comments`)
      .set(bearer(m.token))
      .send({ content: 'Selam!' })
      .expect(201);

    const comments = await request(ctx.app.getHttpServer())
      .get(`/api/posts/${post.body.id}/comments`)
      .set(bearer(a.token))
      .expect(200);
    expect(comments.body.comments).toHaveLength(1);
    expect(ctx.prisma.__store.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it('author soft-deletes own post', async () => {
    const { token } = await authAsAyse(ctx);
    const post = await createPost(token);
    await request(ctx.app.getHttpServer())
      .delete(`/api/posts/${post.body.id}`)
      .set(bearer(token))
      .expect(200);

    const list = await request(ctx.app.getHttpServer())
      .get('/api/posts')
      .set(bearer(token))
      .expect(200);
    expect(list.body.posts.find((p: any) => p.id === post.body.id)).toBeFalsy();
  });

  it('admin can pin/hide via PATCH', async () => {
    const member = await authAsAyse(ctx);
    const admin = await authAsAdmin(ctx);
    const post = await createPost(member.token);

    const patched = await request(ctx.app.getHttpServer())
      .patch(`/api/posts/${post.body.id}`)
      .set(bearer(admin.token))
      .send({ isPinned: true, isAnnouncement: true })
      .expect(200);
    expect(patched.body.isPinned).toBe(true);
  });

  it('rejects empty content', async () => {
    const { token } = await authAsAyse(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/posts')
      .set(bearer(token))
      .send({ content: '' })
      .expect(400);
  });
});
