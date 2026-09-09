import { Module } from '@nestjs/common';
import { AuthController, SmsService } from './auth.controller';
import { PasskeyController } from './passkey.controller';
import { HealthController } from './health.controller';
import { JwtModule_ } from '../../common/jwt/jwt.module';

@Module({
  imports: [JwtModule_],
  controllers: [AuthController, PasskeyController, HealthController],
  providers: [SmsService],
  exports: [SmsService],
})
export class AuthModule {}
