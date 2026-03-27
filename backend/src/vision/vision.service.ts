import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ScanLineupDto } from './dto/scan-lineup.dto';

export interface LineupPlayer {
  name: string;
  position: string;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  async scanLineup(dto: ScanLineupDto): Promise<LineupPlayer[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
      throw new InternalServerErrorException('GEMINI_API_KEY no está configurada en el servidor.');
    }

    this.logger.log(`Usando Gemini API key: ${apiKey.substring(0, 8)}...`);

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    // Agrega esto temporalmente para ver qué modelos tienes permitidos
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    this.logger.log(`Modelo: ${model}`);

    const prompt =
      'Extrae el lineup de béisbol/sóftbol de esta imagen. Devuelve una lista de jugadores. ' +
      "Para cada jugador, identifica su nombre ('name') y su posición ('position'). " +
      "Las posiciones válidas son P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, DP, FLEX, SF, BE. " +
      "Si no encuentras una posición clara, asigna 'P'. " +
      'Devuelve SOLO el JSON array, sin texto adicional.';

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: dto.mimeType, data: dto.imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              position: { type: 'STRING' },
            },
            required: ['name', 'position'],
          },
        },
      },
    };

    // Retry con backoff exponencial (hasta 3 intentos)
    const delays = [1000, 3000, 8000];
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(`Gemini API error (${response.status}): ${errorBody}`);
          throw new Error(`Gemini API HTTP ${response.status}`);
        }

        const result = await response.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error('Gemini devolvió una respuesta vacía');
        }

        const parsed: LineupPlayer[] = JSON.parse(textResponse);
        this.logger.log(`Gemini extrajo ${parsed.length} jugadores del lineup`);
        return parsed;
      } catch (err) {
        lastError = err;
        this.logger.warn(`Intento ${attempt + 1}/3 falló: ${err.message}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }

    this.logger.error('Todos los intentos de Gemini fallaron', lastError);
    throw new InternalServerErrorException(
      'No se pudo procesar la imagen. Intenta de nuevo o ingresa los datos manualmente.',
    );
  }
}
