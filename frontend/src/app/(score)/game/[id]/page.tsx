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
import axios from 'axios';
import { apiFetch, getAccessToken } from '@/lib/auth';
import { getApiUrl, getSocketUrl } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
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

export default function ScorekeeperLivePanel() {
    const params = useParams();
    const router = useRouter();
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [boxscoreLoading, setBoxscoreLoading] = useState(true);
    const [boxscoreError, setBoxscoreError] = useState(false);

    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");

    // Wrap-up modal states
    const [showWrapUpModal, setShowWrapUpModal] = useState(false);
    const [selectedPitcherId, setSelectedPitcherId] = useState<string>('');
    const [selectedBatter1Id, setSelectedBatter1Id] = useState<string>('');
    const [selectedBatter2Id, setSelectedBatter2Id] = useState<string>('');

    // Livepeer Streaming States
    const [isCreatingStream, setIsCreatingStream] = useState(false);
    const [streamInfo, setStreamInfo] = useState<{ streamKey: string, playbackId: string, id: string } | null>(null);

    // Live base tracking — para actualizar las rayitas del corredor en tiempo real
    const { baseIds, inning, half, currentBatter, currentBatterId, homeLineup, awayLineup, homeScore, awayScore } = useGameStore();

    const handleFinalizarJuego = () => {
        if (!window.confirm("¿Deseas finalizar el juego oficialmente? Pasaremos a seleccionar los MVP's.")) return;
        
        // Auto-recommend MVP based on boxscore
        if (boxscore) {
            // Recommend Pitcher (First pitcher on winning team)
            const isHomeWin = homeScore > awayScore;
            const winningTeamBox = isHomeWin ? boxscore.homeTeam : boxscore.awayTeam;
            const winningPitchers = winningTeamBox.lineup.filter((l: any) => l.position === 'P' || l.position === '1');
            if (winningPitchers.length > 0) {
                setSelectedPitcherId(winningPitchers[0].playerId);
            }

            // Recommend Batters (sort by hits then RBI across both teams)
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
            const res = await apiFetch(`/games/${params.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                status: 'finished',
                homeScore,
                awayScore,
                winningPitcherId: selectedPitcherId ? selectedPitcherId : undefined,
                mvpBatter1Id: selectedBatter1Id ? selectedBatter1Id : undefined,
                mvpBatter2Id: selectedBatter2Id ? selectedBatter2Id : undefined
                })
            });
            if (!res.ok) throw new Error('PATCH failed');
            alert("Juego finalizado exitosamente.");
            router.push(`/torneos`);
        } catch (error) {
            console.error("Error al finalizar el juego:", error);
            alert("Hubo un error al intentar finalizar el juego.");
        }
    };

    // Derivar nombre del pitcher actual y stats del bateador/pitcher del boxscore
    const pitcherInfo = useMemo(() => {
        const defLineup = half === 'top' ? homeLineup : awayLineup;
        const p = defLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P');
        const name = p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
        // Computar stats del pitcher del boxscore: IP y K
        let stats = '';
        if (boxscore && p?.playerId) {
            const pitchingBox = half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
            const pitcherEntry = pitchingBox.lineup?.find((b: any) => b.playerId === p.playerId);
            if (pitcherEntry) {
                stats = `IP: ${pitcherEntry.atBats || 0} | K: ${pitcherEntry.so || 0} | BB: ${pitcherEntry.bb || 0}`;
            }
        }
        if (!stats) stats = 'Sin datos aún';
        return { name, stats };
    }, [half, homeLineup, awayLineup, boxscore]);

    const batterStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return 'Sin datos aún';
        const battingBox = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!entry) return 'Sin datos aún';
        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${entry.hits} | RBI: ${entry.rbi} | SO: ${entry.so}`;
    }, [boxscore, currentBatterId, half]);

    // Refs para cleanup robusto (evita duplicados de Strict Mode)
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(false);

    const fetchBoxscore = useCallback((gameId: string) => {
        // Cancelar request anterior si aún está en vuelo
        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();

        // En lugar de setear error de inmediato, esperamos la promesa para evitar render cascade
        const apiUrl = getApiUrl();
        axios.get(
            `${apiUrl}/games/${gameId}/boxscore?t=${Date.now()}`,
            { signal: abortRef.current.signal }
        )
            .then(res => {
                if (isMountedRef.current) {
                    setBoxscore(res.data);
                    setBoxscoreLoading(false);
                    setBoxscoreError(false); // Seteamos false al tener exito
                }
            })
            .catch(err => {
                if (axios.isCancel(err) || err.name === 'CanceledError') return; // request cancelado — ignorar
                if (isMountedRef.current) {
                    setBoxscoreError(true);
                    setBoxscoreLoading(false);
                }
            });
    }, []);

    useEffect(() => {
        const gameId = params.id as string;
        if (!gameId) return;

        // Evitar doble-mount de Strict Mode
        if (isMountedRef.current) return;
        isMountedRef.current = true;

        // 1. Inicializar store
        useGameStore.getState().setGameId(gameId);
        useGameStore.getState().fetchGameConfig().then(() => {
            useGameStore.getState().connectSocket();
        });

        // 2. Carga inicial
        fetchBoxscore(gameId);

        // 3. Socket para tiempo real
        if (!socketRef.current) {
            const socketUrl = getSocketUrl();
            const authToken = getAccessToken();
            socketRef.current = io(socketUrl, { transports: ['websocket'], auth: authToken ? { token: authToken } : undefined });
            socketRef.current.emit('joinGame', gameId);
            socketRef.current.on('gameStateUpdate', (data: { fullState?: { playbackId?: string } }) => {
                // Keep local stream state alive if another client broadcasts it
                if (data?.fullState?.playbackId && isMountedRef.current) {
                    setStreamInfo((prev) => prev || { playbackId: data!.fullState!.playbackId!, streamKey: '*** Oculto (Sesión Remota) ***', id: '' });
                }
                setTimeout(() => {
                    if (isMountedRef.current) fetchBoxscore(gameId);
                }, 500);
            });
        }

        // 4. Polling de respaldo cada 6 segundos
        if (!pollingRef.current) {
            pollingRef.current = setInterval(() => {
                if (isMountedRef.current) fetchBoxscore(gameId);
            }, 6000);
        }

        return () => {
            isMountedRef.current = false;
            if (abortRef.current) abortRef.current.abort();
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
            if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
            useGameStore.getState().disconnectSocket();
        };
    }, [params.id, fetchBoxscore]);

    // Livepeer API Call
    const handleCreateStream = async () => {
        setIsCreatingStream(true);
        try {
            const res = await axios.post('/api/livepeer', {
                name: `TourneyTru Game ${params.id}`
            });

            const newStreamInfo = {
                streamKey: res.data.streamKey,
                playbackId: res.data.playbackId,
                id: res.data.id
            };
            setStreamInfo(newStreamInfo);

            // Broadcast playbackId to public gamecast via socket state bypass
            if (socketRef.current) {
                const currentState = { ...useGameStore.getState() };
                Object.assign(currentState, { playbackId: newStreamInfo.playbackId });
                const authToken = getAccessToken();
                socketRef.current.emit('syncState', {
                    gameId: params.id,
                    token: authToken || undefined,
                    fullState: currentState
                });
            }
        } catch (err) {
            console.error("Livepeer error:", err);
            alert("Error al conectar con Livepeer Studio. Verifica tu conexión.");
        } finally {
            setIsCreatingStream(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="bg-background pt-2 px-4 shadow-sm pb-2 border-b border-muted/20">
                <div className="max-w-[1400px] mx-auto">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2 px-4 bg-surface rounded-lg border border-muted/30 shadow-sm w-fit">
                        <ChevronLeft className="w-4 h-4" /> Volver Atrás
                    </button>
                </div>
            </div>

            <div className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-auto custom-scrollbar transition-colors duration-300">
                {/* Header del Marcador Global */}
                <div className="w-full bg-surface border-b border-muted/30 shadow-md shrink-0">
                    <ScoreCard />
                </div>

                <div className="w-full max-w-[1400px] flex flex-col gap-4 p-4 mt-2">

                    {/* Scorekeeper Sub-Navigation Tabs */}
                    <div className="flex justify-center mb-2">
                        <div className="bg-surface border border-muted/30 p-1 rounded-xl shadow-sm inline-flex">
                            <button
                                onClick={() => setActiveTab('alineaciones')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'alineaciones' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                <Users className="w-4 h-4" /> Alineaciones
                            </button>
                            <button
                                onClick={() => setActiveTab('scorekeeper')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'scorekeeper' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                <LayoutDashboard className="w-4 h-4" /> Scorekeeper
                            </button>
                            <button
                                onClick={() => setActiveTab('stream')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'stream' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                <Radio className="w-4 h-4" /> Stream
                            </button>
                        </div>
                    </div>

                    {/* TAB: ALINEACIONES */}
                    {activeTab === 'alineaciones' && (
                        <div className="animate-fade-in-up">
                            {homeLineup.length === 0 && awayLineup.length === 0 ? (
                                <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center shadow-lg min-h-[500px] flex flex-col items-center justify-center">
                                    <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
                                    <h2 className="text-2xl font-black text-foreground mb-4">Alineación y Configuración del Juego</h2>
                                    <p className="text-muted-foreground max-w-xl mx-auto">Aún no se han establecido las alineaciones para este juego.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {[{ label: 'Visitante', lineup: awayLineup }, { label: 'Local', lineup: homeLineup }].map(({ label, lineup }) => (
                                        <div key={label} className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-lg">
                                            <h3 className="text-lg font-black text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Users className="w-5 h-5" /> {label}
                                            </h3>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-muted/30 text-muted-foreground">
                                                        <th className="py-2 text-left font-bold w-10">#</th>
                                                        <th className="py-2 text-left font-bold">Jugador</th>
                                                        <th className="py-2 text-center font-bold w-16">Pos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lineup.map((item: LineupItem) => (
                                                        <tr key={item.playerId} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                                                            <td className="py-2.5 text-muted-foreground font-bold">{item.battingOrder}</td>
                                                            <td className="py-2.5 text-foreground font-semibold">
                                                                {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido'}
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <span className="bg-primary/10 text-primary font-black text-xs px-2 py-1 rounded">
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

                    {/* TAB: STREAM (Livepeer Placeholder) */}
                    {activeTab === 'stream' && (
                        <div className="bg-surface border border-muted/30 rounded-2xl p-6 lg:p-12 shadow-lg animate-fade-in-up min-h-[500px]">
                            <div className="flex items-center gap-3 mb-6 border-b border-muted/20 pb-4">
                                <Radio className="w-8 h-8 text-rose-500 animate-pulse" />
                                <h2 className="text-2xl font-black text-foreground">Transmisión en Vivo (Livepeer)</h2>
                            </div>
                            <div className="max-w-3xl">
                                <p className="text-muted-foreground mb-8 text-lg">
                                    Conecta tu OBS o cámara compatible para transmitir el partido en vivo. Tus espectadores podrán ver el video incrustado directamente en el Gamecast oficial sin salir de la página.
                                </p>

                                {!streamInfo ? (
                                    <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center max-w-lg">
                                        <button
                                            onClick={handleCreateStream}
                                            disabled={isCreatingStream}
                                            className={`px-8 py-4 ${isCreatingStream ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white'} rounded-xl font-black text-lg transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-3 mx-auto w-full`}
                                        >
                                            {isCreatingStream ? (
                                                <span className="animate-pulse">Configurando servidor...</span>
                                            ) : (
                                                <>
                                                    <Radio className="w-6 h-6" />
                                                    Crear Transmisión (Livepeer)
                                                </>
                                            )}
                                        </button>
                                        <p className="text-xs text-muted-foreground mt-4 uppercase tracking-widest font-bold">Generará claves RTMP automáticas</p>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 shadow-sm">
                                        <h3 className="text-xl font-black text-emerald-500 mb-6 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                            Servidor RTMP Listo
                                        </h3>

                                        <div className="grid gap-6">
                                            <div className="bg-surface border border-muted/30 p-4 rounded-lg">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">1. URL del Servidor (OBS)</label>
                                                <div className="flex justify-between items-center">
                                                    <code className="text-foreground font-mono font-medium text-lg">rtmp://rtmp.livepeer.studio/live</code>
                                                    <button onClick={() => navigator.clipboard.writeText('rtmp://rtmp.livepeer.studio/live')} className="text-xs bg-muted/20 hover:bg-muted/30 px-3 py-1.5 rounded text-foreground transition-colors font-bold">Copiar</button>
                                                </div>
                                            </div>

                                            <div className="bg-surface border border-muted/30 p-4 rounded-lg">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">2. Clave de Transmisión (Stream Key)</label>
                                                <div className="flex justify-between items-center">
                                                    <code className="text-rose-400 font-mono font-black text-lg">{streamInfo.streamKey}</code>
                                                    <button onClick={() => navigator.clipboard.writeText(streamInfo.streamKey)} className="text-xs bg-muted/20 hover:bg-muted/30 px-3 py-1.5 rounded text-foreground transition-colors font-bold">Copiar</button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">Pega esta clave secreta en OBS Studio. ¡No la compartas!</p>
                                            </div>

                                            <div className="bg-surface border border-muted/30 p-4 rounded-lg">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Playback ID (Público)</label>
                                                <div className="flex justify-between items-center">
                                                    <code className="text-emerald-400 font-mono font-bold text-sm">{streamInfo.playbackId}</code>
                                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Emitiéndose al Gamecast ✅</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-4 bg-muted/10 rounded-lg border border-muted/20 text-sm text-muted-foreground">
                                            <b>Siguiente paso:</b> Inicia tu transmisión (&quot;Start Streaming&quot;) en OBS. El reproductor de video aparecerá automáticamente en el Gamecast de tus fanáticos una vez que recibamos la señal.
                                        </div>

                                        {/* Embedded Livepeer Player for Scorekeeper verification */}
                                        <div className="mt-8 w-full bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-primary/30">
                                            <div className="absolute top-4 left-4 z-10 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                                                <div className="w-2 h-2 bg-white rounded-full"></div> VISTA PREVIA DEL DIRECTOR
                                            </div>
                                            <div className="aspect-video w-full">
                                                <iframe
                                                    src={`https://lvpr.tv/?v=${streamInfo.playbackId}`}
                                                    className="w-full h-full border-0"
                                                    allow="autoplay; fullscreen; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: SCOREKEEPER (Main Engine) */}
                    {activeTab === 'scorekeeper' && (
                        <div className="flex flex-col gap-4 animate-fade-in-up">
                            {/* FIRST FOLD: Controls */}
                            <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
                                {/* COLUMNA 1: Jugadores y Diamante (5/12) */}
                                <div className="w-full lg:w-5/12 flex flex-col gap-2 relative min-h-0 h-full">
                                    <div className="shrink-0">
                                        <PlayerInfo type="Batting" name={currentBatter} stats={batterStats} />
                                    </div>

                                    <div className="bg-surface border border-muted/30 p-2 rounded-xl shadow-lg relative flex-1 flex flex-col justify-center overflow-hidden min-h-0">
                                        <h3 className="absolute top-2 left-0 w-full text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest z-0 pointer-events-none">
                                            Diamante en Vivo
                                        </h3>
                                        <div className="w-full h-full flex items-center justify-center pt-5 pb-2">
                                            <Field />
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        <PlayerInfo type="Pitching" name={pitcherInfo.name} stats={pitcherInfo.stats} />
                                    </div>
                                </div>

                                {/* COLUMNA 2: Controles (4/12) */}
                                <div className="w-full lg:w-4/12 flex flex-col gap-2 min-h-0 h-full relative">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                        <ActionPanel />
                                    </div>
                                </div>

                                {/* COLUMNA 3: Log (3/12) */}
                                <div className="w-full lg:w-3/12 flex flex-col gap-2 min-h-0 h-full">
                                    <PlayByPlayLog />
                                    <button 
                                        onClick={handleFinalizarJuego}
                                        className="w-full bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-black py-3 text-[11px] border border-red-500/30 rounded-lg transition-all shadow-md tracking-widest uppercase shrink-0 mt-auto">
                                        Finalizar Juego
                                    </button>
                                </div>
                            </div>

                            {/* SECOND FOLD: Boxscore — siempre visible */}
                            <div className="w-full bg-surface border border-muted/30 rounded-xl p-6 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-black text-primary tracking-wider uppercase">Official Boxscore</h2>
                                    {boxscoreLoading && (
                                        <span className="text-xs text-muted-foreground animate-pulse font-bold">CARGANDO...</span>
                                    )}
                                    {!boxscoreLoading && boxscoreError && (
                                        <span className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full">⚠ ERROR DE CONEXIÓN</span>
                                    )}
                                </div>

                                {boxscore ? (
                                    <div className="grid grid-cols-1 gap-8">
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
                                ) : (
                                    <div className="grid grid-cols-1 gap-8">
                                        {[0, 1].map(i => (
                                            <div
                                                key={i}
                                                className={`h-32 rounded-lg border flex items-center justify-center transition-colors ${boxscoreError
                                                    ? 'bg-red-500/5 border-red-500/20 text-red-500'
                                                    : 'bg-muted/5 border-muted/20 text-muted-foreground animate-pulse'
                                                    }`}
                                            >
                                                <span className="text-sm font-bold uppercase tracking-widest">
                                                    {boxscoreError ? '⚠ Sin conexión al servidor' : 'Cargando lineup...'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MVP Wrap-Up Modal */}
            {showWrapUpModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-surface border border-muted/30 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-foreground leading-none mb-1">Resumen del Juego</h2>
                                <p className="text-muted-foreground text-sm font-medium">Selecciona a los jugadores más valiosos (MVPs) del partido antes de finalizar.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Pitcher Ganador */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Pitcher Ganador</label>
                                <select 
                                    className="w-full bg-background border border-muted/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    value={selectedPitcherId}
                                    onChange={(e) => setSelectedPitcherId(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Pitcher --</option>
                                    {[...(boxscore?.homeTeam?.lineup || []), ...(boxscore?.awayTeam?.lineup || [])]
                                        .filter((p: any) => p.position === 'P' || p.position === '1')
                                        .map((p: any) => (
                                        <option key={p.playerId} value={p.playerId}>{`${p.firstName} ${p.lastName} (${p.position})`}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bateador Destacado 1 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Bateador Destacado 1</label>
                                <select 
                                    className="w-full bg-background border border-muted/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    value={selectedBatter1Id}
                                    onChange={(e) => setSelectedBatter1Id(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Bateador --</option>
                                    {[...(boxscore?.homeTeam?.lineup || []), ...(boxscore?.awayTeam?.lineup || [])].map((p: any) => (
                                        <option key={p.playerId} value={p.playerId}>{`${p.firstName} ${p.lastName} (${p.position})`}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bateador Destacado 2 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Bateador Destacado 2</label>
                                <select 
                                    className="w-full bg-background border border-muted/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    value={selectedBatter2Id}
                                    onChange={(e) => setSelectedBatter2Id(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Bateador --</option>
                                    {[...(boxscore?.homeTeam?.lineup || []), ...(boxscore?.awayTeam?.lineup || [])].map((p: any) => (
                                        <option key={p.playerId} value={p.playerId}>{`${p.firstName} ${p.lastName} (${p.position})`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 justify-end">
                            <button 
                                onClick={() => setShowWrapUpModal(false)}
                                className="px-6 py-2.5 rounded-lg border border-muted/30 text-muted-foreground hover:bg-muted/10 font-bold transition-colors text-sm cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={submitGameFinalization}
                                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white shadow-md font-bold transition-colors text-sm cursor-pointer"
                            >
                                Confirmar y Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
