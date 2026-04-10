import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { DelegatesModule } from '../delegates/delegates.module';

@Module({
  imports: [DelegatesModule],
  providers: [TeamsService],
  controllers: [TeamsController]
})
export class TeamsModule {}
