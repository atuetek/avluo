// MembersModule: MembersController + JWT-Service
//
// Phase 1 minimal: JWT wird vom übergeordneten JwtModule (in AppModule) bereitgestellt.
// Später: eigene Members-Logic (Profile-Update, Member-Liste) in separaten Services.

import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';

@Module({
  controllers: [MembersController],
})
export class MembersModule {}