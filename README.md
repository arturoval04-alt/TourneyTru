# ScoreKeeper

Aplicación para llevar la puntuación y el tablero en vivo de partidos deportivos.

## Requisitos previos

- Node.js (preferentemente v18+)
- NPM o Yarn

## Estructura del Proyecto

El proyecto ha sido migrado a una arquitectura **Serverless con Supabase**:
- **`frontend`**: Aplicación principal construida con Next.js, React y Tailwind CSS. Utiliza Supabase para autenticación, base de datos y tiempo real.
- **`backend`**: (Legacy) Anteriormente utilizado para la lógica de servidor, ahora reemplazado por Supabase y Route Handlers nativos de Next.js.

## Configuración y Ejecución

Ya no es necesario ejecutar un servidor backend por separado. Todo funciona a través del frontend conectado a Supabase.

### Paso 1: Configurar Variables de Entorno
Asegúrate de tener un archivo `.env.local` dentro de la carpeta `frontend` con las siguientes variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase
```

### Paso 2: Ejecutar el Proyecto
1. Abre una terminal en la raíz del proyecto.
2. Navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
3. Instala las dependencias (si no lo has hecho):
   ```bash
   npm install
   ```
4. Inicia la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```

### Paso 3: Abrir la Aplicación
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.


### Paso 3: Abrir la Aplicación


