# Baseball Scorekeeper - PRD

## Original Problem Statement
Recrear visualmente una interfaz de scorekeeper de béisbol basada en una imagen de referencia. Funcional básico (estado local, sin persistencia), con gestión de equipos y jugadores real, lo más fiel posible a la imagen original.

## User Personas
- **Anotador de béisbol**: Persona encargada de registrar jugadas durante un partido
- **Coach/Entrenador**: Usuario que necesita seguir el progreso del juego
- **Liga amateur**: Organizadores que requieren llevar registro de partidos

## Core Requirements (Static)
1. Scoreboard con equipos, marcador, inning, outs, balls, strikes
2. Visualización del campo de béisbol con posiciones de jugadores
3. Panel de bateador actual con estadísticas
4. Panel de pitcher actual con estadísticas
5. Log de jugadas play-by-play
6. Control de anotación con botones categorizados
7. Gestión de alineaciones de equipos
8. Funcionalidad de deshacer última acción

## What's Been Implemented ✅ (Jan 2026)
- [x] Scoreboard completo con indicadores visuales (dots para outs/balls/strikes)
- [x] Campo de béisbol SVG interactivo con posiciones de 9 jugadores
- [x] Tarjetas de jugador para bateador y pitcher con estadísticas
- [x] Play Log scrolleable con registro de todas las jugadas
- [x] Control de Anotación con todos los botones:
  - PITCHEOS: Strike, Bola, Foul, WP/PB
  - HITS: H1, H2, H3, H4
  - OUTS: Rola, Fly, Línea, Ponche, K Swing, Doble Play
  - OTROS/ERRORES: Fly/Toque Sac, Error, Bola Ocupada, Doble Play, Matriz
- [x] Lógica de juego completa (cambio de entrada, avance de corredores, anotación de carreras)
- [x] Botón "Deshacer Última" funcional
- [x] Modal de gestión de equipos (agregar/editar/eliminar jugadores)
- [x] Notificaciones toast para feedback de acciones
- [x] Diseño fiel a la imagen de referencia (tema oscuro, colores específicos)

## Architecture
- **Frontend**: React 19 con Tailwind CSS
- **Componentes**:
  - `/components/game/Scoreboard.jsx`
  - `/components/game/FieldVisualization.jsx`
  - `/components/game/PlayerCard.jsx`
  - `/components/game/PlayLog.jsx`
  - `/components/controls/ActionGrid.jsx`
  - `/components/admin/TeamManager.jsx`
- **Estado**: React useState (local, preparado para conexión a backend)
- **UI Library**: Shadcn/UI components

## Prioritized Backlog

### P0 (Crítico) - Completado
- ✅ Interfaz principal funcional

### P1 (Alto)
- [ ] Conexión a backend para persistencia de datos
- [ ] API endpoints para equipos, jugadores, partidos
- [ ] Guardado automático del estado del juego

### P2 (Medio)
- [ ] Pestaña "Alineaciones" para configuración previa
- [ ] Pestaña "Stream" para transmisión en vivo
- [ ] Estadísticas acumuladas por temporada
- [ ] Exportar box score a PDF

### P3 (Bajo)
- [ ] Modo offline con sincronización
- [ ] Múltiples ligas/torneos
- [ ] Historial de partidos

## Next Tasks
1. Implementar endpoints API para CRUD de equipos y jugadores
2. Conectar estado de React con backend MongoDB
3. Agregar autenticación para anotadores
4. Implementar guardado automático del partido
