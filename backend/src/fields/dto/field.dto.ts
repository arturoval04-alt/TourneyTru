import { IsString, IsBoolean, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CreateFieldDto {
  @IsString()
  leagueId: string;

  @IsOptional()
  @IsString()
  sportsUnitId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  sportsUnitId?: string;

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

export class CreateAvailabilityDto {
  @IsDateString()
  date: string;       // ISO date: 'YYYY-MM-DD'

  @IsString()
  startTime: string;  // 'HH:mm'

  @IsString()
  endTime: string;    // 'HH:mm'

  @IsOptional()
  @IsIn(['available', 'blocked', 'reserved'])
  type?: 'available' | 'blocked' | 'reserved';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsIn(['available', 'blocked', 'reserved'])
  type?: 'available' | 'blocked' | 'reserved';

  @IsOptional()
  @IsString()
  notes?: string;
}
