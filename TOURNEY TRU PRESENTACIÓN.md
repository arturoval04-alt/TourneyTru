# TOURNEY TRU — Presentación Oficial del Proyecto

> Creado por **Arturo** · Plataforma de gestión de torneos de béisbol y sóftbol con marcador en vivo
> **Versión 1.0 — Lanzamiento: Abril 2026**
> **Sitio web:** tourneytru.com
> **Redes sociales:** Instagram · Facebook · WhatsApp

---

# PARTE 1 — PARA EL EQUIPO DE MARKETING Y DISEÑO

> Esta sección es la base para crear la campaña de lanzamiento: diapositivas, posts de redes, carruseles de Instagram, y cualquier material visual. Toda la información aquí es precisa y lista para usarse.

---

## ¿Qué es Tourney Tru?

Tourney Tru es la **plataforma profesional de gestión y transmisión de torneos de béisbol y sóftbol**. Permite a organizadores crear torneos, registrar equipos y jugadores, y llevar el marcador de cada partido en tiempo real, mientras el público sigue el juego desde cualquier dispositivo — sin descargar nada, sin crear cuenta.

### El problema que resuelve

Hoy, miles de ligas de béisbol y sóftbol en México llevan sus torneos con hojas de papel, grupos de WhatsApp y fotos del marcador. No hay un lugar centralizado donde:
- Los aficionados puedan seguir el juego en vivo desde su celular
- Los organizadores tengan las estadísticas automáticas de cada jugador
- Los streamers puedan transmitir con un marcador profesional en pantalla

**Tourney Tru resuelve los tres.**

---

## Propuesta de valor (para los posts y slides)

| Para quién | Lo que obtienen |
|---|---|
| **Organizadores de liga** | Gestión completa del torneo: equipos, jugadores, calendario, estadísticas automáticas |
| **Anotadores (Scorekeepers)** | Panel profesional jugada por jugada desde tablet o laptop, con escáner de alineación por IA |
| **Streamers / Transmisores** | Overlay del marcador en tiempo real sobre su transmisión de Facebook Live |
| **Jugadores y aficionados** | Seguimiento del juego en vivo, perfil de jugador con estadísticas completas |

---

## Los 4 tipos de usuario

### 1. Organizador de Liga
Crea y administra la liga, los torneos, los equipos y los jugadores. Puede añadir co-organizadores. Tiene acceso al panel completo de administración.

### 2. Scorekeeper (Anotador)
Es la persona en el estadio con la tableta. Registra cada jugada: hits, outs, carreras, errores, cambios de alineación. El sistema actualiza el marcador automáticamente para todos los espectadores.

### 3. Streamer / Transmisor
Transmite el juego en vivo (Facebook Live u otras plataformas). Tourney Tru le provee un **overlay transparente del marcador en tiempo real** para colocar sobre su transmisión — un marcador profesional sin equipo de producción.

### 4. Aficionado / Espectador
Abre el link del partido en su celular y sigue el juego en tiempo real. Ve el marcador, las bases ocupadas, la alineación y el historial de jugadas. **No necesita cuenta ni descargar nada.**

---

## Flujo del usuario — Cómo funciona (para infografías)

```
PASO 1: El organizador crea la liga y el torneo
        → Sube logo, configura nombre, sede, categoría y reglas

PASO 2: Registra equipos y jugadores
        → Cada jugador tiene perfil con foto, número, posición y estadísticas

PASO 3: Programa los partidos
        → Fecha, hora, campo, árbitros asignados

PASO 4: El día del juego, el Scorekeeper anota jugada por jugada
        → Panel intuitivo con botones de jugada, diamante con bases, orden al bate

PASO 5: El público sigue el juego en vivo
        → Gamecast público: marcador, bases, alineación, play-by-play

PASO 6: Al terminar el torneo, todos tienen sus estadísticas
        → Promedios de bateo, innings lanzados, ponches, carreras impulsadas
```

---

## Funcionalidades disponibles HOY (v1.0)

### Gestión de torneos
- Crear ligas y torneos (béisbol, sóftbol, semirápida)
- Subir logo del torneo y foto de portada
- Múltiples organizadores por torneo (co-admins)
- Tabla de posiciones / standings en tiempo real
- Campos/estadios registrados por torneo
- Exportar jornada (poster con los partidos del día)
- Hacer pública o privada una liga
- Noticias del torneo

### Marcador en vivo
- Marcador en tiempo real vía WebSocket (actualización instantánea)
- Diamante con bases ocupadas animadas
- Registro completo de jugadas: hits, outs, errores, bases por bolas, ponches, robos, doble plays, etc.
- Alineaciones y orden al bate
- Sustituciones con reglas de béisbol (reentry, DH)
- Historial de jugadas play-by-play
- Reconexión automática — si el scorekeeper pierde internet, resincroniza sin perder datos
- **Escáner de alineación por IA (Gemini 2.5 Flash)**: el scorekeeper toma foto de la planilla de alineación y el sistema la interpreta automáticamente

### Perfiles y estadísticas
- Perfil de equipo: roster, récord (JG-JP), próximos partidos, estadísticas
- Perfil de jugador: foto, número, posición, verificación, estadísticas de bateo y pitcheo por torneo
- Jugadores verificados: pueden participar como "Invitados" en otros equipos/torneos
- Estadísticas individuales completas: AVG, H, 2B, 3B, HR, RBI, BB, K, ERA, IP, etc.

### Gamecast público
- Acceso sin login — cualquier persona con el link sigue el juego
- Vista del marcador, bases, inning, alineación, play-by-play
- Funciona en celular, tablet y computadora

### Streamer
- Overlay transparente del marcador para Facebook Live
- Panel de control del stream integrado

### Sistema de planes
- Planes diferenciados por tipo de usuario con cuotas configurables
- Tab "Mi Plan" con uso actual vs. límites del plan

---

## Funcionalidades en el roadmap (próximas versiones)

1. **Facebook Live overlay completo** — panel de control total para el streamer (schema ya implementado, pendiente UI final)
2. **Bracketing / Cuadro de eliminación** — visualización del bracket del torneo
3. **App móvil** para scorekeepers en campo
4. **Notificaciones push** para aficionados suscritos a un juego
5. **Exportación de estadísticas** a PDF/Excel
6. **Transferencia permanente de jugadores** entre equipos

---

## Planes y precios

> **Para el material de marketing usar: "Contáctanos para conocer tu plan ideal"**

### Plan Demo — GRATIS para siempre
Ideal para probar la plataforma sin compromiso.
- 1 liga
- 1 torneo
- Hasta 8 equipos
- Acceso completo a todas las funciones

### Plan Organizador
Ideal para ligas activas.
- **Base:** 1 liga · 1 torneo · 20 equipos → **$1,200/mes**
- **Equipos adicionales:** $80 por equipo/mes
- **Torneo adicional** (misma liga, hasta 20 equipos): **+$600/mes**

### Plan Streamer
Para personas que transmiten juegos.
- **Por paquete de juegos:** 50 juegos → **$500**
- Sin suscripción mensual — paga según uses

---

## Páginas de la plataforma — Descripción visual y screenshots

> Todas las imágenes están en la carpeta `imagenes_tt/`. Úsalas directamente en los diseños.

---

### Página Principal (Home)
Tagline central: **"Sigue Cada Jugada en Vivo"** sobre fondo azul marino oscuro.
Subtítulo: "Resultados en tiempo real, estadísticas avanzadas y gestión profesional de torneos."
Dos llamadas a la acción: **"Explorar Torneos"** (botón azul) y buscador de equipos/torneos.
Menú: Ligas · Torneos · Equipos · Jugadores · Planes

![Página Principal](imagenes_tt/Mainpage.jpg)

---

### Login / Registro
Pantalla de inicio de sesión. Diseño limpio con el branding de Tourney Tru.

![Login](imagenes_tt/paginalogin.jpg)

---

### Detalle de Liga
Banner con logo de la liga, estadísticas rápidas (torneos, completados, árbitros registrados).
Tabs: **Torneos · Árbitros · Información**
Botón para hacer la liga pública o privada.

![Detalle de Liga](imagenes_tt/paginaLigasId.jpg)

---

### Detalle de Torneo — Información
Header con nombre, deporte, número de equipos, botones de configuración y transmisión en vivo.
Tabs: **Información · Equipos · Juegos · Posiciones · Estadísticas · Acciones del Torneo**
Sección de información: descripción, organizadores, calendario, campos, fondo del póster.

![Torneo - Información](imagenes_tt/paginatorneoId.jpg)

---

### Detalle de Torneo — Vista 2 (Equipos / Juegos)
Vista de los equipos o juegos del torneo. Grid de equipos con logos, nombre y categoría.

![Torneo - Equipos y Juegos](imagenes_tt/paginatorneoid2.jpg)

---

### Detalle de Torneo — Estadísticas
Tabla de estadísticas individuales del torneo: líderes de bateo, pitcheo, etc. Filtrable por equipo.

![Torneo - Estadísticas](imagenes_tt/paginatorneoestadisticas.jpg)

---

### Detalle de Equipo
Header con logo del equipo, nombre, categoría (Semirápida/Regular), roster count, manager y récord (JG-JP).
Tabs: **Juegos · Jugadores · Estadísticas**
Partidos recientes y partidos programados con fecha, hora y sede.

![Detalle de Equipo](imagenes_tt/paginaequiposid.jpg)

---

### Equipo — Jugadores (Roster)
Grid de jugadores del equipo con avatar, nombre, número y posición.
Sección separada para jugadores invitados (participación multi-torneo).

![Roster del Equipo](imagenes_tt/paginaequiposjugadores.jpg)

---

### Perfil de Jugador
Foto/avatar, nombre, badge "✓ Verificado" (si aplica), equipo actual, número, posición.
Estadísticas de bateo y pitcheo filtradas por torneo.
Historial de participación en otros equipos como "Invitado".

![Perfil de Jugador - Lista](imagenes_tt/PERFILJUGADORE.jpg)
![Perfil de Jugador - Detalle](imagenes_tt/paginajugadoresid.jpg)

---

### Juego Programado
Vista previa del partido antes de comenzar. Muestra equipos, fecha, hora, sede y árbitros asignados.

![Juego Programado](imagenes_tt/JUEGOPROGRAMADO.jpg)

---

### Panel de Anotación — Juego en Vivo (Scorekeeper)
Vista exclusiva para el anotador (requiere cuenta Scorekeeper u Organizador).
Muestra: diamante con bases ocupadas, marcador, conteo actual (B-S-O), orden al bate y botones de jugada.
Compatible con tablet en el dugout.

![Juego en Vivo](imagenes_tt/juegoenvivo.jpg)

---

### Panel de Anotación — Box Score
Vista del libro de anotaciones estilo beisbolero. Muestra cada turno al bate de cada jugador con el resultado de la jugada, por inning.

![Box Score](imagenes_tt/juegoenvivoboxscore.jpg)

---

### Juego Finalizado
Resumen final del partido: marcador, estadísticas por jugador, pitcher ganador/perdedor, MVPs.

![Juego Finalizado](imagenes_tt/juegofinalizado.jpg)

---

### Tirilla Oficial
Tirilla/boleta oficial del partido con el resumen de todas las jugadas y estadísticas para impresión o exportación.

![Tirilla Oficial](imagenes_tt/tirillaoficial.jpg)

---

### Panel de Administración (Dashboard)
Panel de control del organizador. 8 tabs: Perfil, Ligas, Torneos, Equipos, Jugadores, Juegos, Usuarios, Mi Plan.
Muestra cuotas de uso vs. límite del plan con barras de progreso.

![Dashboard Admin](imagenes_tt/dashboard.jpg)

---

## Mercado objetivo

**Primario:** Ligas de béisbol y sóftbol en México (especialmente ciudades con cultura beisbolera: Sinaloa, Sonora, Jalisco, CDMX, Monterrey)
**Secundario:** Cualquier persona que transmita o anote partidos de béisbol/sóftbol a nivel amateur y semiprofesional
**Punto de entrada:** Liga Municipal de Softbol de Ahome (Los Mochis, Sinaloa) — primera liga en la plataforma

---

## Material a crear para el lanzamiento

El siguiente material está previsto para la campaña de lanzamiento de Abril 2026:

### Redes Sociales (Instagram / Facebook)
- [ ] Post de anuncio de lanzamiento
- [ ] Carrusel: "¿Qué es Tourney Tru?" (5-7 slides)
- [ ] Carrusel: "¿Cómo funciona?" (flujo paso a paso con screenshots)
- [ ] Post: Plan Demo gratis — llamada a la acción
- [ ] Post: Para streamers — "Tu marcador profesional en Facebook Live"
- [ ] Stories / Reels con demo de la app en uso
- [ ] Post de planes y precios (versión visual con "Contáctanos")

### Diapositivas / Pitch Deck
- [ ] Slide 1: Portada — Logo + Tagline
- [ ] Slide 2: El problema (ligas sin herramienta profesional)
- [ ] Slide 3: La solución — Tourney Tru
- [ ] Slide 4: Los 4 tipos de usuario
- [ ] Slide 5: Cómo funciona (flujo visual)
- [ ] Slide 6: Funciones principales (screenshots)
- [ ] Slide 7: El Gamecast — cualquiera puede seguir el juego
- [ ] Slide 8: Para Streamers — overlay profesional
- [ ] Slide 9: Planes y precios
- [ ] Slide 10: Lanzamiento — ¡Únete gratis! → tourneytru.com

### Screenshots disponibles (reales, de la plataforma en uso)
Todos en carpeta `imagenes_tt/`:

| Archivo | Página |
|---|---|
| `Mainpage.jpg` | Página principal (hero) |
| `paginalogin.jpg` | Login / Registro |
| `paginaLigasId.jpg` | Detalle de liga |
| `paginatorneoId.jpg` | Detalle de torneo — Información |
| `paginatorneoid2.jpg` | Detalle de torneo — Equipos/Juegos |
| `paginatorneoestadisticas.jpg` | Detalle de torneo — Estadísticas |
| `paginaequiposid.jpg` | Perfil de equipo |
| `paginaequiposjugadores.jpg` | Roster del equipo |
| `PERFILJUGADORE.jpg` | Directorio de jugadores |
| `paginajugadoresid.jpg` | Perfil individual de jugador |
| `JUEGOPROGRAMADO.jpg` | Juego programado (pre-partido) |
| `juegoenvivo.jpg` | Panel de anotación — juego en vivo |
| `juegoenvivoboxscore.jpg` | Panel de anotación — box score |
| `juegofinalizado.jpg` | Resumen de juego finalizado |
| `tirillaoficial.jpg` | Tirilla/boleta oficial del partido |
| `dashboard.jpg` | Panel de administración (dashboard) |

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
| IA | Google Gemini 2.5 Flash (escáner de alineación) |

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
├── vision/         ← Módulo de visión artificial (escáner de alineación con Gemini)
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
- **Validación**: `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
- **Rate limiting**: Endpoints de autenticación protegidos contra brute force
- **SQL injection**: Prisma ORM previene inyección; los únicos `$queryRaw` son parametrizados

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
Plan                 ← Plantillas de plan (demo, standard, pro, streamer...)
Subscription         ← Suscripción de una liga a un plan
```

### Cuotas por plan

| Plan | Ligas | Torneos/Liga | Equipos/Torneo | Jugadores/Equipo | Precio |
|---|---|---|---|---|---|
| **Demo** | 1 | 1 | 8 | ilimitado | Gratis |
| **Organizador Base** | 1 | 1 | 20 | ilimitado | $1,200/mes |
| **Organizador Extra** | 1 | +1/torneo | +N/equipo | ilimitado | +$600/torneo · +$80/equipo |
| **Streamer** | — | — | — | — | $500 / 50 juegos |
| **Admin** | sin límite | sin límite | sin límite | sin límite | interno |

### Campos importantes de `User`
- `planLabel` — etiqueta del plan: `public`, `demo`, `standard`, `pro`, `streamer`, `admin`, `custom`
- `maxLeagues`, `maxTournamentsPerLeague`, `maxTeamsPerTournament`, `maxPlayersPerTeam` — cuotas configurables
- `forcePasswordChange` — fuerza cambio de contraseña en el próximo login
- `scorekeeperLeagueId` — liga asignada al scorekeeper

### Campos importantes de `Player`
- `isVerified` — indica si el jugador puede participar en rosters de otros equipos
- `verifiedAt`, `verificationMethod` — auditoría de la verificación

### Campos importantes de `Game`
- `homeScore`, `awayScore` — marcador
- `currentInning`, `half` — inning actual (top/bottom)
- `status` — `scheduled` / `in_progress` / `finished`
- `maxInnings` — innings configurados (7 o 9)
- `facebookStreamUrl`, `streamStatus` — integración Facebook Live
- `mvpBatter1Id`, `mvpBatter2Id`, `winningPitcherId` — MVPs del juego

### Campos de estadísticas (`PlayerStat`)
**Bateo:** `atBats`, `runs`, `hits`, `h2`, `h3`, `hr`, `rbi`, `bb`, `so`, `hbp`, `sac`
**Pitcheo:** `wins`, `losses`, `ipOuts`, `hAllowed`, `erAllowed`, `bbAllowed`, `soPitching`

---

## Frontend — Arquitectura

El frontend es una app Next.js con App Router. Cada carpeta en `src/app/` es una ruta.

```
src/app/
├── page.tsx                  ← Home/lobby con juegos recientes y buscador
├── error.tsx                 ← Error boundary global
├── not-found.tsx             ← Página 404 personalizada
├── planes/                   ← Página pública de planes y precios
├── (auth)/                   ← Login, registro, reset de contraseña, cambio de contraseña
├── (score)/                  ← Interfaz de anotación (scorekeeper)
├── (streamer)/               ← Panel de control del streamer + nuevo juego
├── gamecast/[id]/            ← Vista pública del juego (sin login)
├── gamecast/[id]/overlay     ← Overlay transparente para transmisiones
├── gamescheduled/[id]/       ← Vista previa de juego programado
├── gamefinalizado/[id]/      ← Vista de juego terminado
├── torneos/[id]/             ← Detalle de torneo con organizadores múltiples
├── equipos/[id]/             ← Perfil de equipo + roster de jugadores invitados
├── jugadores/[id]/           ← Perfil de jugador con verificación e historial
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

### Estado global: `store/gameStore.ts`
El store de Zustand mantiene **todo el estado de un juego activo**:
- Inning, mitad, conteo (bolas/strikes/outs), bases ocupadas
- Alineaciones de ambos equipos con posición en el orden al bate
- Historial de jugadas (play-by-play)
- Cola de jugadas pendientes de sincronizar con el servidor
- Conexión WebSocket activa con reconexión automática y resync de estado

Al reconectar, el store emite `requestFullSync` automáticamente y actualiza el estado local con la respuesta `fullStateSync` del servidor, garantizando consistencia tras cortes de conexión.

### Interceptor HTTP centralizado: `lib/api.ts`
Todas las llamadas a la API pasan por un interceptor que maneja automáticamente:
- **401**: intenta refrescar el token; si falla, limpia sesión y redirige a `/login`
- **400**: muestra el mensaje de validación del servidor como toast
- **500+**: muestra "Error del servidor. Intenta de nuevo."
- **Sin red**: muestra "Sin conexión a internet."

### Componentes clave

| Componente | Ruta | Descripción |
|---|---|---|
| `ActionPanel` | `components/controls/` | Panel principal de anotación con botones de jugada |
| `PlayerAvatar` | `components/` | Avatar del jugador: foto real, avatar emoji o iniciales con color |
| `Field` | `components/live/` | Visualización del diamante con bases ocupadas |
| `ScorebookTable` | `components/` | Tabla de marcador al estilo libro de anotaciones |
| `CambiosModal` | `components/controls/` | Modal para sustituciones |
| `PlayByPlayLog` | `components/live/` | Historial de jugadas en tiempo real |
| `AdvancedPlayModal` | `components/controls/` | Jugadas avanzadas (doble play, errores, etc.) |
| `AILineupScanner` | `components/game/` | Escáner de alineación por foto con IA (Gemini) |
| `StreamAdminPanel` | `components/` | Panel de control del streamer |

---

## Variables de entorno

### Backend (`backend/.env`)
```env
DATABASE_URL="sqlserver://servidor;database=ScoreKeeper;user=usuario;password=pass;..."
JWT_SECRET="clave_secreta_minimo_32_caracteres"
JWT_REFRESH_SECRET="clave_refresh_minimo_32_caracteres"
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,https://tourneytru.com"
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

La arquitectura de producción usa **Cloudflare Tunnel** para exponer el backend local de forma segura sin necesidad de abrir puertos. Esto permite:

- Backend corriendo localmente (o en un servidor sin IP pública)
- Frontend en Vercel
- El túnel conecta el backend al dominio público de forma cifrada

---

## Decisiones arquitectónicas importantes

### ¿Por qué WebSocket y no polling?
Un partido de béisbol puede tener 200+ jugadas. Con polling cada segundo estarías haciendo 200+ requests innecesarios por espectador. WebSocket envía el update exactamente cuando ocurre la jugada, sin overhead.

### ¿Por qué cookies httpOnly para el JWT?
Guardar el JWT en `localStorage` lo expone a cualquier script en la página (XSS). Una cookie `httpOnly` no es accesible por JavaScript — aunque exista una vulnerabilidad XSS, el atacante no puede robar el token de sesión.

### ¿Por qué Zustand y no Redux?
El estado del juego es complejo pero contenido. Zustand es más liviano y la persistencia integrada permite sobrevivir recargas de página sin perder el estado del juego en curso.

---

## Próximos pasos del proyecto (roadmap)

1. **Facebook Live overlay completo** — panel de control total para streamers (schema ya implementado)
2. **Bracketing de torneos** — visualización del cuadro de eliminación
3. **App móvil** para scorekeepers en campo
4. **Notificaciones push** para espectadores suscritos a un juego
5. **Exportación de estadísticas** a PDF/Excel
6. **Transferencia permanente de jugadores** entre equipos

---

## Contacto del creador

Arturo — creador y desarrollador principal de Tourney Tru.
Sitio: **tourneytru.com**
Redes: Instagram · Facebook

---

*Documento actualizado el 5 de abril de 2026 — Versión 1.0*
