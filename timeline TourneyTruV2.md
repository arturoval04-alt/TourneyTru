# TourneyTru — Timeline de Lanzamiento y Roadmap V2

> Documento de planificación estratégica · Creado: 6 de abril de 2026
> Arturo Valdez — Fundador y Desarrollador Principal

---

## VALIDACIÓN DEL ENFOQUE ACTUAL

> **TL;DR: Lo que tienes hoy está bien hecho. No lo cambies antes de lanzar.**

El modelo actual — donde tú como admin asignas manualmente los límites de cada usuario desde el panel — es exactamente la estrategia correcta para lanzar. Razones:

1. **Cero riesgo financiero**: No procesas pagos, no tienes chargebacks, no necesitas PCI compliance ni integración con bancos. Puedes lanzar hoy.
2. **Flexibilidad total**: Puedes dar demos extendidas, ajustar límites caso por caso, negociar con ligas grandes sin que el sistema lo impida.
3. **Validación de mercado primero**: No tiene sentido invertir semanas en pagos automáticos si aún no sabes cuántos usuarios van a pagar. Primero confirma que hay demanda real, luego automatiza.
4. **La base técnica ya está**: `maxLeagues`, `maxTournamentsPerLeague`, `maxTeamsPerTournament`, `maxPlayersPerTeam`, `planLabel` — todo existe en el modelo `User`. Migrar a pagos automáticos después es un trabajo de semanas, no meses.

**Lo único que cambia en V2 es quién activa esos campos: hoy eres tú manualmente, mañana será Stripe/Conekta automáticamente.**

---

## DEFINICIÓN FINAL DE PLANES (para configurar en el panel admin)

### Plan Demo — GRATIS
| Campo | Valor |
|---|---|
| `planLabel` | `demo` |
| Precio | $0 |
| Vigencia | 30 días desde la activación |
| Juegos máximos | 40 juegos realizados |
| `maxLeagues` | 1 |
| `maxTournamentsPerLeague` | 1 |
| `maxTeamsPerTournament` | 8 |
| `maxPlayersPerTeam` | 16 |
| Renovación | Manual (el admin puede extender) |

**Propósito**: Que cualquier organizador pruebe la plataforma con un torneo real antes de pagar.

---

### Plan Organizador Base — $1,200/mes
| Campo | Valor |
|---|---|
| `planLabel` | `standard` |
| Precio | $1,200 MXN/mes |
| Vigencia | 30 días desde el pago |
| Juegos máximos | Ilimitados |
| `maxLeagues` | 1 |
| `maxTournamentsPerLeague` | 1 |
| `maxTeamsPerTournament` | 20 |
| `maxPlayersPerTeam` | Ilimitado (999) |

---

### Add-ons del Plan Organizador (cobro manual hoy, automático en V2)
| Add-on | Costo mensual | Cómo se activa hoy |
|---|---|---|
| +1 torneo adicional (hasta 20 equipos) | +$600/mes | Admin sube `maxTournamentsPerLeague` a 2 |
| +1 equipo extra en cualquier torneo | +$80/equipo/mes | Admin sube `maxTeamsPerTournament` |

**Ejemplo**: Un organizador con 1 liga, 2 torneos y 25 equipos en torneo 2 paga:
`$1,200 + $600 + (5 × $80) = $2,200/mes`

---

### Plan Streamer — $500 / 50 juegos
| Campo | Valor |
|---|---|
| `planLabel` | `streamer` |
| Precio | $500 MXN por paquete de 50 juegos |
| Juegos incluidos | 50 (contador manual por ahora) |
| Acceso | Solo panel de transmisión y overlay |
| Renovación | Compra otro paquete al terminarse |

**Nota**: El campo `maxGamesStreamed` no existe aún en el schema — en V2 se agrega. Por ahora el admin lleva el conteo manualmente o lo honra por confianza con el streamer.

---

## TIMELINE

---

### FASE 0 — LANZAMIENTO HOY (6 de abril, 2026)
**Objetivo**: Estar en redes y disponible para primeros usuarios. Sin pagos, sin automatización.

#### Checklist técnico (antes de publicar)
- [x] Verificación de correo por email funcionando
- [x] Deploy en Vercel actualizado con build exitoso
- [ ] Probar flujo completo: registro → verificación → login → crear liga → torneo → equipo
- [ ] Verificar que el correo de admin@tourneytru.com llega (revisar spam)
- [ ] Confirmar que tourneytru.com apunta al frontend correcto

#### Checklist de redes sociales (hoy)
- [ ] Post de lanzamiento en Facebook (copy del MD de presentación)
- [ ] Post de lanzamiento en Instagram
- [ ] Stories en Instagram mostrando la app en uso
- [ ] Link en bio de Instagram → tourneytru.com
- [ ] Grupos de WhatsApp de ligas conocidas → compartir el link

#### Proceso de onboarding manual (primeros usuarios)
1. Usuario se registra en tourneytru.com
2. Verifica su correo
3. Te manda mensaje (WhatsApp / correo a admin@tourneytru.com) para solicitar plan
4. Tú entras al panel admin → buscas al usuario → subes sus límites según el plan
5. Le confirmas por WhatsApp que ya tiene acceso

**Este proceso es temporal pero funciona perfectamente para los primeros 20-50 usuarios.**

---

### FASE 1 — ESTABILIZACIÓN (Abril – Mayo 2026)
**Objetivo**: Tener las primeras ligas reales usando la plataforma. Detectar y corregir bugs.

#### Semana 1-2 (6–20 abril)
- Onboardear manualmente las primeras 3-5 ligas
- Acompañar a los primeros scorekeepers en sus juegos reales
- Registrar bugs y feedback en un documento o Notion
- Seguir publicando contenido: clips del gamecast, screenshots de estadísticas, stories de juegos en vivo

#### Semana 3-4 (20 abril – 4 mayo)
- Corregir bugs críticos encontrados en uso real
- Ajustar UI según feedback de usuarios (especialmente panel de anotación en móvil/tablet)
- Crear página de "Cómo empezar" o FAQ en tourneytru.com
- Documentar el proceso de onboarding para poder delegarlo si crece

#### Meta de Fase 1
- 5+ ligas activas
- 20+ torneos creados
- 100+ juegos registrados
- Cero errores críticos en producción

---

### FASE 2 — MONETIZACIÓN MANUAL OPTIMIZADA (Mayo – Junio 2026)
**Objetivo**: Formalizar el cobro sin pagos automáticos. Flujo: transferencia → tú activas el plan.

#### Proceso de pago manual (formal)
1. Usuario solicita plan (formulario simple o WhatsApp)
2. Tú le mandas los datos de transferencia bancaria o OXXO
3. Usuario paga y te manda comprobante
4. Tú activas el plan desde el panel admin
5. El sistema controla los límites automáticamente

**Herramientas para este paso (sin código nuevo):**
- **Recibo**: Facturapi o simplemente PDF manual
- **Seguimiento**: Hoja de Google Sheets con usuario, plan, fecha de pago, fecha de vencimiento
- **Recordatorio**: Tú (o un asistente) manda WhatsApp 5 días antes del vencimiento

#### Lo que sí requiere código en esta fase
- [ ] **Campo `planExpiresAt` en el modelo `User`** — para que el sistema sepa cuándo vence el plan y bloquee automáticamente
- [ ] **Verificación de vigencia en el backend** — al hacer login o al intentar crear contenido, revisar si el plan no ha vencido
- [ ] **Límite de 40 juegos en Demo** — agregar campo `gamesPlayed` o contarlo dinámicamente desde la tabla `Game`
- [ ] **Notificación de plan por vencer** — toast en el dashboard 7 días antes del vencimiento

**Estimado de desarrollo**: 1-2 días de trabajo.

---

### FASE 3 — PAGOS EN LÍNEA (Julio – Agosto 2026)
**Objetivo**: El usuario puede comprar y activar su plan sin intervención manual.

> ⚠️ **No hacer esto antes de tener al menos 10 clientes de pago.** Integrar un gateway de pagos es una semana de trabajo mínimo. Hazlo cuando el volumen lo justifique.

#### Gateway recomendado para México: **Conekta** o **Stripe**
| | Conekta | Stripe |
|---|---|---|
| Tarjetas MX | ✅ Muy bueno | ✅ Bueno |
| OXXO Pay | ✅ Nativo | ✅ Disponible |
| Transferencia SPEI | ✅ Disponible | ❌ No disponible |
| Documentación | Regular | Excelente |
| Comisión | ~2.9% + $3.50 | ~2.9% + $3 USD |

**Recomendación**: Conekta si tu mercado es 100% México (tiene SPEI y OXXO nativos). Stripe si en el futuro quieres escalar a otros países.

#### Arquitectura de pagos en V2
```
Usuario elige plan en /planes
    → Selecciona método (tarjeta / OXXO / SPEI)
    → Conekta/Stripe procesa el pago
    → Webhook al backend → activa plan automáticamente
    → Correo de confirmación
    → Renovación automática cada 30 días (o manual para OXXO/SPEI)
```

#### Nuevos modelos de base de datos necesarios
```
Payment {
  id, userId, amount, currency
  planLabel, addOns (JSON)
  gateway, gatewayPaymentId
  status (pending/completed/failed/refunded)
  paidAt, periodStart, periodEnd
}

// Actualización a User:
planExpiresAt    DateTime?
gamesPlayedThisMonth Int @default(0)
```

#### Endpoints nuevos necesarios
- `POST /payments/checkout` — crea sesión de pago
- `POST /payments/webhook` — recibe confirmación del gateway (activa plan)
- `GET /payments/history` — historial de pagos del usuario
- `POST /payments/cancel` — cancela suscripción

#### Frontend nuevo necesario
- Página `/planes` actualizada con botones de pago reales
- Página `/mi-plan` con fecha de vencimiento, historial y botón de renovar
- Flujo de checkout (puede ser hosted de Stripe/Conekta, sin código propio)

**Estimado de desarrollo**: 2-3 semanas incluyendo pruebas.

---

### FASE 4 — AUTOMATIZACIÓN COMPLETA (Septiembre 2026+)
**Objetivo**: Cero intervención manual en pagos, planes y renovaciones.

- Renovaciones automáticas con tarjeta guardada
- Emails automáticos de vencimiento (3 días antes, día de vencimiento, 3 días después)
- Downgrade automático a Demo si no paga
- Dashboard de métricas de ingresos (MRR, churn, nuevos clientes)
- Facturación automática (CFDI) si se necesita

---

## RESUMEN DEL TIMELINE

```
ABRIL 2026     Lanzamiento público · onboarding manual · primeros usuarios
               [HOY] Post en redes → primeras ligas en la plataforma

MAYO 2026      Estabilización · corrección de bugs · feedback real
               Formalizar cobro por transferencia bancaria

JUNIO 2026     Implementar planExpiresAt + límite de juegos Demo
               Optimizar proceso manual de activación de planes

JULIO 2026     Integrar gateway de pagos (Conekta/Stripe)
               Self-service: el usuario compra y activa sin intervención

AGOSTO 2026    Automatización de renovaciones y correos
               Métricas de ingresos

SEPT+ 2026     Escala · nuevos mercados · app móvil para scorekeepers
```

---

## RECOMENDACIÓN FINAL

Tu modelo actual es el correcto para lanzar. El orden que describes — tú controlas los planes manualmente, migras a automático cuando el volumen lo justifique — es exactamente cómo lo hacen la mayoría de startups SaaS en sus primeras semanas.

**Lo más importante ahora no es el sistema de pagos — es conseguir las primeras 5 ligas reales usando la plataforma.** Con eso validas el producto, ajustas precios en la vida real y tienes casos de uso reales para la campaña de marketing.

El riesgo de automatizar pagos antes de validar demanda es real: semanas de desarrollo para un feature que quizás necesites cambiar completamente cuando veas cómo se comportan los usuarios reales.

**Lanza hoy. Cobra por transferencia esta semana. Automatiza en julio.**

---

*Documento creado: 6 de abril de 2026 · TourneyTru V2 Planning*
