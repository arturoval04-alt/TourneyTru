# Plan de Implementación: Facebook Live + Overlay en Tiempo Real
## ScoreKeeper / TourneyTru Baseball

---

## Contexto del Proyecto

**Stack:**
- Frontend: Next.js 14 (App Router), Tailwind CSS, Zustand (gameStore), Socket.IO client
- Backend: NestJS, Prisma ORM, SQL Server (MSSQL), Socket.IO gateway (`/live_games`)
- DB: SQL Server local (`tourneytru` database)
- Rutas clave:
  - `/gamecast/[id]` — vista pública del juego en tiempo real
  - `/game/[id]` — scorekeeper (panel de control)
  - `/api/livepeer/route.ts` — proxy existente a Livepeer (a reemplazar/adaptar)
  - `live.gateway.ts` — WebSocket gateway que recibe jugadas y hace broadcast
  - `gameStore.ts` — Zustand store con todo el estado del juego en tiempo real

**Diseño/Colores:**
- Dark mode: `--background: #192638`, `--surface: #212833`, `--primary: #4684DB`
- Clases Tailwind custom: `bg-background`, `bg-surface`, `text-foreground`, `text-primary`, `text-muted-foreground`
- Fuentes: Barlow Condensed (headings), JetBrains Mono (stats), Geist Sans (body)

---

## Arquitectura de la Solución

```
                    ┌─────────────────────────────┐
                    │     PC del Broadcaster       │
                    │                              │
  Cámara ──────────►│  OBS                         │
                    │   ├─ Video de cámara          │
                    │   └─ Browser Source ──────────┼──► /gamecast/[id]/overlay
                    │        (transparente)         │    (Next.js route nueva)
                    │                              │         │
                    │  Scorekeeper App (separada)  │         │ WebSocket
                    └────────────┬─────────────────┘         │
                                 │                     Tu backend
                            RTMP upload                (live.gateway.ts)
                                 │
                        Facebook Live API
                                 │
                    Facebook Page del torneo
                    (fans ven video + overlay)
```

**Los fans tienen DOS canales:**
1. **Facebook** → video en vivo + overlay de scorecard (zero-rating en la mayoría de carriers LatAm)
2. **Tu web** → gamecast en tiempo real sin video, ultra liviano (~5-10 MB/juego)

---

## Lo que ya existe (no tocar)

- `frontend/src/app/api/livepeer/route.ts` — proxy API (se puede adaptar para Facebook)
- `frontend/src/app/gamecast/[id]/page.tsx` — tab "stream" ya existe pero vacío
- `frontend/src/store/gameStore.ts` — todo el estado del juego ya disponible
- `backend/src/live/live.gateway.ts` — WebSocket con `registerPlay`, `syncState`, `gameStateUpdate`
- Componentes existentes en gamecast: `Field`, `PlayerInfo`, `PlayByPlayLog`, `ScoreCard`

---

## Tareas de Implementación

### FASE 1 — Base de Datos (Backend)

**1.1 — Migración Prisma: agregar campo `facebookStreamUrl` al modelo `Game`**

```prisma
// backend/prisma/schema.prisma
model Game {
  // ... campos existentes ...
  facebookStreamUrl  String?  @map("facebook_stream_url") @db.NVarChar(Max)
  streamStatus       String?  @default("offline") @map("stream_status") @db.NVarChar(20)
  // "offline" | "live" | "ended"
}
```

Correr después:
```bash
npx prisma migrate dev --name add_facebook_stream
npx prisma generate
```

---

### FASE 2 — Backend (NestJS)

**2.1 — Nuevo endpoint en `games.controller.ts`:**

```typescript
// GET  /api/games/:id/stream-info  → retorna facebookStreamUrl y streamStatus
// POST /api/games/:id/stream       → guarda facebookStreamUrl, cambia streamStatus a "live"
// DELETE /api/games/:id/stream     → streamStatus a "ended"
```

**2.2 — Al cambiar el streamStatus, emitir evento WebSocket:**

En `games.service.ts`, después de actualizar el stream, emitir desde el gateway:
```typescript
this.liveGateway.server.to(`game:${gameId}`).emit('streamStatusUpdate', {
  facebookStreamUrl: url,
  streamStatus: 'live'
});
```

Para esto, inyectar `LiveGateway` en `GamesService` (o crear un servicio intermedio).

**2.3 — Proteger con `JwtAuthGuard` el POST y DELETE (solo admin).**

---

### FASE 3 — Overlay Route (Frontend)

**Crear: `frontend/src/app/gamecast/[id]/overlay/page.tsx`**

Esta es la página que OBS carga como Browser Source. Características:
- `background: transparent` (OBS lo necesita así)
- Solo muestra elementos visuales, sin Navbar, sin controles
- Se conecta al mismo WebSocket que el gamecast normal
- Usa el mismo `useGameStore`

**Elementos del overlay (sugeridos, pueden ajustarse al gusto):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [NOMBRE EQUIPO LOCAL]  3  ─────  2  [NOMBRE EQUIPO VISITANTE]           │  ← Lower third
│                    ↑ 5TA ENTRADA  2 OUTS                                │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐                    ┌────────────────────────────────┐
│ 📷 Foto bateador   │                    │  ● ●  (bases)                  │
│ NOMBRE BATEADOR    │                    │     ●                          │
│ AVG .312 · HR 4    │                    └────────────────────────────────┘
│ RBI 18 · K 22      │
│ Hoy: 1-2 · BB      │
└────────────────────┘
```

**Metadata importante para el overlay:**
```typescript
// En el <head> de la página overlay:
export const metadata = {
  other: { 'obs-browser-control-url': '...' }
};
// Y en el body tag:
// style="background: transparent !important"
```

**Query params útiles para configurar desde OBS:**
- `?elements=score,batter,bases,log` → mostrar solo ciertos elementos
- `?theme=dark|light` → fondo oscuro semitransparente o sin fondo
- `?size=compact|full` → tamaño del overlay

---

### FASE 4 — Panel Admin del Stream (Frontend)

**Modificar: `frontend/src/app/gamecast/[id]/page.tsx`**

Reemplazar el contenido vacío del tab "stream" con:

**Vista para ADMIN (cuando tiene token):**
```
┌─────────────────────────────────────────┐
│  🔴 Gestionar Transmisión               │
│                                         │
│  URL de Facebook Live:                  │
│  [input: https://fb.watch/...]          │
│                                         │
│  [Iniciar Stream]  [Detener Stream]     │
│                                         │
│  📋 Instrucciones OBS:                  │
│  Browser Source URL:                    │
│  https://tudominio.com/gamecast/ID/overlay│
│  Ancho: 1920 · Alto: 1080               │
└─────────────────────────────────────────┘
```

**Vista para FANS:**
```
┌─────────────────────────────────────────┐
│  🔴 EN VIVO  (si streamStatus === "live")│
│                                         │
│  [Ver en Facebook →]                    │
│  (abre facebookStreamUrl en nueva tab)  │
│                                         │
│  O sigue el scorecard aquí abajo ↓      │
└─────────────────────────────────────────┘
```

Si `streamStatus === "offline"`:
```
┌─────────────────────────────────────────┐
│  Sin transmisión activa                 │
│  Sigue el juego en tiempo real aquí ↓   │
└─────────────────────────────────────────┘
```

---

### FASE 5 — Escuchar streamStatusUpdate en gameStore

**Modificar: `frontend/src/store/gameStore.ts`**

Agregar al `connectSocket()`:
```typescript
gameSocket.on('streamStatusUpdate', (data: { facebookStreamUrl: string; streamStatus: string }) => {
  set({ facebookStreamUrl: data.facebookStreamUrl, streamStatus: data.streamStatus });
});
```

Agregar al estado inicial de `GameState`:
```typescript
facebookStreamUrl: null as string | null,
streamStatus: 'offline' as string,
```

---

## Variables de Entorno Necesarias

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001  # ya existe

# No se necesita API key de Facebook — se usa la URL pública del stream
# que el admin obtiene manualmente desde Facebook al crear el live
```

**No se necesita integración con Facebook API** para la versión MVP. El flujo es:
1. Admin crea un live en Facebook manualmente (desde Facebook)
2. Facebook le da una URL pública (fb.watch/...)
3. Admin pega esa URL en el panel de la app
4. La app la muestra a los fans con un botón "Ver en Facebook"
5. OBS carga el overlay aparte

---

## Flujo Completo del Broadcaster (OBS)

```
1. Abrir OBS
2. Agregar fuente: "Captura de video" (cámara o captura de pantalla)
3. Agregar fuente: "Navegador (Browser Source)"
   - URL: https://tudominio.com/gamecast/[gameId]/overlay
   - Ancho: 1920, Alto: 1080
   - Marcar "Shutdown source when not visible"
   - CSS personalizado: body { background: transparent !important; }
4. En Facebook: crear Live Video → copiar URL del stream (fb.watch/...)
5. En OBS: Configuración → Stream → Servicio: Facebook Live
          pegar Stream Key de Facebook
6. En la app: pegar la URL pública fb.watch/... en el panel admin
7. En OBS: "Iniciar transmisión"
```

---

## Orden de Implementación Recomendado

| Paso | Tarea | Archivos |
|---|---|---|
| 1 | Migración Prisma (`facebookStreamUrl`, `streamStatus`) | `schema.prisma` |
| 2 | Endpoints GET/POST/DELETE stream info | `games.controller.ts`, `games.service.ts` |
| 3 | Emit WebSocket al cambiar stream | `live.gateway.ts` / `games.service.ts` |
| 4 | Agregar estado stream a gameStore | `gameStore.ts` |
| 5 | Crear `/gamecast/[id]/overlay/page.tsx` | archivo nuevo |
| 6 | Rellenar tab "stream" en gamecast | `gamecast/[id]/page.tsx` |
| 7 | Escuchar streamStatusUpdate en gameStore | `gameStore.ts` |

---

## Notas Adicionales

- **Zero-rating carriers en LatAm:** Telcel, Claro, Movistar, AT&T MX, Tigo, Digicel — todos tienen Facebook zero-rated o con datos gratis en sus planes básicos.
- **Latencia del stream:** Facebook Live tiene ~5-15 segundos de delay. El overlay del marcador se verá sincronizado con el video, no con el scorecard en tiempo real.
- **Seguridad:** El API key de Livepeer en `/api/livepeer/route.ts` está hardcodeado — moverlo a variable de entorno antes de producción (`LIVEPEER_API_KEY`).
- **Fallback:** Si el broadcaster corta el stream, el gamecast en la web sigue funcionando normalmente para fans.
- **OBS alternativo:** Para transmitir desde teléfono se puede usar `Streamlabs Mobile` apuntando a Facebook Live. El overlay en ese caso no es posible (solo video).
- **Overlay CSS clave:** `body, html { background: transparent !important; overflow: hidden; }`

---

## Componentes del Gamecast que se Pueden Reutilizar en el Overlay

Todos están en `frontend/src/components/`:
- `live/Field.tsx` — estado de bases en tiempo real
- `live/PlayerInfo.tsx` — info del bateador/pitcher actual
- `live/PlayByPlayLog.tsx` — últimas jugadas
- `scorecard/ScoreCard.tsx` — marcador completo (puede ser pesado para overlay)

Para el overlay usar versiones simplificadas/compactas de estos componentes.
