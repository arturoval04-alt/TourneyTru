import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { LiveGateway } from './live.gateway';
import { PrismaService } from '../prisma/prisma.service';

describe('LiveGateway', () => {
  let gateway: LiveGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveGateway,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: { verify: jest.fn() } },
      ],
    }).compile();

    gateway = module.get<LiveGateway>(LiveGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
