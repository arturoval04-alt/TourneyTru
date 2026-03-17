import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [LiveGateway]
})
export class LiveModule { }
