import { IsString, IsOptional, IsInt, IsUUID, IsIn, MaxLength, Min, Max } from 'class-validator';

export class CreatePlayerDto {
    @IsString()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @MaxLength(50)
    lastName: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    number?: number;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    position?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional()
    @IsIn(['R', 'L'])
    throws?: string;

    @IsUUID()
    teamId: string;
}

export class UpdatePlayerDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    number?: number;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    position?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional()
    @IsIn(['R', 'L'])
    throws?: string;

    @IsOptional()
    @IsUUID()
    teamId?: string;
}
