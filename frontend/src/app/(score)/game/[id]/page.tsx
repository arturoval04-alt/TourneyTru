'use client';

import ScoreCard from '@/components/scorecard/ScoreCard';
import Field from '@/components/live/Field';
import ActionPanel from '@/components/controls/ActionPanel';
import PlayerInfo from '@/components/live/PlayerInfo';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore, LineupItem } from '@/store/gameStore';
import { useParams, useRouter } from 'next/navigation';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import api from '@/lib/api';
import { calculateBoxscore } from '@/lib/boxscore';
import { Users, LayoutDashboard, Radio, ChevronLeft, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { isLoggedIn, getUser } from '@/lib/auth';
import StreamAdminPanel from '@/components/live/StreamAdminPanel';

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

export default function ScorekeeperLivePanel() {
    const params = useParams();
    const router = useRouter();
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [boxscoreLoading, setBoxscoreLoading] = useState(true);
    const [boxscoreError, setBoxscoreError] = useState(false);

    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");
    const [authorized, setAuthorized] = useState(false);

    // Wrap-up modal states
    const [showWrapUpModal, setShowWrapUpModal] = useState(false);
    const [selectedPitcherId, setSelectedPitcherId] = useState<string>('');
    const [selectedBatter1Id, setSelectedBatter1Id] = useState<string>('');
    const [selectedBatter2Id, setSelectedBatter2Id] = useState<string>('');

    // Auth + role + scope guard — no renderiza nada hasta confirmar acceso
    useEffect(() => {
        if (!isLoggedIn()) {
            router.replace(`/login?redirect=/game/${params.id}`);
            return;
        }
        const user = getUser();
        const allowedRoles = ['admin', 'organizer', 'scorekeeper'];
        if (!user || !allowedRoles.includes(user.role)) {
            router.replace('/');
            return;
        }
        // Admin: acceso total sin verificación de scope
        if (user.role === 'admin') {
            setAuthorized(true);
            return;
        }

        // Organizer y Scorekeeper: verificar que el juego pertenece a su liga
        api.get(`/games/${params.id}`).then(({ data }) => {
            const gameLeagueId = data.tournament?.leagueId;
            const leagueAdminId = data.tournament?.league?.adminId;

            if (user.role === 'scorekeeper') {
                if (gameLeagueId && user.scorekeeperLeagueId && gameLeagueId !== user.scorekeeperLeagueId) {
                    router.replace('/');
                    return;
                }
            } else if (user.role === 'organizer') {
                if (leagueAdminId && leagueAdminId !== user.id) {
                    router.replace('/');
                    return;
                }
            }
            setAuthorized(true);
        }).catch(() => {
            router.replace('/');
        });
    }, [router, params.id]);

    // Live base tracking
    const {
        baseIds, inning, half, currentBatter, currentBatterId,
        homeLineup, awayLineup, homeScore, awayScore, playLogs,
        shouldPromptEndGame, clearEndGamePrompt,
    } = useGameStore();

    const handleFinalizarJuego = () => {
        if (!window.confirm("¿Deseas finalizar el juego oficialmente? Pasaremos a seleccionar los MVP's.")) return;

        if (boxscore) {
            const isHomeWin = homeScore > awayScore;
            const winningTeamBox = isHomeWin ? boxscore.homeTeam : boxscore.awayTeam;
            const winningPitchers = winningTeamBox.lineup.filter((l: any) => l.position === 'P' || l.position === '1');
            if (winningPitchers.length > 0) setSelectedPitcherId(winningPitchers[0].playerId);

            const allBatters = [...(boxscore.homeTeam.lineup), ...(boxscore.awayTeam.lineup)]
                .filter((b: any) => b.atBats > 0)
                .sort((a: any, b: any) => (b.hits - a.hits) || (b.rbi - a.rbi));

            if (allBatters.length > 0) setSelectedBatter1Id(allBatters[0].playerId);
            if (allBatters.length > 1) setSelectedBatter2Id(allBatters[1].playerId);
        }

        setShowWrapUpModal(true);
    };

    const submitGameFinalization = async () => {
        try {
            // Finalizar el juego via backend API
            await api.patch(`/games/${params.id}`, {
                status: 'finished',
                homeScore,
                awayScore,
                winningPitcherId: selectedPitcherId || null,
                mvpBatter1Id: selectedBatter1Id || null,
                mvpBatter2Id: selectedBatter2Id || null,
            });
            alert("Juego finalizado y estadísticas guardadas exitosamente.");
            router.push(`/torneos`);
        } catch (error) {
            console.error("Error al finalizar el juego:", error);
            alert("Hubo un error al intentar finalizar el juego o guardar las estadísticas.");
        }
    };

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

    // Fin de juego automático: cuando el store detecta el límite de entradas
    useEffect(() => {
        if (!shouldPromptEndGame) return;
        clearEndGamePrompt();
        // Pequeño delay para que el UI termine de actualizarse antes del modal
        const timer = setTimeout(() => {
            handleFinalizarJuego();
        }, 400);
        return () => clearTimeout(timer);
    }, [shouldPromptEndGame]);

    // Refrescar boxscore cuando el store recibe nuevas jugadas vía socket.io
    useEffect(() => {
        const gameId = params.id as string;
        if (gameId && playLogs.length > 0 && isMountedRef.current) {
            console.log(`[Boxscore Refresh] Triggered by playLogs.length=${playLogs.length}, fetching in 500ms...`);
            const timer = setTimeout(() => fetchBoxscore(gameId), 500);
            return () => clearTimeout(timer);
        }
    }, [playLogs.length, params.id, fetchBoxscore]);

    if (!authorized) return null;

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
                            <LayoutDashboard className="w-4 h-4" /> Scorekeeper
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
                                    <Field />
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

                            {/* ── Row 2: Action Panel ── */}
                            <ActionPanel />

                            {/* ── Row 3: Boxscore ── */}
                            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-4 sm:p-6 shadow-xl overflow-x-auto">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-700/30 pb-4">
                                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" /> RESUMEN OFICIAL (Boxscore)
                                    </h3>
                                    <button
                                        onClick={handleFinalizarJuego}
                                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-rose-900/20 transition-all flex items-center gap-2 shrink-0"
                                    >
                                        FINALIZAR JUEGO
                                    </button>
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
                        <StreamAdminPanel gameId={params.id as string} forceView="admin" />
                    )}
                </div>
            </div>

            {/* Modal de Finalización */}
            {showWrapUpModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-yellow-500" /> MVP & Finalización
                        </h2>
                        <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                            Selecciona a los jugadores más destacados para cerrar el partido oficialmente.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-sky-400 uppercase tracking-widest mb-2">Pitcher Ganador (W)</label>
                                <select
                                    value={selectedPitcherId}
                                    onChange={(e) => setSelectedPitcherId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-sky-500/50 transition-all outline-none"
                                >
                                    <option value="">-- No asignado --</option>
                                    {[...(boxscore?.homeTeam.lineup ?? []), ...(boxscore?.awayTeam.lineup ?? [])]
                                        .filter(l => l.position === 'P' || l.position === '1')
                                        .map(p => <option key={p.playerId} value={p.playerId}>{p.firstName} {p.lastName}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-sky-400 uppercase tracking-widest mb-2">MVP Bateador #1</label>
                                <select
                                    value={selectedBatter1Id}
                                    onChange={(e) => setSelectedBatter1Id(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-sky-500/50 transition-all outline-none"
                                >
                                    <option value="">-- No asignado --</option>
                                    {[...(boxscore?.homeTeam.lineup ?? []), ...(boxscore?.awayTeam.lineup ?? [])]
                                        .map(p => <option key={p.playerId} value={p.playerId}>{p.firstName} {p.lastName}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-sky-400 uppercase tracking-widest mb-2">MVP Bateador #2</label>
                                <select
                                    value={selectedBatter2Id}
                                    onChange={(e) => setSelectedBatter2Id(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-sky-500/50 transition-all outline-none"
                                >
                                    <option value="">-- No asignado --</option>
                                    {[...(boxscore?.homeTeam.lineup ?? []), ...(boxscore?.awayTeam.lineup ?? [])]
                                        .map(p => <option key={p.playerId} value={p.playerId}>{p.firstName} {p.lastName}</option>)
                                    }
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={() => setShowWrapUpModal(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all border border-slate-700"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={submitGameFinalization}
                                className="flex-[2] bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2"
                            >
                                <Trophy className="w-5 h-5" /> GUARDAR & CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
