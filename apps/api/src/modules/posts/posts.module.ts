import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsController } from './posts.controller';

@Module({
  imports: [JwtModule_, NotificationsModule],
  controllers: [PostsController],
})
export class PostsModule {}
