import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyController } from './emergency.controller';

@Module({
  imports: [JwtModule_, NotificationsModule],
  controllers: [EmergencyController],
})
export class EmergencyModule {}
