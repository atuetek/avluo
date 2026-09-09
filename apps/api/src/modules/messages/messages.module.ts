import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';

@Module({
  imports: [JwtModule_, NotificationsModule],
  controllers: [MessagesController],
})
export class MessagesModule {}
