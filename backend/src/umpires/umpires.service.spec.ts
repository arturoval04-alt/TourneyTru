import { Test, TestingModule } from '@nestjs/testing';
import { UmpiresService } from './umpires.service';

describe('UmpiresService', () => {
  let service: UmpiresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UmpiresService],
    }).compile();

    service = module.get<UmpiresService>(UmpiresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
