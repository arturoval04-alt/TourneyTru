'use client';

import { useEffect, useRef, Suspense, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useGameStore, LineupItem } from '@/store/gameStore';
import PlayerInfo from '@/components/live/PlayerInfo';
import Field from '@/components/live/Field';
import ScoreCard from '@/components/scorecard/ScoreCard';
import api from '@/lib/api';
import Image from 'next/image';

// ─── Tipos de vista disponibles ────────────────────────────────────────────────
// ?view=score       → barra de marcador inferior (ScoreCard)
// ?view=batter      → tarjeta del bateador actual (PlayerInfo)
// ?view=pitcher     → tarjeta del pitcher actual (PlayerInfo)
// ?view=field       → campo con bases y defensores
// ?view=playbyplay  → últimas jugadas (lower third)
// ?view=compact     → scoreboard compacto estilo ESPN/MLB
// ?view=ondeck      → próximos 3 bateadores
// ?view=lineup      → lineup card (?team=home|away)
// ?view=matchup     → duelo de pitchers iniciales
// ?view=full        → todo junto
// (sin param)       → full por defecto

const POS_LABEL: Record<string, string> = {
    '1': 'P', 'P': 'P', '2': 'C', 'C': 'C', '3': '1B', '1B': '1B',
    '4': '2B', '2B': '2B', '5': '3B', '3B': '3B', '6': 'SS', 'SS': 'SS',
    '7': 'LF', 'LF': 'LF', '8': 'CF', 'CF': 'CF', '9': 'RF', 'RF': 'RF',
    'DH': 'DH', 'BD': 'BD',
};

function TeamLogo({ url, short, size = 32 }: { url: string | null; short: string; size?: number }) {
    if (url) {
        return (
            <div className="rounded-full overflow-hidden border-2 border-white/20 bg-slate-800 flex-shrink-0"
                style={{ width: size, height: size }}>
                <Image src={url} alt={short} width={size} height={size} className="object-cover w-full h-full" unoptimized />
            </div>
        );
    }
    return (
        <div className="rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-white/20 flex items-center justify-center flex-shrink-0 font-black text-white uppercase"
            style={{ width: size, height: size, fontSize: size * 0.3 }}>
            {short}
        </div>
    );
}

function OverlayContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const gameId = params.id as string;
    const view = (searchParams.get('view') || 'full') as string;
    const teamParam = searchParams.get('team') || 'away';
    const overlayToken = searchParams.get('ot') || '';

    const isMountedRef = useRef(false);
    const [boxscore, setBoxscore] = useState<any>(null);
    const [matchupData, setMatchupData] = useState<any>(null);

    const {
        inning, half, outs, balls, strikes,
        homeScore, awayScore,
        bases,
        currentBatter, currentBatterId,
        homeLineup, awayLineup,
        homeTeamName, awayTeamName,
        homeTeamLogoUrl, awayTeamLogoUrl,
        homeTeamShort, awayTeamShort,
        tournamentName,
        playLogs,
        homeBatterIndex, awayBatterIndex,
        socketConnected,
    } = useGameStore();

    // Fondo transparente para OBS
    useEffect(() => {
        document.documentElement.style.background = 'transparent';
        document.body.style.cssText = 'background: transparent !important; margin: 0; padding: 0; overflow: hidden;';
        return () => {
            document.documentElement.style.background = '';
            document.body.style.cssText = '';
        };
    }, []);

    // Conectar al store / socket
    useEffect(() => {
        if (!gameId || isMountedRef.current) return;
        isMountedRef.current = true;
        const store = useGameStore.getState();
        store.setGameId(gameId);
        store.fetchGameConfig(overlayToken || undefined).then(() => store.connectSocket(overlayToken || undefined));
        return () => {
            isMountedRef.current = false;
            useGameStore.getState().disconnectSocket();
        };
    }, [gameId, overlayToken]);

    // Badge de reconexión — visible solo cuando el socket se cae (para OBS/YoloBox)
    useEffect(() => {
        const BADGE_ID = 'overlay-reconnect-badge';
        let el = document.getElementById(BADGE_ID);
        if (!socketConnected) {
            if (!el) {
                el = document.createElement('div');
                el.id = BADGE_ID;
                el.style.cssText = [
                    'position:fixed', 'top:8px', 'right:8px', 'z-index:9999',
                    'background:rgba(220,38,38,0.85)', 'color:#fff',
                    'padding:3px 10px', 'border-radius:9999px',
                    'font-size:11px', 'font-weight:700', 'font-family:monospace',
                    'letter-spacing:0.05em', 'pointer-events:none',
                    'backdrop-filter:blur(4px)',
                ].join(';');
                el.textContent = '⚡ SIN SEÑAL';
                document.body.appendChild(el);
            }
        } else {
            el?.remove();
        }
        return () => { document.getElementById(BADGE_ID)?.remove(); };
    }, [socketConnected]);

    // Boxscore para stats ricas
    useEffect(() => {
        if (!gameId) return;
        api.get(`/games/${gameId}/boxscore`, {
            params: overlayToken ? { ot: overlayToken } : undefined,
        }).then(({ data }) => setBoxscore(data)).catch(() => { });
    }, [gameId, overlayToken]);

    useEffect(() => {
        if (!gameId || playLogs.length === 0) return;
        const t = setTimeout(() => api.get(`/games/${gameId}/boxscore`, {
            params: overlayToken ? { ot: overlayToken } : undefined,
        }).then(({ data }) => setBoxscore(data)).catch(() => { }), 2000);
        return () => clearTimeout(t);
    }, [playLogs.length, gameId, overlayToken]);

    // Fetch matchup data for matchup view
    useEffect(() => {
        if (!gameId || view !== 'matchup') return;
        api.get(`/games/${gameId}/pitcher-matchup`, {
            params: overlayToken ? { ot: overlayToken } : undefined,
        }).then(({ data }) => setMatchupData(data)).catch(() => { });
    }, [gameId, view, overlayToken]);

    // ── Stats calculadas ──────────────────────────────────────────────
    const battingLineup = half === 'top' ? awayLineup : homeLineup;
    const defensiveLineup = half === 'top' ? homeLineup : awayLineup;

    const batterEntry = battingLineup.find((l: LineupItem) => l.playerId === currentBatterId);
    const batterPhotoUrl = batterEntry?.player?.photoUrl || undefined;

    const batterStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return 'AVG: .000 | H: 0 | RBI: 0 | SO: 0';
        const box = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const e = box?.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!e) return 'AVG: .000 | H: 0 | RBI: 0 | SO: 0';
        const avg = e.atBats > 0 ? (e.hits / e.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${e.hits} | RBI: ${e.rbi} | SO: ${e.so}`;
    }, [boxscore, currentBatterId, half]);

    const batterTodayLine = useMemo(() => {
        if (!boxscore || !currentBatterId) return { hits: 0, ab: 0, rbi: 0, label: '0-0' };
        const box = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const e = box?.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!e) return { hits: 0, ab: 0, rbi: 0, label: '0-0' };
        return { hits: e.hits || 0, ab: e.atBats || 0, rbi: e.rbi || 0, label: `${e.hits || 0}-${e.atBats || 0}` };
    }, [boxscore, currentBatterId, half]);

    const batterTodayStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return undefined;
        const box = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const e = box?.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!e?.plays) return undefined;
        const allPlays = Object.entries(e.plays as Record<string, any[]>)
            .sort(([a], [b]) => Number(a) - Number(b))
            .flatMap(([, plays]) => plays);
        if (allPlays.length === 0) return undefined;
        const results = allPlays.map((p: any) => p.result.split('|')[0].toUpperCase());
        const rbiStr = e.rbi > 0 ? `  ||  (${e.rbi} RBI)` : '';
        return `${e.hits}-${e.atBats}  |  ${results.join(' | ')}${rbiStr}`;
    }, [boxscore, currentBatterId, half]);

    const pitcher = defensiveLineup.find((l: LineupItem) => l.position === '1' || l.position === 'P');
    const pitcherName = pitcher?.player
        ? `${pitcher.player.firstName} ${pitcher.player.lastName}`
        : 'Pitcher';
    const pitcherPhotoUrl = pitcher?.player?.photoUrl || undefined;

    const pitcherGameStats = useMemo(() => {
        if (!boxscore || !pitcher?.playerId) return { ip: '0.0', k: 0, bb: 0, label: 'IP: 0.0 | K: 0 | BB: 0' };
        const box = half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
        const e = box?.lineup?.find((b: any) => b.playerId === pitcher.playerId);
        if (!e) return { ip: '0.0', k: 0, bb: 0, label: 'IP: 0.0 | K: 0 | BB: 0' };
        const ip = `${Math.floor((e.pitchingIPOuts || 0) / 3)}.${(e.pitchingIPOuts || 0) % 3}`;
        return { ip, k: e.pitchingSO || 0, bb: e.pitchingBB || 0, label: `IP: ${ip} | K: ${e.pitchingSO || 0} | BB: ${e.pitchingBB || 0}` };
    }, [boxscore, pitcher, half]);

    // On deck: next 3 batters
    const onDeckBatters = useMemo(() => {
        const lineup = half === 'top' ? awayLineup : homeLineup;
        const currentIdx = half === 'top' ? awayBatterIndex : homeBatterIndex;
        if (lineup.length === 0) return [];
        const result: (LineupItem & { avgLabel: string })[] = [];
        for (let i = 1; i <= 3 && i < lineup.length; i++) {
            const idx = (currentIdx + i) % lineup.length;
            const item = lineup[idx];
            let avg = '.000';
            if (boxscore && item?.playerId) {
                const box = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
                const e = box?.lineup?.find((b: any) => b.playerId === item.playerId);
                if (e && e.atBats > 0) avg = (e.hits / e.atBats).toFixed(3);
            }
            result.push({ ...item, avgLabel: avg });
        }
        return result;
    }, [half, awayLineup, homeLineup, awayBatterIndex, homeBatterIndex, boxscore]);

    const battingTeamShort = half === 'top' ? awayTeamShort : homeTeamShort;
    const battingTeamLogo = half === 'top' ? awayTeamLogoUrl : homeTeamLogoUrl;

    // ── Renderizado por vista ──────────────────────────────────────────────────

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: SCORE — Barra inferior de marcador
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'score') {
        return (
            <div className="fixed bottom-0 left-0 right-0">
                <ScoreCard />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: BATTER — Tarjeta del bateador
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'batter') {
        return (
            <div className="fixed bottom-6 left-6 w-[320px] text-2xl">
                <PlayerInfo
                    type="Batting"
                    name={currentBatter}
                    stats={batterStats}
                    todayStats={batterTodayStats}
                    photoUrl={batterPhotoUrl}
                />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: PITCHER — Tarjeta del pitcher
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'pitcher') {
        return (
            <div className="fixed bottom-6 right-6 w-[320px] text-xl">
                <PlayerInfo
                    type="Pitching"
                    name={pitcherName}
                    stats={pitcherGameStats.label}
                    photoUrl={pitcherPhotoUrl}
                />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: FIELD — Campo con defensores
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'field') {
        return (
            <div className="fixed inset-0 flex items-center justify-center p-8">
                <div className="w-full max-w-[560px] aspect-[400/440]">
                    <Field readOnly />
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: PLAY-BY-PLAY — Últimas 4 jugadas (lower third)
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'playbyplay') {
        const recent = playLogs.filter(l => !l.inningString).slice(0, 4);
        return (
            <div className="fixed bottom-20 left-6 w-[480px] flex flex-col gap-1.5">
                {recent.map((log, i) => (
                    <div
                        key={i}
                        className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2 text-sm font-mono text-slate-200 shadow-lg"
                        style={{ opacity: 1 - i * 0.18 }}
                    >
                        {log.text}
                    </div>
                ))}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: COMPACT — Scoreboard compacto estilo ESPN/MLB
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'compact') {
        const halfSymbol = half === 'top' ? '\u25B2' : '\u25BC';
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-[480px] h-[180px] bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl flex overflow-hidden">
                    {/* LEFT: Batter + Teams + Pitcher */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Row 1: Batter (h-[32px]) */}
                        <div className="h-[32px] flex items-center gap-2 px-4 border-b border-slate-700/30 overflow-hidden shrink-0">
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">AB</span>
                            <span className="text-sm font-bold text-white truncate">{currentBatter}</span>
                            <span className="text-xs text-slate-400 font-mono ml-auto whitespace-nowrap">
                                {batterTodayLine.label}{batterTodayLine.rbi > 0 ? `, ${batterTodayLine.rbi} RBI` : ''}
                            </span>
                        </div>

                        {/* Row 2-3: Teams block (flex-1 approx 116px) */}
                        <div className="flex-1 flex min-h-0">
                            {/* Teams stacked */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {/* Away Team */}
                                <div className={`flex-1 flex items-center gap-3 px-4 ${half === 'top' ? 'bg-sky-500/10 border-l-[4px] border-sky-500' : 'border-l-[4px] border-transparent'}`}>
                                    <TeamLogo url={awayTeamLogoUrl} short={awayTeamShort} size={36} />
                                    <span className="text-[13px] font-black text-white uppercase truncate" title={awayTeamName}>{awayTeamName}</span>
                                    <span className="ml-auto text-4xl font-black text-white tabular-nums drop-shadow-md">{awayScore}</span>
                                </div>
                                {/* Home Team */}
                                <div className={`flex-1 flex items-center gap-3 px-4 border-t border-slate-800/40 ${half === 'bottom' ? 'bg-sky-500/10 border-l-[4px] border-sky-500' : 'border-l-[4px] border-transparent'}`}>
                                    <TeamLogo url={homeTeamLogoUrl} short={homeTeamShort} size={36} />
                                    <span className="text-[13px] font-black text-white uppercase truncate" title={homeTeamName}>{homeTeamName}</span>
                                    <span className="ml-auto text-4xl font-black text-white tabular-nums drop-shadow-md">{homeScore}</span>
                                </div>
                            </div>
                            {/* Inning + Count */}
                            <div className="flex flex-col items-center justify-center px-4 border-l border-slate-700/40 min-w-[75px] shrink-0">
                                <div className="flex items-center gap-1.5 drop-shadow-md">
                                    <span className={`text-sm ${half === 'top' ? 'text-amber-400' : 'text-slate-600'}`}>{halfSymbol}</span>
                                    <span className="text-2xl font-black text-white">{inning}</span>
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-1 font-semibold tracking-widest">{balls}-{strikes}</div>
                            </div>
                        </div>

                        {/* Row 4: Pitcher (h-[32px]) */}
                        <div className="h-[32px] flex items-center gap-2 px-4 border-t border-slate-700/30 bg-slate-950/40 overflow-hidden shrink-0">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">P</span>
                            <span className="text-sm font-bold text-white truncate">{pitcherName}</span>
                            <span className="text-xs text-slate-400 font-mono ml-auto whitespace-nowrap">
                                IP:{pitcherGameStats.ip} K:{pitcherGameStats.k} BB:{pitcherGameStats.bb}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT: Outs + Bases (w-[120px]) */}
                    <div className="w-[120px] flex flex-col items-center justify-center gap-4 border-l border-slate-700/40 bg-slate-950/30 shrink-0">
                        <div className="flex flex-col items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Out</span>
                            <div className="flex gap-2">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${Number(outs) > i ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-slate-700 border border-slate-600'}`} />
                                ))}
                            </div>
                        </div>
                        {/* Big bases diamond */}
                        <svg width="70" height="70" viewBox="0 0 30 30" className="transform rotate-45 mb-2 drop-shadow-lg">
                            {/* Second */}
                            <rect x="2" y="2" width="10" height="10" rx="1.5"
                                className={`${bases.second ? 'fill-amber-400' : 'fill-transparent'} stroke-slate-400`} strokeWidth="1.5" />
                            {/* First */}
                            <rect x="18" y="2" width="10" height="10" rx="1.5"
                                className={`${bases.first ? 'fill-amber-400' : 'fill-transparent'} stroke-slate-400`} strokeWidth="1.5" />
                            {/* Third */}
                            <rect x="2" y="18" width="10" height="10" rx="1.5"
                                className={`${bases.third ? 'fill-amber-400' : 'fill-transparent'} stroke-slate-400`} strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: ON DECK — Próximos 3 bateadores
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'ondeck') {
        const halfLabel = half === 'top' ? '▲' : '▼';
        return (
            <div className="fixed bottom-6 right-6 w-[380px]">
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-sky-600/20 to-transparent border-b border-slate-700/30">
                        <TeamLogo url={battingTeamLogo} short={battingTeamShort} size={24} />
                        <span className="text-xs font-black text-sky-400 uppercase tracking-widest">Próximos al Bat</span>
                        <span className="ml-auto text-xs text-slate-500 font-mono">{halfLabel}{inning}</span>
                    </div>
                    {/* Batters */}
                    <div className="flex flex-col">
                        {onDeckBatters.map((item, i) => {
                            const name = item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido';
                            const pos = POS_LABEL[item.position] || item.position;
                            const avatarUrl = item.player?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${name.replace(/\s/g, '').toLowerCase()}&backgroundColor=transparent`;
                            return (
                                <div key={item.playerId || i}
                                    className={`flex items-center gap-3 px-5 py-3 ${i < onDeckBatters.length - 1 ? 'border-b border-slate-800/40' : ''} hover:bg-slate-800/20 transition-colors`}>
                                    <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-600 bg-slate-800 overflow-hidden flex-shrink-0">
                                        <Image src={avatarUrl} alt={name} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{name}</div>
                                        <div className="text-[10px] text-slate-500">#{item.battingOrder} · {pos}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono font-bold text-slate-300">{item.avgLabel}</div>
                                        <div className="text-[10px] text-slate-600 uppercase">AVG</div>
                                    </div>
                                </div>
                            );
                        })}
                        {onDeckBatters.length === 0 && (
                            <div className="px-5 py-6 text-center text-sm text-slate-500">Esperando lineup...</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: LINEUP — Lineup Card con Field overlay
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'lineup') {
        const isHome = teamParam === 'home';
        const lineup = isHome ? homeLineup : awayLineup;
        const teamName = isHome ? homeTeamName : awayTeamName;
        const teamLogo = isHome ? homeTeamLogoUrl : awayTeamLogoUrl;
        const teamShort = isHome ? homeTeamShort : awayTeamShort;

        return (
            <div className="fixed inset-0 flex items-center justify-center p-6">
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-sky-600/30 via-sky-600/10 to-transparent px-6 py-4 border-b border-slate-700/30">
                        <div className="flex items-center gap-4">
                            <TeamLogo url={teamLogo} short={teamShort} size={48} />
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-wide">{teamName}</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Alineación Inicial</p>
                            </div>
                        </div>
                    </div>

                    {/* Lineup Table */}
                    <div className="px-2">
                        {lineup.map((item, i) => {
                            const name = item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido';
                            const pos = POS_LABEL[item.position] || item.position;
                            const avatarUrl = item.player?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${name.replace(/\s/g, '').toLowerCase()}&backgroundColor=transparent`;
                            // Get AVG from boxscore if available
                            let avg = '.000';
                            if (boxscore && item.playerId) {
                                const box = isHome ? boxscore.homeTeam : boxscore.awayTeam;
                                const e = box?.lineup?.find((b: any) => b.playerId === item.playerId);
                                if (e && e.atBats > 0) avg = (e.hits / e.atBats).toFixed(3);
                            }
                            return (
                                <div key={item.playerId || i}
                                    className={`flex items-center gap-3 px-4 py-2.5 ${i < lineup.length - 1 ? 'border-b border-slate-800/30' : ''}`}>
                                    <span className="text-sm font-black text-sky-500 w-5 text-center">{item.battingOrder}</span>
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-600 bg-slate-800 overflow-hidden flex-shrink-0">
                                        <Image src={avatarUrl} alt={name} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold text-white">{name}</span>
                                    </div>
                                    <span className="bg-sky-500/15 text-sky-400 text-xs font-black px-2 py-0.5 rounded">{pos}</span>
                                    <span className="text-sm font-mono text-slate-400 w-12 text-right">{avg}</span>
                                </div>
                            );
                        })}
                        {lineup.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">Lineup no disponible</div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-slate-700/30 bg-slate-900/50">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                            🏆 {tournamentName || 'Torneo'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: MATCHUP — Duelo de Pitchers Iniciales
    // ═══════════════════════════════════════════════════════════════════════════
    if (view === 'matchup') {
        const away = matchupData?.awayPitcher;
        const home = matchupData?.homePitcher;

        const PitcherCard = ({ data, align }: { data: any; align: 'left' | 'right' }) => {
            if (!data) return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Sin datos</div>;
            const avatarUrl = data.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${data.name.replace(/\s/g, '').toLowerCase()}&backgroundColor=transparent`;
            return (
                <div className={`flex-1 flex flex-col items-center gap-3 p-5 ${align === 'left' ? 'border-r border-slate-700/30' : ''}`}>
                    <TeamLogo url={data.teamLogo} short={data.teamShort} size={36} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{data.teamName}</p>
                    <div className="w-20 h-20 rounded-full border-3 border-sky-500/40 bg-slate-800 overflow-hidden">
                        <Image src={avatarUrl} alt={data.name} width={80} height={80} className="object-cover w-full h-full" unoptimized />
                    </div>
                    <h3 className="text-lg font-black text-white text-center">{data.name}</h3>
                    <div className="text-center text-sm font-bold text-amber-400">{data.wins}-{data.losses} {data.saves > 0 ? `(${data.saves} SV)` : ''}</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-center mt-1">
                        <div><span className="text-[10px] text-slate-500 block uppercase">ERA</span><span className="text-base font-black text-white">{data.era}</span></div>
                        <div><span className="text-[10px] text-slate-500 block uppercase">IP</span><span className="text-base font-black text-white">{data.ip}</span></div>
                        <div><span className="text-[10px] text-slate-500 block uppercase">K</span><span className="text-base font-black text-white">{data.so}</span></div>
                        <div><span className="text-[10px] text-slate-500 block uppercase">BB</span><span className="text-base font-black text-white">{data.bb}</span></div>
                    </div>
                </div>
            );
        };

        return (
            <div className="fixed inset-0 flex items-center justify-center p-6">
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-[640px] overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 px-6 py-3 border-b border-slate-700/30 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{matchupData?.tournamentName || tournamentName || 'Torneo'}</p>
                        <h2 className="text-lg font-black text-white uppercase tracking-wider">🔥 Duelo de Pitchers</h2>
                    </div>

                    {/* Pitchers Side by Side */}
                    <div className="flex">
                        <PitcherCard data={away} align="left" />
                        <PitcherCard data={home} align="right" />
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW: FULL (default) — Todo junto
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* ScoreCard — barra inferior */}
            <div className="absolute bottom-0 left-0 right-0">
                <ScoreCard />
            </div>

            {/* Bateador — inferior izquierda */}
            <div className="absolute bottom-[90px] left-6 w-[300px]">
                <PlayerInfo
                    type="Batting"
                    name={currentBatter}
                    stats={batterStats}
                    todayStats={batterTodayStats}
                    photoUrl={batterPhotoUrl}
                />
            </div>

            {/* Pitcher — inferior derecha */}
            <div className="absolute bottom-[90px] right-6 w-[300px]">
                <PlayerInfo
                    type="Pitching"
                    name={pitcherName}
                    stats={pitcherGameStats.label}
                    photoUrl={pitcherPhotoUrl}
                />
            </div>
        </div>
    );
}

export default function OverlayPage() {
    return (
        <Suspense fallback={null}>
            <OverlayContent />
        </Suspense>
    );
}
