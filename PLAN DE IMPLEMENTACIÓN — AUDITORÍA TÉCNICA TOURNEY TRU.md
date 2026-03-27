# PLAN DE IMPLEMENTACIÓN — AUDITORÍA TÉCNICA TOURNEY TRU
### Tech Lead Full-Stack · Experto en Ciberseguridad · Diseñador UX/UI Senior

> **Versión:** 1.0 · **Fecha:** Marzo 2026
> **Scope:** Auditoría completa de arquitectura, seguridad, UX/UI y rendimiento
> **Stack analizado:** NestJS + Prisma + SQL Server · Next.js 16 + Zustand + Socket.IO

---

## VICTORIAS RÁPIDAS (Quick Wins) — Implementar Esta Semana

Antes del plan detallado, estas mejoras tienen alto impacto y bajo costo de implementación:

| # | Quick Win | Impacto | Tiempo estimado |
|---|---|---|---|
| QW-1 | Agregar `httpOnly: true` a cookies JWT | Seguridad crítica | 2h |
| QW-2 | `next/image` en todos los logos de equipos | Performance +30% LCP | 3h |
| QW-3 | Skeleton loaders en listas de torneos/equipos | UX percibida | 2h |
| QW-4 | Validación con `class-validator` en todos los DTOs del backend | Seguridad | 4h |
| QW-5 | Avatar con foto real en perfil de jugador (reemplazar avatar genérico) | UX/Branding | 1h |
| QW-6 | Añadir `aria-label` a botones de icono (⚙️, 📡, compartir) | Accesibilidad | 1h |
| QW-7 | Rate limiting en endpoints de auth (`/login`, `/register`) | Seguridad | 1h |
| QW-8 | Mensaje de error amigable en formularios (no exponer stack trace) | Seguridad + UX | 2h |

---

## ÁREA 1 — LÓGICA Y ARQUITECTURA DEL SISTEMA

### 1.1 Manejo del Estado en Tiempo Real

**Diagnóstico actual:**
El `gameStore.ts` de 955 líneas maneja TODO el estado del juego activo en un solo store de Zustand. Esto funciona, pero crea acoplamiento fuerte y dificulta el debugging cuando el estado se desincroniza entre cliente y servidor.

---

#### MEJORA 1.1.A — Dividir el GameStore en slices especializados

**Por qué:** Un store de 955 líneas es difícil de mantener. Cuando falla algo, es difícil saber qué parte del estado está corrupta. Los slices permiten aislar responsabilidades.

**Cómo implementarlo:**

```typescript
// store/slices/countSlice.ts — solo conteo (bolas, strikes, outs)
interface CountSlice {
  balls: number;
  strikes: number;
  outs: number;
  addBall: () => void;
  addStrike: () => void;
  addOut: () => void;
  resetCount: () => void;
}

// store/slices/basesSlice.ts — solo estado de bases
interface BasesSlice {
  firstBase: Runner | null;
  secondBase: Runner | null;
  thirdBase: Runner | null;
  advanceRunner: (from: Base, to: Base | 'score') => void;
  clearBases: () => void;
}

// store/slices/lineupSlice.ts — alineaciones
// store/slices/socketSlice.ts — conexión WebSocket
// store/slices/playsSlice.ts — historial de jugadas

// store/gameStore.ts — combina todos los slices
export const useGameStore = create<GameStore>()(
  persist(
    (...a) => ({
      ...createCountSlice(...a),
      ...createBasesSlice(...a),
      ...createLineupSlice(...a),
      ...createSocketSlice(...a),
      ...createPlaysSlice(...a),
    }),
    { name: 'game-store' }
  )
);
```

**Prioridad:** Alta · **Esfuerzo:** 2-3 días

---

#### MEJORA 1.1.B — Cola de jugadas con confirmación y retry

**Por qué:** Actualmente si el WebSocket se cae mientras el scorekeeper registra una jugada, la jugada puede perderse o duplicarse. En un partido oficial esto es un problema grave.

**Cómo implementarlo:**

```typescript
// store/slices/pendingPlaysSlice.ts
interface PendingPlay {
  id: string;           // UUID local generado en el cliente
  playData: PlayData;
  timestamp: number;
  attempts: number;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
}

// En el store:
const registerPlay = (playData: PlayData) => {
  const pendingPlay: PendingPlay = {
    id: crypto.randomUUID(),
    playData,
    timestamp: Date.now(),
    attempts: 0,
    status: 'pending'
  };

  // 1. Primero actualiza UI optimísticamente
  set(state => ({ plays: [...state.plays, pendingPlay] }));

  // 2. Intenta enviar al servidor
  sendWithRetry(pendingPlay);
};

const sendWithRetry = async (play: PendingPlay, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await socket.emitWithAck('registerPlay', play);
      markPlayConfirmed(play.id);
      return;
    } catch {
      await sleep(1000 * Math.pow(2, i)); // backoff exponencial
    }
  }
  markPlayFailed(play.id); // muestra alerta al scorekeeper
};
```

**Prioridad:** Alta · **Esfuerzo:** 1 día

---

#### MEJORA 1.1.C — Reconnection automática del WebSocket con resync de estado

**Por qué:** Si un espectador pierde conexión 30 segundos, cuando vuelve no sabe si el marcador que ve es correcto. Necesita re-sincronizar.

**Cómo implementarlo:**

```typescript
// En live.gateway.ts (backend)
@SubscribeMessage('requestFullSync')
async handleFullSync(client: Socket, gameId: string) {
  const gameState = this.activeGames.get(gameId);
  if (!gameState) {
    // Si no está en memoria, reconstruir desde DB
    const state = await this.gamesService.getGameState(gameId);
    client.emit('fullStateSync', state);
    return;
  }
  client.emit('fullStateSync', gameState);
}

// En frontend (Socket.IO client)
socket.on('connect', () => {
  // Al reconectar, pedir estado completo
  if (currentGameId) {
    socket.emit('requestFullSync', currentGameId);
  }
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // El servidor cerró la conexión — no reconectar automáticamente
    showAlert('Conexión cerrada por el servidor');
  }
  // Para otros casos, Socket.IO reconecta automáticamente
});
```

**Prioridad:** Media · **Esfuerzo:** 4h

---

### 1.2 Base de Datos — Escalabilidad

**Diagnóstico actual:**
El schema de Prisma está bien diseñado para la funcionalidad actual. Sin embargo, hay áreas donde la escalabilidad puede convertirse en problema al crecer el número de torneos y juegos.

---

#### MEJORA 1.2.A — Índices en las consultas más frecuentes

**Por qué:** Sin índices, buscar los juegos de un torneo o las estadísticas de un jugador requiere un full table scan. Con 10,000+ jugadas registradas, esto se vuelve lento.

**Cómo implementarlo** (agregar en `schema.prisma`):

```prisma
model Game {
  // ... campos existentes

  @@index([tournamentId, status])     // buscar juegos activos por torneo
  @@index([status, createdAt])        // home page: juegos recientes en vivo
  @@index([homeTeamId, awayTeamId])   // historial de enfrentamientos
}

model Play {
  // ... campos existentes

  @@index([gameId, inning])           // jugadas por inning
  @@index([batterId])                 // estadísticas de un bateador
  @@index([pitcherId])                // estadísticas de un pitcher
}

model PlayerStat {
  // ... campos existentes

  @@index([playerId, tournamentId])   // stats de un jugador en un torneo
  @@index([teamId, tournamentId])     // stats de un equipo en un torneo
}

model Lineup {
  // ... campos existentes

  @@index([gameId, teamId])           // alineación de un equipo en un juego
}
```

**Migración:** `npx prisma migrate dev --name add_performance_indexes`

**Prioridad:** Alta (preventiva) · **Esfuerzo:** 2h

---

#### MEJORA 1.2.B — Separar estadísticas calculadas de estadísticas registradas

**Por qué:** AVG, OBP, SLG y OPS se calculan desde los datos crudos. Actualmente se calculan en el frontend (`boxscore.ts`). Esto está bien para juegos individuales, pero si quieres mostrar el ranking de bateadores de todo el torneo en tiempo real, calcular en el cliente no es viable.

**Cómo implementarlo:**

```prisma
// Nuevo modelo para estadísticas calculadas (se recalcula al final de cada juego)
model PlayerStatCalculated {
  id           String  @id @default(cuid())
  playerId     String
  tournamentId String?
  teamId       String

  // Calculadas
  avg          Float   @default(0)  // H / AB
  obp          Float   @default(0)  // (H + BB + HBP) / (AB + BB + HBP + SAC)
  slg          Float   @default(0)  // TB / AB
  ops          Float   @default(0)  // OBP + SLG
  era          Float?  @default(0)  // (ER * 9) / IP (para pitchers)
  whip         Float?  @default(0)  // (BB + H) / IP

  calculatedAt DateTime @updatedAt

  player     Player      @relation(fields: [playerId], references: [id])
  tournament Tournament? @relation(fields: [tournamentId], references: [id])
  team       Team        @relation(fields: [teamId], references: [id])

  @@unique([playerId, tournamentId])
  @@index([tournamentId, avg(sort: Desc)])  // ranking de bateadores
}
```

**Prioridad:** Media · **Esfuerzo:** 1 día

---

### 1.3 Manejo de Errores y Resiliencia en el Frontend

**Diagnóstico actual:**
Basado en el código, los errores de API probablemente se manejan con `try/catch` y `console.error`. No hay una estrategia global de error handling visible.

---

#### MEJORA 1.3.A — Error Boundary global en Next.js

**Por qué:** Si un componente lanza un error sin capturar, toda la página se rompe con una pantalla blanca. Un Error Boundary muestra una UI de error amigable en cambio.

**Cómo implementarlo:**

```typescript
// app/error.tsx (Next.js App Router — Error Boundary automático)
'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log a tu servicio de errores (Sentry, etc.)
    console.error('Error capturado:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-bold">Algo salió mal</h2>
      <p className="text-muted-foreground text-sm">
        Ocurrió un error inesperado. El equipo fue notificado.
      </p>
      <button
        onClick={reset}
        className="btn-primary"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}

// app/not-found.tsx — Para rutas 404
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2>Página no encontrada</h2>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

#### MEJORA 1.3.B — Interceptor de Axios con manejo centralizado

**Por qué:** Actualmente cada llamada a la API necesita manejar sus propios errores. Un interceptor centraliza la lógica: si el token expiró, redirige al login. Si el servidor devuelve 500, muestra un toast genérico.

**Cómo implementarlo** (mejorar `lib/api.ts`):

```typescript
// lib/api.ts — interceptor mejorado
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Token expirado → refrescar
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshToken();
        return api(originalRequest);
      } catch {
        // Refresh falló → logout
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Errores de validación (400) — mostrar al usuario
    if (error.response?.status === 400) {
      const message = (error.response.data as any)?.message;
      toast.error(Array.isArray(message) ? message[0] : message);
    }

    // Error del servidor (500) — NO exponer detalles internos
    if (error.response?.status && error.response.status >= 500) {
      toast.error('Error del servidor. Intenta de nuevo en unos momentos.');
    }

    // Sin conexión
    if (!error.response) {
      toast.error('Sin conexión a internet.');
    }

    return Promise.reject(error);
  }
);
```

**Prioridad:** Alta · **Esfuerzo:** 3h

---

## ÁREA 2 — INTERFAZ DE USUARIO (UI) Y EXPERIENCIA DE USUARIO (UX)

### 2.1 Evaluación Visual Actual

**Lo que funciona bien (visto en los screenshots):**
- La paleta dark con azul primario (`#4684DB`) es coherente con plataformas deportivas premium
- El uso de Barlow Condensed para headings da energía y dinamismo deportivo
- Las cards de equipos con logos grandes generan identidad visual fuerte
- La tipografía monoespaciada para estadísticas (JetBrains Mono) es correcta

**Lo que necesita mejora:**

| Problema visual | Ubicación | Impacto |
|---|---|---|
| Avatar genérico femenino en perfil de jugador masculino | Perfil de jugador | Credibilidad baja |
| Estadísticas en 0.000 no comunican nada al usuario nuevo | Perfil de jugador | UX confusa |
| Foto de perfil sin borde ni indicador de posición claro | Perfil de jugador | Jerarquía visual débil |
| Botones de icono sin label (⚙️, 📡) no son autoexplicativos | Torneo/Equipo | Usabilidad baja |
| Marca "PLATAFORMA OFICIAL" en el hero no tiene credibilidad aún | Home | Branding prematuro |

---

#### MEJORA 2.1.A — Perfil de jugador rediseñado

**Por qué:** El perfil de jugador es la página más visitada por los jugadores mismos. Un avatar genérico incorrecto (femenino en un jugador masculino) daña la credibilidad de la plataforma.

**Propuesta de cambio:**

```typescript
// components/PlayerAvatar.tsx
interface PlayerAvatarProps {
  photoUrl: string | null;
  firstName: string;
  number: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerAvatar({ photoUrl, firstName, number, size = 'md' }: PlayerAvatarProps) {
  const sizes = { sm: 'w-10 h-10', md: 'w-24 h-24', lg: 'w-32 h-32' };

  if (photoUrl) {
    return (
      <div className="relative">
        <Image
          src={photoUrl}
          alt={firstName}
          className={`${sizes[size]} rounded-full object-cover border-2 border-primary`}
          width={128}
          height={128}
        />
        {/* Número del jugador como badge */}
        <span className="absolute -bottom-1 -right-1 bg-primary text-white
                         text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {number}
        </span>
      </div>
    );
  }

  // Si no hay foto: iniciales con color generado por nombre
  const color = stringToColor(firstName); // función que genera color determinístico
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center
                     text-white font-bold text-2xl relative`}
         style={{ backgroundColor: color }}>
      {firstName.charAt(0).toUpperCase()}
      <span className="absolute -bottom-1 -right-1 bg-primary text-white
                       text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        {number}
      </span>
    </div>
  );
}
```

**Prioridad:** Alta · **Esfuerzo:** 3h

---

#### MEJORA 2.1.B — Estado vacío inteligente para estadísticas en cero

**Por qué:** Ver "0.000" en todos los campos no comunica nada. El jugador recién registrado debería ver un mensaje motivacional o un indicador de que sus stats aparecerán después del primer juego.

**Cómo implementarlo:**

```typescript
// components/StatsDisplay.tsx
function StatCard({ label, value, decimals = 0 }: StatCardProps) {
  const isEmpty = value === 0 || value === null;

  return (
    <div className="bg-surface rounded-lg p-4 text-center">
      {isEmpty ? (
        <span className="text-muted text-2xl font-mono">—</span>
      ) : (
        <span className="text-primary text-2xl font-mono font-bold">
          {decimals > 0 ? value.toFixed(decimals) : value}
        </span>
      )}
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
}

// En perfil de jugador, si TODOS los stats son 0:
{allStatsAreZero && (
  <div className="text-center py-8 text-muted-foreground">
    <TrophyIcon className="mx-auto mb-2 opacity-30" size={40} />
    <p>Las estadísticas aparecerán después del primer juego registrado.</p>
  </div>
)}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

### 2.2 Accesibilidad

**Diagnóstico:** Los botones de icono sin texto (el botón ⚙️ de configuración, el botón de transmisión 📡) no tienen `aria-label`. Los lectores de pantalla dirían "botón" sin contexto.

#### MEJORA 2.2.A — Botones de icono accesibles

```typescript
// ANTES (problemático)
<button onClick={openSettings}>
  <Settings size={20} />
</button>

// DESPUÉS (accesible)
<button
  onClick={openSettings}
  aria-label="Configuración del torneo"
  title="Configuración del torneo"
>
  <Settings size={20} aria-hidden="true" />
</button>
```

#### MEJORA 2.2.B — Focus visible en modo teclado

**Por qué:** Usuarios que navegan con teclado (Tab) necesitan ver dónde está el foco. El outline por defecto suele desactivarse con `outline: none` en CSS resets.

```css
/* globals.css */
/* Solo mostrar focus ring cuando se navega con teclado, no con mouse */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

### 2.3 Experiencia Móvil

**Diagnóstico crítico:** La app es usada en el campo de juego. El scorekeeper tiene sol, prisa, y probablemente dedos sudados. La interfaz de anotación debe ser diseñada para eso.

---

#### MEJORA 2.3.A — Targets táctiles mínimos de 48x48px

**Por qué:** Google recomienda targets mínimos de 48x48px para botones en móvil. Un botón de "Ball" que se presiona cuando se quería presionar "Strike" durante un juego es un error grave.

```css
/* En los botones del ActionPanel */
.game-control-button {
  min-width: 48px;
  min-height: 48px;
  /* Para botones pequeños, aumentar el área de toque sin cambiar el visual */
  padding: 12px;
}

/* O con Tailwind: */
/* className="min-h-12 min-w-12 p-3" */
```

#### MEJORA 2.3.B — Layout del scorekeeper optimizado para una mano

**Por qué:** El scorekeeper necesita registrar jugadas rápidamente. Los botones de acción frecuente (Ball, Strike, Out) deben estar en la parte inferior de la pantalla, alcanzables con el pulgar.

```
DISEÑO ACTUAL (estimado):        DISEÑO RECOMENDADO:
┌─────────────────┐               ┌─────────────────┐
│  Header/Score   │               │  Score/Inning   │
│  Diamante       │               │  Diamante       │
│  Bateador info  │               │  Bateador info  │
│  [BALL][STRIKE] │               │  Play-by-Play   │
│  [OUT][HIT]     │               │─────────────────│
│  Play log       │               │  [BALL][STRIKE] │  ← Thumb zone
└─────────────────┘               │  [OUT ][HIT   ] │
                                  └─────────────────┘
```

**Prioridad:** Alta (para la UX del scorekeeper) · **Esfuerzo:** 1-2 días

---

#### MEJORA 2.3.C — Modo pantalla completa en móvil para el scorekeeper

```typescript
// components/controls/ScorekeeperLayout.tsx
export function ScorekeeperLayout({ children }: { children: React.ReactNode }) {
  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* dvh (dynamic viewport height) funciona correctamente en móvil
          con la barra de navegación del browser */}
      {children}
      <button
        className="fixed bottom-safe-area right-4 opacity-30 hover:opacity-100"
        onClick={requestFullscreen}
        aria-label="Pantalla completa"
      >
        <Maximize size={20} />
      </button>
    </div>
  );
}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

### 2.4 Visualización de Datos Complejos

#### MEJORA 2.4.A — Tabla de posiciones del torneo (standings) con color coding

**Por qué:** La tab "POSICIONES" en el torneo actualmente no es visible en los screenshots. Una tabla de posiciones con colores que indiquen zona de playoffs vs eliminación es estándar en deportes.

```typescript
// components/tournament/Standings.tsx
function StandingsRow({ team, rank, playoffCutoff }: StandingsRowProps) {
  const isInPlayoffs = rank <= playoffCutoff;
  const isBorderline = rank === playoffCutoff;

  return (
    <tr className={cn(
      "border-b border-surface",
      isBorderline && "border-b-2 border-b-primary" // línea de corte visual
    )}>
      <td className="py-2 px-3">
        <span className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
          isInPlayoffs ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        )}>
          {rank}
        </span>
      </td>
      <td className="py-2 px-3 flex items-center gap-2">
        <TeamLogo src={team.logoUrl} size={24} />
        <span>{team.name}</span>
      </td>
      <td className="text-center font-mono">{team.wins}</td>
      <td className="text-center font-mono">{team.losses}</td>
      <td className="text-center font-mono text-primary">{team.pct.toFixed(3)}</td>
      <td className="text-center font-mono text-muted-foreground">{team.gb}</td>
    </tr>
  );
}
```

#### MEJORA 2.4.B — Bracket de eliminación visual

**Por qué:** Los torneos de béisbol/softbol generalmente tienen una fase de bracket. Visualizarlo gráficamente es fundamental para que jugadores y espectadores entiendan el estado del torneo.

```typescript
// Estructura de datos sugerida para el bracket
interface BracketMatch {
  id: string;
  round: number;          // 1 = primera ronda, 2 = semifinal, etc.
  position: number;       // posición vertical en el bracket
  homeTeam: BracketTeam | null;
  awayTeam: BracketTeam | null;
  winnerId: string | null;
  gameId: string | null;  // link al juego registrado
}

interface BracketTeam {
  id: string;
  name: string;
  logoUrl: string | null;
  seed: number;
}
```

**Prioridad:** Media-Alta (feature nueva) · **Esfuerzo:** 3-4 días

---

## ÁREA 3 — SEGURIDAD Y PROTECCIÓN DE DATOS

### 3.1 Vulnerabilidades a Mitigar

#### VULNERABILIDAD 3.1.A — XSS (Cross-Site Scripting) — CRÍTICO

**Por qué:** Si en algún lugar del frontend se renderiza HTML dinámico con datos del usuario (nombre de torneo, descripción, etc.) usando `dangerouslySetInnerHTML` sin sanitizar, un atacante podría inyectar scripts que roben tokens de sesión de todos los usuarios.

**Cómo auditarlo y corregirlo:**

```bash
# Buscar usos de dangerouslySetInnerHTML en el frontend
grep -r "dangerouslySetInnerHTML" frontend/src/
```

```typescript
// Si usas dangerouslySetInnerHTML, SIEMPRE sanitiza primero:
import DOMPurify from 'dompurify';

// NUNCA hagas esto:
<div dangerouslySetInnerHTML={{ __html: tournament.description }} />

// SIEMPRE haz esto:
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(tournament.description)
}} />

// O mejor aún, evita HTML dinámico y usa texto plano:
<p>{tournament.description}</p>
```

**Instalar:** `npm install dompurify @types/dompurify`

**Prioridad:** Crítica · **Esfuerzo:** 2h

---

#### VULNERABILIDAD 3.1.B — Exposición del JWT en localStorage — ALTO

**Por qué:** Almacenar el JWT en `localStorage` (que es el comportamiento por defecto de muchas implementaciones) expone el token a cualquier script en la página. Si hay una vulnerabilidad XSS, el atacante roba el token y puede hacerse pasar por el usuario indefinidamente.

**Cómo corregirlo** (migrar a HttpOnly cookies):

```typescript
// backend/src/auth/auth.controller.ts — CAMBIO CRÍTICO
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const { access_token, refresh_token, user } = await this.authService.login(dto);

  // Enviar tokens como cookies HttpOnly (no accesibles por JavaScript)
  res.cookie('access_token', access_token, {
    httpOnly: true,        // ← Clave: JS no puede leerla
    secure: true,          // ← Solo HTTPS
    sameSite: 'strict',    // ← Protege contra CSRF
    maxAge: 15 * 60 * 1000 // 15 minutos
  });

  res.cookie('refresh_token', refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth/refresh', // Solo se envía al endpoint de refresh
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });

  // Solo devolver datos del usuario (SIN el token)
  return { user };
}
```

```typescript
// frontend/lib/auth.ts — YA NO manejar tokens manualmente
// El browser envía las cookies automáticamente

// ANTES (inseguro):
const token = localStorage.getItem('token');
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// DESPUÉS (seguro con cookies HttpOnly):
// No necesitas hacer nada — el browser envía las cookies automáticamente
// Solo asegúrate de que axios tenga withCredentials: true
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // ← Esto es todo lo que necesitas
});
```

**Prioridad:** Crítica · **Esfuerzo:** 4-6h

---

#### VULNERABILIDAD 3.1.C — Inyección SQL via Prisma — BAJO RIESGO (pero verificar)

**Por qué:** Prisma por sí mismo previene la mayoría de inyecciones SQL, pero si en algún lugar usas `$queryRaw` con interpolación de strings, estás expuesto.

**Cómo auditarlo:**

```bash
# Buscar usos de queryRaw en el backend
grep -r "queryRaw" backend/src/
grep -r "\$queryRaw" backend/src/
```

```typescript
// PELIGROSO — Si encuentras algo así:
const result = await prisma.$queryRaw`
  SELECT * FROM Player WHERE name = ${userInput}  // ← VULNERABLE
`;

// SEGURO — Prisma template literal (parametrizado automáticamente):
const result = await prisma.$queryRaw`
  SELECT * FROM Player WHERE name = ${Prisma.sql`${userInput}`}
`;

// O mejor: usa el ORM de Prisma directamente:
const result = await prisma.player.findMany({
  where: { firstName: userInput } // ← Siempre seguro
});
```

**Prioridad:** Alta (auditoría) · **Esfuerzo:** 1h

---

### 3.2 Validación en Formularios

#### MEJORA 3.2.A — Validación estricta en todos los DTOs del backend

**Por qué:** Si el frontend permite solo campos válidos pero el backend no valida, un atacante puede enviar requests directamente a la API con datos maliciosos.

**Cómo implementarlo** (ejemplo con `class-validator`):

```typescript
// backend/src/games/dto/create-game.dto.ts
import { IsInt, IsString, IsOptional, Min, Max, IsEnum, IsUUID } from 'class-validator';

export class CreateGameDto {
  @IsUUID()
  homeTeamId: string;

  @IsUUID()
  awayTeamId: string;

  @IsUUID()
  tournamentId: string;

  @IsInt()
  @Min(1)
  @Max(9)
  maxInnings: number;  // Validar que sea entre 1 y 9

  @IsEnum(GameStatus)
  status: GameStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)  // Limitar longitud de strings
  notes?: string;
}
```

```typescript
// backend/src/main.ts — Asegurarse de que la validación global esté activa
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,      // ← Rechaza propiedades no definidas en el DTO
  forbidNonWhitelisted: true, // ← Error si llegan propiedades extra
  transform: true,      // ← Transforma automáticamente tipos
}));
```

**Prioridad:** Alta · **Esfuerzo:** 4h

---

### 3.3 Seguridad en Rutas de la API

#### MEJORA 3.3.A — Audit de endpoints públicos vs protegidos

**Por qué:** Es posible que algún endpoint que debería requerir autenticación esté accidentalmente público.

**Cómo auditarlo** — Crear un mapa de endpoints:

```typescript
// Lista de verificación de seguridad por módulo:

// PÚBLICO (sin JWT) — ✅ correcto:
GET /api/tournaments          // Ver torneos
GET /api/tournaments/:id      // Ver torneo
GET /api/games/:id/state      // Gamecast (espectadores)
GET /api/players              // Ver jugadores
POST /api/auth/login          // Login
POST /api/auth/register       // Registro

// REQUIERE JWT — verificar que tengan @UseGuards(JwtAuthGuard):
POST /api/games               // Crear juego
PATCH /api/games/:id          // Actualizar juego
POST /api/games/:id/lineup    // Configurar alineación
DELETE /api/tournaments/:id   // Eliminar torneo
GET /api/users                // Listar usuarios (¡solo admin!)

// REQUIERE ROL ADMIN — verificar @Roles('admin'):
DELETE cualquier cosa
GET /api/users
PATCH /api/users/:id/role
```

```typescript
// backend/src/games/games.controller.ts — Ejemplo correcto
@Controller('games')
@UseGuards(JwtAuthGuard) // ← Protege todos los endpoints del controller
export class GamesController {

  @Get(':id/state')
  @Public() // ← Decorador personalizado para excluir del guard global
  async getGameState(@Param('id') id: string) { ... }

  @Post()
  @Roles('admin', 'scorekeeper')
  @UseGuards(RolesGuard)
  async createGame(@Body() dto: CreateGameDto) { ... }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async deleteGame(@Param('id') id: string) { ... }
}
```

**Prioridad:** Crítica · **Esfuerzo:** 4h (auditoría y correcciones)

---

#### MEJORA 3.3.B — No exponer datos sensibles en respuestas de la API

**Por qué:** Si el endpoint de usuario devuelve el `passwordHash`, cualquier vulnerabilidad que permita leer respuestas de API expone contraseñas hasheadas (que se pueden crackear offline).

```typescript
// backend/src/users/users.service.ts

// PELIGROSO — devuelve passwordHash:
async findOne(id: string) {
  return this.prisma.user.findUnique({ where: { id } });
}

// SEGURO — excluye campos sensibles:
async findOne(id: string) {
  return this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      // passwordHash: false ← NO incluir
    }
  });
}

// Alternativa: usar un DTO de respuesta con @Exclude():
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;

  @Exclude() // ← Nunca aparece en la respuesta JSON
  passwordHash: string;
}
```

**Prioridad:** Alta · **Esfuerzo:** 2h

---

## ÁREA 4 — AUTENTICACIÓN, AUTORIZACIÓN Y SESIONES

### 4.1 Gestión de Sesiones

#### MEJORA 4.1.A — Implementar Refresh Token Rotation

**Por qué:** Actualmente el JWT de acceso probablemente tiene una expiración larga (para evitar que el usuario tenga que hacer login frecuente). Esto es un problema: si el token se roba, el atacante tiene acceso prolongado.

**Solución:** Access token de vida corta (15 min) + Refresh token de vida larga (7 días) con rotación automática.

```typescript
// backend/src/auth/auth.service.ts
async refreshTokens(refreshToken: string) {
  // 1. Verificar el refresh token
  const payload = this.jwtService.verify(refreshToken, {
    secret: process.env.JWT_REFRESH_SECRET
  });

  // 2. Verificar que el refresh token no ha sido revocado
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });

  if (!storedToken || storedToken.revoked) {
    throw new UnauthorizedException('Refresh token inválido');
  }

  // 3. ROTACIÓN: revocar el token actual y generar uno nuevo
  await this.prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true }
  });

  // 4. Generar nuevos tokens
  return this.generateTokenPair(payload.sub);
}

// Nuevo modelo en schema.prisma:
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  revoked   Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId])
}
```

**Prioridad:** Alta · **Esfuerzo:** 1 día

---

### 4.2 Control de Acceso Basado en Roles (RBAC)

**Diagnóstico actual:** Hay roles definidos pero la granularidad puede necesitar expansión para manejar los casos de uso reales.

#### MEJORA 4.2.A — Mapa completo de roles y permisos

```typescript
// Roles sugeridos y sus capacidades:

enum Role {
  SUPER_ADMIN   = 'super_admin',   // Arturo — acceso total
  LEAGUE_ADMIN  = 'league_admin',  // Admin de liga
  TOURNAMENT_ORGANIZER = 'tournament_organizer', // Organiza un torneo específico
  SCOREKEEPER   = 'scorekeeper',   // Lleva el marcador de juegos asignados
  TEAM_MANAGER  = 'team_manager',  // Gestiona su equipo y roster
  PLAYER        = 'player',        // Ve su perfil y estadísticas
  PUBLIC        = 'public'         // Sin cuenta — solo lectura de gamecast
}

// Permisos por recurso:
const PERMISSIONS = {
  'tournament:create': [SUPER_ADMIN, LEAGUE_ADMIN],
  'tournament:edit': [SUPER_ADMIN, LEAGUE_ADMIN, TOURNAMENT_ORGANIZER],
  'tournament:delete': [SUPER_ADMIN, LEAGUE_ADMIN],
  'game:create': [SUPER_ADMIN, LEAGUE_ADMIN, TOURNAMENT_ORGANIZER],
  'game:score': [SUPER_ADMIN, SCOREKEEPER], // Solo scorekeepers asignados
  'game:view': [ALL], // Público
  'team:manage_roster': [SUPER_ADMIN, TOURNAMENT_ORGANIZER, TEAM_MANAGER],
  'player:edit_own': [PLAYER],
  'player:edit_any': [SUPER_ADMIN, TOURNAMENT_ORGANIZER],
} as const;
```

#### MEJORA 4.2.B — Verificar pertenencia antes de modificar (Object-Level Authorization)

**Por qué:** Un scorekeeper autenticado NO debería poder editar el marcador de UN JUEGO AL QUE NO FUE ASIGNADO. Sin esta verificación, cualquier scorekeeper puede editar cualquier juego.

```typescript
// backend/src/games/games.service.ts
async registerPlay(gameId: string, playData: RegisterPlayDto, userId: string) {
  // Verificar que el usuario es el scorekeeper asignado a ESTE juego
  const game = await this.prisma.game.findUnique({
    where: { id: gameId },
    include: { tournament: { include: { organizers: true } } }
  });

  if (!game) throw new NotFoundException('Juego no encontrado');

  const isAuthorized =
    game.scorekeeperId === userId ||                    // Scorekeeper asignado
    game.tournament.organizers.some(o => o.userId === userId) || // Organizador
    await this.isAdmin(userId);                         // Admin

  if (!isAuthorized) {
    throw new ForbiddenException('No tienes permiso para registrar jugadas en este juego');
  }

  // Continuar con el registro de la jugada...
}
```

**Prioridad:** Alta · **Esfuerzo:** 4h

---

### 4.3 Recuperación de Contraseña y Onboarding

#### MEJORA 4.3.A — Reset de contraseña seguro con token de un solo uso

**Por qué:** Si el reset de contraseña usa un token simple predecible, o si el token no expira, un atacante puede resetear la contraseña de cualquier usuario.

```typescript
// backend/src/auth/auth.service.ts
async requestPasswordReset(email: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });

  // IMPORTANTE: Siempre responder con el mismo mensaje,
  // aunque el email no exista (evita enumerar usuarios)
  if (!user) {
    return { message: 'Si el email existe, recibirás instrucciones.' };
  }

  // Token criptográficamente seguro
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(token, 10);

  await this.prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      used: false
    }
  });

  // Enviar email con el token SIN hashear
  await this.emailService.sendPasswordReset(email, token);

  return { message: 'Si el email existe, recibirás instrucciones.' };
}

async resetPassword(token: string, newPassword: string) {
  // Buscar todos los resets pendientes del último periodo
  const resets = await this.prisma.passwordReset.findMany({
    where: { used: false, expiresAt: { gt: new Date() } }
  });

  // Comparar el token con el hash (evita timing attacks)
  const validReset = await Promise.all(
    resets.map(async r => ({
      ...r,
      valid: await bcrypt.compare(token, r.tokenHash)
    }))
  ).then(results => results.find(r => r.valid));

  if (!validReset) throw new BadRequestException('Token inválido o expirado');

  // Marcar como usado Y actualizar contraseña en una transacción
  await this.prisma.$transaction([
    this.prisma.passwordReset.update({
      where: { id: validReset.id },
      data: { used: true }
    }),
    this.prisma.user.update({
      where: { id: validReset.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) }
    })
  ]);
}
```

**Prioridad:** Alta · **Esfuerzo:** 4h

---

## ÁREA 5 — RENDIMIENTO Y OPTIMIZACIÓN

### 5.1 Core Web Vitals

**Métricas objetivo:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID/INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

---

#### MEJORA 5.1.A — Optimización de imágenes (LCP — IMPACTO MAYOR)

**Por qué:** Los logos de equipos son las imágenes más grandes de la página. Sin `next/image`, se cargan sin optimizar, en formato original (PNG grande) y sin lazy loading.

```typescript
// ANTES (sin optimizar):
<img src={team.logoUrl} alt={team.name} className="w-24 h-24" />

// DESPUÉS (con next/image):
import Image from 'next/image';

<Image
  src={team.logoUrl}
  alt={team.name}
  width={96}
  height={96}
  className="rounded-full object-cover"
  // Para imágenes above-the-fold (visibles sin scroll):
  priority // ← Precarga esta imagen para mejorar LCP
  // Para imágenes below-the-fold:
  loading="lazy" // ← Default, puedes omitirlo
  // Placeholder mientras carga:
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..." // blur hash pequeño
/>
```

**Para logos externos** (si se suben URLs de logos de Facebook, etc.):

```typescript
// next.config.ts — permitir dominios externos
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudflare.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' }, // Facebook CDN
      // Agregar los dominios donde están los logos
    ],
  },
};
```

**Prioridad:** Alta · **Esfuerzo:** 3h

---

#### MEJORA 5.1.B — Skeleton Loaders para evitar Layout Shift (CLS)

**Por qué:** Cuando la página carga y los datos llegan de la API, los elementos "saltan" al aparecer, causando CLS. Un skeleton loader reserva el espacio antes de que lleguen los datos.

```typescript
// components/ui/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse rounded-md bg-surface",
      className
    )} />
  );
}

// Uso en la página de torneos:
function TournamentCard({ isLoading, tournament }: Props) {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="w-16 h-16 rounded-full" /> {/* Logo */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />            {/* Nombre */}
          <Skeleton className="h-4 w-1/2" />            {/* Subtítulo */}
        </div>
      </div>
    );
  }

  return <div className="card">...</div>;
}
```

**Prioridad:** Media · **Esfuerzo:** 3h

---

#### MEJORA 5.1.C — Caché de datos con SWR o React Query

**Por qué:** Actualmente cada navegación entre páginas probablemente hace una nueva petición a la API. Con caché, los datos que no cambian frecuentemente (lista de torneos, perfil de jugador) se sirven instantáneamente desde caché mientras se revalidan en el fondo.

```typescript
// Instalar: npm install swr
// O: npm install @tanstack/react-query

// Ejemplo con SWR:
import useSWR from 'swr';

function TournamentPage({ id }: { id: string }) {
  const { data: tournament, error, isLoading } = useSWR(
    `/api/tournaments/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,  // No revalidar al volver a la tab
      dedupingInterval: 60000,   // Deduplicar requests por 60 segundos
    }
  );

  if (isLoading) return <TournamentSkeleton />;
  if (error) return <ErrorState />;
  return <TournamentDetail tournament={tournament} />;
}

// Para datos en tiempo real (marcador del juego):
const { data: gameState } = useSWR(
  `/api/games/${gameId}/state`,
  fetcher,
  {
    refreshInterval: 0, // No polling — usamos WebSocket para esto
  }
);
```

**Prioridad:** Media · **Esfuerzo:** 1 día

---

#### MEJORA 5.1.D — Code Splitting y carga diferida de componentes pesados

**Por qué:** El `gameStore.ts` y los modales del scorekeeper son componentes complejos. Si se cargan en la página inicial, aumentan el bundle size y ralentizan el LCP.

```typescript
// Cargar el scorekeeper solo cuando se necesita:
import dynamic from 'next/dynamic';

const ActionPanel = dynamic(
  () => import('@/components/controls/ActionPanel'),
  {
    loading: () => <ActionPanelSkeleton />,
    ssr: false // El panel de anotación no necesita SSR
  }
);

const AdvancedPlayModal = dynamic(
  () => import('@/components/controls/AdvancedPlayModal'),
  { ssr: false }
);

// En la página de game:
export default function GamePage() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <ActionPanel />
      {showAdvanced && <AdvancedPlayModal />} {/* Solo carga cuando se abre */}
    </>
  );
}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

#### MEJORA 5.1.E — Headers de caché en el backend para datos estáticos

**Por qué:** Datos como el perfil de un jugador, los logos de equipos, o las estadísticas del torneo no cambian cada segundo. Agregar headers de caché permite que el CDN de Vercel/Cloudflare los sirva sin llegar al backend.

```typescript
// backend/src/players/players.controller.ts
@Get(':id')
async getPlayer(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
  const player = await this.playersService.findOne(id);

  // Datos estáticos: cachear por 5 minutos en el CDN
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return player;
}

// Para el estado del juego en vivo — NO cachear:
@Get(':id/state')
async getGameState(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
  res.setHeader('Cache-Control', 'no-store'); // Nunca cachear datos en vivo
  return this.gamesService.getGameState(id);
}
```

**Prioridad:** Media · **Esfuerzo:** 2h

---

## RESUMEN EJECUTIVO — PRIORIDADES DE IMPLEMENTACIÓN

### Fase 1 — Seguridad Crítica (Esta semana)

| Tarea | Área | Impacto | Esfuerzo |
|---|---|---|---|
| Migrar JWT a HttpOnly cookies | Seguridad | Crítico | 6h |
| Validación global con `ValidationPipe` | Seguridad | Alto | 4h |
| Audit de endpoints públicos vs protegidos | Seguridad | Alto | 4h |
| Excluir `passwordHash` de respuestas de API | Seguridad | Alto | 2h |
| Rate limiting en auth | Seguridad | Alto | 1h |
| Búsqueda de `dangerouslySetInnerHTML` sin sanitizar | Seguridad | Crítico | 2h |

**Total Fase 1: ~19h de trabajo**

---

### Fase 2 — Arquitectura y Estabilidad (Próximas 2 semanas)

| Tarea | Área | Impacto | Esfuerzo |
|---|---|---|---|
| Interceptor de Axios centralizado | Arquitectura | Alto | 3h |
| Error boundaries en Next.js | Arquitectura | Alto | 2h |
| Cola de jugadas con retry y confirmación | Arquitectura | Alto | 1 día |
| Refresh token rotation | Autenticación | Alto | 1 día |
| Índices en base de datos | Base de datos | Alto | 2h |
| Object-level authorization en games | Seguridad | Alto | 4h |

**Total Fase 2: ~4-5 días de trabajo**

---

### Fase 3 — UX/Performance (Próximo mes)

| Tarea | Área | Impacto | Esfuerzo |
|---|---|---|---|
| `next/image` en todos los logos | Performance | Alto | 3h |
| Skeleton loaders globales | UX | Medio | 3h |
| Avatar de jugador con iniciales coloreadas | UX | Medio | 3h |
| Botones accesibles con `aria-label` | Accesibilidad | Medio | 1h |
| Layout de scorekeeper mobile-first | UX | Alto | 2 días |
| Tabla de posiciones con color coding | UX | Alto | 1 día |
| SWR/React Query para caché | Performance | Medio | 1 día |

**Total Fase 3: ~2 semanas de trabajo**

---

### Fase 4 — Features Estratégicos (2-3 meses)

| Tarea | Área | Impacto | Esfuerzo |
|---|---|---|---|
| Bracket visual de eliminación | Feature | Alto | 4 días |
| Facebook Live overlay | Feature | Alto | 1 semana |
| Estadísticas calculadas en BD | Base de datos | Medio | 1 día |
| Push notifications para espectadores | Feature | Medio | 3 días |
| División de GameStore en slices | Arquitectura | Medio | 3 días |

---

## APPENDIX — HERRAMIENTAS RECOMENDADAS

### Monitoreo (agregar desde el principio)
- **Sentry** — Captura errores del frontend y backend automáticamente
- **Vercel Analytics** — Core Web Vitals reales de usuarios reales
- **Prisma Accelerate** — Connection pooling para SQL Server en producción

### Seguridad
- `helmet` para NestJS — headers de seguridad HTTP automáticos
- `dompurify` para sanitizar HTML
- `zod` o `class-validator` para validación de esquemas

### Testing
- **Jest + Supertest** para tests de integración del backend (especialmente los endpoints de auth y seguridad)
- **Playwright** para tests E2E del flujo de scoring

---

*Documento preparado como auditoría técnica completa de TourneyTru.*
*Cada mejora incluye el "por qué" y un ejemplo de código práctico.*
*Revisión recomendada: trimestralmente o después de cambios de arquitectura mayores.*
