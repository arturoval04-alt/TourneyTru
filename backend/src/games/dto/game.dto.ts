import { IsString, IsOptional, IsInt, IsUUID, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
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
    field?: string;
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
    @IsInt()
    battingOrder: number;

    @IsString()
    position: string;

    @IsOptional()
    @IsString()
    dhForPosition?: string;

    @IsOptional()
    @IsBoolean()
    isStarter?: boolean;

    @IsUUID()
    teamId: string;

    @IsUUID()
    playerId: string;
}

export class SetGameLineupDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLineupDto)
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

