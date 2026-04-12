export interface OverlayConfig {
    id: string;
    name: string;
    description: string;
    query: string;
    width: number;
    height: number;
    emoji: string;
    color: string;
}

export const OVERLAYS: OverlayConfig[] = [
    { id: 'full',         name: 'Full Overlay',     description: 'Bateador, pitcher y marcador en pantalla completa',       query: '?view=full',               width: 1920, height: 1080, emoji: '🖥️', color: 'from-sky-500/20 to-sky-600/10' },
    { id: 'compact',      name: 'Compact ESPN',      description: 'Scoreboard compacto estilo ESPN/MLB con bateador y pitcher', query: '?view=compact',           width: 480,  height: 180,  emoji: '📊', color: 'from-amber-500/20 to-amber-600/10' },
    { id: 'score',        name: 'Score Bar',         description: 'Solo la barra de marcador inferior',                      query: '?view=score',              width: 1920, height: 120,  emoji: '🏆', color: 'from-emerald-500/20 to-emerald-600/10' },
    { id: 'field',        name: 'Campo',             description: 'Diamante con defensores y bases iluminadas',              query: '?view=field',              width: 800,  height: 900,  emoji: '⚾', color: 'from-green-500/20 to-green-600/10' },
    { id: 'batter',       name: 'Bateador',          description: 'Tarjeta del bateador actual con foto y stats',            query: '?view=batter',             width: 400,  height: 500,  emoji: '🏏', color: 'from-sky-500/20 to-sky-600/10' },
    { id: 'pitcher',      name: 'Pitcher',           description: 'Tarjeta del pitcher actual con foto y stats',             query: '?view=pitcher',            width: 400,  height: 400,  emoji: '⚡', color: 'from-emerald-500/20 to-emerald-600/10' },
    { id: 'playbyplay',   name: 'Play-by-Play',      description: 'Últimas 4 jugadas como lower third',                     query: '?view=playbyplay',         width: 600,  height: 300,  emoji: '📋', color: 'from-violet-500/20 to-violet-600/10' },
    { id: 'ondeck',       name: 'On Deck',           description: 'Próximos 3 bateadores — ideal entre entradas',           query: '?view=ondeck',             width: 480,  height: 400,  emoji: '👥', color: 'from-orange-500/20 to-orange-600/10' },
    { id: 'lineup-away',  name: 'Lineup Visitante',  description: 'Alineación completa del equipo visitante',               query: '?view=lineup&team=away',   width: 600,  height: 800,  emoji: '📑', color: 'from-rose-500/20 to-rose-600/10' },
    { id: 'lineup-home',  name: 'Lineup Local',      description: 'Alineación completa del equipo local',                  query: '?view=lineup&team=home',   width: 600,  height: 800,  emoji: '📑', color: 'from-cyan-500/20 to-cyan-600/10' },
    { id: 'matchup',      name: 'Duelo Pitchers',    description: 'Comparativa de pitchers iniciales con stats del torneo', query: '?view=matchup',            width: 1280, height: 500,  emoji: '🔥', color: 'from-red-500/20 to-red-600/10' },
];
