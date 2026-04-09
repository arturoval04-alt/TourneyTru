---
name: Plan — Rol Delegado + Estados del Torneo + Insignias
description: Plan de implementación del rol delegado, sección documentos del torneo, vistas por estado y sistema futuro de insignias en perfil de jugador
type: project
---

# Plan: Rol Delegado + Mejoras al Torneo

## Contexto clave (aclaraciones del usuario)

- La separación `Player` ↔ `RosterEntry` YA EXISTE. El perfil del jugador es independiente de quién lo creó.
- La importación de jugadores por Excel YA valida: duplicados en mismo equipo, mismo torneo, y jugadores ya dados de alta. No reimplementar.
- La auditoría de cambios en jugadores YA existe implícitamente por la separación de tablas.
- `Player.teamId` ya fue desacoplado — `RosterEntry` es el vínculo jugador↔equipo↔torneo.

## Nuevo rol: Delegado

### Modelo nuevo: `TeamDelegate`
```prisma
model TeamDelegate {
  id           String     @id @default(uuid())
  userId       String     @map("user_id")       // User con rol 'delegado'
  teamId       String     @map("team_id")
  tournamentId String     @map("tournament_id")
  createdById  String     @map("created_by_id") // organizer o presi
  isActive     Boolean    @default(true) @map("is_active")
  createdAt    DateTime   @default(now()) @map("created_at")

  @@unique([userId, teamId, tournamentId])
  @@map("team_delegates")
}
```

### Nuevo modelo: `TournamentDocument`
```prisma
model TournamentDocument {
  id           String   @id @default(uuid())
  tournamentId String   @map("tournament_id")
  name         String   @db.NVarChar(200)
  fileUrl      String   @map("file_url") @db.NVarChar(Max)
  fileType     String   @map("file_type") @db.NVarChar(20)  // 'pdf' | 'excel'
  category     String   @default("general") @db.NVarChar(50)
  // categorías: 'convocatoria' | 'reglas' | 'modo_juego' | 'plantilla_jugadores'
  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("tournament_documents")
}
```

## Permisos del delegado

| Acción | Condición |
|---|---|
| Editar perfil del equipo (logo, manager, nombre) | `tournament.status === 'upcoming'` y `TeamDelegate.isActive === true` |
| Crear jugador nuevo | mismo |
| Agregar jugador verificado al roster del equipo | mismo |
| Editar jugador del equipo | mismo |

- El delegado NO puede: crear juegos, modificar otros equipos, subir documentos.
- Al pasar el torneo a `active`: bloqueo automático (opción recomendada: campo calculado en guard, no escritura masiva).
- Notificación al delegado cuando torneo cambia a `active`: email/toast "El torneo ha iniciado. Tu acceso de edición ha sido desactivado."

## Creación del delegado

- Lo crean: organizador o presi (del torneo)
- Sin verificación de email (igual que presi/scorekeeper)
- Interfaz: Tab "Delegados" en admin/dashboard (visible para organizer y presi)
  - Selector de torneo → lista de equipos → por equipo: delegado asignado + toggle activo/inactivo

## Vista del delegado

Ruta: `/delegado/equipo/[teamId]`
Tabs:
- Perfil del equipo (logo, manager, nombre)
- Jugadores (roster + agregar nuevo o buscar verificado)
- Importar (Excel con formato plantilla del torneo)

## Cambios en vista del torneo

### Sección Documentos (en tab Información, estados upcoming y active)
- Grid de documentos: PDF convocatoria, reglas, modo de juego
- Siempre incluye botón de descarga del Excel plantilla de jugadores (generado con exceljs)
- Solo org/presi pueden subir/eliminar documentos

### Torneo FINISHED — tab Estadísticas
Solo muestra campeones individuales:
- Cards: Líder Bateo (AVG), Líder HR, Líder RBI, Líder ERA, Líder K, Líder Wins
- Datos de PlayerStat ya existentes

### Torneo FINISHED — tab Posiciones
- Podio visual: 1°, 2°, 3° lugar (logo equipo + nombre)
- Tabla general de standings completa debajo

### Visibilidad del podio
- También mostrar en la página pública `/torneos/[id]` para aficionados

## Futuro: Insignias en perfil de jugador

Pendiente de diseño e implementación posterior al delegado.
Tipos de insignia previstos:
- Campeón del torneo (primer lugar del equipo)
- Campeón individual (líder AVG, HR, RBI, ERA, K, W)
- Jugador verificado
- MVP de juego

**Why:** El usuario quiere que los logros queden grabados en el perfil del jugador para construir historial deportivo a largo plazo.
**How to apply:** Al diseñar la tabla de insignias, hacerla genérica (tipo + torneoId + jugadorId + fecha) para soportar todos los tipos sin migraciones adicionales.

## Orden de implementación sugerido

```
Semana 1 — DB + backend delegates
Semana 2 — Backend documents + dashboard tab delegados + vista /delegado/equipo
Semana 3 — Vistas del torneo (documentos, estadísticas finished, posiciones finished + podio público)
Futuro   — Insignias en perfil de jugador
```
