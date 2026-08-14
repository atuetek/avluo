// Avluo · Members API Tests
//
// Strategie:
// - NestJS TestingModule + supertest für HTTP-Endpoints
// - PrismaService wird gemockt (kein DB-Connect im Test, weil DB-Stack in Phase 1
//   noch nicht hochgefahren werden kann für CI)
// - Mock-Daten kommen aus einem In-Memory-Store der als Prisma-Ersatz dient
//
// Phase 1 (Szenario A): Wir testen Controller-Logik isoliert, mit gemockten Daten.
// Volle DB-Integration-Tests kommen in Sprint Woche 1 Tag 5 mit Testcontainers.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

// In-Memory-Mock für Prisma
const MEMBER_AYSE = {
  id: '00000000-0000-0000-0000-000000000030',
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000031',
  houseNumber: 'A-2',
  blockName: 'Block A',
  role: 'MEMBER',
  displayName: 'Ayşe Yılmaz',
  isVerified: true,
  preferredLang: 'tr-TR',
  isActive: true,
};

const MEMBER_HANS = {
  id: '00000000-0000-0000-0000-000000000050',
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000051',
  houseNumber: 'A-8',
  blockName: 'Block A',
  role: 'MEMBER',
  displayName: 'Hans Schmidt',
  isVerified: true,
  preferredLang: 'de-DE',
  isActive: true,
};

// Mock JWT-Token, der einen eingeloggten User mit tenant_id simuliert
const MOCK_TOKEN_PAYLOAD = {
  sub: MEMBER_AYSE.userId,
  tid: MEMBER_AYSE.tenantId,
};

const ALL_TENANT_MEMBERS = [MEMBER_AYSE, MEMBER_HANS];

describe('Members API', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let mockPrisma: any;

  beforeAll(async () => {
    // Mock Prisma – keine echte DB im Test
    // Die Tenant-Middleware nutzt tenant.findUnique + member.findUnique
    // Der MembersController nutzt member.findFirst
    mockPrisma = {
      member: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.userId === MEMBER_AYSE.userId && where.tenantId === MEMBER_AYSE.tenantId) {
            return Promise.resolve(MEMBER_AYSE);
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          // Tenant-Middleware nutzt composite key { tenantId_userId: { tenantId, userId } }
          if (where.tenantId_userId?.userId === MEMBER_AYSE.userId) {
            return Promise.resolve({
              id: MEMBER_AYSE.id,
              role: MEMBER_AYSE.role,
              isActive: MEMBER_AYSE.isActive,
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          // GET /api/members: filter by tenantId
          if (where?.tenantId === MEMBER_AYSE.tenantId) {
            return Promise.resolve(ALL_TENANT_MEMBERS);
          }
          return Promise.resolve([]);
        }),
        count: jest.fn().mockResolvedValue(ALL_TENANT_MEMBERS.length),
        create: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) => {
          if (where.id === MEMBER_AYSE.id) {
            return Promise.resolve({ ...MEMBER_AYSE, ...data });
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.slug === 'yesiltepe') {
            return Promise.resolve({
              id: MEMBER_AYSE.tenantId,
              slug: 'yesiltepe',
              name: 'Yeşiltepe Sitesi',
              plan: 'STANDARD',
              defaultLang: 'tr-TR',
              status: 'ACTIVE',
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      post: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock JWT – wir testen nur Member-Endpoints, nicht Auth selbst
      .overrideProvider(JwtService)
      .useValue({
        verifyAsync: jest.fn().mockResolvedValue(MOCK_TOKEN_PAYLOAD),
        signAsync: jest.fn().mockResolvedValue('mock-token'),
      })
      // Mock Prisma – keine echte DB im Test
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/members/me', () => {
    it('returns the authenticated member profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/members/me')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe') // Tenant-Auflösung im Test
        .expect(200);

      expect(res.body).toMatchObject({
        id: MEMBER_AYSE.id,
        tenantId: MEMBER_AYSE.tenantId,
        displayName: MEMBER_AYSE.displayName,
        houseNumber: MEMBER_AYSE.houseNumber,
        blockName: MEMBER_AYSE.blockName,
        role: MEMBER_AYSE.role,
        preferredLang: MEMBER_AYSE.preferredLang,
        isVerified: MEMBER_AYSE.isVerified,
      });
      expect(res.body).toHaveProperty('userId', MOCK_TOKEN_PAYLOAD.sub);
      expect(res.body).not.toHaveProperty('user'); // wir geben nicht das User-Objekt zurück
    });

    it('returns 401 if no Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/members/me')
        .set('x-dev-tenant', 'yesiltepe') // Tenant muss da sein, sonst 400 nicht 401
        .expect(401);
    });

    it('returns 403 if user is not a member of any tenant', async () => {
      // JWT-User existiert, aber hat keine Member-Zeile im Tenant
      const orphanToken = {
        sub: '00000000-0000-0000-0000-000000099999',
        tid: MEMBER_AYSE.tenantId,
      };
      (jwt.verifyAsync as jest.Mock).mockResolvedValue(orphanToken);
      // WICHTIG: Tenant-Middleware darf NICHT crashen.
      // findUnique (Tenant-MW) gibt nichts zurück → keine MemberContext → next()
      // findFirst (Controller) gibt null zurück → 403 ForbiddenException
      mockPrisma.member.findUnique.mockResolvedValue(null);
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/members/me')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe');

      // Reset Mocks für andere Tests
      mockPrisma.member.findUnique.mockImplementation(({ where }: any) => {
        if (where.tenantId_userId?.userId === MEMBER_AYSE.userId) {
          return Promise.resolve({
            id: MEMBER_AYSE.id,
            role: MEMBER_AYSE.role,
            isActive: MEMBER_AYSE.isActive,
          });
        }
        return Promise.resolve(null);
      });
      mockPrisma.member.findFirst.mockImplementation(({ where }: any) => {
        if (where.userId === MEMBER_AYSE.userId && where.tenantId === MEMBER_AYSE.tenantId) {
          return Promise.resolve(MEMBER_AYSE);
        }
        return Promise.resolve(null);
      });
      (jwt.verifyAsync as jest.Mock).mockResolvedValue(MOCK_TOKEN_PAYLOAD);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/members', () => {
    it('returns all members of the tenant (paginated)', async () => {
      // Mock findMany für die Liste
      mockPrisma.member.findMany.mockResolvedValue(ALL_TENANT_MEMBERS);
      mockPrisma.member.count.mockResolvedValue(ALL_TENANT_MEMBERS.length);

      const res = await request(app.getHttpServer())
        .get('/api/members?limit=20&offset=0')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .expect(200);

      expect(res.body).toMatchObject({
        members: expect.arrayContaining([
          expect.objectContaining({ id: MEMBER_AYSE.id, displayName: 'Ayşe Yılmaz' }),
          expect.objectContaining({ id: MEMBER_HANS.id, displayName: 'Hans Schmidt' }),
        ]),
        total: 2,
        limit: 20,
        offset: 0,
      });
    });

    it('returns empty list with total=0 when no members match', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);
      mockPrisma.member.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/members?limit=20&offset=0')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .expect(200);

      expect(res.body).toEqual({ members: [], total: 0, limit: 20, offset: 0 });
    });

    it('rejects limit > 100 (DOS-Schutz)', async () => {
      await request(app.getHttpServer())
        .get('/api/members?limit=500&offset=0')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .expect(400);
    });
  });

  describe('PATCH /api/members/me', () => {
    it('updates the authenticated member profile', async () => {
      const updated = { ...MEMBER_AYSE, displayName: 'Ayşe Y.', houseNumber: 'A-12' };
      mockPrisma.member.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/api/members/me')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .send({ displayName: 'Ayşe Y.', houseNumber: 'A-12' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: MEMBER_AYSE.id,
        displayName: 'Ayşe Y.',
        houseNumber: 'A-12',
      });
    });

    it('rejects update without body', async () => {
      await request(app.getHttpServer())
        .patch('/api/members/me')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .send({})
        .expect(400);
    });

    it('rejects forbidden fields like role or tenantId', async () => {
      // Security: User darf nicht seine Rolle selbst ändern
      await request(app.getHttpServer())
        .patch('/api/members/me')
        .set('Authorization', 'Bearer mock-token')
        .set('x-dev-tenant', 'yesiltepe')
        .send({ role: 'SUPER_ADMIN', displayName: 'Hacker' })
        .expect(400); // forbidNonWhitelisted wirft 400
    });
  });
});