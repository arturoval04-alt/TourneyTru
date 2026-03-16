import { Test, TestingModule } from '@nestjs/testing';
import { LeaguesController } from './leagues.controller';

describe('LeaguesController', () => {
  let controller: LeaguesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaguesController],
    }).compile();

    controller = module.get<LeaguesController>(LeaguesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
