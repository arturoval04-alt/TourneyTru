import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateDocumentDto {
    @IsString() @IsNotEmpty()
    tournamentId: string;

    @IsString() @IsNotEmpty()
    name: string;

    @IsString() @IsNotEmpty()
    fileUrl: string;

    @IsString()
    @IsIn(['pdf', 'csv', 'excel', 'image', 'other'])
    fileType: string;

    @IsString() @IsOptional()
    @IsIn(['convocatoria', 'reglas', 'modo_juego', 'general'])
    category?: string;
}
