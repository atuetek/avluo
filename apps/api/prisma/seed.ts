// Avluo · Prisma Seed
//
// Erstellt den Pilot-Tenant "Yeşiltepe" mit:
// - 1 Tenant
// - 1 Platform-Admin-User
// - 1 SUPER_ADMIN-Member im Yeşiltepe-Tenant
// - Optional: ein paar Demo-Members + Posts für UI-Tests
//
// WICHTIG: Seed läuft als Platform-Admin (kein tenant_id-Kontext).
// Daher wird PrismaService.withPlatform() verwendet, NICHT withTenant().
//
// Aufruf: pnpm prisma db seed
// Oder:    pnpm db:seed (im Root)

import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

const prisma = new PrismaClient();

// IDs sind deterministisch, damit der Test-Login + Cross-References funktionieren
const TENANT_YESILTEPE_ID = '00000000-0000-0000-0000-000000000001';
const USER_ADMIN_ID = '00000000-0000-0000-0000-000000000010';
const MEMBER_ADMIN_ID = '00000000-0000-0000-0000-000000000020';

// Demo-Daten für UI-Tests
const DEMO_MEMBERS = [
  {
    id: '00000000-0000-0000-0000-000000000030',
    userId: '00000000-0000-0000-0000-000000000031',
    houseNumber: 'A-2',
    blockName: 'Block A',
    role: 'MEMBER' as const,
    displayName: 'Ayşe Yılmaz',
    isVerified: true,
    preferredLang: 'tr-TR' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000040',
    userId: '00000000-0000-0000-0000-000000000041',
    houseNumber: 'B-5',
    blockName: 'Block B',
    role: 'MEMBER' as const,
    displayName: 'Mehmet Demir',
    isVerified: true,
    preferredLang: 'tr-TR' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000050',
    userId: '00000000-0000-0000-0000-000000000051',
    houseNumber: 'A-8',
    blockName: 'Block A',
    role: 'MEMBER' as const,
    displayName: 'Hans Schmidt',
    isVerified: true,
    preferredLang: 'de-DE' as const,
  },
];

const DEMO_USERS = [
  {
    id: USER_ADMIN_ID,
    email: 'admin@avluo.dev',
    phone: '+905551234567',
    emailVerified: true,
    phoneVerified: true,
    locale: 'tr-TR' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000031',
    email: 'ayse@avluo.dev',
    phone: '+905551234568',
    emailVerified: true,
    phoneVerified: true,
    locale: 'tr-TR' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000041',
    email: 'mehmet@avluo.dev',
    phone: '+905551234569',
    emailVerified: true,
    phoneVerified: true,
    locale: 'tr-TR' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000051',
    email: 'hans@avluo.dev',
    phone: '+905551234570',
    emailVerified: true,
    phoneVerified: true,
    locale: 'de-DE' as const,
  },
];

async function main() {
  console.log('🌱 Seeding Avluo Pilot-Tenant (Yeşiltepe)...\n');

  // ========================================
  // Platform-Admin-Kontext
  // Seed läuft als Platform, KEIN tenant_id gesetzt
  // ========================================

  console.log('  1/5 Tenants anlegen...');
  await prisma.tenant.upsert({
    where: { id: TENANT_YESILTEPE_ID },
    update: {
      memberCount: 1 + DEMO_MEMBERS.length, // admin + demo members
    },
    create: {
      id: TENANT_YESILTEPE_ID,
      slug: 'yesiltepe',
      name: 'Yeşiltepe Sitesi Kooperatifi',
      subdomain: 'yesiltepe',
      defaultLang: 'tr-TR',
      plan: 'STANDARD',
      status: 'ACTIVE',
      memberCount: 1 + DEMO_MEMBERS.length,
    },
  });

  console.log('  2/5 Demo-Users anlegen (4)...');
  for (const user of [DEMO_USERS[0], ...DEMO_USERS.slice(1)]) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        locale: user.locale,
      },
      create: user,
    });
  }

  console.log('  3/5 Members im Yeşiltepe-Tenant anlegen (4)...');
  // Admin-Member
  await prisma.member.upsert({
    where: { id: MEMBER_ADMIN_ID },
    update: {
      role: 'SUPER_ADMIN',
      displayName: 'Siedlungs-Verwaltung',
      isVerified: true,
    },
    create: {
      id: MEMBER_ADMIN_ID,
      tenantId: TENANT_YESILTEPE_ID,
      userId: USER_ADMIN_ID,
      houseNumber: 'A-1',
      blockName: 'Block A',
      role: 'SUPER_ADMIN',
      displayName: 'Siedlungs-Verwaltung',
      isVerified: true,
      preferredLang: 'tr-TR',
    },
  });

  // Demo-Members
  for (const member of DEMO_MEMBERS) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: {
        displayName: member.displayName,
        isVerified: member.isVerified,
        preferredLang: member.preferredLang,
      },
      create: {
        ...member,
        tenantId: TENANT_YESILTEPE_ID,
      },
    });
  }

  console.log('  4/5 Demo-Posts anlegen (3)...');
  // Posts werden über withPlatform angelegt (RLS umgehen für Setup)
  // In Production würde das nicht passieren, hier nur für Demo
  await prisma.$executeRawUnsafe(`SET LOCAL row_security = OFF;`);

  const posts = [
    {
      id: '00000000-0000-0000-0000-000000000100',
      authorId: MEMBER_ADMIN_ID,
      content:
        'Willkommen bei Yeşiltepe! Dies ist der erste Post in unserer neuen Community-App. Stellt euch vor und sagt Hallo! 👋',
      contentHtml:
        '<p>Willkommen bei Yeşiltepe! Dies ist der erste Post in unserer neuen Community-App. Stellt euch vor und sagt Hallo! 👋</p>',
      lang: 'tr-TR',
      isPinned: true,
      isAnnouncement: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000101',
      authorId: '00000000-0000-0000-0000-000000000030', // Ayşe
      content: 'Hallo zusammen! Ich bin Ayşe aus Block A. Freue mich auf den Austausch mit euch! 🌻',
      contentHtml: '<p>Hallo zusammen! Ich bin Ayşe aus Block A. Freue mich auf den Austausch mit euch! 🌻</p>',
      lang: 'tr-TR',
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      authorId: '00000000-0000-0000-0000-000000000050', // Hans
      content:
        'Hello everyone! My name is Hans, I live in Block A. Looking forward to being part of this community. 🏡',
      contentHtml:
        '<p>Hello everyone! My name is Hans, I live in Block A. Looking forward to being part of this community. 🏡</p>',
      lang: 'de-DE',
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: { content: post.content, contentHtml: post.contentHtml },
      create: {
        ...post,
        tenantId: TENANT_YESILTEPE_ID,
      },
    });
  }

  console.log('  5/5 Pilot-Veranstaltung anlegen (1)...');
  await prisma.event.upsert({
    where: { id: '00000000-0000-0000-0000-000000000200' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000200',
      tenantId: TENANT_YESILTEPE_ID,
      organizerId: MEMBER_ADMIN_ID,
      title: 'Nachbarschaftsfest 2026',
      description:
        'Unser jährliches Treffen mit Essen, Trinken und Musik. Bitte bringt eine Kleinigkeit mit!',
      lang: 'de-DE',
      location: 'Siedlungs-Innenhof',
      startsAt: new Date('2026-09-15T17:00:00Z'),
      endsAt: new Date('2026-09-15T22:00:00Z'),
    },
  });

  await prisma.$executeRawUnsafe(`SET LOCAL row_security = ON;`);

  // ========================================
  // Summary
  // ========================================
  console.log('\n✅ Seed erfolgreich abgeschlossen!\n');
  console.log('Pilot-Tenant: Yeşiltepe Sitesi Kooperatifi');
  console.log('  Slug:     yesiltepe');
  console.log('  Subdomain: yesiltepe.localhost:4200 (dev)');
  console.log('  Tenant-ID:', TENANT_YESILTEPE_ID);
  console.log('  Members:  1 SUPER_ADMIN + 3 Demo-Members');
  console.log('  Posts:    3 (1 Pinned Announcement + 2 Vorstellungs-Posts)');
  console.log('  Events:   1 (Nachbarschaftsfest)');
  console.log('\nDemo-Login:');
  console.log('  Admin:    admin@avluo.dev / +905551234567');
  console.log('  Ayşe:     ayse@avluo.dev / +905551234568');
  console.log('  Mehmet:   mehmet@avluo.dev / +905551234569');
  console.log('  Hans:     hans@avluo.dev / +905551234570');
  console.log('\nOTP-Code erscheint in der API-Console (Dev-Mock-SMS).');
}

main()
  .catch((e) => {
    console.error('❌ Seed fehlgeschlagen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
