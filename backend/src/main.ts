import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://tourneytru.vercel.app', // Pon aquí TU enlace real de Vercel
      'http://localhost:3000',         // Para cuando pruebes en tu laptop
    ],
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Límite de tamaño para imágenes Base64
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // CORS — en producción reemplazar origin con el dominio real
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://tourneytru.vercel.app'];

  app.enableCors({
    origin: true, // Esto acepta automáticamente la URL que lo esté llamando (Vercel)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
