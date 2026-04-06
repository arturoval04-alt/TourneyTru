'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore, LineupItem } from '@/store/gameStore';
import { GameBoxscoreDto } from '@/types/boxscore';
import { ScorebookTable } from '@/components/ScorebookTable';
import Field from '@/components/live/Field';
import PlayByPlayLog from '@/components/live/PlayByPlayLog';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Trophy, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function GameFinalizado() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [gameData, setGameData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const {
        homeLineup, awayLineup, homeScore, awayScore, homeTeamName, awayTeamName, status
    } = useGameStore();

    const [fieldView, setFieldView] = useState<'home' | 'away'>('away');

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!gameId) return;

        // Populate global store for Field & PlayByPlayLog
        useGameStore.getState().setGameId(gameId);
        useGameStore.getState().fetchGameConfig().then(() => {
            // Also fetch final boxscore & game data
            Promise.all([
                api.get(`/games/${gameId}/boxscore`),
                api.get(`/games/${gameId}`)
            ]).then(([resBox, resGame]) => {
                setBoxscore(resBox.data);
                setGameData(resGame.data);
                setLoading(false);
            }).catch(console.error);
        });
    }, [gameId]);

    const getBatterStats = (playerId: string, teamBox: any) => {
        if (!teamBox || !playerId) return null;
        const entry = teamBox.lineup?.find((b: any) => b.playerId === playerId);
        if (!entry) return null;

        let extras = [];
        if (entry.h2 > 0) extras.push(`2B: ${entry.h2}`);
        if (entry.h3 > 0) extras.push(`3B: ${entry.h3}`);
        if (entry.hr > 0) extras.push(`HR: ${entry.hr}`);
        let extraStr = extras.length > 0 ? ` | ${extras.join(' ')}` : '';

        const avg = entry.atBats > 0 ? (entry.hits / entry.atBats).toFixed(3) : '.000';
        return `AVG: ${avg} | ${entry.hits}-${entry.atBats} | RBI: ${entry.rbi}${extraStr}`;
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="animate-pulse">Cargando Resumen Oficial...</div></div>;

    const winningPitcher = gameData?.winningPitcher;
    const losingPitcher = gameData?.losingPitcher;
    const savePitcher = gameData?.savePitcher;
    const mvpBatter1 = gameData?.mvpBatter1;
    const mvpBatter2 = gameData?.mvpBatter2;

    const getPitcherStats = (pitcher: any) => {
        if (!boxscore || !pitcher) return 'IP: 0.0 | K: 0 | BB: 0';
        const homeEntry = boxscore.homeTeam.lineup?.find((b: any) => b.playerId === pitcher.id);
        const awayEntry = boxscore.awayTeam.lineup?.find((b: any) => b.playerId === pitcher.id);
        const entry = homeEntry || awayEntry;
        if (!entry) return 'IP: 0.0 | K: 0 | BB: 0';
        const ipOuts = entry.pitchingIPOuts || 0;
        const ipStr = `${Math.floor(ipOuts / 3)}.${ipOuts % 3}`;
        return `IP: ${ipStr} | K: ${entry.pitchingSO || 0} | BB: ${entry.pitchingBB || 0}`;
    };

    const wpStats = getPitcherStats(winningPitcher);
    const lpStats = getPitcherStats(losingPitcher);
    const svStats = getPitcherStats(savePitcher);

    const transitionClasses = `transition-all duration-700 transform ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center">
                {/* ═══ HEADER SCOREBOARD ═══ */}
                <div className={`w-full max-w-[1400px] mt-4 px-4 hidden md:block ${transitionClasses}`}>
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors mb-2">
                        <ChevronLeft className="w-4 h-4" /> Volver al Torneo
                    </button>
                </div>

                <div className={`w-full max-w-[1400px] px-2 md:px-4 py-2 ${transitionClasses}`}>
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl flex items-center justify-between">
                        {/* Away Team */}
                        <div className="flex items-center gap-3 md:gap-4 flex-1">
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-800 border-[1.5px] border-slate-700 flex items-center justify-center text-lg font-black shrink-0">
                                {(boxscore?.awayTeam as any)?.logoUrl ? <img src={(boxscore?.awayTeam as any).logoUrl} alt="V" className="w-full h-full object-cover rounded-full p-0.5" /> : (awayTeamName?.substring(0, 2) || 'V')}
                            </div>
                            <div>
                                <h2 className="text-base md:text-xl font-heading font-black text-white">{awayTeamName || 'Visitante'}</h2>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest hidden md:block">Visitante</p>
                            </div>
                        </div>

                        {/* Score & Final */}
                        <div className="flex items-center gap-4 md:gap-8 shrink-0">
                            <span className="text-3xl md:text-5xl font-heading font-black tabular-nums">{awayScore}</span>
                            <div className="flex flex-col items-center">
                                <span className="text-xs md:text-sm font-black text-slate-500 tracking-[0.2em] uppercase mb-1">FINAL</span>
                                <div className="w-8 md:w-12 h-1 bg-slate-800 rounded-full" />
                            </div>
                            <span className="text-3xl md:text-5xl font-heading font-black tabular-nums">{homeScore}</span>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center gap-3 md:gap-4 flex-1 justify-end text-right">
                            <div>
                                <h2 className="text-base md:text-xl font-heading font-black text-white">{homeTeamName || 'Local'}</h2>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest hidden md:block">Local</p>
                            </div>
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-800 border-[1.5px] border-slate-700 flex items-center justify-center text-lg font-black shrink-0">
                                {(boxscore?.homeTeam as any)?.logoUrl ? <img src={(boxscore?.homeTeam as any).logoUrl} alt="L" className="w-full h-full object-cover rounded-full p-0.5" /> : (homeTeamName?.substring(0, 2) || 'L')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ MAIN LAYOUT GRIDS ═══ */}
                <div className={`w-full max-w-[1400px] px-2 md:px-4 py-4 md:py-4 grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-4 ${transitionClasses}`} style={{ transitionDelay: '100ms' }}>

                    {/* LEFT 3/8: FIELD VIEW */}
                    <div className="lg:col-span-6 bg-slate-900 border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 md:p-4 shadow-xl flex flex-col w-full h-full min-h-[400px]">
                        <div className=" flex items-center justify-between mb-1 bg-slate-950 rounded-xl p-1 shadow-inner">
                            <button onClick={() => setFieldView('away')} className={`flex-1 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${fieldView === 'away' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                Defensiva {awayTeamName?.substring(0, 3)}
                            </button>
                            <button onClick={() => setFieldView('home')} className={`flex-1 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${fieldView === 'home' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                Defensiva {homeTeamName?.substring(0, 3)}
                            </button>
                        </div>
                        <div className="w-full flex-1 md:max-w-[655px] md:max-h-[655px] mx-auto bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/80 shadow-inner p-1 sm:p-2">
                            <Field
                                readOnly
                                forceStoreData={{
                                    bases: { first: null, second: null, third: null },
                                    half: fieldView === 'home' ? 'top' : 'bottom',
                                    homeLineup: homeLineup,
                                    awayLineup: awayLineup
                                }}
                            />
                        </div>
                    </div>

                    {/* MIDDLE 3/8: MVP STATS */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <MvpCard
                            label={<><Trophy className="w-3.5 h-3.5 inline mr-1" /> PITCHER GANADOR (W)</>}
                            player={winningPitcher}
                            statsStr={wpStats}
                            colorType="amber"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <MvpCard
                                label="PITCHER PERDEDOR (L)"
                                player={losingPitcher}
                                statsStr={lpStats}
                                colorType="red"
                            />
                            <MvpCard
                                label="PITCHER SALVADO (SV)"
                                player={savePitcher}
                                statsStr={svStats}
                                colorType="green"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <MvpCard
                                label="MVP BATEADOR 1"
                                player={mvpBatter1}
                                statsStr={mvpBatter1 ? (getBatterStats(mvpBatter1.id, boxscore?.homeTeam) || getBatterStats(mvpBatter1.id, boxscore?.awayTeam) || 'Sin datos al bate') : '-'}
                                colorType="blue"
                            />
                            <MvpCard
                                label="MVP BATEADOR 2"
                                player={mvpBatter2}
                                statsStr={mvpBatter2 ? (getBatterStats(mvpBatter2.id, boxscore?.homeTeam) || getBatterStats(mvpBatter2.id, boxscore?.awayTeam) || 'Sin datos al bate') : '-'}
                                colorType="blue"
                            />
                        </div>
                    </div>

                    {/* RIGHT 2/8: PLAY BY PLAY HISTORIC LOG */}
                    <div className="lg:col-span-3 bg-slate-900 border border-slate-700/50 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-xl flex flex-col h-[400px] lg:h-[auto] min-h-[400px] lg:max-h-[728px] overflow-hidden">
                        <div className="flex-1 -mx-2 h-full">
                            <PlayByPlayLog />
                        </div>
                    </div>
                </div>

                {/* ═══ BOXSCORE SECTION ═══ */}
                <div className={`w-full max-w-[1400px] px-2 md:px-4 py-4 pb-12 ${transitionClasses}`} style={{ transitionDelay: '200ms' }}>
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl">
                        <h3 className="text-base md:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4 md:mb-6 border-b border-slate-800 pb-4">
                            <Trophy className="w-5 h-5 text-amber-500" /> Resumen Oficial (Boxscore)
                        </h3>
                        {boxscore && (
                            <div className="flex flex-col gap-10 overflow-x-auto w-full">
                                <ScorebookTable teamBoxscore={boxscore.awayTeam} />
                                <ScorebookTable teamBoxscore={boxscore.homeTeam} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function MvpCard({ label, player, statsStr, colorType }: { label: React.ReactNode, player: any, statsStr: string, colorType: 'amber' | 'blue' | 'red' | 'green' }) {
    const fName = player?.first_name || player?.firstName || '';
    const lName = player?.last_name || player?.lastName || '';
    const nameStr = `${fName} ${lName}`.trim();
    const avatarSeed = nameStr ? nameStr.replace(/\s+/g, '').toLowerCase() : 'default';
    const finalAvatarUrl = player?.photo_url || player?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`;

    const colorMap = {
        amber: { border: 'border-amber-500/60', bg: 'bg-amber-950/30', label: 'text-amber-400', gradient: 'bg-gradient-to-r from-amber-500 to-amber-600' },
        blue:  { border: 'border-sky-500/60',   bg: 'bg-sky-950/30',   label: 'text-sky-400',   gradient: 'bg-gradient-to-r from-sky-500 to-sky-600' },
        red:   { border: 'border-red-500/60',    bg: 'bg-red-950/30',   label: 'text-red-400',   gradient: 'bg-gradient-to-r from-red-600 to-red-700' },
        green: { border: 'border-emerald-500/60',bg: 'bg-emerald-950/30',label: 'text-emerald-400',gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
    };
    const { border: borderColor, bg: bgColor, label: labelColor, gradient } = colorMap[colorType];

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg w-full overflow-hidden flex flex-col items-center justify-center p-4 transition-all hover:border-slate-600 h-full relative">
            <div className={`h-1 w-full absolute top-0 inset-x-0 ${gradient}`} />
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 p-0.5 flex items-center justify-center mt-2 mb-3 ${borderColor} ${bgColor}`}>
                <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden relative border border-slate-700 flex items-center justify-center">
                    {player ? (
                        <img src={finalAvatarUrl} alt="MVP" className="w-full h-full object-cover" />
                    ) : (
                        <Trophy className="w-6 h-6 text-slate-600" />
                    )}
                </div>
            </div>
            <h4 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${labelColor} flex items-center justify-center w-full`}>
                {label}
            </h4>
            <span className="font-heading text-white font-extrabold text-base sm:text-lg mb-2 text-center leading-tight">
                {nameStr || 'Sin Decisión'}
            </span>
            <div className="w-full pt-3 pb-1 border-t border-slate-800/60 flex flex-wrap justify-center gap-x-3 gap-y-1 mt-auto">
                {statsStr.split('|').map((s: string, i: number) => (
                    <span key={i} className="text-slate-300 font-mono text-[10px] sm:text-xs font-bold tracking-tight bg-slate-950/50 px-2 py-0.5 rounded shadow-sm">{s.trim()}</span>
                ))}
            </div>
        </div>
    );
}
