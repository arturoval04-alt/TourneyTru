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
import { supabase } from '@/lib/supabaseClient';
import { calculateBoxscore } from '@/lib/boxscore';
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

    // Live base tracking
    const { 
        baseIds, inning, half, currentBatter, currentBatterId, 
        homeLineup, awayLineup, homeScore, awayScore 
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
            const { error } = await supabase.from('games').update({
                status: 'finished',
                home_score: homeScore,
                away_score: awayScore,
                winning_pitcher_id: selectedPitcherId ? selectedPitcherId : null,
                mvp_batter1_id: selectedBatter1Id ? selectedBatter1Id : null,
                mvp_batter2_id: selectedBatter2Id ? selectedBatter2Id : null,
                updated_at: new Date().toISOString()
            }).eq('id', params.id);

            if (error) throw error;
            alert("Juego finalizado exitosamente.");
            router.push(`/torneos`);
        } catch (error) {
            console.error("Error al finalizar el juego:", error);
            alert("Hubo un error al intentar finalizar el juego.");
        }
    };

    const pitcherInfo = useMemo(() => {
        const defLineup = half === 'top' ? homeLineup : awayLineup;
        const p = defLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P');
        const name = p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
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

    const isMountedRef = useRef(false);

    const fetchBoxscore = useCallback(async (gameId: string) => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select(`
                    id, home_team_id, away_team_id, 
                    homeTeam:teams!home_team_id(*),
                    awayTeam:teams!away_team_id(*),
                    lineups(*, player:players(*)),
                    plays(*)
                `)
                .eq('id', gameId)
                .single();

            if (error) throw error;
            if (data && isMountedRef.current) {
                const box = calculateBoxscore(gameId, data.homeTeam, data.awayTeam, data.lineups, data.plays);
                setBoxscore(box);
                setBoxscoreLoading(false);
                setBoxscoreError(false);
            }
        } catch (err) {
            console.error("Error fetching boxscore from Supabase:", err);
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

        // 3. Suscribirse a cambios vía Supabase Realtime
        const channel = supabase.channel(`boxscore-${gameId}`)
            .on('broadcast', { event: 'gameStateUpdate' }, () => {
                setTimeout(() => { if (isMountedRef.current) fetchBoxscore(gameId); }, 300);
            })
            .subscribe();

        return () => {
            isMountedRef.current = false;
            channel.unsubscribe();
        };
    }, [params.id, fetchBoxscore]);

    const handleCreateStream = async () => {
        setIsCreatingStream(true);
        try {
            alert("Streaming functionality disabled in serverless mode for now.");
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

                    {/* TAB: SCOREKEEPER PANEL */}
                    {activeTab === 'scorekeeper' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {/* Left: Field and Controls */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                <div className="bg-surface border border-muted/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                                    <Field />
                                </div>
                                <ActionPanel />
                                <div className="bg-surface border border-muted/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                     <div className="flex items-center justify-between mb-4 border-b border-muted/20 pb-4">
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Trophy className="w-6 h-6 text-yellow-500" /> RESUMEN OFICIAL (Boxscore)
                                        </h3>
                                        <button 
                                            onClick={handleFinalizarJuego}
                                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-rose-900/20 transition-all flex items-center gap-2"
                                        >
                                            FINALIZAR JUEGO
                                        </button>
                                     </div>
                                     {boxscoreLoading ? (
                                         <div className="p-20 text-center animate-pulse text-muted-foreground font-bold italic">Calculando estadísticas actualizadas...</div>
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

                            {/* Right: Info Panels */}
                            <div className="flex flex-col gap-6">
                                <PlayerInfo 
                                    type="Batting"
                                    name={currentBatter} 
                                    stats={batterStats}
                                />
                                <PlayerInfo 
                                    type="Pitching"
                                    name={pitcherInfo.name} 
                                    stats={pitcherInfo.stats}
                                />
                                <PlayByPlayLog />
                            </div>
                        </div>
                    )}

                    {/* TAB: STREAM */}
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
                                <div className="bg-muted/10 border border-muted/20 rounded-xl p-8 text-center">
                                    <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground font-bold">Funcionalidad de Streaming temporalmente limitada en modo Serverless.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Finalización */}
            {showWrapUpModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-surface border border-muted/30 rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-300">
                        <h2 className="text-3xl font-black text-foreground mb-2 flex items-center gap-3">
                             <Trophy className="w-8 h-8 text-yellow-500" /> MVP & Finalización
                        </h2>
                        <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                            Selecciona a los jugadores más destacados para cerrar el partido oficialmente.
                        </p>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-primary uppercase tracking-widest mb-2">Pitcher Ganador (W)</label>
                                <select 
                                    value={selectedPitcherId} 
                                    onChange={(e) => setSelectedPitcherId(e.target.value)}
                                    className="w-full bg-background border border-muted/30 rounded-xl px-4 py-3 font-bold text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                                >
                                    <option value="">-- No asignado --</option>
                                    {[...(boxscore?.homeTeam.lineup ?? []), ...(boxscore?.awayTeam.lineup ?? [])]
                                        .filter(l => l.position === 'P' || l.position === '1')
                                        .map(p => <option key={p.playerId} value={p.playerId}>{p.firstName} {p.lastName}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-primary uppercase tracking-widest mb-2">MVP Bateador #1</label>
                                <select 
                                    value={selectedBatter1Id} 
                                    onChange={(e) => setSelectedBatter1Id(e.target.value)}
                                    className="w-full bg-background border border-muted/30 rounded-xl px-4 py-3 font-bold text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                                >
                                    <option value="">-- No asignado --</option>
                                    {[...(boxscore?.homeTeam.lineup ?? []), ...(boxscore?.awayTeam.lineup ?? [])]
                                        .map(p => <option key={p.playerId} value={p.playerId}>{p.firstName} {p.lastName}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-primary uppercase tracking-widest mb-2">MVP Bateador #2</label>
                                <select 
                                    value={selectedBatter2Id} 
                                    onChange={(e) => setSelectedBatter2Id(e.target.value)}
                                    className="w-full bg-background border border-muted/30 rounded-xl px-4 py-3 font-bold text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none"
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
                                className="flex-1 bg-muted/20 hover:bg-muted/30 text-foreground py-4 rounded-2xl font-black transition-all"
                            >
                                CANCELAR
                            </button>
                            <button 
                                onClick={submitGameFinalization}
                                className="flex-[2] bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
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
