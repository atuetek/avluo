import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtVerifier } from '../../common/jwt/jwt-verifier';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from '../notifications/notifications.service';

class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  lang?: 'tr-TR' | 'en-US' | 'de-DE';

  @IsOptional()
  @IsUUID()
  mediaId?: string;
}

class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isAnnouncement?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hiddenReason?: string;
}

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsIn(['tr-TR', 'en-US', 'de-DE'])
  lang?: 'tr-TR' | 'en-US' | 'de-DE';
}

@Controller('api/posts')
export class PostsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtVerifier,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('since') since?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const limit = Math.min(parseInt(limitStr || '20', 10) || 20, 50);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);

    const where: any = {
      tenantId: tenant.id,
      deletedAt: null,
      isHidden: false,
    };
    if (since) {
      const d = new Date(since);
      if (isNaN(d.getTime())) {
        throw new BadRequestException('since muss ISO-Datum sein');
      }
      where.createdAt = { gt: d };
    }

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            houseNumber: true,
            blockName: true,
          },
        },
        media: { include: { media: true }, orderBy: { position: 'asc' } },
        likes: {
          where: { authorId: tenant.memberId },
          select: { id: true },
        },
      },
    });

    return {
      posts: posts.map((p) => this.serializePost(p, tenant.memberId!)),
      limit,
      offset,
    };
  }

  @Get(':id')
  async getOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            houseNumber: true,
            blockName: true,
          },
        },
        media: { include: { media: true } },
        likes: {
          where: { authorId: tenant.memberId },
          select: { id: true },
        },
      },
    });
    if (!post || (post.isHidden && post.authorId !== tenant.memberId)) {
      throw new NotFoundException('Post nicht gefunden');
    }
    return this.serializePost(post, tenant.memberId!);
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    const tenant = this.jwt.requireTenantContext(req);

    const post = await this.prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorId: tenant.memberId!,
        content: dto.content.trim(),
        lang: dto.lang || 'tr-TR',
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            houseNumber: true,
            blockName: true,
          },
        },
        media: { include: { media: true } },
        likes: { where: { authorId: tenant.memberId }, select: { id: true } },
      },
    });

    if (dto.mediaId) {
      const media = await this.prisma.media.findFirst({
        where: { id: dto.mediaId, tenantId: tenant.id },
      });
      if (!media) throw new BadRequestException('mediaId ungültig');
      await this.prisma.postMedia.create({
        data: { postId: post.id, mediaId: media.id, position: 0 },
      });
      const refreshed = await this.prisma.post.findUnique({
        where: { id: post.id },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              houseNumber: true,
              blockName: true,
            },
          },
          media: { include: { media: true } },
          likes: { where: { authorId: tenant.memberId }, select: { id: true } },
        },
      });
      return this.serializePost(refreshed!, tenant.memberId!);
    }

    return this.serializePost(post, tenant.memberId!);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const post = await this.findOwnedOrAdmin(id, tenant);
    const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'SUPER_ADMIN';

    const data: any = {};
    if (dto.content !== undefined) {
      if (post.authorId !== tenant.memberId) {
        throw new ForbiddenException('Nur Autor darf Inhalt ändern');
      }
      data.content = dto.content.trim();
      data.editedAt = new Date();
    }
    if (isAdmin) {
      if (dto.isPinned !== undefined) {
        data.isPinned = dto.isPinned;
        data.pinnedAt = dto.isPinned ? new Date() : null;
      }
      if (dto.isAnnouncement !== undefined) {
        data.isAnnouncement = dto.isAnnouncement;
      }
      if (dto.isHidden !== undefined) {
        data.isHidden = dto.isHidden;
        data.hiddenReason = dto.hiddenReason || null;
        data.hiddenBy = dto.isHidden ? tenant.memberId : null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Keine gültigen Felder');
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            houseNumber: true,
            blockName: true,
          },
        },
        media: { include: { media: true } },
        likes: { where: { authorId: tenant.memberId }, select: { id: true } },
      },
    });
    return this.serializePost(updated, tenant.memberId!);
  }

  @Delete(':id')
  @HttpCode(200)
  async softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    await this.findOwnedOrAdmin(id, tenant);
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  @Get(':id/comments')
  async listComments(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    await this.requirePost(id, tenant.id);
    const comments = await this.prisma.comment.findMany({
      where: {
        tenantId: tenant.id,
        postId: id,
        isHidden: false,
        parentId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    return { comments };
  }

  @Post(':id/comments')
  async createComment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const post = await this.requirePost(id, tenant.id);

    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          tenantId: tenant.id,
          postId: id,
          authorId: tenant.memberId!,
          content: dto.content.trim(),
          lang: dto.lang || 'tr-TR',
        },
        include: {
          author: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });
      await tx.post.update({
        where: { id },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });

    if (post.authorId !== tenant.memberId) {
      const me = await this.prisma.member.findUnique({
        where: { id: tenant.memberId },
      });
      await this.notifications.create({
        tenantId: tenant.id,
        memberId: post.authorId,
        type: 'comment',
        title: 'Neuer Kommentar',
        body: `${me?.displayName || 'Jemand'} hat deinen Beitrag kommentiert`,
        refType: 'post',
        refId: id,
      });
    }

    return comment;
  }

  @Post(':id/like')
  @HttpCode(200)
  async toggleLike(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const tenant = this.jwt.requireTenantContext(req);
    const post = await this.requirePost(id, tenant.id);

    const existing = await this.prisma.like.findUnique({
      where: {
        tenantId_postId_authorId: {
          tenantId: tenant.id,
          postId: id,
          authorId: tenant.memberId!,
        },
      },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.like.delete({ where: { id: existing.id } }),
        this.prisma.post.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    }

    await this.prisma.$transaction([
      this.prisma.like.create({
        data: {
          tenantId: tenant.id,
          postId: id,
          authorId: tenant.memberId!,
        },
      }),
      this.prisma.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    if (post.authorId !== tenant.memberId) {
      const me = await this.prisma.member.findUnique({
        where: { id: tenant.memberId },
      });
      await this.notifications.create({
        tenantId: tenant.id,
        memberId: post.authorId,
        type: 'like',
        title: 'Neuer Like',
        body: `${me?.displayName || 'Jemand'} gefällt dein Beitrag`,
        refType: 'post',
        refId: id,
      });
    }

    return { liked: true };
  }

  private async requirePost(id: string, tenantId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId, deletedAt: null, isHidden: false },
    });
    if (!post) throw new NotFoundException('Post nicht gefunden');
    return post;
  }

  private async findOwnedOrAdmin(
    id: string,
    tenant: { id: string; memberId?: string; role?: string },
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('Post nicht gefunden');
    const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'SUPER_ADMIN';
    if (post.authorId !== tenant.memberId && !isAdmin) {
      throw new ForbiddenException('Keine Berechtigung');
    }
    return post;
  }

  private serializePost(p: any, memberId: string) {
    const { likes, media, ...rest } = p;
    return {
      ...rest,
      likedByMe: Array.isArray(likes) && likes.length > 0,
      media: (media || []).map((pm: any) => ({
        id: pm.media?.id,
        url: pm.media?.url,
        thumbUrl: pm.media?.thumbUrl,
        mimeType: pm.media?.mimeType,
        position: pm.position,
      })),
    };
  }
}
