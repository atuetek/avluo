// AuthModule: AuthController + SmsService
//
// Phase 1 minimal: SMS via Logging, später Netgsm
// JwtModule ist global im AppModule, kein expliziter Import nötig

import { Module } from '@nestjs/common';
import { AuthController, SmsService } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [SmsService],
  exports: [SmsService],
})
export class AuthModule {}