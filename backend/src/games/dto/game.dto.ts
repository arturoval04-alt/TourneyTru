import { IsString, IsOptional, IsInt, IsUUID, IsDateString, IsArray, ValidateNested, IsBoolean, IsIn, Min, Max, MaxLength } from 'class-validator';
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
    @IsIn(['scheduled', 'in_progress', 'finished', 'cancelled'])
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    field?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    umpirePlate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    umpireBase1?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    umpireBase2?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    umpireBase3?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(15)
    maxInnings?: number;
}

export class UpdateGameDto {
    @IsOptional()
    @IsIn(['scheduled', 'in_progress', 'finished', 'cancelled'])
    status?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    homeScore?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    awayScore?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(15)
    currentInning?: number;

    @IsOptional()
    @IsIn(['top', 'bottom'])
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
    @IsInt()
    @Min(1)
    @Max(12)
    battingOrder: number;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    position: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    dhForPosition?: string;

    @IsOptional()
    @IsBoolean()
    isStarter?: boolean;

    @IsOptional()
    @IsUUID()
    teamId?: string;

    @IsOptional()
    @IsUUID()
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
    @Min(1)
    @Max(12)
    battingOrder: number;

    @IsUUID()
    playerInId: string;

    @IsOptional()
    @IsUUID()
    playerOutId?: string;

    @IsString()
    @MaxLength(10)
    position: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    dhForPosition?: string;
}

// ─── Cambios v2 ───────────────────────────────────────────────────────────────

export class CambioSustitucionDto {
    @IsUUID()
    teamId: string;

    @IsUUID()
    playerOutId: string;

    @IsUUID()
    playerInId: string;

    @IsString()
    @MaxLength(10)
    position: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    dhForPosition?: string;
}

export class PosicionSwapDto {
    @IsString()
    @MaxLength(10)
    fromPosition: string;

    @IsString()
    @MaxLength(10)
    toPosition: string;
}

export class CambioPosicionDto {
    @IsUUID()
    teamId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PosicionSwapDto)
    swaps: PosicionSwapDto[];
}

export class CambioReingresoDto {
    @IsUUID()
    teamId: string;

    @IsUUID()
    starterPlayerId: string;
}

export class AssignUmpireDto {
    @IsUUID()
    umpireId: string;

    @IsOptional()
    @IsIn(['plate', 'base1', 'base2', 'base3'])
    role?: string;
}
