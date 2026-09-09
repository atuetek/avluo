import { Page, Route } from '@playwright/test';
import { FIXTURES, FAKE_TOKEN } from './session';

type Json = Record<string, unknown> | unknown[];

async function json(route: Route, status: number, body: Json) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Intercepts Avluo API calls (default http://127.0.0.1:3000/api/**).
 * Stateful enough for MVP UI flows.
 */
export async function mockApi(page: Page) {
  const state = {
    posts: [] as any[],
    comments: {} as Record<string, any[]>,
    conversations: [] as any[],
    messages: {} as Record<string, any[]>,
    events: [] as any[],
    alerts: [] as any[],
    notifications: [
      {
        id: 'n1',
        type: 'like',
        title: 'Neuer Like',
        body: 'Jemand gefällt dein Beitrag',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ] as any[],
    members: [
      {
        id: FIXTURES.member.id,
        displayName: FIXTURES.member.displayName,
        houseNumber: 'A-2',
        blockName: 'Block A',
        role: 'MEMBER',
        isActive: true,
      },
      {
        id: FIXTURES.mehmet.id,
        displayName: FIXTURES.mehmet.displayName,
        houseNumber: FIXTURES.mehmet.houseNumber,
        blockName: FIXTURES.mehmet.blockName,
        role: 'MEMBER',
        isActive: true,
      },
      {
        id: FIXTURES.adminMember.id,
        displayName: FIXTURES.adminMember.displayName,
        houseNumber: 'A-1',
        blockName: 'Block A',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    ],
    invites: [] as any[],
    audit: [] as any[],
  };

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname.replace(/\/$/, '') || '/';
    let body: any = {};
    try {
      body = req.postDataJSON() || {};
    } catch {
      body = {};
    }

    // Auth
    if (method === 'POST' && path.endsWith('/api/auth/send-otp')) {
      return json(route, 200, { sent: true, debugOtp: '123456' });
    }
    if (method === 'POST' && path.endsWith('/api/auth/verify-otp')) {
      if (body.code !== '123456') {
        return json(route, 401, { message: 'OTP ungültig' });
      }
      const isAdmin = body.phone === FIXTURES.adminUser.phone;
      return json(route, 200, {
        token: FAKE_TOKEN,
        user: isAdmin ? FIXTURES.adminUser : FIXTURES.user,
        member: isAdmin ? FIXTURES.adminMember : FIXTURES.member,
      });
    }

    // Notifications
    if (method === 'GET' && path.endsWith('/api/notifications')) {
      const unread = state.notifications.filter((n) => !n.readAt).length;
      return json(route, 200, {
        notifications: state.notifications,
        total: state.notifications.length,
        unread,
      });
    }
    if (method === 'PATCH' && path.endsWith('/api/notifications/read-all')) {
      state.notifications = state.notifications.map((n) => ({
        ...n,
        readAt: new Date().toISOString(),
      }));
      return json(route, 200, { ok: true });
    }
    if (method === 'PATCH' && /\/api\/notifications\/[^/]+\/read$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      state.notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      );
      return json(route, 200, { ok: true });
    }

    // Posts
    if (method === 'GET' && path.endsWith('/api/posts')) {
      return json(route, 200, { posts: state.posts, limit: 20, offset: 0 });
    }
    if (method === 'POST' && path.endsWith('/api/posts')) {
      const post = {
        id: `post-${state.posts.length + 1}`,
        content: body.content,
        authorId: FIXTURES.member.id,
        author: {
          id: FIXTURES.member.id,
          displayName: FIXTURES.member.displayName,
          houseNumber: 'A-2',
          blockName: 'Block A',
        },
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        media: [],
      };
      state.posts.unshift(post);
      return json(route, 201, post);
    }
    if (method === 'POST' && /\/api\/posts\/[^/]+\/like$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      const post = state.posts.find((p) => p.id === id);
      if (post) {
        post.likedByMe = !post.likedByMe;
        post.likeCount += post.likedByMe ? 1 : -1;
        return json(route, 200, { liked: post.likedByMe });
      }
      return json(route, 404, { message: 'not found' });
    }
    if (method === 'GET' && /\/api\/posts\/[^/]+\/comments$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      return json(route, 200, { comments: state.comments[id] || [] });
    }
    if (method === 'POST' && /\/api\/posts\/[^/]+\/comments$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      const c = {
        id: `c-${Date.now()}`,
        content: body.content,
        author: { displayName: FIXTURES.member.displayName },
      };
      state.comments[id] = [...(state.comments[id] || []), c];
      const post = state.posts.find((p) => p.id === id);
      if (post) post.commentCount += 1;
      return json(route, 201, c);
    }
    if (method === 'DELETE' && /\/api\/posts\/[^/]+$/.test(path)) {
      const id = path.split('/').pop();
      state.posts = state.posts.filter((p) => p.id !== id);
      return json(route, 200, { ok: true });
    }

    // Members
    if (method === 'GET' && path.endsWith('/api/members/me')) {
      return json(route, 200, {
        ...FIXTURES.member,
        houseNumber: 'A-2',
        blockName: 'Block A',
      });
    }
    if (method === 'GET' && path.endsWith('/api/members')) {
      let list = state.members;
      const q = url.searchParams.get('q');
      if (q) {
        list = list.filter((m) =>
          String(m.displayName).toLowerCase().includes(q.toLowerCase()),
        );
      }
      return json(route, 200, { members: list });
    }
    if (method === 'PATCH' && path.endsWith('/api/members/me')) {
      return json(route, 200, { ...FIXTURES.member, ...body });
    }

    // Messages
    if (method === 'GET' && path.endsWith('/api/messages/conversations')) {
      return json(route, 200, { conversations: state.conversations });
    }
    if (method === 'POST' && path.endsWith('/api/messages/conversations')) {
      const existing = state.conversations.find(
        (c) => c.otherMember?.id === body.memberId,
      );
      if (existing) return json(route, 201, { id: existing.id, created: false });
      const id = `conv-${state.conversations.length + 1}`;
      const other =
        state.members.find((m) => m.id === body.memberId) || FIXTURES.mehmet;
      state.conversations.unshift({
        id,
        type: 'DIRECT',
        otherMember: other,
        lastMessage: null,
        unread: false,
      });
      state.messages[id] = [];
      return json(route, 201, { id, created: true });
    }
    if (method === 'GET' && /\/api\/messages\/conversations\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()!;
      return json(route, 200, { messages: state.messages[id] || [] });
    }
    if (method === 'POST' && /\/api\/messages\/conversations\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()!;
      const msg = {
        id: `m-${Date.now()}`,
        content: body.content,
        senderId: FIXTURES.member.id,
        sender: { displayName: FIXTURES.member.displayName },
        createdAt: new Date().toISOString(),
      };
      state.messages[id] = [...(state.messages[id] || []), msg];
      const conv = state.conversations.find((c) => c.id === id);
      if (conv) conv.lastMessage = msg;
      return json(route, 201, msg);
    }
    if (method === 'PATCH' && /\/api\/messages\/conversations\/[^/]+\/read$/.test(path)) {
      return json(route, 200, { ok: true });
    }

    // Events
    if (method === 'GET' && path.endsWith('/api/events')) {
      return json(route, 200, { events: state.events });
    }
    if (method === 'POST' && path.endsWith('/api/events')) {
      const ev = {
        id: `ev-${state.events.length + 1}`,
        title: body.title,
        description: body.description,
        location: body.location,
        startsAt: body.startsAt,
        myRsvp: null,
        organizer: { displayName: FIXTURES.member.displayName },
      };
      state.events.push(ev);
      return json(route, 201, ev);
    }
    if (method === 'POST' && /\/api\/events\/[^/]+\/rsvp$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      const ev = state.events.find((e) => e.id === id);
      if (ev) ev.myRsvp = body.status;
      return json(route, 200, { status: body.status });
    }

    // Emergency
    if (method === 'GET' && path.endsWith('/api/emergency')) {
      return json(route, 200, { alerts: state.alerts });
    }
    if (method === 'POST' && path.endsWith('/api/emergency')) {
      const alert = {
        id: `sos-${state.alerts.length + 1}`,
        type: body.type,
        title: body.title,
        message: body.message,
        location: body.location,
        severity: body.severity || 'HIGH',
        myAck: null,
        triggeredByMember: { displayName: FIXTURES.member.displayName },
        createdAt: new Date().toISOString(),
      };
      state.alerts.unshift(alert);
      return json(route, 201, { ...alert, recipients: 3 });
    }
    if (method === 'POST' && /\/api\/emergency\/[^/]+\/ack$/.test(path)) {
      const id = path.split('/').slice(-2)[0];
      const alert = state.alerts.find((a) => a.id === id);
      if (alert) alert.myAck = { status: body.status, note: body.note };
      return json(route, 200, { status: body.status });
    }

    // Admin
    if (method === 'GET' && path.endsWith('/api/admin/members')) {
      return json(route, 200, { members: state.members, total: state.members.length });
    }
    if (method === 'PATCH' && /\/api\/admin\/members\/[^/]+$/.test(path)) {
      const id = path.split('/').pop();
      const m = state.members.find((x) => x.id === id);
      if (m) Object.assign(m, body);
      return json(route, 200, m || {});
    }
    if (method === 'GET' && path.endsWith('/api/admin/invites')) {
      return json(route, 200, { invites: state.invites });
    }
    if (method === 'POST' && path.endsWith('/api/admin/invites')) {
      const invite = {
        id: `inv-${state.invites.length + 1}`,
        code: 'YSL-E2E01',
        houseNumber: body.houseNumber,
      };
      state.invites.push(invite);
      state.audit.unshift({
        id: `a-${Date.now()}`,
        action: 'admin.invite.create',
        createdAt: new Date().toISOString(),
      });
      return json(route, 201, invite);
    }
    if (method === 'GET' && path.endsWith('/api/admin/audit')) {
      return json(route, 200, { logs: state.audit });
    }
    if (method === 'GET' && /\/api\/admin\/emergency\/[^/]+\/acks$/.test(path)) {
      return json(route, 200, { acks: [] });
    }

    // Media
    if (method === 'POST' && path.endsWith('/api/media/upload')) {
      return json(route, 201, {
        id: 'media-1',
        url: 'https://example.com/img.jpg',
        thumbUrl: 'https://example.com/t.jpg',
      });
    }

    return json(route, 404, { message: `Unmocked ${method} ${path}` });
  });

  return state;
}
