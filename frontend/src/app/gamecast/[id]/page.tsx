'use client';

import ScoreCard from '@/components/scorecard/ScoreCard';
import Field from '@/components/live/Field';
import PlayerInfo from '@/components/live/PlayerInfo';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore, LineupItem } from '@/store/gameStore';
import { useParams } from 'next/navigation';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import api from '@/lib/api';
import { Users, LayoutDashboard, Radio, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StreamAdminPanel from '@/components/live/StreamAdminPanel';
import TeamLineupCard from '@/components/live/TeamLineupCard';
import PitchingBoxscore from '@/components/live/PitchingBoxscore';

// Mapa de código numérico a nombre de posición
const POS_LABEL: Record<string, string> = {
    '1': 'P', 'P': 'P', '2': 'C', 'C': 'C', '3': '1B', '1B': '1B',
    '4': '2B', '2B': '2B', '5': '3B', '3B': '3B', '6': 'SS', 'SS': 'SS',
    '7': 'LF', 'LF': 'LF', '8': 'CF', 'CF': 'CF', '9': 'RF', 'RF': 'RF',
    'DH': 'DH', 'BD': 'BD',
};

const formatPosition = (item: LineupItem, lineup?: LineupItem[]) => {
    const isDh = item.position === 'DH' || item.position === 'BD';
    if (isDh && item.dhForPosition) {
        const anchor = POS_LABEL[item.dhForPosition] || item.dhForPosition;
        return `DH (por ${anchor})`;
    }
    if (lineup) {
        const normPos = item.position?.toUpperCase().trim() === '1' ? 'P' : item.position?.toUpperCase().trim();
        const dhEntry = lineup.find(l => (l.position === 'DH' || l.position === 'BD') && l.dhForPosition);
        if (dhEntry) {
            const coveredPos = dhEntry.dhForPosition?.toUpperCase().trim() === '1' ? 'P' : dhEntry.dhForPosition?.toUpperCase().trim();
            if (normPos === coveredPos) {
                const posLabel = POS_LABEL[item.position] || item.position;
                return `${posLabel} (FLEX)`;
            }
        }
    }
    return POS_LABEL[item.position] || item.position;
};

export default function PublicGamecast() {
    const params = useParams();
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [boxscoreLoading, setBoxscoreLoading] = useState(true);
    const [boxscoreError, setBoxscoreError] = useState(false);

    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");

    // Live base tracking
    const {
        baseIds, inning, half, currentBatter, currentBatterId,
        homeLineup, awayLineup, playLogs, status, plays,
        homeTeamName, awayTeamName,
        winningPitcher, mvpBatter1, mvpBatter2, pendingPlays
    } = useGameStore();

    const livePitcherId = useMemo(() => {
        const defensiveLineup = half === 'top' ? homeLineup : awayLineup;
        return defensiveLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P')?.playerId || null;
    }, [awayLineup, half, homeLineup]);

    const pitcherInfo = useMemo(() => {
        const defLineup = half === 'top' ? homeLineup : awayLineup;
        const p = defLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P');
        const name = p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
        const photoUrl = p?.player?.photoUrl || undefined;
        let stats = '';
        if (boxscore && p?.playerId) {
            const pitchingBox = half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
            const pitcherEntry = pitchingBox.lineup?.find((b: any) => b.playerId === p.playerId);
            if (pitcherEntry) {
                const ipOuts = pitcherEntry.pitchingIPOuts || 0;
                const ipStr = `${Math.floor(ipOuts / 3)}.${ipOuts % 3}`;
                stats = `IP: ${ipStr} | K: ${pitcherEntry.pitchingSO || 0} | BB: ${pitcherEntry.pitchingBB || 0}`;
            }
        }
        if (!stats) stats = 'Sin datos aún';
        return { name, stats, photoUrl };
    }, [half, homeLineup, awayLineup, boxscore]);

    const batterPhotoUrl = useMemo(() => {
        if (!currentBatterId) return undefined;
        const battingLineup = half === 'top' ? awayLineup : homeLineup;
        const b = battingLineup.find((item: LineupItem) => item.playerId === currentBatterId);
        return b?.player?.photoUrl || undefined;
    }, [currentBatterId, half, homeLineup, awayLineup]);

    const batterStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return 'Sin datos aún';
        const battingBox = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!entry) return 'Sin datos aún';
        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${entry.hits} | RBI: ${entry.rbi} | SO: ${entry.so}`;
    }, [boxscore, currentBatterId, half]);

    const batterTodayStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return undefined;
        const battingBox = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!entry?.plays) return undefined;
        const allPlays = Object.entries(entry.plays as Record<string, any[]>)
            .sort(([a], [b]) => Number(a) - Number(b))
            .flatMap(([, plays]) => plays);
        if (allPlays.length === 0) return undefined;
        const results = allPlays.map((p: any) => p.result.split('|')[0].toUpperCase());
        const summary = `${entry.hits}-${entry.atBats}`;
        const rbiStr = entry.rbi > 0 ? `  ||  (${entry.rbi} RBI)` : '';
        return `${summary}  |  ${results.join(' | ')}${rbiStr}`;
    }, [boxscore, currentBatterId, half]);

    const isMountedRef = useRef(false);

    const fetchBoxscore = useCallback(async (gameId: string, showLoading = false) => {
        try {
            if (showLoading) setBoxscoreLoading(true);
            const { data } = await api.get(`/games/${gameId}/boxscore`);
            if (data && isMountedRef.current) {
                setBoxscore(data);
                setBoxscoreLoading(false);
                setBoxscoreError(false);
            }
        } catch (err) {
            console.error("Error fetching boxscore:", err);
            if (isMountedRef.current) {
                setBoxscoreError(true);
                setBoxscoreLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const gameId = params.id as string;
        if (!gameId) return;

        if (isMountedRef.current) return;
        isMountedRef.current = true;

        // 1. Inicializar store
        useGameStore.getState().setGameId(gameId);
        useGameStore.getState().fetchGameConfig().then(() => {
            useGameStore.getState().connectSocket();
        });

        // 2. Carga inicial
        fetchBoxscore(gameId);

        return () => {
            isMountedRef.current = false;
            useGameStore.getState().disconnectSocket();
        };
    }, [params.id, fetchBoxscore]);

    // Refrescar boxscore cuando el store recibe nuevas jugadas vía socket.io
    useEffect(() => {
        const gameId = params.id as string;
        if (gameId && playLogs.length > 0 && isMountedRef.current) {
            const timer = setTimeout(() => fetchBoxscore(gameId), 2000);
            return () => clearTimeout(timer);
        }
    }, [playLogs.length, params.id, fetchBoxscore]);

    return (
        <>
            <Navbar />

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col gap-0">

                {/* Sub-Navigation Tabs — arriba */}
                <div className="flex justify-center py-3 px-3 gap-0">
                    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 p-1 rounded-xl shadow-lg inline-flex flex-wrap sm:flex-nowrap justify-center gap-1">
                        <button
                            onClick={() => setActiveTab('alineaciones')}
                            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'alineaciones' ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            <Users className="w-4 h-4" /> Alineaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('scorekeeper')}
                            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'scorekeeper' ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" /> En Vivo
                        </button>
                        <button
                            onClick={() => setActiveTab('stream')}
                            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'stream' ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            <Radio className="w-4 h-4" /> Stream
                        </button>
                    </div>
                </div>

                {/* ScoreCard — debajo de los tabs */}
                <ScoreCard />

                <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-4 px-3 sm:px-4 py-4">

                    {/* TAB: ALINEACIONES */}
                    {activeTab === 'alineaciones' && (
                        <div className="animate-fade-in-up">
                            {homeLineup.length === 0 && awayLineup.length === 0 ? (
                                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-12 text-center shadow-lg min-h-[500px] flex flex-col items-center justify-center">
                                    <Users className="w-16 h-16 text-slate-600 mb-4" />
                                    <h2 className="text-2xl font-black text-white mb-4">Alineación y Configuración del Juego</h2>
                                    <p className="text-slate-400 max-w-xl mx-auto">Aún no se han establecido las alineaciones para este juego.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Visitante', teamName: awayTeamName, lineup: awayLineup },
                                        { label: 'Local', teamName: homeTeamName, lineup: homeLineup },
                                    ].map(({ label, teamName, lineup }) => (
                                        <TeamLineupCard
                                            key={label}
                                            label={label}
                                            teamName={teamName}
                                            lineup={lineup}
                                            plays={plays}
                                            formatPosition={formatPosition}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: SCOREKEEPER PANEL */}
                    {activeTab === 'scorekeeper' && (
                        <div className="flex flex-col gap-4 animate-fade-in-up w-full">

                            {/* ── Row 1: Field | Info | Log ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4 w-full">
                                {/* Field — wider */}
                                <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-1 sm:p-2 shadow-xl overflow-hidden">
                                    <Field readOnly />
                                </div>

                                {/* Batting + Pitching Info */}
                                <div className="lg:col-span-4 flex flex-col gap-4">
                                    <PlayerInfo
                                        type="Batting"
                                        name={currentBatter}
                                        stats={batterStats}
                                        todayStats={batterTodayStats}
                                        photoUrl={batterPhotoUrl}
                                    />
                                    <PlayerInfo
                                        type="Pitching"
                                        name={pitcherInfo.name}
                                        stats={pitcherInfo.stats}
                                        photoUrl={pitcherInfo.photoUrl}
                                    />
                                </div>

                                {/* Play by Play Log — locked height to 720px with scroll */}
                                <div className="lg:col-span-3 h-[625px] max-h-[625px] overflow-hidden rounded-xl">
                                    <PlayByPlayLog />
                                </div>
                            </div>

                            {/* ── MVP Panel para finalizados (Opcional, similar al gamecast antiguo) ── */}
                            {status === 'finished' && (winningPitcher || mvpBatter1 || mvpBatter2) && (
                                <div className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-colors">
                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pitcher Ganador</div>
                                        <div className="text-lg font-black text-white">
                                            {winningPitcher ? `${winningPitcher.first_name} ${winningPitcher.last_name}` : 'Sin registrar'}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-colors">
                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">MVP Bateador 1</div>
                                        <div className="text-lg font-black text-white">
                                            {mvpBatter1 ? `${mvpBatter1.first_name} ${mvpBatter1.last_name}` : 'Sin registrar'}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-colors">
                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">MVP Bateador 2</div>
                                        <div className="text-lg font-black text-white">
                                            {mvpBatter2 ? `${mvpBatter2.first_name} ${mvpBatter2.last_name}` : 'Sin registrar'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Row 3: Boxscore ── */}
                            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-4 sm:p-6 shadow-xl overflow-x-auto">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-700/30 pb-4">
                                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" /> RESUMEN OFICIAL (Boxscore)
                                    </h3>
                                    {pendingPlays > 0 && (
                                        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider animate-pulse">
                                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                                            {pendingPlays} jugada{pendingPlays > 1 ? 's' : ''} pendiente{pendingPlays > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                                {boxscoreLoading ? (
                                    <div className="p-20 text-center animate-pulse text-slate-500 font-bold italic">Calculando estadísticas actualizadas...</div>
                                ) : boxscoreError ? (
                                    <div className="p-20 text-center text-rose-500 font-bold">Error al cargar el resumen oficial.</div>
                                ) : boxscore && (
                                    <div className="flex flex-col gap-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Turno Actual</div>
                                                <div className="mt-1 text-sm font-bold text-white">
                                                    {half === 'top' ? boxscore.awayTeam.teamName : boxscore.homeTeam.teamName}
                                                </div>
                                                <div className="text-xs text-slate-300">{currentBatter}</div>
                                            </div>
                                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Corredores Vivos</div>
                                                <div className="mt-1 text-sm font-bold text-white">
                                                    {[baseIds.first, baseIds.second, baseIds.third].filter(Boolean).length} en base
                                                </div>
                                                <div className="text-xs text-slate-300">
                                                    {[
                                                        baseIds.first ? '1B' : null,
                                                        baseIds.second ? '2B' : null,
                                                        baseIds.third ? '3B' : null,
                                                    ].filter(Boolean).join(' • ') || 'Bases limpias'}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Lanzador Defensivo</div>
                                                <div className="mt-1 text-sm font-bold text-white">{pitcherInfo.name}</div>
                                                <div className="text-xs text-slate-300">{pitcherInfo.stats}</div>
                                            </div>
                                        </div>

                                        <ScorebookTable
                                            teamBoxscore={boxscore.awayTeam}
                                            baseIds={half === 'top' ? baseIds : null}
                                            currentInning={inning}
                                            activeBatterId={half === 'top' ? currentBatterId : null}
                                            isBattingTeamLive={half === 'top'}
                                        />
                                        <PitchingBoxscore
                                            teamBoxscore={boxscore.awayTeam}
                                            livePitcherId={half === 'bottom' ? livePitcherId : null}
                                        />
                                        <ScorebookTable
                                            teamBoxscore={boxscore.homeTeam}
                                            baseIds={half === 'bottom' ? baseIds : null}
                                            currentInning={inning}
                                            activeBatterId={half === 'bottom' ? currentBatterId : null}
                                            isBattingTeamLive={half === 'bottom'}
                                        />
                                        <PitchingBoxscore
                                            teamBoxscore={boxscore.homeTeam}
                                            livePitcherId={half === 'top' ? livePitcherId : null}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: STREAM */}
                    {activeTab === 'stream' && (
                        <StreamAdminPanel gameId={params.id as string} forceView="fan" />
                    )}
                </div>
            </div>
        </>
    );
}
