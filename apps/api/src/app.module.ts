import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from './common/common.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { PostsModule } from './modules/posts/posts.module';
import { MessagesModule } from './modules/messages/messages.module';
import { EventsModule } from './modules/events/events.module';
import { PollsModule } from './modules/polls/polls.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { MediaModule } from './modules/media/media.module';
import { AdminModule } from './modules/admin/admin.module';

// JwtModule als Global, damit alle Module JwtService injekten können
// ohne JwtModule explizit zu importieren
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'change-me-32-chars-minimum-secret',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      }),
    }),
  ],
  exports: [JwtModule],
})
class JwtGlobalModule {}

@Module({
  imports: [
    CommonModule,
    JwtGlobalModule,
    AuthModule,
    MembersModule,
    PostsModule,
    MessagesModule,
    EventsModule,
    PollsModule,
    EmergencyModule,
    MediaModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Tenant-Middleware auf alle API-Routes
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
