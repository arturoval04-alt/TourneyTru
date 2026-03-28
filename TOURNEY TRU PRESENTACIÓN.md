# TOURNEY TRU — Presentación Oficial del Proyecto

> Creado por **Arturo** · Plataforma de gestión de torneos de béisbol y sóftbol con marcador en vivo

---

## ¿Qué es Tourney Tru?

Tourney Tru (ScoreKeeper internamente) es una plataforma web completa para **organizar y transmitir torneos de béisbol y sóftbol**. Permite a los organizadores crear torneos, registrar equipos y jugadores, y llevar el marcador de cada partido en tiempo real, mientras que el público puede seguir el juego desde cualquier dispositivo.

La plataforma está construida para cubrir todo el ciclo de un torneo:
desde la creación del torneo hasta la estadística final de cada jugador.

---

# PARTE 1 — PARA LOS USUARIOS

## ¿Quiénes usan Tourney Tru y para qué?

Hay tres tipos de personas que interactúan con la plataforma:

### 1. Organizadores de torneo
Crean y administran el torneo: agregan equipos, jugadores, programan juegos y asignan árbitros. Tienen acceso al panel de administración.

### 2. Scorekeepers (anotadores)
Son la persona en el estadio con la tableta o laptop. Llevan el marcador jugada a jugada durante el partido usando la interfaz de anotación. Registran hits, outs, carreras, cambios de alineación, y más.

### 3. Espectadores / Público
Siguen el partido en tiempo real desde su celular o computadora a través del **Gamecast** — una vista pública que muestra el marcador, las bases ocupadas, la alineación y el historial de jugadas.

---

## ¿Cómo se usa? (Flujo principal)

### Paso 1 — Crear el torneo
El organizador entra, crea un torneo con nombre, categoría (béisbol/sóftbol), sede y configuraciones de reglas.

### Paso 2 — Agregar equipos y jugadores
Se registran los equipos participantes y se carga el roster de cada equipo con nombre, número y posición de cada jugador.

### Paso 3 — Programar juegos
Se crean los partidos indicando equipo local, equipo visitante, fecha y árbitros asignados.

### Paso 4 — Llevar el marcador (Scorekeeper)
El anotador entra al panel del juego y:
- Configura la alineación (orden al bate y posiciones)
- Registra cada jugada: bola, strike, out, hit, carrera, cambio de jugador, etc.
- El sistema actualiza automáticamente el conteo, las bases, el marcador y las estadísticas

### Paso 5 — El público sigue el juego
Cualquier persona con el link del partido puede abrir el Gamecast y ver en tiempo real exactamente lo que el scorekeeper está registrando. No requiere cuenta ni login.

### Paso 6 — Estadísticas finales
Al terminar el torneo, cada jugador tiene su hoja de estadísticas completa: turnos al bate, hits, carreras impulsadas, promedio de bateo, innings lanzados, ponches, etc.

---

## Funcionalidades disponibles hoy

- Creación y gestión de torneos, equipos y jugadores
- Marcador en vivo con actualizaciones en tiempo real (WebSocket)
- Reconexión automática del WebSocket con resincronización de estado completo
- Registro completo de jugadas (hits, outs, errores, bases por bolas, ponches, etc.)
- Visualización del diamante con bases ocupadas
- Alineaciones, orden al bate, y posiciones defensivas
- Sustituciones, cambios de posición y reingresos (reentry rules)
- Asignación de árbitros por posición (home plate, 1B, 2B, 3B)
- Estadísticas individuales de bateo y pitcheo por juego y por torneo
- Gamecast público (sin login) para espectadores
- Perfiles de jugadores con foto real, iniciales como fallback y badge de número
- Ligas que agrupan torneos
- Noticias del torneo
- Notificaciones en pantalla (toasts) para errores de conexión y validación
- Página de error global y página 404 personalizadas
- Modo oscuro en toda la interfaz
- **Sistema de planes y cuotas**: cada usuario tiene límites configurables (ligas, torneos, equipos, jugadores); el backend lanza `QUOTA_EXCEEDED` y la UI deshabilita los botones de creación al alcanzar el límite
- **Tab "Mi Plan"** en el panel de administración: muestra uso actual vs. límite del plan con barras de progreso y etiqueta de plan (demo, standard, pro, custom, etc.)
- **Verificación de jugadores**: los organizadores/admins pueden marcar jugadores como "Verificado" con un solo clic; el badge aparece en el perfil del jugador
- **Participación multi-torneo (RosterEntry)**: un jugador verificado puede ser añadido como invitado a un equipo de otro torneo; su perfil muestra el historial de equipos con badge "Invitado"
- **Múltiples organizadores por torneo**: un torneo puede tener varios organizadores; el creador queda añadido automáticamente al crear el torneo; los organizadores pueden editar el torneo igual que el administrador
- **Escáner de alineación por IA**: captura de foto de la planilla de alineación con visión artificial (Google Gemini 2.5 Flash) — disponible en el panel del juego

## Funcionalidades en desarrollo

- **Integración con Facebook Live**: overlay transparente del marcador sobre transmisiones en vivo
- Panel de transmisión en el Gamecast con incrustación del stream
- **Escáner de alineación por IA**: captura de foto de la planilla de alineación con OCR/visión artificial

---

# PARTE 2 — PARA DESARROLLADORES

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS + TypeScript |
| Base de datos | SQL Server (MSSQL) |
| ORM | Prisma v6 |
| Autenticación | JWT con cookies httpOnly + bcrypt |
| Tiempo real | Socket.IO (WebSocket) |
| Frontend | Next.js 16 + React 19 |
| Estilos | Tailwind CSS v4 |
| Estado global | Zustand (con persistencia) |
| Cliente HTTP | Axios (con interceptor centralizado) |
| Notificaciones | Sonner (toasts) |
| Infraestructura | Cloudflare Tunnel |

---

## Estructura del proyecto

```
ScoreKeeper/
├── backend/          ← API REST + WebSocket (NestJS)
├── frontend/         ← Interfaz web (Next.js)
├── prisma/           ← Schema y migraciones (dentro de /backend)
├── *.sql             ← Scripts de datos de prueba
└── generate_jardin.js ← Script de generación de datos
```

---

## Backend — Arquitectura

El backend es una API REST + WebSocket construida con NestJS organizada en módulos por dominio:

```
src/
├── auth/           ← Login, registro, reset de contraseña, guards JWT
├── games/          ← CRUD de juegos, lógica de alineaciones y jugadas
├── tournaments/    ← CRUD de torneos y organizadores
├── teams/          ← Equipos dentro de torneos
├── players/        ← Jugadores, verificación y búsqueda de verificados
├── roster/         ← Participación multi-torneo (RosterEntry)
├── leagues/        ← Ligas que contienen torneos
├── umpires/        ← Árbitros y asignaciones
├── users/          ← Usuarios de la plataforma, planes y cuotas
├── stats/          ← Agregación y consulta de estadísticas
├── live/           ← Gateway WebSocket (Socket.IO)
├── vision/         ← Módulo de visión artificial (escáner de alineación)
├── common/         ← Guards, interceptors y utilidades compartidas
└── prisma/         ← Servicio de base de datos
```

### Módulo clave: `games/`
El servicio `games.service.ts` contiene toda la lógica de negocio del béisbol:
- Gestión de alineaciones y orden al bate
- Registro de jugadas y avance de corredores
- Sustituciones con reglas (reentry, DH)
- Cálculo de estadísticas en tiempo real

### Gateway WebSocket: `live/live.gateway.ts`
Namespace: `/live_games`

| Evento (cliente → servidor) | Descripción |
|---|---|
| `joinGame(gameId)` | El cliente se suscribe a un juego |
| `registerPlay(playData)` | Registra una jugada |
| `syncState(stateData)` | Sincroniza el estado completo del juego |
| `changeLineup(changeData)` | Registra un cambio de alineación |
| `requestFullSync(gameId)` | Solicita el estado completo al reconectar |

| Evento (servidor → cliente) | Descripción |
|---|---|
| `gameStateUpdate(state)` | Actualización del estado del juego |
| `playRegistered(playData)` | Confirmación de jugada registrada |
| `gameEnded(finalState)` | Notificación de fin de juego |
| `fullStateSync(state)` | Estado completo enviado tras reconexión |

### Seguridad del backend
- **Autenticación**: JWT enviado como cookie `httpOnly` — no accesible por JavaScript
- **Validación**: `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` — rechaza propiedades no declaradas en los DTOs
- **DTOs validados**: Todos los módulos usan `class-validator` con restricciones de tipo, longitud y rango
- **Rate limiting**: Endpoints de autenticación protegidos contra brute force
- **SQL injection**: Prisma ORM previene inyección; los únicos `$queryRaw` en el proyecto son parametrizados y sin input de usuario

---

## Base de datos — Modelos principales (Prisma)

```
User                 ← Usuarios con roles, plan y cuotas configurables
League               ← Contenedor de torneos
Tournament           ← Un torneo específico
TournamentOrganizer  ← Usuarios co-administradores del torneo (múltiples)
TournamentNews       ← Noticias del torneo
Field                ← Campo/estadio dentro de un torneo
Team                 ← Equipo dentro de un torneo
Player               ← Jugador individual con verificación (isVerified)
RosterEntry          ← Participación de un jugador verificado en otro equipo/torneo
Game                 ← Partido (home vs away)
Lineup               ← Bateador en la alineación de un juego
LineupChange         ← Sustitución o cambio durante el juego
Play                 ← Jugada individual registrada
PlayerStat           ← Estadísticas acumuladas por jugador y torneo
GameUmpire           ← Asignación de árbitro a un juego
Plan                 ← Plantillas de plan (demo, standard, pro...)
Subscription         ← Suscripción de una liga a un plan
```

### Índices de performance
Los modelos críticos tienen índices compuestos para evitar full table scans:
- `Game`: por `(tournamentId, status)`, `(status, createdAt)`, `(homeTeamId, awayTeamId)`
- `Play`: por `(gameId, inning)`, `batterId`, `pitcherId`
- `PlayerStat`: por `(playerId, tournamentId)`, `(teamId, tournamentId)`
- `Lineup`: por `(gameId, teamId)`

### Campos importantes de `User`
- `planLabel` — etiqueta del plan: `public`, `demo`, `standard`, `pro`, `admin`, `custom`
- `maxLeagues`, `maxTournamentsPerLeague`, `maxTeamsPerTournament`, `maxPlayersPerTeam` — cuotas configurables individualmente por usuario
- `forcePasswordChange` — fuerza cambio de contraseña en el próximo login
- `scorekeeperLeagueId` — liga asignada al scorekeeper

### Campos importantes de `Player`
- `isVerified` — indica si el jugador está verificado y puede participar en rosters de otros equipos
- `verifiedAt`, `verificationMethod` — auditoría de la verificación

### Campos del modelo `RosterEntry`
- `playerId`, `teamId`, `tournamentId` — relaciones únicas (constraint compuesto)
- `number`, `position` — número y posición del jugador en ese equipo/torneo
- `isActive` — soft delete: `false` significa que ya no participa
- `joinedAt`, `leftAt` — auditoría de la participación

### Campos importantes de `Game`
- `homeScore`, `awayScore` — marcador
- `currentInning`, `half` — inning actual (top/bottom)
- `status` — `scheduled` / `in_progress` / `finished`
- `maxInnings` — innings configurados (puede ser 7 o 9)
- `facebookStreamUrl`, `streamStatus` — integración Facebook Live (en desarrollo)
- `mvpBatter1Id`, `mvpBatter2Id`, `winningPitcherId` — MVPs del juego

### Campos de estadísticas (`PlayerStat`)
**Bateo:** `atBats`, `runs`, `hits`, `h2`, `h3`, `hr`, `rbi`, `bb`, `so`, `hbp`, `sac`
**Pitcheo:** `wins`, `losses`, `ipOuts`, `hAllowed`, `erAllowed`, `bbAllowed`, `soPitching`

---

## Frontend — Arquitectura

El frontend es una app Next.js con App Router. Cada carpeta en `src/app/` es una ruta.

```
src/app/
├── page.tsx                  ← Home/lobby con juegos recientes
├── error.tsx                 ← Error boundary global (pantalla de error amigable)
├── not-found.tsx             ← Página 404 personalizada
├── planes/                   ← Página pública de planes y precios
├── (auth)/                   ← Login, registro, reset de contraseña
├── (score)/                  ← Interfaz de anotación (scorekeeper)
├── gamecast/[id]/            ← Vista pública del juego (sin login)
├── torneos/[id]/             ← Detalle de torneo con organizadores múltiples
├── equipos/[id]/             ← Perfil de equipo + roster de jugadores invitados
├── jugadores/[id]/           ← Perfil de jugador con verificación e historial multi-torneo
├── ligas/                    ← Lista y detalle de ligas
└── admin/dashboard/          ← Panel de administración (8 tabs)
```

### Panel de administración: `admin/dashboard/page.tsx`
El dashboard tiene **8 tabs** según el rol del usuario:

| Tab | Roles | Descripción |
|---|---|---|
| Perfil | Todos | Editar datos personales |
| Ligas | Admin, Organizer | Crear y gestionar ligas (con cuota) |
| Torneos | Admin, Organizer | Gestionar torneos por liga (con cuota) |
| Equipos | Admin, Organizer | Gestionar equipos por torneo (con cuota) |
| Jugadores | Admin, Organizer | Dar de alta jugadores por equipo (con cuota) |
| Juegos | Admin, Organizer, Scorekeeper | Programar y gestionar partidos |
| Usuarios | Admin | Gestión de accesos, roles y planes |
| Mi Plan | Organizer | Ver uso actual vs. límites del plan contratado |

**Cuotas por plan** (configurables individualmente en el modelo `User`):

| Plan | Ligas | Torneos/Liga | Equipos/Torneo | Jugadores/Equipo |
|---|---|---|---|---|
| demo | 1 | 1 | 6 | 25 |
| standard | 1 | 3 | 10 | 30 |
| pro | 1 | 10 | 50 | 50 |
| custom | según usuario | según usuario | según usuario | según usuario |
| admin | sin límite | sin límite | sin límite | sin límite |

### Perfiles de torneo, equipo y jugador
- **`torneos/[id]/`**: Los organizadores (no sólo el admin) pueden editar el torneo. El creador se añade automáticamente como organizador al crearlo. El acceso se controla con `canEdit` (estado calculado al cargar los datos, no hardcoded por rol).
- **`equipos/[id]/`**: Tab JUGADORES muestra el roster regular + una sección "Jugadores Invitados" para los jugadores con `RosterEntry`. Los canEdit pueden añadir jugadores verificados de otros equipos.
- **`jugadores/[id]/`**: Badge "✓ Verificado" en el nombre. Estadísticas de bateo y pitcheo con filtro por torneo. Historial de juegos con filtro por torneo. Tab de historial de participación en otros equipos.

### Estado global: `store/gameStore.ts` (~1030 líneas)
El store de Zustand mantiene **todo el estado de un juego activo**:
- Inning, mitad, conteo (bolas/strikes/outs), bases ocupadas
- Alineaciones de ambos equipos con posición en el orden al bate
- Historial de jugadas (play-by-play)
- Cola de jugadas pendientes de sincronizar con el servidor
- Conexión WebSocket activa con reconexión automática y resync de estado

Al reconectar, el store emite `requestFullSync` automáticamente y actualiza el estado local con la respuesta `fullStateSync` del servidor, garantizando consistencia tras cortes de conexión.

Acciones principales del store:
`addBall`, `addStrike`, `addOut`, `registerHit`, `executeAdvancedPlay`, `nextBatter`, `nextInning`, `makeSubstitution`

### Interceptor HTTP centralizado: `lib/api.ts`
Todas las llamadas a la API pasan por un interceptor que maneja automáticamente:
- **401**: intenta refrescar el token; si falla, limpia sesión y redirige a `/login`
- **400**: muestra el mensaje de validación del servidor como toast
- **500+**: muestra "Error del servidor. Intenta de nuevo." sin exponer detalles internos
- **Sin red**: muestra "Sin conexión a internet."

### Componentes clave

| Componente | Ruta | Descripción |
|---|---|---|
| `ActionPanel` | `components/controls/` | Panel principal de anotación con botones de jugada (mín. 48×48px para móvil) |
| `PlayerAvatar` | `components/` | Avatar del jugador: foto real, fallback de iniciales con color, badge de número |
| `Field` | `components/live/` | Visualización del diamante con bases |
| `ScorebookTable` | `components/` | Tabla de marcador al estilo libro de anotaciones |
| `CambiosModal` | `components/controls/` | Modal para sustituciones |
| `PlayByPlayLog` | `components/live/` | Historial de jugadas en tiempo real |
| `AdvancedPlayModal` | `components/controls/` | Jugadas avanzadas (doble play, errores, etc.) |
| `AILineupScanner` | `components/game/` | Escáner de alineación por foto con IA (en desarrollo) |

---

## Variables de entorno

### Backend (`backend/.env`)
```env
DATABASE_URL="sqlserver://servidor;database=ScoreKeeper;user=usuario;password=pass;..."
JWT_SECRET="clave_secreta_minimo_32_caracteres"
JWT_REFRESH_SECRET="clave_refresh_minimo_32_caracteres"
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,https://tudominio.com"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Cómo correr el proyecto en local

### Requisitos previos
- Node.js 20+
- SQL Server (local o instancia remota)
- npm o pnpm

### Backend
```bash
cd backend
npm install
npx prisma db push          # aplicar schema e índices
npx prisma generate         # generar cliente Prisma
npm run start:dev           # servidor en puerto 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # app en puerto 3000
```

---

## Infraestructura (producción)

La arquitectura de producción usa **Cloudflare Tunnel** para exponer el backend local de forma segura sin necesidad de abrir puertos en el router. Esto permite:

- Backend corriendo localmente (o en un servidor sin IP pública)
- Frontend en Vercel o cualquier hosting
- El túnel conecta el backend al dominio público de forma cifrada

---

## Decisiones arquitectónicas importantes

### ¿Por qué NestJS y no algo más simple?
NestJS ofrece estructura, inyección de dependencias y decoradores que escalan bien con la complejidad del dominio (béisbol tiene muchas reglas). Facilita agregar módulos sin que el código se vuelva caótico.

### ¿Por qué SQL Server y no PostgreSQL?
Decisión de infraestructura existente. Prisma abstrae las diferencias — si en el futuro se necesita migrar, el cambio en el schema es mínimo.

### ¿Por qué Zustand y no Redux?
El estado del juego es complejo pero contenido. Zustand es más liviano, sencillo de leer y la persistencia integrada permite sobrevivir recargas de página sin perder el estado del juego en curso.

### ¿Por qué WebSocket y no polling?
Un partido de béisbol puede tener 200+ jugadas. Con polling cada segundo estarías haciendo 200+ requests innecesarios por espectador. WebSocket envía el update exactamente cuando ocurre la jugada, sin overhead.

### ¿Por qué cookies httpOnly para el JWT?
Guardar el JWT en `localStorage` lo expone a cualquier script en la página (XSS). Una cookie `httpOnly` no es accesible por JavaScript — aunque exista una vulnerabilidad XSS, el atacante no puede robar el token de sesión.

---

## Próximos pasos del proyecto (roadmap)

1. **Facebook Live overlay** — overlay transparente del marcador para streamers (schema ya listo, falta el panel de control completo)
2. **Bracketing de torneos** — visualización del cuadro de eliminación
3. **App móvil** para scorekeepers en campo
4. **Notificaciones push** para espectadores suscritos a un juego
5. **Exportación de estadísticas** a PDF/Excel
6. **Escáner de alineación por IA** — completar integración del módulo `vision/` (ya funcional con Gemini 2.5 Flash, falta UI definitiva)
7. **Transferencia permanente de jugadores** — actualmente el `RosterEntry` siempre es temporal (Invitado); se podría añadir un flujo para cambiar el `teamId` permanente del jugador

---

## Contacto del creador

Arturo — creador y desarrollador principal de Tourney Tru.
Para reporte de bugs o sugerencias, contactar directamente.

---

*Documento actualizado el 27 de marzo de 2026.*
