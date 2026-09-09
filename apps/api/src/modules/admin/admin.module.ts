import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [JwtModule_],
  controllers: [AdminController],
})
export class AdminModule {}
