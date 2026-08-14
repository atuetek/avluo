// Avluo · Auth API Tests
//
// Phase 1 (Szenario A):
// - POST /api/auth/send-otp: SMS-OTP senden (im Dev-Mode: nur loggen)
// - POST /api/auth/verify-otp: Phone + Code → JWT-Token + User-Info
//
// Mock-Strategie: SMS-Service gemockt (kein echter Netgsm-Call im Test),
// Prisma gemockt, JWT-Sign gemockt.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

// In-Memory-Mocks
const EXISTING_USER_AYSE = {
  id: '00000000-0000-0000-0000-000000000031',
  email: 'ayse@avluo.dev',
  phone: '+905551234568',
  emailVerified: true,
  phoneVerified: true,
  locale: 'tr-TR',
};

const TENANT_YESILTEPE = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'yesiltepe',
  name: 'Yeşiltepe Sitesi',
  plan: 'STANDARD',
  defaultLang: 'tr-TR',
  status: 'ACTIVE',
};

// Map für OTP-Speicherung (was der SMS-Service "gesendet" hat)
const sentOtps = new Map<string, string>();

// Reset-Stores für jeden Test
const { otpStore, rateLimitStore } = require('./auth.controller');

beforeEach(() => {
  sentOtps.clear();
  otpStore.clear();
  rateLimitStore.clear();
  jest.clearAllMocks();
});

describe('Auth API', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let mockPrisma: any;

  beforeAll(async () => {
    // Prisma-Mock
    mockPrisma = {
      user: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.phone === EXISTING_USER_AYSE.phone) {
            return Promise.resolve(EXISTING_USER_AYSE);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          return Promise.resolve({ id: 'new-user-id', ...data });
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          return Promise.resolve({ ...EXISTING_USER_AYSE, ...data, id: where.id });
        }),
      },
      member: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          // Nach Verify: User ist Member im Tenant
          if (where.userId === EXISTING_USER_AYSE.id && where.tenantId === TENANT_YESILTEPE.id) {
            return Promise.resolve({
              id: '00000000-0000-0000-0000-000000000030',
              tenantId: TENANT_YESILTEPE.id,
              userId: EXISTING_USER_AYSE.id,
              role: 'MEMBER',
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      tenant: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.slug === 'yesiltepe') {
            return Promise.resolve(TENANT_YESILTEPE);
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useValue({
        // verifyAsync wird von TenantMiddleware und JwtVerifier genutzt
        verifyAsync: jest.fn().mockResolvedValue({ sub: EXISTING_USER_AYSE.id, tid: TENANT_YESILTEPE.id }),
        // signAsync wird vom Auth-Endpoint genutzt
        signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      })
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

  describe('POST /api/auth/send-otp', () => {
    it('sends OTP to a registered phone', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: EXISTING_USER_AYSE.phone })
        .expect(200);

      expect(res.body).toEqual({
        sent: true,
        // Dev-Mode: OTP wird in der Response zurückgegeben für Tests
        debugOtp: expect.stringMatching(/^\d{6}$/),
      });
    });

    it('creates new user with locale and sends OTP (User-Onboarding)', async () => {
      // User existiert NICHT
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: '+905559999999', locale: 'tr-TR' })
        .expect(200);

      expect(res.body).toMatchObject({ sent: true });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('rejects invalid phone format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: 'kein-telefon' })
        .expect(400);
    });

    it('rate-limits too many OTP requests (anti-spam)', async () => {
      // Erste 3 Requests gehen durch
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/send-otp')
          .send({ phone: EXISTING_USER_AYSE.phone })
          .expect(200);
      }

      // 4. Request → 429 Too Many Requests
      await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: EXISTING_USER_AYSE.phone })
        .expect(429);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('returns JWT and user-info for valid OTP', async () => {
      // Vorher send-otp aufrufen damit OTP-Code gespeichert ist
      await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: EXISTING_USER_AYSE.phone })
        .expect(200);

      // OTP aus dem Controller-internen Store holen
      const otpRecord = otpStore.get(EXISTING_USER_AYSE.phone);
      expect(otpRecord).toBeDefined();
      const debugOtp = otpRecord!.code;

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ phone: EXISTING_USER_AYSE.phone, code: debugOtp })
        .expect(200);

      expect(res.body).toMatchObject({
        token: 'mock-jwt-token',
        user: {
          id: EXISTING_USER_AYSE.id,
          phone: EXISTING_USER_AYSE.phone,
          locale: 'tr-TR',
        },
        member: {
          id: '00000000-0000-0000-0000-000000000030',
          tenantId: TENANT_YESILTEPE.id,
          role: 'MEMBER',
        },
      });

      // JWT wurde mit tenant_id signiert
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: EXISTING_USER_AYSE.id,
          tid: TENANT_YESILTEPE.id,
          role: 'MEMBER',
        }),
      );
    });

    it('rejects wrong OTP code', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ phone: EXISTING_USER_AYSE.phone })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ phone: EXISTING_USER_AYSE.phone, code: '000000' })
        .expect(401);
    });

    it('rejects missing phone or code', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ code: '123456' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({ phone: EXISTING_USER_AYSE.phone })
        .expect(400);
    });
  });
});