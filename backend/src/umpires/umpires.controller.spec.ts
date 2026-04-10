import { Test, TestingModule } from '@nestjs/testing';
import { UmpiresController } from './umpires.controller';
import { UmpiresService } from './umpires.service';

describe('UmpiresController', () => {
  let controller: UmpiresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UmpiresController],
      providers: [{ provide: UmpiresService, useValue: {} }],
    }).compile();

    controller = module.get<UmpiresController>(UmpiresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
