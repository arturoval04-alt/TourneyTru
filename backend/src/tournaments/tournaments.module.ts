import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { DelegatesModule } from '../delegates/delegates.module';

@Module({
  imports: [DelegatesModule],
  providers: [TournamentsService],
  controllers: [TournamentsController]
})
export class TournamentsModule {}
