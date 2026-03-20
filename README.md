# ScoreKeeper

Aplicación para llevar la puntuación y el tablero en vivo de partidos deportivos.

## Requisitos previos

- Node.js (preferentemente v18+)
- NPM o Yarn

## Estructura del Proyecto

El proyecto se divide en dos partes principales:
- **`backend`**: API construida con NestJS y Prisma para la base de datos (SQLite en modo desarrollo y WebSockets para tiempo real).
- **`frontend`**: Interfaz de usuario construida con Next.js y React.

## Instalación Inicial

Si es la primera vez que clonas o descargas el proyecto, necesitas instalar las dependencias en ambas carpetas.

Desde la carpeta raíz del proyecto (`ScoreKeeper`):

1. **Dependencias del Backend:**
   ```bash
   cd backend
   npm install
   ```
2. **Dependencias del Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

*Nota: La base de datos local SQLite ya se encuentra en el proyecto (`backend/dev.db`), pero si necesitas reiniciarla puedes ejecutar `npx prisma db push` o `npx prisma migrate dev` dentro de la carpeta `backend`.*

---

## Instrucciones para Ejecutar el Proyecto (Paso a Paso)

Para que la aplicación funcione correctamente, debes ejecutar **tanto el backend como el frontend al mismo tiempo**. Para esto se recomienda abrir dos terminales distintas.

### Paso 1: Iniciar el Backend

1. Abre una terminal.
2. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```
3. Inicia el servidor:
   ```bash
   npm run start:dev
   ```
4. Verás en la consola mensajes indicando que NestJS y los servicios de WebSockets (Socket.io) se han iniciado correctamente. Deja esta terminal abierta.

### Paso 2: Iniciar el Frontend

1. Abre una **nueva** terminal (o pestaña).
2. Navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
3. Inicia la aplicación:
   ```bash
   npm run dev
   ```
4.

### Paso 3: Abrir la Aplicación


