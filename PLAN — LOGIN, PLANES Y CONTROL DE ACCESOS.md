# PLAN — LOGIN, PLANES DE PAGO Y CONTROL DE ACCESOS
### Autenticación · Planes · Cuotas · Admin

> **Fecha:** Marzo 2026
> **Estado:** Plan de diseño — implementación por etapas
> **Conectado con:** PLAN — IDENTIDAD, LIGAS Y JUGADORES GLOBALES.md

---

## VISIÓN GENERAL

El sistema de accesos de TourneyTru tiene tres capas:

```
1. AUTENTICACIÓN — quién eres (login, registro, email verificado)
2. ROL — qué tipo de cuenta tienes (admin, organizador, público)
3. CUOTA — cuánto puedes crear (ligas, torneos, equipos, jugadores)
```

Estas tres capas son independientes pero trabajan juntas.
Un organizador Pro tiene el mismo rol que uno Estándar — la diferencia está en sus cuotas.

---

## PARTE 1 — PLANES DE PAGO

### Los planes

| Plan | Liga | Torneos por liga | Equipos por torneo | Jugadores por equipo |
|---|---|---|---|---|
| **Demo** | 1 | 1 | 6 | 25 |
| **Estándar** | 1 | 3 | 10 | 30 |
| **Pro** | 1 | 10 | 50 | 50 |
| **Admin Total** | Sin límite | Sin límite | Sin límite | Sin límite |

> El número de ligas por plan es 1 — si quiere una segunda liga, la compra como add-on.

### Modelo de cuotas (lo que se guarda en BD)

En lugar de guardar "Plan Estándar", guardamos los números directamente por usuario.
Esto permite flexibilidad total: el admin puede darle cuotas personalizadas a cualquier cuenta.

```
User
├── maxLeagues        (ej: 1)
├── maxTournamentsPerLeague  (ej: 3)
├── maxTeamsPerTournament    (ej: 10)
├── maxPlayersPerTeam        (ej: 30)
└── planLabel         (ej: "standard" | "pro" | "demo" | "admin")
    ← solo para mostrar el badge en UI, la lógica usa los números
```

### Add-ons (extras que se compran)

| Add-on | Descripción |
|---|---|
| Liga extra | +1 liga adicional |
| Torneo extra | +1 torneo en una liga específica |
| Equipo extra | +X equipos en todos los torneos de esa liga |

> **Por ahora:** toda la interfaz de planes y add-ons se muestra como "Próximo" sin cobro real.
> Stripe/Shopify se integra en Etapa 3.

---

## PARTE 2 — FLUJO DE REGISTRO Y ROLES

### Roles del sistema

| Rol | Descripción |
|---|---|
| `public` | Cuenta recién creada — solo puede ver contenido público |
| `organizer` | Puede crear ligas/torneos dentro de su cuota. Puede crear scorekeepers para su liga. |
| `scorekeeper` | Puede crear y llevar juegos en cualquier torneo de la liga a la que pertenece |
| `admin` | Control total — gestiona cuentas, cuotas y roles |

### Scorekeepers — creados por el organizador

Un organizador puede crear cuentas de scorekeeper **vinculadas a su liga**.
El scorekeeper hereda el scope de esa liga: puede operar en **cualquier torneo** dentro de ella,
pero no puede salir de ese scope (no ve ni toca otras ligas).

```
Organizer (dueño de Liga A)
  └── crea Scorekeeper Juan
        └── Juan puede: crear y llevar juegos en Torneo 1, Torneo 2, Torneo 3...
                         (todos dentro de Liga A)
        └── Juan NO puede: crear ligas, crear torneos, gestionar equipos/jugadores,
                            ver ligas de otros organizadores
```

**Modelo de datos — vínculo scorekeeper ↔ liga:**
```prisma
model User {
  // ...
  // Para scorekeepers: liga a la que pertenecen
  scorekeeperLeagueId  String?
  scorekeeperLeague    League? @relation("LeagueScorekeepers", fields: [scorekeeperLeagueId], references: [id])
}
```

**Flujo de creación:**
1. El organizador entra a su panel de liga → sección "Mis Scorekeepers"
2. Llena: nombre, apellido, correo, contraseña temporal
3. El sistema crea la cuenta con rol `scorekeeper` + `scorekeeperLeagueId` = liga del organizador
4. El scorekeeper recibe sus credenciales (por ahora se las pasa el organizador directamente)
5. Al entrar, el scorekeeper ve solo los juegos de esa liga

**Permisos exactos del scorekeeper:**
- ✅ Ver torneos de su liga
- ✅ Abrir el panel de un juego y llevar el marcador
- ✅ Crear un juego nuevo (con equipos ya registrados en el torneo)
- ❌ Crear/editar/eliminar ligas, torneos, equipos o jugadores
- ❌ Ver otras ligas
- ❌ Gestionar otros usuarios

### Flujo de registro actual (a modificar)

**ANTES:**
```
Formulario → Cuenta creada → Redirige al dashboard
```

**DESPUÉS:**
```
Formulario → Elige tipo de cuenta:
    ├── "Solo ver" (público) → cuenta creada, redirige a home
    └── "Quiero organizar" (demo) → cuenta creada como public
                                    + mensaje de solicitud de acceso
```

### Mensaje en pantalla para solicitud Demo

Justo antes del botón "Crear cuenta", si eligió "Quiero organizar":

```
┌─────────────────────────────────────────────────────────────┐
│  Gracias por tu interés en TourneyTru como organizador.     │
│                                                             │
│  Tu cuenta será creada como visitante. Para activar         │
│  acceso de organizador, envía un correo a:                  │
│                                                             │
│  valdezarturoval@gmail.com                                  │
│                                                             │
│  con tu nombre y correo registrado. Recibirás respuesta     │
│  en máximo 2 días hábiles.                                  │
└─────────────────────────────────────────────────────────────┘
```

Este mensaje también aparece en el dashboard del usuario público:
> "Tu solicitud de acceso como organizador está pendiente de revisión."

---

## PARTE 3 — PANEL DE CONTROL DE ACCESOS (ADMIN)

Esta es la pantalla más importante para la operación diaria.

### Lo que el admin puede hacer por cuenta

1. **Cambiar rol** → public / organizer / scorekeeper / admin
2. **Establecer cuotas manualmente:**
   - Máximo de ligas
   - Máximo de torneos por liga
   - Máximo de equipos por torneo
   - Máximo de jugadores por equipo
3. **Asignar etiqueta de plan** → Demo / Estándar / Pro / Custom
4. **Ver uso actual** → cuántas ligas tiene creadas, cuántos torneos, etc.

### Wireframe de la pantalla de Control de Accesos

```
CONTROL DE ACCESOS
──────────────────────────────────────────────────────────

🔍 [Buscar por nombre o correo...]

┌─────────────────────────────────────────────────────────┐
│ Arturo Valdez           arturoval04@gmail.com           │
│ Rol: ADMIN TOTAL        Plan: —                         │
│                                          [Editar]       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Juan Ejemplo            juan@ejemplo.com                │
│ Rol: public ← PENDIENTE Plan: —                        │
│ Solicitud: "Quiero organizar el torneo municipal"       │
│                         [Activar como Organizador] [↓]  │
└─────────────────────────────────────────────────────────┘

Al hacer [Editar] o [Activar]:

┌──────────────────────────────────────────────────────┐
│ EDITAR CUENTA — Juan Ejemplo                         │
│                                                      │
│ Rol:    [Organizador ▼]                              │
│                                                      │
│ Cuotas:                                              │
│   Ligas:              [1  ▲▼]                        │
│   Torneos por liga:   [3  ▲▼]                        │
│   Equipos p/torneo:   [10 ▲▼]                        │
│   Jugadores p/equipo: [30 ▲▼]                        │
│                                                      │
│ Etiqueta de plan:                                    │
│   ○ Demo  ● Estándar  ○ Pro  ○ Custom                │
│                                                      │
│                           [Guardar] [Cancelar]       │
└──────────────────────────────────────────────────────┘
```

---

## PARTE 4 — ENFORCEMENT DE CUOTAS (LÓGICA BACKEND)

Cuando un organizador intenta crear algo, el backend verifica:

```typescript
// Ejemplo: crear un torneo
async createTournament(userId, leagueId, dto) {
    const user = await this.getUserWithQuotas(userId);
    const currentCount = await this.countTournamentsInLeague(leagueId);

    if (currentCount >= user.maxTournamentsPerLeague) {
        throw new ForbiddenException({
            code: 'QUOTA_EXCEEDED',
            message: 'Alcanzaste el límite de torneos de tu plan.',
            limit: user.maxTournamentsPerLeague,
            current: currentCount,
            upgradeAvailable: true,
        });
    }

    // ...crear torneo
}
```

El frontend muestra un modal específico cuando recibe `QUOTA_EXCEEDED`:

```
┌────────────────────────────────────────────────┐
│  Límite alcanzado                              │
│                                                │
│  Tu plan Estándar incluye hasta 3 torneos      │
│  por liga. Ya tienes 3.                        │
│                                                │
│  [Ver planes →]          [Cerrar]              │
└────────────────────────────────────────────────┘
```

---

## PARTE 5 — PANTALLA DE PLANES (UI "PRÓXIMO")

Ruta: `/planes`

Se muestra en el navbar para usuarios logueados y en una sección del home público.

```
┌──────────────────────────────────────────────────────────┐
│                    ELIGE TU PLAN                          │
│         Gestiona torneos con las herramientas             │
│              que tu liga necesita                         │
└──────────────────────────────────────────────────────────┘

┌────────────┐  ┌───────────────┐  ┌────────────────────┐
│   DEMO     │  │  ESTÁNDAR     │  │       PRO          │
│            │  │               │  │                    │
│ Con apro-  │  │  Próximamente │  │  Próximamente      │
│ bación     │  │               │  │                    │
│            │  │  $XX/mes      │  │  $XX/mes           │
│ 1 liga     │  │  1 liga       │  │  1 liga            │
│ 1 torneo   │  │  3 torneos    │  │  10 torneos        │
│ 6 equipos  │  │  10 equipos   │  │  50 equipos        │
│ 25 jugad.  │  │  30 jugad.    │  │  50 jugad.         │
│            │  │               │  │                    │
│ [Solicitar]│  │ [Próximamente]│  │  [Próximamente]    │
└────────────┘  └───────────────┘  └────────────────────┘

          ¿Necesitas algo personalizado?
          Escríbenos a valdezarturoval@gmail.com
```

---

## PARTE 6 — REDISEÑO DEL LOGIN (VISUAL)

### Estructura de la nueva página

**Desktop (split layout):**
```
┌──────────────────────┬─────────────────────────┐
│                      │                         │
│   HERO IZQUIERDO     │   FORMULARIO            │
│                      │                         │
│  Imagen/gradiente    │   TT logo               │
│  deportivo           │                         │
│                      │   Bienvenido de vuelta  │
│  "La plataforma de   │                         │
│  béisbol que tu      │   [Email]               │
│  torneo merece"      │   [Contraseña]          │
│                      │   [Iniciar sesión]      │
│  • Logo TT grande    │                         │
│  • Stats animados    │   ¿No tienes cuenta?    │
│    del torneo        │   [Registrarse]         │
│    (si los hay)      │                         │
└──────────────────────┴─────────────────────────┘
```

**Móvil:** Solo el formulario, con logo TT arriba y fondo con gradiente sutil.

### Elementos visuales clave

- Fondo izquierdo: gradiente `from-primary/20 via-background to-background` + patrón de diamante SVG
- Tipografía hero: Barlow Condensed, bold, grande
- Badge "BETA" o "TEMPORADA 2026" en el hero
- Botón de login: full-width, `bg-primary`, hover con ligero scale
- Link de registro con mención al plan Demo

---

## ETAPAS DE IMPLEMENTACIÓN

### Etapa 0 — Ya hecho ✅
- Login funcional con JWT
- Registro básico
- Roles en BD (admin, organizer, scorekeeper, general)

### Etapa 1 — Esta semana (implementar ahora)
**Objetivo:** Control de accesos funcional + cuotas + UI de planes como "próximo"

1. **BD:** Agregar campos de cuota al modelo `User` en Prisma
   ```prisma
   maxLeagues              Int @default(0)
   maxTournamentsPerLeague Int @default(0)
   maxTeamsPerTournament   Int @default(0)
   maxPlayersPerTeam       Int @default(25)
   planLabel               String @default("public")
   ```

2. **Backend:** Middleware/guard de cuotas en los endpoints de crear liga, torneo, equipo, jugador

3. **Admin Dashboard — Control de Accesos:**
   - Lista de usuarios con rol y cuota
   - Modal para editar rol + cuotas
   - Badge "PENDIENTE" en cuentas que tienen nota de solicitud

4. **Registro:** Selector de intención (ver / organizar) + mensaje de solicitud si elige organizar

5. **Frontend — Pantalla `/planes`:** Cards visuales con planes, todo marcado como "Próximamente" excepto Demo

6. **Login:** Rediseño visual (split layout desktop / formulario móvil)

### Etapa 2 — Próximas semanas
- Verificación de correo electrónico al registrarse
- Notificación interna al admin cuando llega una solicitud nueva
- Página de perfil de organizador con uso de cuota visible ("2/3 torneos usados")

### Etapa 3 — Futuro
- Integración de pago (Stripe o similar)
- Upgrade automático de plan al pagar
- Facturación y recibos

---

## MODELO DE DATOS COMPLETO (ETAPA 1)

```prisma
model User {
  // ...campos existentes...

  // Cuotas del plan
  maxLeagues              Int     @default(0)
  maxTournamentsPerLeague Int     @default(0)
  maxTeamsPerTournament   Int     @default(0)
  maxPlayersPerTeam       Int     @default(25)
  planLabel               String  @default("public")

  // Solicitud de acceso como organizador
  organizerRequestNote    String? // mensaje que dejó al registrarse
  organizerRequestedAt    DateTime?
}
```

**Cuotas por defecto al activar un plan:**

| planLabel | maxLeagues | maxTournaments | maxTeams | maxPlayers |
|---|---|---|---|---|
| `public` | 0 | 0 | 0 | 25 |
| `demo` | 1 | 1 | 6 | 25 |
| `standard` | 1 | 3 | 10 | 30 |
| `pro` | 1 | 10 | 50 | 50 |
| `admin` | 999 | 999 | 999 | 999 |

Cuando el admin cambia el `planLabel`, el backend setea automáticamente las cuotas default del plan.
Si el admin edita las cuotas manualmente, el `planLabel` se pone en `custom`.

---

## PREGUNTAS ABIERTAS (decidir antes de implementar)

1. **¿El scorekeeper tiene cuotas?** Probablemente no — es un rol operativo, no de creación.
2. **¿Un organizador puede tener múltiples ligas de tipos diferentes?** Por ahora no — 1 liga base, más como add-on.
3. **¿El límite de jugadores es por equipo o por torneo?** Por equipo (más fácil de gestionar).
4. **¿Los jugadores eliminados cuentan para el historial?** Sí — el conteo es de jugadores activos (no eliminados lógicamente).

---

*Documento creado el 26 de marzo de 2026.*
