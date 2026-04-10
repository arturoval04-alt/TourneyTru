import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';
import { LiveGateway } from '../live/live.gateway';

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: {} },
        { provide: LiveGateway, useValue: { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
