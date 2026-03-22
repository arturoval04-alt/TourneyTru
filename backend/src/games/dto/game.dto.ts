import { IsString, IsOptional, IsInt, IsUUID, IsDateString, IsArray, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameDto {
    @IsUUID()
    tournamentId: string;

    @IsUUID()
    homeTeamId: string;

    @IsUUID()
    awayTeamId: string;

    @IsDateString()
    scheduledDate: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    field?: string;

    @IsOptional()
    @IsString()
    umpirePlate?: string;

    @IsOptional()
    @IsString()
    umpireBase1?: string;

    @IsOptional()
    @IsString()
    umpireBase2?: string;

    @IsOptional()
    @IsString()
    umpireBase3?: string;
}

export class UpdateGameDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsInt()
    homeScore?: number;

    @IsOptional()
    @IsInt()
    awayScore?: number;

    @IsOptional()
    @IsInt()
    currentInning?: number;

    @IsOptional()
    @IsString()
    half?: string;

    @IsOptional()
    @IsDateString()
    endTime?: string;

    @IsOptional()
    @IsString()
    winningPitcherId?: string;

    @IsOptional()
    @IsString()
    mvpBatter1Id?: string;

    @IsOptional()
    @IsString()
    mvpBatter2Id?: string;
}

export class CreateLineupDto {
    @IsOptional()
    battingOrder: number;

    @IsOptional()
    position: string;

    @IsOptional()
    dhForPosition?: string;

    @IsOptional()
    isStarter?: boolean;

    @IsOptional()
    teamId?: string;

    @IsOptional()
    playerId: string;
}

export class SetGameLineupDto {
    @IsOptional()
    @IsArray()
    lineups: CreateLineupDto[];
}

export class ChangeLineupDto {
    @IsUUID()
    teamId: string;

    @IsInt()
    battingOrder: number;

    @IsUUID()
    playerInId: string;

    @IsOptional()
    @IsUUID()
    playerOutId?: string;

    @IsString()
    position: string;

    @IsOptional()
    @IsString()
    dhForPosition?: string;
}

export class AssignUmpireDto {
    @IsUUID()
    umpireId: string;

    @IsOptional()
    @IsIn(['plate', 'base1', 'base2', 'base3'])
    role?: string;
}
