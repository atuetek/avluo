import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const MEMBER = {
  id: '00000000-0000-0000-0000-000000000030',
  tenantId: TENANT_ID,
  userId: '00000000-0000-0000-0000-000000000031',
  displayName: 'Ayşe Yılmaz',
  role: 'ADMIN',
  preferredLang: 'tr-TR',
  isActive: true,
};

describe('PostsController (MVP smoke)', () => {
  let app: INestApplication;
  const posts: any[] = [];

  beforeEach(async () => {
    posts.length = 0;
    const mockPrisma: any = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: TENANT_ID,
          slug: 'yesiltepe',
          name: 'Yeşiltepe Sitesi',
          plan: 'STANDARD',
          defaultLang: 'tr-TR',
          status: 'ACTIVE',
        }),
      },
      member: {
        findFirst: jest.fn().mockResolvedValue(MEMBER),
        findUnique: jest.fn().mockResolvedValue({
          id: MEMBER.id,
          role: MEMBER.role,
          isActive: true,
        }),
        findMany: jest.fn().mockResolvedValue([MEMBER]),
      },
      post: {
        findMany: jest.fn().mockImplementation(async () => posts.filter((p) => !p.deletedAt)),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) =>
          posts.find((p) => p.id === where.id && !p.deletedAt),
        ),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) =>
          posts.find((p) => p.id === where.id),
        ),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const post = {
            id: '00000000-0000-0000-0000-000000000031',
            likeCount: 0,
            commentCount: 0,
            isPinned: false,
            isAnnouncement: false,
            isHidden: false,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
            author: {
              id: MEMBER.id,
              displayName: MEMBER.displayName,
              avatarUrl: null,
              houseNumber: null,
              blockName: null,
            },
            media: [],
            likes: [],
          };
          posts.push(post);
          return post;
        }),
        update: jest.fn(),
      },
      media: { findFirst: jest.fn() },
      postMedia: { create: jest.fn() },
      like: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
      },
      comment: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === 'function') return arg(mockPrisma);
        return Promise.all(arg);
      }),
      notification: { create: jest.fn(), createMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useValue({
        verifyAsync: jest.fn().mockResolvedValue({
          sub: MEMBER.userId,
          tid: TENANT_ID,
          role: 'ADMIN',
        }),
        signAsync: jest.fn().mockResolvedValue('mock-jwt'),
      })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates and lists a post', async () => {
    await request(app.getHttpServer())
      .post('/api/posts')
      .set('Authorization', 'Bearer mock')
      .set('x-dev-tenant', 'yesiltepe')
      .send({ content: 'Merhaba Yeşiltepe' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/posts')
      .set('Authorization', 'Bearer mock')
      .set('x-dev-tenant', 'yesiltepe')
      .expect(200);

    expect(list.body.posts.length).toBeGreaterThan(0);
    expect(list.body.posts[0].content).toBe('Merhaba Yeşiltepe');
  });
});
