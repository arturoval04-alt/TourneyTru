'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Field from '@/components/live/Field';
import ScoreCard from '@/components/scorecard/ScoreCard';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import PlayerInfo from '@/components/live/PlayerInfo';
import { PlayLog } from '@/store/gameStore';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Users, LayoutDashboard, Radio, ChevronLeft, Trophy, Star, Award } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Mapa de código numérico a nombre de posición
const POS_LABEL: Record<string, string> = {
    '1': 'P', 'P': 'P', '2': 'C', 'C': 'C', '3': '1B', '1B': '1B',
    '4': '2B', '2B': '2B', '5': '3B', '3B': '3B', '6': 'SS', 'SS': 'SS',
    '7': 'LF', 'LF': 'LF', '8': 'CF', 'CF': 'CF', '9': 'RF', 'RF': 'RF',
    'DH': 'DH', 'BD': 'BD',
};

interface LineupItemPublic {
    playerId: string;
    teamId: string;
    position: string;
    battingOrder: number;
    player?: { id: string; firstName: string; lastName: string };
}

// Instancia de socket local para la vista pública (readonly)
let socket: Socket;

export default function PublicGamecast() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [isConnected, setIsConnected] = useState(false);
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");

    // Lineups obtenidos de la API para la pestaña de Alineaciones
    const [apiLineups, setApiLineups] = useState<{ home: LineupItemPublic[], away: LineupItemPublic[] }>({ home: [], away: [] });

    // Estado replicado básico del juego
    const [gameState, setGameState] = useState({
        inning: 1,
        half: 'top' as 'top' | 'bottom',
        outs: 0,
        balls: 0,
        strikes: 0,
        homeScore: 0,
        awayScore: 0,
        bases: { first: null, second: null, third: null },
        currentBatter: "Esperando Bateador...",
        currentBatterId: null as string | null,
        currentPitcher: "Esperando Pitcher..." as string,
        playLogs: [] as PlayLog[],
        playbackId: null as string | null,
        homeLineup: [] as LineupItemPublic[],
        awayLineup: [] as LineupItemPublic[],
    });

    const fetchBoxscore = useCallback(async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
            const response = await axios.get(`${apiUrl}/games/${gameId}/boxscore`);
            setBoxscore(response.data);
        } catch (error) {
            console.error("Error fetching boxscore:", error);
        }
    }, [gameId]);

    const fetchGameState = useCallback(async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
            const response = await axios.get(`${apiUrl}/games/${gameId}/state`);
            console.log("Initial state fetched:", response.data);
            setGameState(prev => ({
                ...prev,
                ...response.data
            }));
        } catch (error) {
            console.error("Error fetching game state:", error);
        }
    }, [gameId]);

    // Fetch lineups de la API para la pestaña de Alineaciones
    const fetchLineups = useCallback(async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
            const response = await axios.get(`${apiUrl}/games/${gameId}`);
            const data = response.data;
            const homeLp = (data.lineups || [])
                .filter((l: LineupItemPublic) => l.teamId === data.homeTeam?.id)
                .sort((a: LineupItemPublic, b: LineupItemPublic) => a.battingOrder - b.battingOrder);
            const awayLp = (data.lineups || [])
                .filter((l: LineupItemPublic) => l.teamId === data.awayTeam?.id)
                .sort((a: LineupItemPublic, b: LineupItemPublic) => a.battingOrder - b.battingOrder);
            setApiLineups({
                home: homeLp,
                away: awayLp,
            });
        } catch (error) {
            console.error("Error fetching lineups:", error);
        }
    }, [gameId]);

    useEffect(() => {
        // Carga inicial de datos vía API
        fetchGameState();
        fetchBoxscore();
        fetchLineups();

        // Conectar al namespace de juegos en vivo
        const socketUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:3001';
        socket = io(`${socketUrl}/live_games`);

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('joinGame', gameId);
            console.log("Conectado al Gamecast Público:", gameId);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Escuchar "gameStateUpdate" desde el backend
        socket.on('gameStateUpdate', (data) => {
            console.log("State actualizado vía WebSocket:", data);

            // Setear estado completo
            if (data.fullState) {
                setGameState(data.fullState);
            }
            fetchBoxscore();
        });

        return () => {
            socket.disconnect();
        };
    }, [gameId, fetchBoxscore, fetchLineups, fetchGameState]);

    // Derivar stats del bateador y pitcher del boxscore
    const batterStats = useMemo(() => {
        if (!boxscore || !gameState.currentBatterId) return 'Sin datos aún';
        const battingBox = gameState.half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === gameState.currentBatterId);
        if (!entry) return 'Sin datos aún';
        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${entry.hits} | RBI: ${entry.rbi} | SO: ${entry.so}`;
    }, [boxscore, gameState.currentBatterId, gameState.half]);

    const pitcherNameDisplay = useMemo(() => {
        const defLineup = gameState.half === 'top' ? gameState.homeLineup : gameState.awayLineup;
        const p = defLineup?.find((item: LineupItemPublic) => item.position === '1' || item.position === 'P');
        return p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
    }, [gameState.half, gameState.homeLineup, gameState.awayLineup]);

    const pitcherStats = useMemo(() => {
        if (!boxscore) return 'Sin datos aún';
        // Try to find pitcher in boxscore by matching name
        const pitchingBox = gameState.half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
        
        const entry = pitchingBox.lineup?.find((b: any) =>
            `${b.firstName} ${b.lastName}` === pitcherNameDisplay
        );
        if (!entry) return 'Sin datos aún';
        return `IP: ${entry.atBats || 0} | K: ${entry.so || 0} | BB: ${entry.bb || 0}`;
    }, [boxscore, pitcherNameDisplay, gameState.half]);

    // Lineups to display — prefer API data, fallback to WebSocket data
    const displayLineups = useMemo(() => {
        if (apiLineups.home.length > 0 || apiLineups.away.length > 0) {
            return apiLineups;
        }
        return { home: gameState.homeLineup || [], away: gameState.awayLineup || [] };
    }, [apiLineups, gameState.homeLineup, gameState.awayLineup]);

    // Pasamos todo el objeto gameState clonado para prevenir desfaces de React
    const mockStoreForField = { ...gameState };
    const mockStoreForScore = { ...gameState };

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

                {/* Header Público Simplificado / Scoreboard (Solo Lectura) */}
                <div className="w-full bg-surface border-b border-muted/30 shadow-md shrink-0 pointer-events-none">
                    <ScoreCard forceStoreData={mockStoreForScore} />
                </div>

                <div className="w-full max-w-[1400px] flex flex-col gap-4 p-4 mt-2">
                    {/* Gamecast Sub-Navigation Tabs */}
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
                        </div>
                    </div>

                    {/* TAB: ALINEACIONES (Readonly) */}
                    {activeTab === 'alineaciones' && (
                        <div className="animate-fade-in-up">
                            {displayLineups.home.length === 0 && displayLineups.away.length === 0 ? (
                                <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center shadow-lg min-h-[500px] flex flex-col items-center justify-center">
                                    <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
                                    <h2 className="text-2xl font-black text-foreground mb-4">Alineación Oficial</h2>
                                    <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                                        Las alineaciones para este juego se mostrarán aquí una vez que el organizador confirme los lineups.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {[{ label: 'Visitante', lineup: displayLineups.away }, { label: 'Local', lineup: displayLineups.home }].map(({ label, lineup }) => (
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
                                                    {lineup.map((item: LineupItemPublic) => (
                                                        <tr key={item.playerId} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                                                            <td className="py-2.5 text-muted-foreground font-bold">{item.battingOrder}</td>
                                                            <td className="py-2.5 text-foreground font-semibold">
                                                                {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido'}
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <span className="bg-primary/10 text-primary font-black text-xs px-2 py-1 rounded">
                                                                    {POS_LABEL[item.position] || item.position}
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

                    {/* TAB: SCOREKEEPER / GAMECAST (Main View) */}
                    {activeTab === 'scorekeeper' && (
                        <div className="flex flex-col gap-6 animate-fade-in-up w-full">

                            {/* UPPER ROW: Diamond | Player Cards | Log */}
                            <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[550px] w-full">
                                {/* DIAMOND (Left) */}
                                <div className="w-full lg:w-5/12 bg-surface border border-muted/30 p-2 text-center rounded-2xl shadow-xl flex items-center justify-center relative min-h-[400px] h-full overflow-hidden">
                                    <div className="absolute top-4 left-4 z-10 bg-surface/80 backdrop-blur-md border border-muted/30 px-4 py-2 rounded-lg pointer-events-none">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Bateando:</span>
                                        <span className="text-lg font-black text-primary">{gameState.currentBatter}</span>
                                    </div>
                                    <div className="pointer-events-none origin-center w-full h-full flex items-center justify-center pt-5 pb-2">
                                        <Field forceStoreData={mockStoreForField} />
                                    </div>
                                </div>

                                {/* PLAYER CARDS (Center) */}
                                <div className="w-full lg:w-3/12 flex flex-col gap-4 min-h-0 h-full justify-center">
                                    <PlayerInfo type="Batting" name={gameState.currentBatter} stats={batterStats} />
                                    <PlayerInfo type="Pitching" name={pitcherNameDisplay} stats={pitcherStats} />
                                </div>

                                {/* LOG (Right) */}
                                <div className="w-full lg:w-4/12 flex flex-col h-full bg-surface border border-muted/30 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
                                    <PlayByPlayLog forceStoreData={mockStoreForScore} />
                                </div>
                            </div>

                            {/* LOWER ROW: Stream Player (Always visible in Scorekeeper tab) */}
                            <div className="w-full bg-transparent p-2 mt-4 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-3 mb-6 w-full lg:max-w-5xl justify-start">
                                    <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
                                    <h2 className="text-xl font-black text-foreground">Transmisión Oficial Completa</h2>
                                </div>

                                {gameState.playbackId ? (
                                    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-primary/30 animate-fade-in-up flex-1 aspect-video lg:max-w-5xl">
                                        <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full"></div> EN VIVO
                                        </div>
                                        <iframe
                                            src={`https://lvpr.tv/?v=${gameState.playbackId}`}
                                            className="w-full h-full border-0"
                                            allow="autoplay; fullscreen; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center w-full lg:max-w-5xl">
                                        <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                        <h3 className="text-lg font-bold text-foreground">Transmisión no disponible</h3>
                                        <p className="text-muted-foreground text-sm mt-2">El anotador no ha iniciado la transmisión de video para este partido.</p>
                                    </div>
                                )}
                            </div>

                            {/* Boxscore Oficial */}
                            {boxscore && (
                                <div className="w-full mt-8 flex flex-col gap-6">
                                    {/* Resumen Final Banner */}
                                    {boxscore.status === 'finished' && (
                                        <div className="w-full bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Trophy className="w-32 h-32" />
                                            </div>
                                            <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400 mb-6 tracking-wider uppercase flex items-center gap-3">
                                                <Trophy className="w-6 h-6" /> Destacados del Partido
                                            </h2>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                                {/* Pitcher Ganador */}
                                                {boxscore.winningPitcher && (
                                                    <div className="bg-surface/80 backdrop-blur border border-amber-500/20 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                                                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                                                            <Award className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Pitcher Ganador</span>
                                                        <h3 className="text-lg font-black text-foreground">{`${boxscore.winningPitcher.firstName} ${boxscore.winningPitcher.lastName}`}</h3>
                                                    </div>
                                                )}
                                                
                                                {/* MVP Bateador 1 */}
                                                {boxscore.mvpBatter1 && (
                                                    <div className="bg-surface/80 backdrop-blur border border-primary/20 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 shadow-inner">
                                                            <Star className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">MVP Bateador</span>
                                                        <h3 className="text-lg font-black text-foreground">{`${boxscore.mvpBatter1.firstName} ${boxscore.mvpBatter1.lastName}`}</h3>
                                                    </div>
                                                )}
                                                
                                                {/* MVP Bateador 2 */}
                                                {boxscore.mvpBatter2 && (
                                                    <div className="bg-surface/80 backdrop-blur border border-primary/20 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 shadow-inner">
                                                            <Star className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bateador Destacado</span>
                                                        <h3 className="text-lg font-black text-foreground">{`${boxscore.mvpBatter2.firstName} ${boxscore.mvpBatter2.lastName}`}</h3>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Boxscore Tables */}
                                    <div className="w-full bg-surface border border-muted/30 rounded-2xl p-6 shadow-xl">
                                        <h2 className="text-2xl font-black text-primary mb-6 tracking-wider uppercase flex items-center gap-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Boxscore Oficial
                                        </h2>
                                        <div className="grid grid-cols-1 gap-8">
                                            <ScorebookTable teamBoxscore={boxscore!.awayTeam} />
                                            <ScorebookTable teamBoxscore={boxscore!.homeTeam} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
