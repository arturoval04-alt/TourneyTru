'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Field from '@/components/live/Field';
import ScoreCard from '@/components/scorecard/ScoreCard';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import PlayerInfo from '@/components/live/PlayerInfo';
import { useGameStore, PlayLog } from '@/store/gameStore';
import { useRouter } from 'next/navigation';
import { Users, Radio, ChevronLeft, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { calculateBoxscore } from '@/lib/boxscore';

// Mapa de código numérico a nombre de posición
const POS_LABEL: Record<string, string> = {
    '1': 'P', 'P': 'P', '2': 'C', 'C': 'C', '3': '1B', '1B': '1B',
    '4': '2B', '2B': '2B', '5': '3B', '3B': '3B', '6': 'SS', 'SS': 'SS',
    '7': 'LF', 'LF': 'LF', '8': 'CF', 'CF': 'CF', '9': 'RF', 'RF': 'RF',
    'DH': 'DH', 'BD': 'BD',
};

const formatPosition = (item: any) => {
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

    // Usar el store global igual que el Scorekeeper
    const { 
        inning, half, outs, balls, strikes, homeScore, awayScore, bases,
        currentBatter, currentPitcher, currentBatterId, playLogs, 
        homeLineup, awayLineup, playbackId, setGameId, fetchGameConfig, connectSocket,
        winningPitcher, mvpBatter1, mvpBatter2, status
    } = useGameStore();

    const fetchBoxscore = useCallback(async () => {
        try {
            const { data } = await api.get(`/games/${gameId}/boxscore`);
            if (data) setBoxscore(data);
        } catch (error) {
            console.error("Error fetching boxscore:", error);
        }
    }, [gameId]);

    useEffect(() => {
        if (!gameId) return;

        // Inicializar el store
        setGameId(gameId);
        fetchGameConfig().then(() => {
            connectSocket();
        });

        fetchBoxscore();

        // El store ya maneja el WebSocket via socket.io
        return () => {};
    }, [gameId, setGameId, fetchGameConfig, connectSocket, fetchBoxscore]);

    // Refrescar boxscore cada vez que llega una nueva jugada (playLogs cambia)
    useEffect(() => {
        if (gameId && playLogs.length > 0) {
            const timer = setTimeout(() => fetchBoxscore(), 1500);
            return () => clearTimeout(timer);
        }
    }, [playLogs.length, gameId, fetchBoxscore]);

    const batterStats = useMemo(() => {
        if (!boxscore || !currentBatterId) return 'Sin datos aún';
        const battingBox = half === 'top' ? boxscore.awayTeam : boxscore.homeTeam;
        const entry = battingBox.lineup?.find((b: any) => b.playerId === currentBatterId);
        if (!entry) return 'Sin datos aún';
        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | H: ${entry.hits} | RBI: ${entry.rbi} | SO: ${entry.so}`;
    }, [boxscore, currentBatterId, half]);

    const pitcherStats = useMemo(() => {
        const defLineup = half === 'top' ? homeLineup : awayLineup;
        const p = defLineup.find((item: any) => item.position === '1' || item.position === 'P');
        if (boxscore && p?.playerId) {
            const pitchingBox = half === 'top' ? boxscore.homeTeam : boxscore.awayTeam;
            const pitcherEntry = pitchingBox.lineup?.find((b: any) => b.playerId === p.playerId);
            if (pitcherEntry) {
                const ip = (Math.floor((pitcherEntry.pitchingIPOuts || 0) / 3) + ((pitcherEntry.pitchingIPOuts || 0) % 3) / 10).toFixed(1);
                return `IP: ${ip} | K: ${pitcherEntry.pitchingSO || 0} | BB: ${pitcherEntry.pitchingBB || 0} | H: ${pitcherEntry.pitchingHits || 0} | R: ${pitcherEntry.pitchingRuns || 0}`;
            }
        }
        return "IP: 0.0 | K: 0 | BB: 0";
    }, [boxscore, half, homeLineup, awayLineup]);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Navbar />
            
            <div className="max-w-[1400px] mx-auto p-4 flex flex-col gap-6">
                <ScoreCard />

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
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl relative overflow-hidden group">
                                <Field />
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl overflow-x-auto scrollbar-hide">
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <Trophy className="w-6 h-6 text-amber-500" /> RESUMEN OFICIAL
                                </h3>

                                {/* MVP Panel for Finished Games */}
                                {status === 'finished' && (winningPitcher || mvpBatter1 || mvpBatter2) && (
                                    <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-10">
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
                                {boxscore ? (
                                    <div className="flex flex-col gap-8">
                                        <ScorebookTable 
                                            teamBoxscore={boxscore.awayTeam} 
                                            baseIds={half === 'top' ? bases : null} 
                                            currentInning={inning} 
                                        />
                                        <ScorebookTable 
                                            teamBoxscore={boxscore.homeTeam} 
                                            baseIds={half === 'bottom' ? bases : null} 
                                            currentInning={inning} 
                                        />
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-500 animate-pulse font-bold italic">Calculando estadísticas oficiales...</div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <PlayerInfo type="Batting" name={currentBatter} stats={batterStats} />
                            <PlayerInfo type="Pitching" name={currentPitcher} stats={pitcherStats} />
                            <PlayByPlayLog />
                        </div>
                    </div>
                )}

                {activeTab === 'alineaciones' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        {[{ label: 'VISITANTE', lineup: awayLineup }, { label: 'LOCAL', lineup: homeLineup }].map(t => (
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
