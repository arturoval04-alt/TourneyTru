import { IsString, IsOptional, IsInt, IsUUID, IsIn, IsBoolean, IsArray, ValidateNested, MaxLength, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Crear jugador (identidad + membresía inicial) ────────────────────────────
export class CreatePlayerDto {
    // Identidad
    @IsString() @MaxLength(50)
    firstName: string;

    @IsString() @MaxLength(50)
    lastName: string;

    @IsOptional() @IsString() @MaxLength(50)
    secondLastName?: string;

    @IsOptional() @IsString() @MaxLength(18)
    curp?: string;

    @IsOptional() @IsDateString()
    birthDate?: string;

    @IsOptional() @IsIn(['M', 'F', 'O'])
    sex?: string;

    // Atributos deportivos
    @IsOptional() @IsString() @MaxLength(10)
    position?: string;

    @IsOptional() @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional() @IsIn(['R', 'L'])
    throws?: string;

    @IsOptional() @IsString()
    photoUrl?: string;

    // Membresía inicial (para crear el RosterEntry)
    @IsUUID()
    teamId: string;

    @IsUUID()
    tournamentId: string;

    @IsOptional() @IsInt() @Min(0) @Max(99)
    number?: number;

    // Override de duplicado
    @IsOptional() @IsBoolean()
    forceCreate?: boolean;
}

// ─── Actualizar jugador ───────────────────────────────────────────────────────
export class UpdatePlayerDto {
    @IsOptional() @IsString() @MaxLength(50)
    firstName?: string;

    @IsOptional() @IsString() @MaxLength(50)
    lastName?: string;

    @IsOptional() @IsString() @MaxLength(50)
    secondLastName?: string;

    @IsOptional() @IsString() @MaxLength(18)
    curp?: string;

    @IsOptional() @IsDateString()
    birthDate?: string;

    @IsOptional() @IsIn(['M', 'F', 'O'])
    sex?: string;

    @IsOptional() @IsString() @MaxLength(10)
    position?: string;

    @IsOptional() @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional() @IsIn(['R', 'L'])
    throws?: string;

    @IsOptional() @IsString()
    photoUrl?: string;

    @IsOptional() @IsBoolean()
    isVerified?: boolean;

    // Campos temporales para actualizar RosterEntry al mismo tiempo que el Jugador
    @IsOptional() @IsInt() @Min(0) @Max(99)
    number?: number;

    @IsOptional() @IsUUID()
    teamId?: string;

    @IsOptional() @IsUUID()
    tournamentId?: string;
}

// ─── Importación masiva ───────────────────────────────────────────────────────
export class BulkPlayerItem {
    @IsString() @MaxLength(50)
    firstName: string;

    @IsString() @MaxLength(50)
    lastName: string;

    @IsOptional() @IsString() @MaxLength(50)
    secondLastName?: string;

    @IsOptional() @IsString() @MaxLength(18)
    curp?: string;

    @IsOptional() @IsDateString()
    birthDate?: string;

    @IsOptional() @IsIn(['M', 'F', 'O'])
    sex?: string;

    @IsOptional() @IsInt() @Min(0) @Max(99)
    number?: number;

    @IsOptional() @IsString() @MaxLength(10)
    position?: string;

    @IsOptional() @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional() @IsIn(['R', 'L'])
    throws?: string;
}

export class BulkCreatePlayersDto {
    @IsUUID()
    teamId: string;

    @IsUUID()
    tournamentId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkPlayerItem)
    players: BulkPlayerItem[];
}

// ─── Confirmar importación (2 listas: nuevos + reutilizables) ─────────────────
export class RosterLinkItem {
    @IsUUID()
    playerId: string;

    @IsOptional() @IsInt() @Min(0) @Max(99)
    number?: number;

    @IsOptional() @IsString() @MaxLength(10)
    position?: string;
}

export class ConfirmImportDto {
    @IsUUID()
    teamId: string;

    @IsUUID()
    tournamentId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkPlayerItem)
    toCreate: BulkPlayerItem[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RosterLinkItem)
    toRoster: RosterLinkItem[];
}
