import { Module } from '@nestjs/common';
import { JwtModule_ } from '../../common/jwt/jwt.module';
import { MediaController } from './media.controller';

@Module({
  imports: [JwtModule_],
  controllers: [MediaController],
})
export class MediaModule {}
