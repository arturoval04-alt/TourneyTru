import { IsString, IsNotEmpty } from 'class-validator';

export class ScanLineupDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
