import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma/prisma.service';
import { DelegatesService } from '../delegates/delegates.service';
import { LeaguesService } from '../leagues/leagues.service';

describe('PlayersService', () => {
  let service: PlayersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: PrismaService, useValue: {} },
        { provide: DelegatesService, useValue: {} },
        { provide: LeaguesService, useValue: {} },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
