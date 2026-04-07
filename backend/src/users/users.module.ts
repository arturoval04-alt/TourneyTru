import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
    imports: [PrismaModule, LeaguesModule],
    controllers: [UsersController],
    providers: [UsersService]
})
export class UsersModule { }
