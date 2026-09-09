/**
 * Shared fixtures for Avluo API e2e tests.
 * UUIDs use version 4 so class-validator @IsUUID() accepts them.
 */
export const TENANT = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'yesiltepe',
  name: 'Yeşiltepe Sitesi',
  subdomain: 'yesiltepe',
  plan: 'STANDARD' as const,
  defaultLang: 'tr-TR',
  status: 'ACTIVE' as const,
  memberCount: 3,
};

export const OTHER_TENANT = {
  id: '00000000-0000-4000-8000-000000000099',
  slug: 'other-site',
  name: 'Other Site',
  subdomain: 'other',
  plan: 'FREE' as const,
  defaultLang: 'tr-TR',
  status: 'ACTIVE' as const,
  memberCount: 1,
};

export const USER_ADMIN = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'admin@avluo.dev',
  phone: '+905551234567',
  emailVerified: true,
  phoneVerified: true,
  locale: 'tr-TR',
};

export const USER_AYSE = {
  id: '00000000-0000-4000-8000-000000000031',
  email: 'ayse@avluo.dev',
  phone: '+905551234568',
  emailVerified: true,
  phoneVerified: true,
  locale: 'tr-TR',
};

export const USER_MEHMET = {
  id: '00000000-0000-4000-8000-000000000041',
  email: 'mehmet@avluo.dev',
  phone: '+905551234569',
  emailVerified: true,
  phoneVerified: true,
  locale: 'tr-TR',
};

export const MEMBER_ADMIN = {
  id: '00000000-0000-4000-8000-000000000020',
  tenantId: TENANT.id,
  userId: USER_ADMIN.id,
  houseNumber: 'A-1',
  blockName: 'Block A',
  role: 'SUPER_ADMIN' as const,
  displayName: 'Pilot Admin',
  avatarUrl: null as string | null,
  preferredLang: 'tr-TR',
  phone: USER_ADMIN.phone,
  isVerified: true,
  isActive: true,
};

export const MEMBER_AYSE = {
  id: '00000000-0000-4000-8000-000000000030',
  tenantId: TENANT.id,
  userId: USER_AYSE.id,
  houseNumber: 'A-2',
  blockName: 'Block A',
  role: 'MEMBER' as const,
  displayName: 'Ayşe Yılmaz',
  avatarUrl: null as string | null,
  preferredLang: 'tr-TR',
  phone: USER_AYSE.phone,
  isVerified: true,
  isActive: true,
};

export const MEMBER_MEHMET = {
  id: '00000000-0000-4000-8000-000000000040',
  tenantId: TENANT.id,
  userId: USER_MEHMET.id,
  houseNumber: 'B-5',
  blockName: 'Block B',
  role: 'MEMBER' as const,
  displayName: 'Mehmet Demir',
  avatarUrl: null as string | null,
  preferredLang: 'tr-TR',
  phone: USER_MEHMET.phone,
  isVerified: true,
  isActive: true,
};

export const MEMBER_OTHER = {
  id: '00000000-0000-4000-8000-000000000098',
  tenantId: OTHER_TENANT.id,
  userId: USER_AYSE.id,
  houseNumber: 'X-1',
  blockName: 'X',
  role: 'MEMBER' as const,
  displayName: 'Ayşe Other',
  avatarUrl: null as string | null,
  preferredLang: 'tr-TR',
  phone: USER_AYSE.phone,
  isVerified: true,
  isActive: true,
};

export function newId(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}
