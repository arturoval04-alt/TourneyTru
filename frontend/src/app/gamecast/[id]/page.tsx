'use client';

import ScoreCard from '@/components/scorecard/ScoreCard';
import Field from '@/components/live/Field';
import PlayerInfo from '@/components/live/PlayerInfo';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore, LineupItem } from '@/store/gameStore';
import { useParams, useRouter } from 'next/navigation';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import api from '@/lib/api';
import { Users, LayoutDashboard, Radio, ChevronLeft, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Mapa de código numérico a nombre de posición
const POS_LABEL: Record<string, string> = {
    '1': 'P', 'P': 'P', '2': 'C', 'C': 'C', '3': '1B', '1B': '1B',
    '4': '2B', '2B': '2B', '5': '3B', '3B': '3B', '6': 'SS', 'SS': 'SS',
    '7': 'LF', 'LF': 'LF', '8': 'CF', 'CF': 'CF', '9': 'RF', 'RF': 'RF',
    'DH': 'DH', 'BD': 'BD',
};

const formatPosition = (item: LineupItem) => {
    const isDh = item.position === 'DH' || item.position === 'BD';
    if (isDh && item.dhForPosition) {
        const anchor = POS_LABEL[item.dhForPosition] || item.dhForPosition;
        return `DH (por ${anchor})`;
    }
    return POS_LABEL[item.position] || item.position;
};

export default function PublicGamecast() {
    const params = useParams();
    const router = useRouter();
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [boxscoreLoading, setBoxscoreLoading] = useState(true);
    const [boxscoreError, setBoxscoreError] = useState(false);

    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");

    // Live base tracking
    const {
        baseIds, inning, half, currentBatter, currentBatterId,
        homeLineup, awayLineup, homeScore, awayScore, playLogs, status,
        winningPitcher, mvpBatter1, mvpBatter2
    } = useGameStore();

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

        // El store ya recibe actualizaciones vía socket.io
        // Refrescar boxscore con el primer load
        return () => {
            isMountedRef.current = false;
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
                                    {[{ label: 'Visitante', lineup: awayLineup }, { label: 'Local', lineup: homeLineup }].map(({ label, lineup }) => (
                                        <div key={label} className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-lg">
                                            <h3 className="text-lg font-black text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Users className="w-5 h-5" /> {label}
                                            </h3>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-700/40 text-slate-500">
                                                        <th className="py-2 text-left font-bold w-10">#</th>
                                                        <th className="py-2 text-left font-bold">Jugador</th>
                                                        <th className="py-2 text-center font-bold w-16">Pos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lineup.map((item: LineupItem) => (
                                                        <tr key={item.playerId} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                                                            <td className="py-2.5 text-slate-500 font-bold">{item.battingOrder}</td>
                                                            <td className="py-2.5 text-white font-semibold">
                                                                {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido'}
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <span className="bg-sky-500/10 text-sky-400 font-black text-xs px-2 py-1 rounded">
                                                                    {formatPosition(item)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
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
                                </div>
                                {boxscoreLoading ? (
                                    <div className="p-20 text-center animate-pulse text-slate-500 font-bold italic">Calculando estadísticas actualizadas...</div>
                                ) : boxscoreError ? (
                                    <div className="p-20 text-center text-rose-500 font-bold">Error al cargar el resumen oficial.</div>
                                ) : boxscore && (
                                    <div className="flex flex-col gap-8">
                                        <ScorebookTable
                                            teamBoxscore={boxscore.awayTeam}
                                            baseIds={half === 'top' ? baseIds : null}
                                            currentInning={inning}
                                        />
                                        <ScorebookTable
                                            teamBoxscore={boxscore.homeTeam}
                                            baseIds={half === 'bottom' ? baseIds : null}
                                            currentInning={inning}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: STREAM */}
                    {activeTab === 'stream' && (
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 lg:p-12 shadow-lg animate-fade-in-up min-h-[500px]">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-700/30 pb-4">
                                <Radio className="w-8 h-8 text-rose-500 animate-pulse" />
                                <h2 className="text-2xl font-black text-white">Transmisión en Vivo (Livepeer)</h2>
                            </div>
                            <div className="max-w-3xl">
                                <p className="text-slate-400 mb-8 text-lg">
                                    Cuando el administrador inicie la transmisión, aparecerá aquí automáticamente.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
