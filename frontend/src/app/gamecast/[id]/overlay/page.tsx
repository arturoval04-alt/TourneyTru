'use client';

import { useEffect, useRef, Suspense, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useGameStore, LineupItem } from '@/store/gameStore';
import PlayerInfo from '@/components/live/PlayerInfo';
import Field from '@/components/live/Field';
import ScoreCard from '@/components/scorecard/ScoreCard';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import api from '@/lib/api';
import { useState } from 'react';

// ─── Tipos de vista disponibles ────────────────────────────────────────────────
// ?view=score       → barra de marcador inferior (ScoreCard)
// ?view=batter      → tarjeta del bateador actual (PlayerInfo)
// ?view=pitcher     → tarjeta del pitcher actual (PlayerInfo)
// ?view=field       → campo con bases y defensores
// ?view=playbyplay  → últimas jugadas (lower third)
// ?view=full        → todo junto
// (sin param)       → full por defecto

function OverlayContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const gameId = params.id as string;
    const view = (searchParams.get('view') || 'full') as
        'score' | 'batter' | 'pitcher' | 'field' | 'playbyplay' | 'full';

    const isMountedRef = useRef(false);
    const [boxscore, setBoxscore] = useState<any>(null);

    const {
        inning, half, outs, balls, strikes,
        homeScore, awayScore,
        bases,
        currentBatter, currentBatterId,
        homeLineup, awayLineup,
        homeTeamName, awayTeamName,
        playLogs,
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
        store.fetchGameConfig().then(() => store.connectSocket());
        return () => { isMountedRef.current = false; };
    }, [gameId]);

    // Boxscore para stats ricas (igual que gamecast)
    useEffect(() => {
        if (!gameId) return;
        const fetch = () => api.get(`/games/${gameId}/boxscore`).then(({ data }) => setBoxscore(data)).catch(() => { });
        fetch();
        // Refrescar cuando llegan jugadas
    }, [gameId]);

    useEffect(() => {
        if (!gameId || playLogs.length === 0) return;
        const t = setTimeout(() => api.get(`/games/${gameId}/boxscore`).then(({ data }) => setBoxscore(data)).catch(() => { }), 2000);
        return () => clearTimeout(t);
    }, [playLogs.length, gameId]);

    // ── Stats calculadas igual que gamecast/[id]/page.tsx ──────────────────────
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

    const pitcherStats = useMemo(() => {
        if (!boxscore || !pitcher?.playerId) return 'IP: 0.0 | K: 0 | BB: 0';
        const box = half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
        const e = box?.lineup?.find((b: any) => b.playerId === pitcher.playerId);
        if (!e) return 'IP: 0.0 | K: 0 | BB: 0';
        const ip = `${Math.floor((e.pitchingIPOuts || 0) / 3)}.${(e.pitchingIPOuts || 0) % 3}`;
        return `IP: ${ip} | K: ${e.pitchingSO || 0} | BB: ${e.pitchingBB || 0}`;
    }, [boxscore, pitcher, half]);

    // ── Renderizado por vista ──────────────────────────────────────────────────

    if (view === 'score') {
        return (
            <div className="fixed bottom-0 left-0 right-0">
                <ScoreCard />
            </div>
        );
    }

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

    if (view === 'pitcher') {
        return (
            <div className="fixed bottom-6 right-6 w-[320px] text-xl">
                <PlayerInfo
                    type="Pitching"
                    name={pitcherName}
                    stats={pitcherStats}
                    photoUrl={pitcherPhotoUrl}
                />
            </div>
        );
    }

    if (view === 'field') {
        return (
            <div className="fixed inset-0 flex items-center justify-center p-8">
                <div className="w-full max-w-[560px] aspect-[400/440]">
                    <Field readOnly />
                </div>
            </div>
        );
    }

    if (view === 'playbyplay') {
        // Últimas 4 jugadas como lower third
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

    // ── view === 'full' (default) ──────────────────────────────────────────────
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
                    stats={pitcherStats}
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
