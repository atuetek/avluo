// MembersModule: MembersController + JwtVerifier
//
// Phase 1 minimal: JWT wird vom übergeordneten JwtModule (in AppModule) bereitgestellt.
// JwtVerifier ist ein Helper-Service, der in mehreren Controllern verwendet wird.

import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { JwtModule_ } from '../../common/jwt/jwt.module';

@Module({
  imports: [JwtModule_],
  controllers: [MembersController],
})
export class MembersModule {}