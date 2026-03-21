# ScoreKeeper - Nueva Arquitectura

Aplicación avanzada para la gestión de torneos deportivos, anotaciones en vivo y sabermetría.

## 🏗️ Arquitectura Actual

El proyecto ha sido migrado de un modelo serverless (Supabase) a una arquitectura robusta de servidor:

- **Frontend**: Next.js (React, Tailwind CSS) - Ubicado en `/frontend`.
- **Backend**: NestJS (Node.js framework) - Ubicado en `/backend`.
- **Base de Datos**: SQL Server (Local/Remoto) gestionado mediante **Prisma ORM**.
- **Conectividad**: Cloudflare Tunnel para exponer de forma segura el backend local al frontend (ej. Vercel).

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos
- Node.js v18+
- SQL Server (Instancia local o remota)
- Cloudflare Tunnel (`cloudflared`) instalado para acceso externo.

### 2. Configuración del Backend
1. Navega a `backend/`.
2. Copia `.env.example` a `.env` y configura tu `DATABASE_URL`.
3. Instala dependencias e inicia el servidor:
   ```bash
   npm install
   npm run start:dev
   ```
4. Sincroniza la base de datos (si es necesario):
   ```bash
   npx prisma db push
   ```

### 3. Configuración del Frontend
1. Navega a `frontend/`.
2. Configura `.env.local` con la URL de tu API:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001 # O tu URL de Cloudflare
   ```
3. Instala dependencias e inicia:
   ```bash
   npm install
   npm run dev
   ```

## 🛠️ Tecnologías Utilizadas
- **Lenguaje**: TypeScript
- **Frameworks**: NestJS, Next.js
- **ORM**: Prisma (SQL Server)
- **Estilos**: Tailwind CSS
- **Autenticación**: JWT (JSON Web Tokens)
- **Comunicación**: Axios con Interceptores

## 📡 Túnel de Cloudflare
Para configurar el acceso externo:
1. Ejecuta `cloudflared tunnel run <nombre-del-túnel>`.
2. Asegúrate de que el tráfico se redirija a `http://localhost:3001`.
3. Actualiza `ALLOWED_ORIGINS` en el `.env` del backend para permitir el dominio de tu frontend.
