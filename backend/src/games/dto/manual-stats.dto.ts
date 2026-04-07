import { IsString, IsOptional, IsInt, IsUUID, IsArray, ValidateNested, IsIn, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualBatterEntryDto {
    @IsUUID()
    playerId: string;

    @IsArray()
    @IsString({ each: true })
    results: string[]; // e.g. ["H1", "K", "6-3", "BB", "HR"]

    @IsInt()
    @Min(0)
    runs: number;

    @IsInt()
    @Min(0)
    rbi: number;
}

export class ManualPitcherEntryDto {
    @IsUUID()
    playerId: string;

    @IsInt()
    @Min(0)
    ipOuts: number; // total outs recorded (6 = 2.0 IP)

    @IsInt()
    @Min(0)
    hits: number;

    @IsInt()
    @Min(0)
    runs: number;

    @IsInt()
    @Min(0)
    earnedRuns: number;

    @IsInt()
    @Min(0)
    bb: number;

    @IsInt()
    @Min(0)
    so: number;
}

export class ManualRunsByInningDto {
    @IsInt()
    @Min(1)
    inning: number;

    @IsIn(['top', 'bottom'])
    half: string;

    @IsInt()
    @Min(0)
    runs: number;
}

export class SubmitManualStatsDto {
    @IsInt()
    @Min(0)
    homeScore: number;

    @IsInt()
    @Min(0)
    awayScore: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualBatterEntryDto)
    awayBatters: ManualBatterEntryDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualBatterEntryDto)
    homeBatters: ManualBatterEntryDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualPitcherEntryDto)
    awayPitchers: ManualPitcherEntryDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualPitcherEntryDto)
    homePitchers: ManualPitcherEntryDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualRunsByInningDto)
    runsByInning: ManualRunsByInningDto[];

    @IsOptional()
    @IsString()
    winningPitcherId?: string;

    @IsOptional()
    @IsString()
    losingPitcherId?: string;

    @IsOptional()
    @IsString()
    savePitcherId?: string;

    @IsOptional()
    @IsString()
    mvpBatter1Id?: string;

    @IsOptional()
    @IsString()
    mvpBatter2Id?: string;
}
