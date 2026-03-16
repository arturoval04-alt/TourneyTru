import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar la validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remueve las propiedades no definidas en los DTOs
    forbidNonWhitelisted: true, // Lanza error si llegan propiedades no permitidas
    transform: true // Transforma payloads acorde a los tipos de los DTOs
  }));

  // Aumentar el límite de tamaño para subida de imágenes Base64
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors(); // Fundamental para SaaS
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
