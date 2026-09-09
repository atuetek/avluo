import { randomUUID } from 'crypto';
import {
  TENANT,
  OTHER_TENANT,
  USER_ADMIN,
  USER_AYSE,
  USER_MEHMET,
  MEMBER_ADMIN,
  MEMBER_AYSE,
  MEMBER_MEHMET,
  MEMBER_OTHER,
} from './fixtures';

type Row = Record<string, any>;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function toComparable(v: any): any {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return v;
}

function eq(a: any, b: any): boolean {
  if (a == null && b == null) return true;
  return toComparable(a) === toComparable(b);
}

function matchWhere(row: Row, where: Row = {}, ctx?: { table?: string; store?: any }): boolean {
  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    if (key === 'AND') {
      if (!(val as Row[]).every((w) => matchWhere(row, w, ctx))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!(val as Row[]).some((w) => matchWhere(row, w, ctx))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (Array.isArray(val)) {
        if (val.some((w) => matchWhere(row, w, ctx))) return false;
      } else if (matchWhere(row, val as Row, ctx)) {
        return false;
      }
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('some' in val || 'every' in val || 'none' in val) {
        if (!matchRelationFilter(row, key, val, ctx)) return false;
        continue;
      }
      if ('equals' in val && !eq(row[key], val.equals)) return false;
      if ('contains' in val) {
        const hay = String(row[key] ?? '').toLowerCase();
        const needle = String(val.contains).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if ('gt' in val && !(toComparable(row[key]) > toComparable(val.gt))) return false;
      if ('gte' in val && !(toComparable(row[key]) >= toComparable(val.gte))) return false;
      if ('lt' in val && !(toComparable(row[key]) < toComparable(val.lt))) return false;
      if ('lte' in val && !(toComparable(row[key]) <= toComparable(val.lte))) return false;
      if ('in' in val && !val.in.some((x: any) => eq(row[key], x))) return false;
      if ('not' in val) {
        if (typeof val.not === 'object' && val.not && 'in' in val.not) {
          if (val.not.in.some((x: any) => eq(row[key], x))) return false;
        } else if (eq(row[key], val.not)) return false;
      }
      if ('mode' in val) {
        /* ignore */
      }
      continue;
    }
    if (!eq(row[key], val)) return false;
  }
  return true;
}

function matchRelationFilter(
  row: Row,
  key: string,
  filter: Row,
  ctx?: { table?: string; store?: any },
): boolean {
  const related = resolveRelatedRows(row, key, ctx);
  if ('some' in filter) {
    return related.some((r) => matchWhere(r, filter.some || {}, ctx));
  }
  if ('every' in filter) {
    return related.every((r) => matchWhere(r, filter.every || {}, ctx));
  }
  if ('none' in filter) {
    return !related.some((r) => matchWhere(r, filter.none || {}, ctx));
  }
  return true;
}

function resolveRelatedRows(
  row: Row,
  key: string,
  ctx?: { table?: string; store?: any },
): Row[] {
  const store = ctx?.store;
  if (!store) return [];
  if (key === 'members' && ctx?.table === 'conversations') {
    return store.memberConversations.filter((m: Row) => m.conversationId === row.id);
  }
  if (key === 'conversation' && ctx?.table === 'memberConversations') {
    const c = store.conversations.find((x: Row) => x.id === row.conversationId);
    return c ? [c] : [];
  }
  return [];
}

function applyOrder(rows: Row[], orderBy?: Row | Row[]): Row[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const o of orders) {
      const [k, dir] = Object.entries(o)[0];
      if (dir && typeof dir === 'object') continue; // nested orderBy ignored
      const av = toComparable(a[k]);
      const bv = toComparable(b[k]);
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

function pickSelect(row: Row, select?: Row): Row {
  let out = clone(row);
  if (select) {
    out = {};
    for (const k of Object.keys(select)) {
      if (select[k]) out[k] = row[k];
    }
  }
  return out;
}

const DEFAULTS: Record<string, Row> = {
  posts: {
    deletedAt: null,
    isHidden: false,
    isPinned: false,
    isAnnouncement: false,
    likeCount: 0,
    commentCount: 0,
    editedAt: null,
    pinnedAt: null,
    hiddenReason: null,
    hiddenBy: null,
  },
  comments: {
    isHidden: false,
    parentId: null,
  },
  events: {
    isCancelled: false,
    location: null,
    endsAt: null,
  },
  emergencyAlerts: {
    resolvedAt: null,
    severity: 'HIGH',
  },
  messages: {
    isDeleted: false,
  },
  conversations: {
    lastMessageAt: null,
    title: null,
  },
  notifications: {
    readAt: null,
  },
  memberConversations: {
    lastReadAt: null,
    isMuted: false,
  },
};

export function createMemoryStore() {
  const store = {
    tenants: [clone(TENANT), clone(OTHER_TENANT)] as Row[],
    users: [clone(USER_ADMIN), clone(USER_AYSE), clone(USER_MEHMET)] as Row[],
    members: [
      clone(MEMBER_ADMIN),
      clone(MEMBER_AYSE),
      clone(MEMBER_MEHMET),
      clone(MEMBER_OTHER),
    ] as Row[],
    posts: [] as Row[],
    comments: [] as Row[],
    likes: [] as Row[],
    media: [] as Row[],
    postMedia: [] as Row[],
    conversations: [] as Row[],
    memberConversations: [] as Row[],
    messages: [] as Row[],
    events: [] as Row[],
    eventRsvps: [] as Row[],
    emergencyAlerts: [] as Row[],
    emergencyAcks: [] as Row[],
    notifications: [] as Row[],
    invites: [] as Row[],
    auditLogs: [] as Row[],
    webAuthnCredentials: [] as Row[],
  };

  const seq = { n: 1 };
  const id = () => {
    seq.n += 1;
    return randomUUID();
  };

  function table(name: keyof typeof store) {
    const ctx = { table: name as string, store };
    return {
      findMany: jest.fn(async ({ where, orderBy, skip, take, include, select }: any = {}) => {
        let rows = store[name].filter((r) => matchWhere(r, where, ctx));
        rows = applyOrder(rows, orderBy);
        if (skip) rows = rows.slice(skip);
        if (take) rows = rows.slice(0, take);
        return rows.map((r) => enrich(name, pickSelect(r, select), include));
      }),
      findFirst: jest.fn(async ({ where, include, select, orderBy }: any = {}) => {
        let rows = store[name].filter((r) => matchWhere(r, where, ctx));
        rows = applyOrder(rows, orderBy);
        const row = rows[0];
        return row ? enrich(name, pickSelect(row, select), include) : null;
      }),
      findUnique: jest.fn(async ({ where, include, select }: any = {}) => {
        const row = findUniqueRow(name, where);
        return row ? enrich(name, pickSelect(row, select), include) : null;
      }),
      create: jest.fn(async ({ data, include, select }: any) => {
        const row = {
          id: data.id || id(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(DEFAULTS[name] || {}),
          ...flattenCreate(data),
        };
        store[name].push(row);
        handleNestedCreates(name, row, data);
        return enrich(name, pickSelect(row, select), include);
      }),
      createMany: jest.fn(async ({ data }: any) => {
        const arr = Array.isArray(data) ? data : [data];
        for (const d of arr) {
          store[name].push({
            id: d.id || id(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(DEFAULTS[name] || {}),
            ...d,
          });
        }
        return { count: arr.length };
      }),
      update: jest.fn(async ({ where, data, include, select }: any) => {
        const row = findUniqueRow(name, where) || store[name].find((r) => matchWhere(r, where, ctx));
        if (!row) throw new Error(`update: not found in ${name}`);
        applyUpdate(row, data);
        row.updatedAt = new Date().toISOString();
        return enrich(name, pickSelect(row, select), include);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = store[name].filter((r) => matchWhere(r, where, ctx));
        for (const row of rows) applyUpdate(row, data);
        return { count: rows.length };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const found = findUniqueRow(name, where);
        const idx = store[name].findIndex((r) =>
          found ? found.id === r.id : matchWhere(r, where, ctx),
        );
        if (idx < 0) throw new Error(`delete: not found in ${name}`);
        const [row] = store[name].splice(idx, 1);
        return row;
      }),
      deleteMany: jest.fn(async ({ where }: any = {}) => {
        const before = store[name].length;
        (store as any)[name] = store[name].filter((r) => !matchWhere(r, where || {}, ctx));
        return { count: before - store[name].length };
      }),
      count: jest.fn(async ({ where }: any = {}) => {
        return store[name].filter((r) => matchWhere(r, where || {}, ctx)).length;
      }),
      upsert: jest.fn(async ({ where, create, update, include }: any) => {
        let row = findUniqueRow(name, where);
        if (!row) {
          row = {
            id: create.id || id(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(DEFAULTS[name] || {}),
            ...flattenCreate(create),
          };
          store[name].push(row);
        } else {
          applyUpdate(row, update);
          row.updatedAt = new Date().toISOString();
        }
        return enrich(name, row, include);
      }),
    };
  }

  function findUniqueRow(name: keyof typeof store, where: Row): Row | undefined {
    if (!where) return undefined;
    if (where.id) return store[name].find((r) => r.id === where.id);
    for (const [key, val] of Object.entries(where)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return store[name].find((r) =>
          Object.entries(val as Row).every(([k, v]) => eq(r[k], v)),
        );
      }
      if (key === 'slug' || key === 'code' || key === 'credentialId' || key === 'token') {
        return store[name].find((r) => eq(r[key], val));
      }
    }
    return store[name].find((r) => matchWhere(r, where, { table: name as string, store }));
  }

  function flattenCreate(data: Row): Row {
    const out: Row = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && 'create' in (v as any)) continue;
      if (v && typeof v === 'object' && 'connect' in (v as any)) continue;
      if (v === undefined) continue;
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
  }

  function handleNestedCreates(name: keyof typeof store, row: Row, data: Row) {
    if (name === 'conversations' && data.members?.create) {
      const items = Array.isArray(data.members.create)
        ? data.members.create
        : [data.members.create];
      for (const m of items) {
        store.memberConversations.push({
          id: id(),
          conversationId: row.id,
          memberId: m.memberId,
          joinedAt: new Date().toISOString(),
          lastReadAt: null,
          isMuted: false,
        });
      }
    }
  }

  function applyUpdate(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (v && typeof v === 'object' && 'increment' in (v as any)) {
        row[k] = (row[k] || 0) + (v as any).increment;
      } else if (v && typeof v === 'object' && 'decrement' in (v as any)) {
        row[k] = (row[k] || 0) - (v as any).decrement;
      } else if (v instanceof Date) {
        row[k] = v.toISOString();
      } else {
        row[k] = v;
      }
    }
  }

  function enrich(name: keyof typeof store, row: Row, include?: Row): Row {
    if (!include || !row) return row;
    const out = clone(row);
    if (include.author) {
      const m = store.members.find((x) => x.id === row.authorId);
      out.author = m
        ? pickSelect(m, typeof include.author === 'object' ? include.author.select : undefined)
        : null;
    }
    if (include.organizer) {
      const m = store.members.find((x) => x.id === row.organizerId);
      out.organizer = m
        ? pickSelect(m, typeof include.organizer === 'object' ? include.organizer.select : undefined)
        : null;
    }
    if (include.sender) {
      const m = store.members.find((x) => x.id === row.senderId);
      out.sender = m
        ? pickSelect(m, typeof include.sender === 'object' ? include.sender.select : undefined)
        : null;
    }
    if (include.member) {
      const m = store.members.find((x) => x.id === row.memberId);
      out.member = m
        ? pickSelect(m, typeof include.member === 'object' ? include.member.select : undefined)
        : null;
    }
    if (include.triggeredByMember) {
      const m = store.members.find((x) => x.id === row.triggeredBy);
      out.triggeredByMember = m
        ? pickSelect(
            m,
            typeof include.triggeredByMember === 'object'
              ? include.triggeredByMember.select
              : undefined,
          )
        : null;
    }
    if (include.likes) {
      const where = include.likes.where || {};
      out.likes = store.likes
        .filter((l) => l.postId === row.id && matchWhere(l, where))
        .map((l) => pickSelect(l, include.likes.select));
    }
    if (include.media) {
      out.media = store.postMedia
        .filter((pm) => pm.postId === row.id)
        .map((pm) => ({
          ...pm,
          media: store.media.find((m) => m.id === pm.mediaId),
        }));
    }
    if (include.members) {
      out.members = store.memberConversations
        .filter((mc) => mc.conversationId === row.id)
        .map((mc) => ({
          ...mc,
          member: include.members.include?.member
            ? pickSelect(
                store.members.find((m) => m.id === mc.memberId) || {},
                include.members.include.member.select,
              )
            : store.members.find((m) => m.id === mc.memberId),
        }));
    }
    if (include.messages) {
      let msgs = store.messages.filter(
        (m) => m.conversationId === row.id && matchWhere(m, include.messages.where || {}),
      );
      msgs = applyOrder(msgs, include.messages.orderBy);
      if (include.messages.take) msgs = msgs.slice(0, include.messages.take);
      out.messages = msgs;
    }
    if (include.conversation) {
      const conv = store.conversations.find((c) => c.id === row.conversationId);
      out.conversation = conv
        ? enrich('conversations', conv, include.conversation.include)
        : null;
    }
    if (include.rsvps) {
      const rsvps = store.eventRsvps.filter(
        (r) => r.eventId === row.id && matchWhere(r, include.rsvps.where || {}),
      );
      out.rsvps = rsvps.map((r) => ({
        ...r,
        member: include.rsvps.include?.member
          ? pickSelect(
              store.members.find((m) => m.id === r.memberId) || {},
              include.rsvps.include.member.select,
            )
          : undefined,
      }));
    }
    if (include.acks) {
      let acks = store.emergencyAcks.filter(
        (a) => a.alertId === row.id && matchWhere(a, include.acks.where || {}),
      );
      acks = applyOrder(acks, include.acks.orderBy);
      out.acks = acks.map((a) => ({
        ...a,
        member: include.acks.include?.member
          ? pickSelect(
              store.members.find((m) => m.id === a.memberId) || {},
              include.acks.include.member.select,
            )
          : undefined,
      }));
    }
    return out;
  }

  const prisma: any = {
    tenant: table('tenants'),
    user: table('users'),
    member: table('members'),
    post: table('posts'),
    comment: table('comments'),
    like: table('likes'),
    media: table('media'),
    postMedia: table('postMedia'),
    conversation: table('conversations'),
    memberConversation: table('memberConversations'),
    message: table('messages'),
    event: table('events'),
    eventRsvp: table('eventRsvps'),
    emergencyAlert: table('emergencyAlerts'),
    emergencyAck: table('emergencyAcks'),
    notification: table('notifications'),
    invite: table('invites'),
    auditLog: table('auditLogs'),
    webAuthnCredential: table('webAuthnCredentials'),
    $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
    $executeRawUnsafe: jest.fn(async () => 0),
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    __store: store,
    __reset() {
      store.posts = [];
      store.comments = [];
      store.likes = [];
      store.media = [];
      store.postMedia = [];
      store.conversations = [];
      store.memberConversations = [];
      store.messages = [];
      store.events = [];
      store.eventRsvps = [];
      store.emergencyAlerts = [];
      store.emergencyAcks = [];
      store.notifications = [];
      store.invites = [];
      store.auditLogs = [];
      store.webAuthnCredentials = [];
      store.members = [
        clone(MEMBER_ADMIN),
        clone(MEMBER_AYSE),
        clone(MEMBER_MEHMET),
        clone(MEMBER_OTHER),
      ];
      store.users = [clone(USER_ADMIN), clone(USER_AYSE), clone(USER_MEHMET)];
      store.tenants = [clone(TENANT), clone(OTHER_TENANT)];
    },
  };

  return prisma;
}
