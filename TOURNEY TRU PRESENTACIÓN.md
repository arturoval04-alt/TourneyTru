# TOURNEY TRU — Presentación Oficial del Proyecto

> Creado por **Arturo** · Plataforma de gestión y transmisión de torneos de béisbol y sóftbol con marcador en vivo
> **Versión 1.1 — Actualizado: 9 de abril de 2026**
> **Sitio web:** `tourneytru.com`
> **Redes sociales:** Instagram · Facebook · WhatsApp

---

# PARTE 1 — PARA MARKETING, DISEÑO Y VENTAS

> Este documento ya está alineado al estado actual del producto. Sirve como base para campañas, pitch deck, textos comerciales, demo scripts, posts, reels y presentaciones de lanzamiento.

---

## ¿Qué es Tourney Tru?

Tourney Tru es una **plataforma web profesional para administrar ligas y torneos de béisbol y sóftbol, registrar juegos en vivo y compartir la experiencia con jugadores, aficionados y streamers en tiempo real**.

Permite que una liga:
- Cree sus ligas, torneos, equipos y calendarios
- Lleve el score jugada por jugada desde tablet o laptop
- Genere estadísticas automáticas de jugadores y equipos
- Muestre un gamecast público en vivo
- Use overlays para transmisiones en streaming
- Mantenga control de acceso, privacidad y operación por roles

Todo desde navegador, sin instalar app.

---

## El problema que resuelve

Hoy, muchísimas ligas amateur y semiprofesionales siguen operando con:
- Hojas de papel
- Grupos de WhatsApp
- Fotos del pizarrón
- Estadísticas manuales
- Transmisiones sin marcador profesional

Eso provoca:
- Información dispersa
- Errores en roster, alineaciones y resultados
- Cero historial confiable de estadísticas
- Mala experiencia para aficionados y streamers

**Tourney Tru centraliza la operación completa del torneo y convierte cada juego en una experiencia digital profesional.**

---

## Propuesta de valor

| Para quién | Lo que obtiene |
|---|---|
| **Organizadores** | Gestión integral de ligas, torneos, equipos, calendarios, permisos y documentos |
| **Anotadores / Scorekeepers** | Panel profesional para registrar jugadas, cambios y boxscore en vivo |
| **Delegados de equipo** | Control del roster, documentos y operación de su equipo |
| **Streamers** | Overlay en tiempo real y panel para transmisión |
| **Jugadores** | Perfil con historial, estadísticas y participación por torneo |
| **Aficionados** | Seguimiento del juego en vivo desde cualquier dispositivo, sin crear cuenta |

---

## Tipos de usuario del sistema

### 1. Administrador
Controla toda la plataforma. Gestiona usuarios, planes, ligas y soporte operativo.

### 2. Organizador
Crea y administra ligas, torneos, equipos, juegos, organizadores y configuración general.

### 3. Scorekeeper
Registra el juego en vivo: jugadas, outs, carreras, conteo, cambios y cierre del juego.

### 4. Delegado
Representa a un equipo dentro de un torneo. Puede gestionar jugadores, documentos y operación del roster según permisos.

### 5. Streamer
Usa el overlay y herramientas de transmisión para mostrar marcador profesional en vivo.

### 6. Público general
Consulta ligas, torneos, equipos, jugadores y juegos públicos sin necesidad de cuenta.

---

## Flujo de uso

```text
PASO 1: El organizador crea la liga y el torneo
        → Configura nombre, sede, deporte, privacidad, imágenes y reglas

PASO 2: Registra equipos, delegados y jugadores
        → Puede importar roster, cargar documentos y validar participación

PASO 3: Programa los juegos
        → Define fecha, hora, campo, ampayers y transmisión

PASO 4: El día del juego, el scorekeeper anota en vivo
        → Registra jugadas, alineaciones, cambios y boxscore

PASO 5: El público sigue el partido
        → Gamecast público con marcador, inning, bases, lineups y play-by-play

PASO 6: Al terminar, el sistema consolida resultados y estadísticas
        → Standings, líderes, perfiles de jugador y resumen del juego
```

---

## Funcionalidades disponibles HOY

### Gestión de ligas y torneos
- Creación de ligas y torneos de béisbol, sóftbol y variantes
- Ligas y torneos públicos o privados
- Organizadores múltiples por torneo
- Campos / estadios por torneo
- Noticias del torneo
- Standings automáticos
- Portadas, logos e identidad visual
- Dashboard administrativo para operación diaria

### Gestión de equipos y jugadores
- Alta de equipos por torneo
- Perfil de equipo con roster, récord, próximos juegos y resultados
- Perfiles de jugador con estadísticas por torneo
- Directorio global de jugadores
- Jugadores verificados
- Participación multi-torneo mediante roster entries
- Delegados asignados por equipo
- Importación y administración masiva de jugadores
- Detección y fusión de duplicados

### Operación de juego
- Programación de juegos
- Asignación de ampayers
- Alineaciones completas
- Cambios y sustituciones con reglas del juego
- Registro play-by-play en tiempo real
- Boxscore en vivo
- Estado completo del juego con recuperación tras reconexión
- Carga manual de estadísticas cuando aplica
- Resumen final del juego y tirilla oficial

### Experiencia en vivo
- Gamecast público sin login
- Marcador en tiempo real
- Bases ocupadas, inning y conteo
- Alineaciones y seguimiento del turno al bate
- Historial de jugadas
- Overlay para streaming
- Panel streamer

### IA y automatización
- Escáner de alineación con IA usando Gemini
- Interpretación de foto de lineup para acelerar el inicio del juego

### Seguridad y control
- Autenticación por JWT en cookies `httpOnly`
- Refresh de sesión centralizado
- Roles y permisos por recurso
- Protección de contenido privado
- Validación de datos y control de acceso por liga, torneo, equipo y juego

---

## Diferenciadores clave

1. **Gamecast en vivo sin app**
El aficionado entra al link y sigue el juego al instante.

2. **Overlay real para streaming**
El streamer puede montar un marcador profesional sin una cabina de producción.

3. **Estadística viva y trazable**
Cada jugada alimenta resultados, boxscore, perfiles y standings.

4. **Operación por roles**
Organizador, delegado, scorekeeper, streamer y público conviven con permisos distintos.

5. **Privacidad configurable**
La liga o torneo puede decidir qué se publica y qué queda restringido.

---

## Roadmap priorizado

1. Notificaciones push para juegos y torneos
2. Exportación de estadísticas y reportes a PDF / Excel
3. Bracket visual de eliminación
4. App móvil enfocada en scorekeeping de campo
5. Auditoría y reportes operativos más avanzados
6. Mejoras visuales para overlays y transmisión

---

## Planes y modelo comercial

> Para marketing y ventas: usar la frase **"Contáctanos para recomendarte el plan ideal"**.

Actualmente la plataforma ya soporta lógica de planes y límites de uso por cuenta. A nivel comercial, la oferta puede empaquetarse así:

### Demo
- Ideal para probar la plataforma
- Uso limitado
- Enfoque de onboarding y validación

### Standard
- Para ligas activas con operación regular
- Gestión de torneo, equipos, jugadores, juegos y score en vivo

### Pro
- Para ligas con mayor volumen y operación constante
- Mayor capacidad y operación multi-torneo

### Custom
- Para ligas, academias, torneos especiales o necesidades a medida

### Admin / Interno
- Sin límites operativos
- Uso interno de plataforma

**Nota comercial:** los límites exactos y el pricing final se pueden ajustar por estrategia de lanzamiento sin cambiar la base del producto.

---

## Páginas principales de la plataforma

> Todas las imágenes de apoyo siguen referidas en `imagenes_tt/`.

### Home
- Hero principal con branding
- Exploración pública de ligas, torneos, equipos y jugadores
- CTA a explorar y registrarse

### Login / Registro
- Acceso por correo y contraseña
- Recuperación y cambio de contraseña

### Dashboard administrativo
- Gestión de perfil, ligas, torneos, equipos, jugadores, juegos, usuarios y plan

### Liga
- Vista de torneos, ampayers e información general

### Torneo
- Tabs de información, equipos, juegos, standings, estadísticas y acciones
- Gestión de organizadores, campos, noticias y documentos

### Equipo
- Perfil, roster, récord, calendario, estadísticas y operación del delegado

### Jugador
- Perfil individual, foto, número, posición, equipos y estadísticas por torneo

### Juego programado
- Vista previa antes del inicio del partido

### Panel de anotación
- Interfaz de scorekeeper para operación jugada por jugada

### Boxscore y resumen final
- Vista de tirilla, resultados y desempeño individual

### Gamecast público
- Vista optimizada para seguir el juego en vivo

### Overlay
- Vista especial para streaming

---

## Mercado objetivo

**Primario**
- Ligas de béisbol y sóftbol amateur y semiprofesional en México

**Secundario**
- Academias, torneos independientes, organizadores privados y streamers deportivos

**Entrada natural**
- Ligas locales y regionales que hoy operan con Excel, papel y WhatsApp

---

## Material sugerido para lanzamiento

### Redes sociales
- [ ] Post de lanzamiento oficial
- [ ] Carrusel: “Qué es Tourney Tru”
- [ ] Carrusel: “Cómo funciona un juego en vivo”
- [ ] Reel del gamecast en vivo
- [ ] Reel del panel de scorekeeper
- [ ] Post para delegados de equipo
- [ ] Post para streamers y overlays
- [ ] Post de beneficios para organizadores

### Pitch deck
- [ ] Slide 1: Portada y propuesta
- [ ] Slide 2: Problema actual del mercado
- [ ] Slide 3: Solución Tourney Tru
- [ ] Slide 4: Roles del sistema
- [ ] Slide 5: Flujo operativo
- [ ] Slide 6: Demo visual de producto
- [ ] Slide 7: Gamecast y experiencia del aficionado
- [ ] Slide 8: Streamers y overlay
- [ ] Slide 9: Modelo comercial
- [ ] Slide 10: Próximos pasos y contacto

---

# PARTE 2 — PARA DESARROLLO, OPERACIÓN Y PRODUCTO

## Stack tecnológico actual

| Capa | Tecnología |
|---|---|
| Backend | NestJS + TypeScript |
| Base de datos | SQL Server (MSSQL) |
| ORM | Prisma |
| Frontend | Next.js 16 + React 19 |
| Estilos | Tailwind CSS v4 |
| Tiempo real | Socket.IO |
| Estado global | Zustand |
| Cliente HTTP | Axios |
| Autenticación | JWT + cookies `httpOnly` |
| IA | Google Gemini 2.5 Flash |
| Infraestructura web | Frontend compatible con despliegue en Vercel |

---

## Estructura general del proyecto

```text
ScoreKeeper/
├── backend/        ← API REST + WebSocket
├── frontend/       ← Aplicación web
├── backend/prisma/ ← Schema y migraciones
├── *.sql           ← Scripts auxiliares
└── README.md
```

---

## Backend — Módulos principales

```text
src/
├── auth/         ← login, registro, refresh, seguridad
├── leagues/      ← ligas
├── tournaments/  ← torneos, organizadores, campos, noticias
├── teams/        ← equipos
├── players/      ← jugadores, perfiles, verificación, duplicados
├── roster/       ← participación de jugadores por equipo / torneo
├── games/        ← juegos, lineups, boxscore, stream, manual stats
├── live/         ← gateway WebSocket para operación en vivo
├── documents/    ← documentos asociados a torneos y operación
├── delegates/    ← delegados por equipo
├── umpires/      ← ampayers
├── users/        ← usuarios, roles, límites y plan
├── vision/       ← escáner de alineación con IA
├── common/       ← tipos, guards y utilidades
└── prisma/       ← acceso a base de datos
```

### Núcleo de negocio

#### `games/`
Concentra buena parte de la lógica del deporte:
- Alineaciones
- Orden al bate
- Cambios y reingresos
- Registro de jugadas
- Cálculo de estado vivo
- Boxscore, stream y cierre del juego

#### `live/live.gateway.ts`
Maneja la experiencia en tiempo real:
- Unión a sala por juego
- Registro de jugadas
- Sincronización de estado
- Recuperación completa del juego al reconectar
- Persistencia del estado vivo para evitar pérdida de contexto

#### `players/` + `roster/`
Soportan:
- Perfil global de jugador
- Participación en múltiples torneos
- Verificación
- Fusión de registros duplicados

---

## Seguridad del sistema

### Autenticación
- `accessToken` y `refreshToken` manejados por cookie
- Cookies `httpOnly`
- Sesión renovable desde frontend sin exponer tokens a scripts del navegador

### Autorización
- Validación de acceso por recurso
- Protección para mutaciones sensibles de torneos y juegos
- Restricciones por rol y por contexto real del torneo / equipo

### Privacidad
- Ligas y torneos pueden ser públicos o privados
- Los recursos relacionados respetan ese mismo nivel de visibilidad

### Validación
- Validación estructurada de DTOs en backend
- Manejo centralizado de errores y refresh de sesión en frontend

---

## Modelos principales de datos

```text
User
League
Tournament
TournamentOrganizer
TournamentNews
Field
Team
Delegate
Player
RosterEntry
Document
Game
Lineup
LineupChange
Play
PlayerStat
GameUmpire
Plan
Subscription
```

### Capacidades clave del modelo
- Un jugador puede tener historial en varios torneos
- Un torneo puede tener múltiples organizadores
- Un equipo puede tener delegado
- Un juego puede almacenar estado vivo persistido
- Los documentos pueden vincularse al contexto operativo del torneo
- Los planes limitan el uso según reglas del negocio

---

## Frontend — Arquitectura actual

La aplicación usa App Router de Next.js y combina vistas públicas, privadas y de operación.

### Rutas importantes

```text
src/app/
├── page.tsx                    ← home
├── (auth)/                     ← login, register, forgot, reset, change-password
├── admin/dashboard/            ← panel administrativo
├── delegado/                   ← experiencia de delegado
├── delegado/equipo/[teamId]/   ← operación del delegado por equipo
├── (score)/game/[id]/          ← anotación en vivo
├── gamecast/[id]/              ← gamecast público
├── gamecast/[id]/overlay/      ← overlay para stream
├── gamescheduled/[id]/         ← pre-juego
├── gamefinalizado/[id]/        ← post-juego
├── manual-stats/[id]/          ← captura manual de estadísticas
├── ligas/                      ← exploración pública de ligas
├── torneos/                    ← exploración pública de torneos
├── equipos/                    ← exploración pública de equipos
└── jugadores/                  ← exploración pública de jugadores
```

### Estado de juego

`frontend/src/store/gameStore.ts` concentra:
- Estado del inning y conteo
- Bases ocupadas
- Lineups
- Historial de jugadas
- Reconexión del socket
- Resincronización completa del juego

### Cliente API

`frontend/src/lib/api.ts` y `frontend/src/lib/auth.ts` resuelven:
- Manejo de sesión con cookies
- Refresh automático
- Reintento tras `401`
- Limpieza de sesión y redirección a login cuando corresponde

### Proxy

La aplicación ya usa `frontend/src/proxy.ts` para compatibilidad moderna con Next.js.

---

## Variables de entorno

### Backend
```env
DATABASE_URL="sqlserver://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,https://tourneytru.com"
FRONTEND_URL="http://localhost:3000"
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Ejecución local

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Infraestructura y operación

- Frontend listo para despliegue web moderno
- Backend con API REST y WebSocket
- Compatible con exposición segura mediante túnel o despliegue controlado
- Arquitectura pensada para operación continua de juegos en vivo

---

## Estado actual del proyecto

Al 9 de abril de 2026, el proyecto ya cuenta con:
- `build` de backend en verde
- `build` de frontend en verde
- suite de pruebas backend pasando
- lint frontend sin errores bloqueantes
- flujo de auth actualizado con cookies
- recuperación de estado en vivo endurecida
- permisos sensibles reforzados en torneos, juegos y perfiles privados

---

## Próximos pasos de producto

1. Publicar versión comercial con onboarding guiado
2. Afinar pricing y empaquetado comercial
3. Mejorar exportables y reporting
4. Elevar experiencia de mobile scorekeeping
5. Expandir el módulo streamer y herramientas de broadcast

---

## Contacto del creador

**Arturo** — creador y desarrollador principal de Tourney Tru

- Sitio: `tourneytru.com`
- Redes: Instagram · Facebook

---

*Documento actualizado el 9 de abril de 2026 — Versión 1.1*
