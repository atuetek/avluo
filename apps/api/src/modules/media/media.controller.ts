import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as Minio from 'minio';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const MAX_BYTES = 5 * 1024 * 1024;

function getMinio() {
  const endpoint =
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'localhost';
  // Allow host or host:port
  const host = endpoint.replace(/^https?:\/\//, '').split('/')[0];
  const [endPoint, portFromHost] = host.includes(':')
    ? [host.split(':')[0], host.split(':')[1]]
    : [host, undefined];
  const useSSL =
    process.env.MINIO_USE_SSL === 'true' ||
    process.env.S3_USE_SSL === 'true' ||
    endpoint.startsWith('https://') ||
    !!process.env.S3_ENDPOINT;
  const port = parseInt(
    process.env.MINIO_PORT ||
      portFromHost ||
      (useSSL ? '443' : '9000'),
    10,
  );
  return new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey:
      process.env.S3_ACCESS_KEY ||
      process.env.MINIO_USER ||
      'avluo',
    secretKey:
      process.env.S3_SECRET_KEY ||
      process.env.MINIO_PASSWORD ||
      'devpass',
  });
}

function publicObjectUrl(bucket: string, key: string): string {
  if (process.env.MEDIA_PUBLIC_BASE_URL) {
    return `${process.env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, '')}/${bucket}/${key}`;
  }
  const endpoint =
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'localhost';
  if (endpoint.startsWith('http')) {
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
  }
  const useSSL =
    process.env.MINIO_USE_SSL === 'true' ||
    process.env.S3_USE_SSL === 'true' ||
    !!process.env.S3_ENDPOINT;
  const port = process.env.MINIO_PORT || (useSSL ? '443' : '9000');
  const proto = useSSL ? 'https' : 'http';
  const portSuffix =
    (useSSL && port === '443') || (!useSSL && port === '80')
      ? ''
      : `:${port}`;
  return `${proto}://${endpoint}${portSuffix}/${bucket}/${key}`;
}

@Controller('api/media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    if (!file) throw new BadRequestException('file erforderlich');
    if (!ALLOWED.has(file.mimetype) && file.mimetype !== 'image/heic') {
      // Accept heic mimetype variants; convert via sharp when possible
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Nur Bilder (jpg/png/webp/heic)');
      }
    }

    let buffer = file.buffer;
    let mimeType = 'image/jpeg';
    let width: number | undefined;
    let height: number | undefined;

    try {
      const image = sharp(file.buffer).rotate();
      const meta = await image.metadata();
      width = meta.width;
      height = meta.height;
      buffer = await image
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      mimeType = 'image/jpeg';
    } catch {
      if (file.size > MAX_BYTES) {
        throw new BadRequestException('Datei zu groß (max 5MB)');
      }
      buffer = file.buffer;
      mimeType = file.mimetype;
    }

    const bucket = `tenant-${tenant.slug || tenant.id}`;
    const key = `${tenant.id}/${randomUUID()}.jpg`;
    const client = getMinio();

    const exists = await client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await client.makeBucket(bucket, 'eu-central-1');
      // Public-read policy for MVP (dev); lock down in production
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await client.setBucketPolicy(bucket, JSON.stringify(policy)).catch(() => undefined);
    }

    await client.putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const url = publicObjectUrl(bucket, key);

    const media = await this.prisma.media.create({
      data: {
        tenantId: tenant.id,
        url,
        thumbUrl: url,
        mimeType,
        sizeBytes: buffer.length,
        width,
        height,
        isScanned: false,
      },
    });

    return media;
  }
}
