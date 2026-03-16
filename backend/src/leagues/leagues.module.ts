import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';

@Module({
  providers: [LeaguesService],
  controllers: [LeaguesController]
})
export class LeaguesModule {}
