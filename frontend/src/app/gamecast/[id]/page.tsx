'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Field from '@/components/live/Field';
import ScoreCard from '@/components/scorecard/ScoreCard';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import PlayerInfo from '@/components/live/PlayerInfo';
import { PlayLog } from '@/store/gameStore';
import { useRouter } from 'next/navigation';
import { Users, LayoutDashboard, Radio, ChevronLeft, Trophy, Star, Award } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';
import { calculateBoxscore } from '@/lib/boxscore';

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
    dhForPosition?: string | null;
    player?: { id: string; firstName: string; lastName: string };
}

const formatPosition = (item: LineupItemPublic) => {
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
    const gameId = params.id as string;

    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [activeTab, setActiveTab] = useState<"alineaciones" | "scorekeeper" | "stream">("scorekeeper");

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
        homeLineup: [] as any[],
        awayLineup: [] as any[],
    });

    const fetchBoxscore = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select(`
                    id, home_team_id, away_team_id, home_score, away_score, current_inning, half, playback_id,
                    homeTeam:teams!home_team_id(*),
                    awayTeam:teams!away_team_id(*),
                    lineups(*, player:players(*)),
                    plays(*)
                `)
                .eq('id', gameId)
                .single();

            if (error) throw error;
            if (data) {
                const box = calculateBoxscore(gameId, data.homeTeam, data.awayTeam, data.lineups, data.plays);
                setBoxscore(box);
                
                // If it's the first fetch or someone refreshed, sync initial state
                setGameState(prev => ({
                    ...prev,
                    homeScore: data.home_score || 0,
                    awayScore: data.away_score || 0,
                    inning: data.current_inning || 1,
                    half: data.half || 'top',
                    playbackId: data.playback_id,
                    homeLineup: data.lineups.filter((l: any) => l.team_id === data.home_team_id).sort((a:any, b:any) => a.batting_order - b.batting_order),
                    awayLineup: data.lineups.filter((l: any) => l.team_id === data.away_team_id).sort((a:any, b:any) => a.batting_order - b.batting_order),
                }));
            }
        } catch (error) {
            console.error("Error fetching boxscore from Supabase:", error);
        }
    }, [gameId]);

    useEffect(() => {
        if (!gameId) return;

        fetchBoxscore();

        const channel = supabase.channel(`gamecast-${gameId}`)
            .on('broadcast', { event: 'gameStateUpdate' }, ({ payload }) => {
                if (payload.fullState) {
                    setGameState(prev => ({ ...prev, ...payload.fullState }));
                }
                fetchBoxscore();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [gameId, fetchBoxscore]);

    const batterStats = useMemo(() => {
        if (!boxscore || !gameState.currentBatterId) return 'Sin datos aún';
        const battingBox = gameState.half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === gameState.currentBatterId);
        if (!entry) return 'Sin datos aún';
        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${entry.hits} | RBI: ${entry.rbi} | SO: ${entry.so}`;
    }, [boxscore, gameState.currentBatterId, gameState.half]);

    const pitcherStats = useMemo(() => {
        // Simple placeholder for now, could be improved by tracking current pitcher in state
        return "IP: 0.0 | K: 0 | ERA: 0.00";
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />
            
            <div className="max-w-[1400px] mx-auto p-4 flex flex-col gap-6">
                {/* Scoreboard */}
                {/* We pass internal state to components since we don't have the store in Public view */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-6 shadow-2xl overflow-hidden relative">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-500" />
                     {/* Mocking the props for ScoreCard since it usually uses store */}
                     {/* In a real scenario, we might want to pass props to ScoreCard instead of it being a connected component */}
                     <ScoreCard />
                </div>

                {/* Tabs */}
                <div className="flex justify-center border-b border-slate-800 pb-4">
                    <div className="bg-slate-900/50 p-1 w-full sm:w-auto rounded-2xl border border-slate-800 flex overflow-x-auto scrollbar-hide gap-1 sm:gap-2">
                        {[
                            { id: 'scorekeeper', label: 'En Vivo', icon: Radio },
                            { id: 'alineaciones', label: 'Alineaciones', icon: Users },
                            { id: 'stream', label: 'Transmisión', icon: Radio }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center whitespace-nowrap gap-1.5 sm:gap-2 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${activeTab === tab.id ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'text-slate-400 hover:text-white'}`}
                            >
                                <tab.icon className="w-4 h-4" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'scorekeeper' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Field Section */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl relative overflow-hidden group">
                                <Field />
                            </div>

                            {/* Boxscore Table */}
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl overflow-x-auto scrollbar-hide">
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <Trophy className="w-6 h-6 text-amber-500" /> RESUMEN OFICIAL
                                </h3>
                                {boxscore ? (
                                    <div className="flex flex-col gap-8">
                                        <ScorebookTable 
                                            teamBoxscore={boxscore.awayTeam} 
                                            baseIds={gameState.half === 'top' ? gameState.bases : null} 
                                            currentInning={gameState.inning} 
                                        />
                                        <ScorebookTable 
                                            teamBoxscore={boxscore.homeTeam} 
                                            baseIds={gameState.half === 'bottom' ? gameState.bases : null} 
                                            currentInning={gameState.inning} 
                                        />
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-500 animate-pulse font-bold italic">Calculando estadísticas oficiales...</div>
                                )}
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex flex-col gap-6">
                            <PlayerInfo 
                                type="Batting"
                                name={gameState.currentBatter} 
                                stats={batterStats}
                            />
                            <PlayerInfo 
                                type="Pitching"
                                name={gameState.currentPitcher} 
                                stats={pitcherStats}
                            />
                            <PlayByPlayLog />
                        </div>
                    </div>
                )}

                {activeTab === 'alineaciones' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        {[{ label: 'VISITANTE', lineup: gameState.awayLineup }, { label: 'LOCAL', lineup: gameState.homeLineup }].map(t => (
                            <div key={t.label} className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl hover:border-slate-700 transition-colors">
                                <h3 className="text-xl sm:text-2xl font-black text-sky-400 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-2 sm:pb-4">
                                    <Users className="w-6 h-6 sm:w-7 sm:h-7" /> {t.label}
                                </h3>
                                <div className="space-y-4">
                                    {t.lineup.map((item: any) => (
                                        <div key={item.playerId} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-800">
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <span className="text-slate-500 font-mono font-bold w-5 sm:w-6 shrink-0">{item.battingOrder}</span>
                                                <span className="font-bold text-base sm:text-lg text-slate-200 truncate">
                                                    {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido'}
                                                </span>
                                            </div>
                                            <span className="bg-sky-500/10 text-sky-400 font-black text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-sky-500/20 shrink-0 ml-2">
                                                {formatPosition(item)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'stream' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-12 text-center shadow-2xl min-h-[300px] sm:min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-500/5 via-transparent to-transparent pointer-events-none" />
                        <Radio className="w-20 h-20 text-sky-500/20 mb-6" />
                        <h2 className="text-3xl font-black text-white mb-4">Streaming en Vivo</h2>
                        <p className="text-slate-400 max-w-lg mx-auto text-lg">
                            Cuando el administrador inicie la transmisión, aparecerá aquí automáticamente.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
