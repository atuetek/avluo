import { Page } from '@playwright/test';

export const FIXTURES = {
  tenantId: '00000000-0000-4000-8000-000000000001',
  user: {
    id: '00000000-0000-4000-8000-000000000031',
    phone: '+905551234568',
    locale: 'tr-TR',
  },
  member: {
    id: '00000000-0000-4000-8000-000000000030',
    tenantId: '00000000-0000-4000-8000-000000000001',
    role: 'MEMBER',
    displayName: 'Ayşe Yılmaz',
  },
  adminMember: {
    id: '00000000-0000-4000-8000-000000000020',
    tenantId: '00000000-0000-4000-8000-000000000001',
    role: 'SUPER_ADMIN',
    displayName: 'Pilot Admin',
  },
  adminUser: {
    id: '00000000-0000-4000-8000-000000000010',
    phone: '+905551234567',
    locale: 'tr-TR',
  },
  mehmet: {
    id: '00000000-0000-4000-8000-000000000040',
    displayName: 'Mehmet Demir',
    houseNumber: 'B-5',
    blockName: 'Block B',
  },
};

/** Minimal JWT-shaped token (UI only checks presence; API is mocked). */
export const FAKE_TOKEN = 'e2e.fake.token';

export async function seedSession(
  page: Page,
  opts: { admin?: boolean } = {},
) {
  const user = opts.admin ? FIXTURES.adminUser : FIXTURES.user;
  const member = opts.admin ? FIXTURES.adminMember : FIXTURES.member;
  await page.addInitScript(
    ({ token, user, member }) => {
      localStorage.setItem('avluo_token', token);
      localStorage.setItem('avluo_user', JSON.stringify(user));
      localStorage.setItem('avluo_member', JSON.stringify(member));
      localStorage.setItem('avluo_locale', 'tr-TR');
      localStorage.setItem('avluo_api_url', 'http://127.0.0.1:3000');
    },
    { token: FAKE_TOKEN, user, member },
  );
}

export async function clearSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('avluo_api_url', 'http://127.0.0.1:3000');
    localStorage.setItem('avluo_locale', 'tr-TR');
  });
}
