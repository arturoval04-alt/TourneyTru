# PLAN — IDENTIDAD, LIGAS Y JUGADORES GLOBALES
### Autenticación · Monetización · Jerarquía · Jugador Verificado

> **Fecha:** Marzo 2026
> **Estado:** Plan de diseño — pendiente de dominio propio y BD en la nube
> **Prioridad:** Diseñar el modelo de datos AHORA aunque la implementación sea después

---

## EL PROBLEMA CENTRAL QUE RESUELVE ESTE PLAN

Hoy en TourneyTru, un jugador existe **dentro de un equipo**, que existe **dentro de un torneo**.
Esto significa que "Luis Alejandro Juárez" en el Torneo A y "Luis Alejandro Juárez" en el Torneo B son dos registros diferentes sin ninguna conexión.

Lo que queremos:

```
AHORA (problemático):
Torneo A → Equipo X → Jugador "Luis" (registro #1)
Torneo B → Equipo Y → Jugador "Luis" (registro #2, sin conexión)

FUTURO (correcto):
Jugador Global "Luis" (verificado, una sola identidad)
  ├── Torneo A → Equipo X → Luis (mismo jugador)
  └── Torneo B → Equipo Y → Luis (mismo jugador, stats acumuladas)
```

Este cambio afecta el modelo de datos, la autenticación, el sistema de roles y los planes de pago.
Todo está conectado — por eso hay que planear todo junto aunque se implemente por etapas.

---

## PARTE 1 — JERARQUÍA DEFINITIVA DEL SISTEMA

### La cadena completa:

```
Liga
 └── Torneo
      └── Equipo (instancia del equipo en ese torneo)
           └── Jugador (identidad global, reutilizable)
```

### Explicación de cada nivel:

| Nivel | Descripción | Ejemplo |
|---|---|---|
| **Liga** | Organización deportiva permanente | Liga Municipal de Softbol de Ahome |
| **Torneo** | Competencia específica dentro de la liga | Torneo "Pollo Fierro" 2026 |
| **Equipo** | Franquicia que participa en uno o más torneos | Tacos El Zurdo |
| **Jugador** | Persona real, identidad única y verificable | Luis Alejandro Juárez #72 |

### Relaciones importantes a entender:

- Una **Liga** puede tener muchos **Torneos** a lo largo del tiempo
- Un **Equipo** puede participar en múltiples **Torneos** (misma franquicia, diferente temporada)
- Un **Jugador** puede jugar en diferentes **Equipos** en diferentes **Torneos**
- Las **Estadísticas** se acumulan por jugador a través del tiempo

---

## PARTE 2 — CAMBIO DE MODELO DE DATOS (El más importante)

Este es el cambio arquitectónico central. Hay que hacerlo antes de crecer más.

### El problema actual en el schema:

```prisma
// ACTUAL — Jugador amarrado a un equipo específico
model Player {
  id       String @id
  teamId   String // ← Problema: solo puede estar en UN equipo
  team     Team   @relation(...)
  // ...
}
```

### El modelo correcto:

```prisma
// ─────────────────────────────────────────────
// JUGADOR GLOBAL — Identidad permanente
// ─────────────────────────────────────────────
model Player {
  id            String   @id @default(cuid())
  // Datos personales (inmutables o raramente cambian)
  firstName     String
  lastName      String
  dateOfBirth   DateTime?
  photoUrl      String?

  // Datos de juego (pueden variar por torneo)
  bats          String?   // L, R, S (switch)
  throws        String?   // L, R

  // Verificación
  isVerified    Boolean  @default(false)
  verifiedAt    DateTime?
  verificationMethod String? // 'email', 'id_document', 'admin'

  // Cuenta de usuario vinculada (opcional — un jugador puede existir sin cuenta)
  userId        String?  @unique
  user          User?    @relation(fields: [userId], references: [id])

  // RELACIÓN NUEVA: participaciones en equipos
  rosterEntries RosterEntry[]

  // Stats globales calculadas (acumulado de toda su carrera)
  careerStats   PlayerCareerStat?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([lastName, firstName])
  @@index([userId])
}

// ─────────────────────────────────────────────
// ROSTER ENTRY — El jugador en un equipo específico de un torneo
// Esta tabla REEMPLAZA la relación directa Player → Team
// ─────────────────────────────────────────────
model RosterEntry {
  id           String  @id @default(cuid())
  playerId     String
  teamId       String
  tournamentId String  // Denormalizado para queries más rápidos

  // Datos que pueden variar por torneo (un jugador puede usar
  // diferente número o posición en diferentes equipos)
  number       Int
  position     String  // P, C, 1B, 2B, SS, 3B, LF, CF, RF, DH, UT

  isActive     Boolean @default(true)
  joinedAt     DateTime @default(now())
  leftAt       DateTime? // Si fue cortado o transferido

  player       Player     @relation(fields: [playerId], references: [id])
  team         Team       @relation(fields: [teamId], references: [id])
  tournament   Tournament @relation(fields: [tournamentId], references: [id])

  // Stats de este jugador en este torneo específico (ya existe como PlayerStat)
  stats        PlayerStat?

  @@unique([playerId, teamId, tournamentId]) // Un jugador, un equipo, por torneo
  @@index([teamId, tournamentId])
  @@index([playerId])
}

// ─────────────────────────────────────────────
// STATS ACUMULADAS DE CARRERA
// Se recalcula al terminar cada torneo
// ─────────────────────────────────────────────
model PlayerCareerStat {
  id          String @id @default(cuid())
  playerId    String @unique
  player      Player @relation(fields: [playerId], references: [id])

  // Bateo carrera
  gamesPlayed Int    @default(0)
  atBats      Int    @default(0)
  hits        Int    @default(0)
  hr          Int    @default(0)
  rbi         Int    @default(0)
  bb          Int    @default(0)
  so          Int    @default(0)
  avg         Float  @default(0)
  obp         Float  @default(0)
  slg         Float  @default(0)
  ops         Float  @default(0)

  // Pitcheo carrera
  wins        Int    @default(0)
  losses      Int    @default(0)
  era         Float  @default(0)
  ip          Float  @default(0)

  tournamentsPlayed Int @default(0)
  teamsPlayed       Int @default(0)

  updatedAt   DateTime @updatedAt
}

// ─────────────────────────────────────────────
// LIGA — Nivel superior de la jerarquía
// Ya existe en el schema pero necesita expandirse
// ─────────────────────────────────────────────
model League {
  id          String  @id @default(cuid())
  name        String
  shortName   String?
  logoUrl     String?
  description String?
  city        String?
  state       String?
  country     String  @default("MX")
  sport       String  @default("baseball") // baseball | softball | both
  foundedYear Int?
  websiteUrl  String?
  facebookUrl String?

  // Plan de pago de la liga
  planId      String?
  plan        Plan?   @relation(fields: [planId], references: [id])
  planExpiresAt DateTime?

  adminId     String
  admin       User    @relation(fields: [adminId], references: [id])
  tournaments Tournament[]
  umpires     Umpire[]

  isVerified  Boolean @default(false) // Liga verificada por TourneyTru
  isActive    Boolean @default(true)

  createdAt   DateTime @default(now())

  @@index([adminId])
  @@index([city, sport])
}
```

---

## PARTE 3 — AUTENTICACIÓN CON VERIFICACIÓN DE EMAIL

### Por qué esperar es la decisión correcta:

Para el email de verificación necesitas:
1. **Dominio propio** — Los emails de verificación desde `gmail.com` o `outlook.com` van a spam
2. **Servicio de envío de email** — Resend, SendGrid, o AWS SES (requieren dominio verificado)
3. **Base de datos en la nube** — Los tokens de verificación deben persistir, no en un servidor local con túnel

### Lo que debes diseñar ahora (para no refactorizar después):

```prisma
// Schema que soporta verificación de email CUANDO estés listo
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String

  // Verificación de email
  emailVerified     Boolean   @default(false)
  emailVerifiedAt   DateTime?

  // Token para verificar email (se llena al registrarse, se borra al verificar)
  verificationToken String?   @unique
  verificationTokenExpiresAt DateTime?

  // Datos del perfil
  firstName         String
  lastName          String
  phone             String?
  profilePicture    String?

  // Rol en la plataforma
  roleId            String?
  role              Role?     @relation(fields: [roleId], references: [id])

  // Jugador vinculado (si el usuario es un jugador)
  playerProfile     Player?

  // Plan de pago personal (si aplica para ligas individuales)
  planId            String?
  plan              Plan?     @relation(fields: [planId], references: [id])

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([email])
  @@index([verificationToken])
}
```

### Flujo de verificación de email (para implementar después):

```
[Usuario se registra]
        ↓
[Backend genera token UUID + lo guarda hasheado en DB]
[Backend envía email: "Verifica tu cuenta en TourneyTru"]
        ↓
[Usuario hace click en link: https://tourneytru.com/verify?token=abc123]
        ↓
[Backend verifica el token, marca emailVerified = true, borra el token]
        ↓
[Usuario puede hacer login completo]
```

### Regla de negocio importante a decidir:

¿Qué puede hacer un usuario NO verificado?
- **Opción A (restrictiva):** No puede hacer nada hasta verificar email
- **Opción B (permisiva):** Puede explorar pero no crear torneos/equipos
- **Recomendación:** Opción B — permite onboarding suave, muestra valor antes de pedir verificación

```typescript
// backend/src/auth/guards/email-verified.guard.ts
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu correo electrónico para realizar esta acción.'
      );
    }
    return true;
  }
}

// Uso solo en endpoints que lo requieren:
@Post('tournaments')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard) // ← Solo aquí
async createTournament(...) {}
```

---

## PARTE 4 — SISTEMA DE PLANES DE PAGO

### Filosofía del modelo de negocio

El cliente de TourneyTru no es el jugador — **es la liga o el organizador**.
Los jugadores y espectadores siempre deben acceder gratis.

```
GRATIS ← jugadores, espectadores, managers de equipo
DE PAGO ← organizadores de torneo, admins de liga
```

### Planes sugeridos:

```
┌─────────────────┬──────────────┬───────────────┬────────────────┐
│                 │   STARTER    │      PRO       │   ELITE        │
│                 │   Gratis     │  $X/mes        │  $XX/mes       │
├─────────────────┼──────────────┼───────────────┼────────────────┤
│ Torneos activos │      1       │       5        │   Ilimitados   │
│ Equipos/torneo  │      8       │      16        │   Ilimitados   │
│ Jugadores/equipo│     15       │      25        │   Ilimitados   │
│ Scorekeepers    │      1       │       3        │   Ilimitados   │
│ Juegos en vivo  │      1       │   Todos        │   Todos        │
│ Estadísticas    │   Básicas    │   Completas    │   + Sabermetría│
│ Facebook Live   │      ✗       │       ✓        │        ✓       │
│ Bracket visual  │      ✗       │       ✓        │        ✓       │
│ Logo de liga    │      ✗       │       ✓        │        ✓       │
│ Soporte         │   Email      │   Prioritario  │   Dedicado     │
└─────────────────┴──────────────┴───────────────┴────────────────┘
```

### Modelo de datos para planes:

```prisma
model Plan {
  id          String  @id @default(cuid())
  name        String  // "Starter", "Pro", "Elite"
  slug        String  @unique // "starter", "pro", "elite"
  price       Float   // 0, X, XX
  currency    String  @default("MXN")
  interval    String  @default("month") // month | year

  // Límites del plan
  maxActiveTournaments  Int     // -1 = ilimitado
  maxTeamsPerTournament Int
  maxPlayersPerTeam     Int
  maxScorekeeperSlots   Int
  maxLiveGames          Int

  // Features booleanas
  facebookLiveEnabled   Boolean @default(false)
  bracketEnabled        Boolean @default(false)
  advancedStatsEnabled  Boolean @default(false)
  customLogoEnabled     Boolean @default(false)

  isActive    Boolean @default(true)

  leagues     League[]
  users       User[]

  createdAt   DateTime @default(now())
}

model Subscription {
  id          String   @id @default(cuid())
  leagueId    String?
  userId      String?
  planId      String

  status      String   // active | cancelled | past_due | trialing
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  // Referencia al proveedor de pago (Stripe, etc.)
  externalId  String?  // Stripe subscription ID
  paymentMethod String? // card_ending_4242

  league      League?  @relation(fields: [leagueId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])
  plan        Plan     @relation(fields: [planId], references: [id])

  createdAt   DateTime @default(now())
  cancelledAt DateTime?

  @@index([leagueId])
  @@index([status])
}
```

### Cómo aplicar los límites del plan en el backend:

```typescript
// backend/src/tournaments/tournaments.service.ts
async createTournament(dto: CreateTournamentDto, userId: string) {
  // 1. Obtener la liga y su plan
  const league = await this.prisma.league.findUnique({
    where: { id: dto.leagueId },
    include: { plan: true, tournaments: { where: { status: 'active' } } }
  });

  const plan = league.plan;
  const activeTournaments = league.tournaments.length;

  // 2. Verificar límite del plan
  if (plan.maxActiveTournaments !== -1 &&
      activeTournaments >= plan.maxActiveTournaments) {
    throw new ForbiddenException(
      `Tu plan ${plan.name} permite máximo ${plan.maxActiveTournaments} torneos activos. ` +
      `Actualiza tu plan para crear más torneos.`
    );
  }

  // 3. Crear el torneo
  return this.prisma.tournament.create({ data: dto });
}
```

### Procesador de pagos recomendado: **Stripe**

Stripe tiene SDK oficial para Node.js, maneja MXN, y tiene una integración directa con webhooks para actualizar el estado de las suscripciones automáticamente.

```typescript
// Cuando implementes pagos (DESPUÉS de tener dominio y cloud DB):
// npm install stripe

// backend/src/payments/payments.service.ts
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  async createCheckoutSession(leagueId: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: plan.stripePriceId, // ID del precio en tu dashboard de Stripe
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/liga/${leagueId}?upgraded=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: { leagueId, planSlug },
    });

    return { checkoutUrl: session.url };
  }
}
```

---

## PARTE 5 — SISTEMA DE JUGADOR VERIFICADO

### ¿Qué significa que un jugador esté "Verificado"?

Un jugador verificado es una **identidad real y única** en la plataforma.
Significa que TourneyTru (o la liga) ha confirmado que esa persona existe y sus datos son correctos.

### Niveles de verificación:

```
[ ] Sin verificar         — Solo nombre, número y foto. Creado por el manager.
[✓] Verificado por liga   — La liga/organizador confirmó la identidad.
[✓✓] Verificado con cuenta — El jugador tiene cuenta propia y la vinculó.
[✓✓✓] Verificado ID       — Documentación verificada (futuro — para ligas grandes).
```

### Flujo de cómo se crea y verifica un jugador:

```
FLUJO ACTUAL (sin verificación):
Manager crea equipo → Manager agrega jugador (nombre, número, posición)
→ Jugador existe solo en ese equipo de ese torneo

FLUJO FUTURO (con verificación):
┌─────────────────────────────────────────────────────────────┐
│                    OPCIÓN A — Manager agrega                │
│                                                             │
│  Manager busca: "Luis Juárez" en la base global             │
│    ├── Si existe → lo agrega al roster del equipo           │
│    └── Si no existe → lo crea (sin verificar por defecto)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OPCIÓN B — El jugador se registra         │
│                                                             │
│  Jugador crea cuenta → Completa perfil de jugador           │
│  → Sistema revisa si ya existe un registro con su nombre    │
│  → Si sí: puede reclamar ese perfil (con verificación)      │
│  → Si no: se crea el perfil vinculado a su cuenta           │
│  → El manager puede encontrarlo en búsquedas               │
└─────────────────────────────────────────────────────────────┘
```

### Búsqueda y reutilización de jugadores:

```typescript
// frontend — Cuando el manager agrega jugadores al roster
function AddPlayerToRoster({ teamId, tournamentId }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);

  const searchPlayers = async (q: string) => {
    // Busca en la base GLOBAL de jugadores
    const data = await api.get(`/players/search?q=${q}&tournamentId=${tournamentId}`);
    setResults(data);
  };

  return (
    <div>
      <input
        placeholder="Buscar jugador por nombre..."
        onChange={e => searchPlayers(e.target.value)}
      />

      {results.map(player => (
        <div key={player.id} className="flex items-center gap-3">
          <PlayerAvatar player={player} />
          <div>
            <p>{player.firstName} {player.lastName}</p>
            {player.isVerified && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <CheckCircle size={12} /> Verificado
              </span>
            )}
            <p className="text-muted-foreground text-xs">
              {player.careerStats?.gamesPlayed ?? 0} juegos · AVG {player.careerStats?.avg?.toFixed(3) ?? '.000'}
            </p>
          </div>
          <button onClick={() => addToRoster(player.id)}>
            + Agregar al equipo
          </button>
        </div>
      ))}

      <button onClick={createNewPlayer}>
        + Crear nuevo jugador
      </button>
    </div>
  );
}
```

### Reglas de negocio del jugador verificado:

```
REGLA 1: Un jugador SIN cuenta puede existir en la BD (creado por manager)
REGLA 2: Un jugador CON cuenta tiene control sobre su perfil (foto, datos)
REGLA 3: Un jugador verificado NO puede duplicarse
         → El sistema debe detectar y sugerir fusionar duplicados
REGLA 4: Un jugador puede jugar en MÚLTIPLES equipos en el MISMO torneo
         → Solo si la regla del torneo lo permite (árbitros, jugadores comodín)
REGLA 5: Las stats se acumulan automáticamente cross-torneos
REGLA 6: El número de dorsal puede variar por equipo/torneo (se guarda en RosterEntry)
```

### Detección de duplicados:

```typescript
// backend/src/players/players.service.ts
async findPotentialDuplicates(firstName: string, lastName: string) {
  // Busca jugadores con nombre similar para evitar duplicados
  return this.prisma.player.findMany({
    where: {
      OR: [
        // Mismo nombre y apellido exacto
        { firstName, lastName },
        // Apellido igual, nombre similar (para "Luis" vs "Luis Alejandro")
        {
          lastName,
          firstName: { startsWith: firstName.split(' ')[0] }
        }
      ]
    },
    include: {
      careerStats: true,
      rosterEntries: {
        include: { team: true, tournament: true },
        take: 3,
        orderBy: { joinedAt: 'desc' }
      }
    }
  });
}

// Endpoint usado ANTES de crear un jugador nuevo:
// GET /players/check-duplicate?firstName=Luis&lastName=Juarez
// → Devuelve lista de posibles duplicados para que el manager confirme
```

---

## PARTE 6 — PÁGINA DE LIGAS

### Lo que necesita la página de una liga:

```
Liga Municipal de Softbol de Ahome (LMSA)
├── Header: Logo · Nombre · Ciudad · Sport · [Verificada ✓]
├── Tabs:
│   ├── Inicio      → Torneos recientes/activos, noticias
│   ├── Torneos     → Lista de todos los torneos de la liga
│   ├── Equipos     → Franquicias históricas de la liga
│   ├── Jugadores   → Todos los jugadores que han participado
│   ├── Estadísticas → Líderes históricos de la liga (bateo, pitcheo)
│   └── Info        → Contacto, redes sociales, campos
└── (Si admin) Panel de administración de la liga
```

### Rutas sugeridas:

```
/ligas                    → Lista de todas las ligas públicas
/ligas/[id]               → Página principal de una liga
/ligas/[id]/torneos       → Torneos de la liga
/ligas/[id]/estadisticas  → Líderes históricos
/ligas/[id]/admin         → Administración (protegida)
```

### Jerarquía de navegación completa del sitio:

```
/                         → Home (torneos en vivo + búsqueda)
/ligas                    → Ligas
/ligas/[id]               → Liga
/torneos                  → Todos los torneos
/torneos/[id]             → Torneo (ya existe: /torneos/[id])
  /torneos/[id]/equipos   → Equipos en este torneo
  /torneos/[id]/posiciones → Tabla de posiciones
  /torneos/[id]/bracket   → Bracket de eliminación (futuro)
/equipos/[id]             → Equipo (ya existe)
/jugadores                → Directorio global de jugadores
/jugadores/[id]           → Perfil del jugador (ya existe)
/gamecast/[id]            → Juego en vivo (ya existe)
```

---

## PARTE 7 — ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Por qué este orden importa:

El cambio de modelo de datos (Player → RosterEntry) es el más invasivo.
Si lo haces después de agregar más funcionalidad, el costo de migración crece.

### Fase 0 — Ahora (antes de cualquier otra cosa)
> Sin necesidad de dominio propio ni cloud DB

- [ ] Migrar `Player.teamId` a tabla `RosterEntry` (cambio de schema)
- [ ] Agregar `League` expandida con los campos de info
- [ ] Crear página `/ligas/[id]` básica
- [ ] Búsqueda global de jugadores al agregar al roster
- [ ] Agregar campo `isVerified` al jugador (aunque no haya flujo aún)
- [ ] Añadir modelo `Plan` y `Subscription` al schema (vacíos, sin lógica aún)

**Por qué ahora:** Estos cambios de schema son más fáciles de hacer con pocos datos en BD.
Después de cientos de torneos registrados, una migración es mucho más riesgosa.

---

### Fase 1 — Cuando tengas dominio + cloud DB
> Prerrequisito: dominio propio + Resend/SendGrid configurado + BD migrada

- [ ] Verificación de email al registrarse
- [ ] Email guard en endpoints que lo requieran
- [ ] Flujo "Reclamar perfil de jugador" (jugador existente vincula su cuenta)
- [ ] Detección de duplicados al crear jugador

---

### Fase 2 — Cuando tengas usuarios activos pagando
> Prerrequisito: al menos 5-10 ligas usando la plataforma activamente

- [ ] Integración con Stripe (checkout, webhooks)
- [ ] Tabla `Plan` con límites aplicados en el backend
- [ ] Página de pricing en `/precios`
- [ ] Dashboard de suscripción para el admin de la liga
- [ ] Downgrade graceful (si no pagan, limitar sin borrar datos)

---

### Fase 3 — Jugador verificado completo
> Prerrequisito: Fases 1 y 2 completas

- [ ] Verificación por documento (upload de INE/pasaporte)
- [ ] Badge visual en perfil de jugador verificado
- [ ] Stats de carrera acumuladas automáticamente
- [ ] Perfil de jugador público compartible (URL canónica)
- [ ] Historial completo de equipos y torneos en el perfil

---

## RESUMEN DE CAMBIOS DE SCHEMA A HACER YA

```
AGREGAR:
+ RosterEntry (reemplaza Player.teamId)
+ PlayerCareerStat
+ Plan
+ Subscription
+ Campos a League: shortName, description, city, state, sport, foundedYear, websiteUrl, facebookUrl, planId, isVerified
+ Campos a Player: isVerified, verifiedAt, verificationMethod, userId (opcional)
+ Campos a User: emailVerified, emailVerifiedAt, verificationToken, verificationTokenExpiresAt, playerProfile

MODIFICAR:
~ Player: eliminar teamId (reemplazado por RosterEntry)
~ Lineup: cambiar referencia de Player a RosterEntry (o mantener playerId + verificar membresía)

RUTAS NUEVAS:
+ /ligas
+ /ligas/[id]
+ /ligas/[id]/admin
+ /precios (cuando haya planes)
```

---

*Este documento define la arquitectura a largo plazo de TourneyTru.*
*Los cambios de schema en Fase 0 deben hacerse antes de que crezca más la base de datos.*
