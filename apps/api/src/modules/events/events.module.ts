import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsController } from './events.controller';

@Module({
  imports: [JwtModule_, NotificationsModule],
  controllers: [EventsController],
})
export class EventsModule {}
