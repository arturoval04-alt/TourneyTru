---
name: ScoreKeeper / TourneyTru — Referencia técnica del proyecto
description: Stack, estructura de archivos clave, convenciones y estado actual del proyecto
type: project
---

# TourneyTru — Referencia técnica

## Stack
- **Backend:** NestJS + TypeScript · Puerto 3001
- **BD:** SQL Server (MSSQL) · ORM: Prisma v6
- **Auth:** JWT en localStorage (migrar a HttpOnly cookies — pendiente)
- **WebSocket:** Socket.IO — namespace `/live_games`
- **Frontend:** Next.js 16 + React 19 · App Router · Puerto 3000
- **Estilos:** Tailwind CSS v4 · Dark mode
- **Estado global:** Zustand (gameStore.ts — 955 líneas)
- **HTTP client:** Axios (`frontend/src/lib/api.ts`)
- **Infra:** Cloudflare Tunnel (backend local → dominio público)

## Archivos clave

### Backend
- `backend/prisma/schema.prisma` — Schema completo de la BD
- `backend/src/main.ts` — Bootstrap NestJS (CORS, ValidationPipe, body limit 10MB)
- `backend/src/app.module.ts` — Módulos registrados
- `backend/src/games/games.service.ts` — Lógica de béisbol (~45KB, NO tocar sin cuidado)
- `backend/src/live/live.gateway.ts` — Gateway WebSocket
- `backend/src/players/players.service.ts` — CRUD de jugadores
- `backend/src/leagues/leagues.service.ts` — CRUD de ligas

### Frontend
- `frontend/src/components/Navbar.tsx` — Navbar con navLinks array
- `frontend/src/app/page.tsx` — Home
- `frontend/src/app/torneos/[id]/page.tsx` — Detalle de torneo (referencia de diseño)
- `frontend/src/app/jugadores/[id]/page.tsx` — Perfil de jugador
- `frontend/src/app/equipos/[id]/page.tsx` — Detalle de equipo
- `frontend/src/store/gameStore.ts` — Zustand store del juego activo
- `frontend/src/lib/api.ts` — Axios instance

## Convenciones del proyecto
- **Mapeo de columnas:** `@map("snake_case")` en Prisma (columnas SQL en snake_case, modelos en camelCase)
- **Defaults en Prisma SQL Server:** Usar `@default(now(), map: "nombre_constraint")` para defaults nombrados
- **Controllers:** Prefijo `api/` en el Controller (ej: `@Controller('api/leagues')`)
- **Guards:** `@UseGuards(JwtAuthGuard)` para proteger endpoints
- **Imágenes:** `@db.NVarChar(Max)` para URLs de imágenes (pueden ser Base64 largas)
- **IDs:** `@id @default(uuid())` — todos los IDs son UUIDs string
- **onDelete/onUpdate:** SQL Server requiere especificar explícitamente en relaciones con ciclos
- **Estilos frontend:** Variables CSS (`--primary`, `--surface`, `--background`, `--foreground`, `--muted`, `--muted-foreground`)
- **Animaciones:** clase `animate-fade-in-up` disponible en globals.css

## Jerarquía de datos
```
Liga → Torneo → Equipo → Jugador
```
(Fase 0: agregar RosterEntry para desacoplar Jugador de Equipo)

## Rutas del frontend
```
/              → Home
/ligas         → Lista de ligas (NUEVO — Fase 0)
/ligas/[id]    → Detalle de liga (NUEVO — Fase 0)
/torneos       → Todos los torneos
/torneos/[id]  → Detalle de torneo
/equipos       → Lista de equipos
/equipos/[id]  → Detalle de equipo
/jugadores     → Directorio de jugadores
/jugadores/[id]→ Perfil de jugador
/gamecast/[id] → Juego en vivo (público)
/game/[id]     → Panel scorekeeper (protegido)
/admin/dashboard → Dashboard admin
```

## API endpoints relevantes
- `GET /api/leagues` — Lista ligas
- `GET /api/leagues/:id` — Detalle liga
- `GET /api/leagues/:id/torneos` — Torneos de una liga
- `GET /api/tournaments` — Lista torneos
- `GET /api/players` — Lista jugadores (filtro: ?teamId=)
- `GET /api/players/search?q=` — Búsqueda global de jugadores (NUEVO — Fase 0)
- `GET /api/teams` — Lista equipos (filtro: ?tournamentId=&includePlayers=true)

## Estado de la BD (Fase 0 — pendiente migración)
### Modelos existentes
User, Role, League, Tournament, TournamentOrganizer, Field, Team, Player,
Umpire, GameUmpire, Game, Lineup, LineupChange, PlayerStat, TournamentNews, Play

### Modelos a agregar (Fase 0)
- `Plan` — Planes de pago (vacío, sin lógica)
- `Subscription` — Suscripciones de ligas (vacío, sin lógica)
- `RosterEntry` — Desacople Jugador/Equipo (Player.teamId se mantiene por ahora)

### Campos a agregar (Fase 0)
**League:** shortName, description, city, state, sport, foundedYear, websiteUrl, facebookUrl, isVerified
**Player:** isVerified, verifiedAt, verificationMethod
**User:** emailVerified, verificationToken, verificationTokenExpiresAt

## Diseño visual (dark mode)
- Background: `#192638`
- Surface: `#212833`
- Primary: `#4684DB`
- Font headings: Barlow Condensed
- Font stats/números: JetBrains Mono
- Patron de cards: `bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-2 hover:border-primary/50 cursor-pointer transition-all duration-300`

## Why: razones de decisiones
- Player.teamId se MANTIENE en Fase 0 (no romper games.service.ts de 45KB)
- RosterEntry se agrega como tabla nueva para futuro desacople gradual
- Plan/Subscription se agregan vacíos para que el schema esté listo antes de que crezca la BD
