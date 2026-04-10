import { IsString, IsBoolean, IsOptional, IsArray, IsNumber, IsInt, Min, Max } from 'class-validator';

export interface ScheduleConfig {
  slots: string[];             // ['19:00', '21:00']
  avgDurationMinutes: number;  // duración promedio de un juego (ej. 120)
  minGapMinutes: number;       // brecha mínima entre juegos del mismo campo (ej. 30)
  allowOverlap: boolean;       // si false, bloquea juegos superpuestos
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  slots: ['19:00', '21:00'],
  avgDurationMinutes: 120,
  minGapMinutes: 30,
  allowOverlap: false,
};

export class CreateSportsUnitDto {
  @IsString()
  leagueId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSportsUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduleConfigDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slots?: string[];

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(360)
  avgDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  minGapMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowOverlap?: boolean;
}
