import { IsUUID, IsOptional, IsInt, IsString, MaxLength, Min, Max } from 'class-validator';

export class AddRosterEntryDto {
    @IsUUID()
    playerId: string;

    @IsUUID()
    teamId: string;

    @IsUUID()
    tournamentId: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    number?: number;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    position?: string;
}

export class UpdateRosterEntryDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    number?: number | null;
}
