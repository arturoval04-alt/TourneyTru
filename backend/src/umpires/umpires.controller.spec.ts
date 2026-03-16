import { Test, TestingModule } from '@nestjs/testing';
import { UmpiresController } from './umpires.controller';

describe('UmpiresController', () => {
  let controller: UmpiresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UmpiresController],
    }).compile();

    controller = module.get<UmpiresController>(UmpiresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
