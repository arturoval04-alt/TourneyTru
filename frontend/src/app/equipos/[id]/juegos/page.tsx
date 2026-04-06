"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import api from "@/lib/api";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Trophy } from "lucide-react";

interface GameRecord {
    id: string;
    homeScore: number;
    awayScore: number;
    currentInning?: number;
    half?: string;
    scheduledDate: string;
    status: string;
    location?: string;
    round?: string;
    homeTeam?: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number };
    awayTeam?: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number };
    winningPitcher?: { firstName: string; lastName: string; photoUrl?: string };
    mvpBatter1?: { firstName: string; lastName: string; photoUrl?: string };
    mvpBatter2?: { firstName: string; lastName: string; photoUrl?: string };
}

interface TeamData {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    gamesAsHome: GameRecord[];
    gamesAsAway: GameRecord[];
}

export default function TeamGamesHistoryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const teamId = params.id as string;
    const initialTab = searchParams.get('tab') || 'recientes';

    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'recientes' | 'programados'>(initialTab as any);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const response = await api.get(`/teams/${teamId}`);
                setTeam(response.data);
            } catch (error) {
                console.error("Error fetching team games:", error);
            } finally {
                setLoading(false);
            }
        };

        if (teamId) {
            fetchTeamData();
        }
    }, [teamId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-black mb-4">Equipo no encontrado</h2>
                <Link href="/equipos">
                    <button className="px-6 py-2 bg-primary text-white rounded-lg font-bold">Volver al Directorio</button>
                </Link>
            </div>
        );
    }

    const allGames = [...(team.gamesAsHome || []), ...(team.gamesAsAway || [])].sort(
        (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );

    const recentGames = allGames.filter(g => g.status === 'in_progress' || g.status === 'finished');
    const scheduledGames = allGames.filter(g => g.status === 'scheduled');

    const renderRecentGames = () => {
        if (recentGames.length === 0) {
            return (
                <div className="bg-surface border border-muted/30 rounded-xl p-8 text-center text-muted-foreground font-medium text-sm">
                    No hay partidos recientes registrados.
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {recentGames.map(game => {
                    const isHome = game.homeTeam?.id === team.id;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const teamScore = isHome ? game.homeScore : game.awayScore;
                    const opponentScore = isHome ? game.awayScore : game.homeScore;

                    let winStatus: 'win' | 'loss' | 'tie' | 'live' = 'live';
                    if (game.status === 'finished') {
                        if (teamScore! > opponentScore!) winStatus = 'win';
                        else if (teamScore! < opponentScore!) winStatus = 'loss';
                        else winStatus = 'tie';
                    }

                    // Background gradient based on status
                    let bgGradient = 'bg-surface';
                    let borderClass = 'border-muted/30';

                    if (winStatus === 'win') {
                        bgGradient = 'bg-gradient-to-br from-emerald-500/30 to-surface hover:-translate-y-1.5 transition-transform duration-300';
                        borderClass = 'border-emerald-500/30';
                    } else if (winStatus === 'loss') {
                        bgGradient = 'bg-gradient-to-br from-red-500/30 to-surface hover:-translate-y-1.5 transition-transform duration-300';
                        borderClass = 'border-red-500/30';
                    } else if (winStatus === 'tie') {
                        bgGradient = 'bg-gradient-to-br from-amber-500/30 to-surface hover:-translate-y-1.5 transition-transform duration-300';
                        borderClass = 'border-amber-500/30';
                    } else if (winStatus === 'live') {
                        bgGradient = 'bg-gradient-to-br from-blue-500/30 to-surface hover:-translate-y-1.5 transition-transform duration-300';
                        borderClass = 'border-blue-500/30';
                    }

                    return (
                        <div key={game.id} className={`${bgGradient} border ${borderClass} rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow relative`}>
                            {game.status === 'in_progress' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                            )}

                            {/* Game Header */}
                            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                                <div className="text-xs font-bold opacity-70 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} &bull; {new Date(game.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-sm font-bold opacity-50 capitalize flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {game.location || 'Sede Local'}
                                </div>
                            </div>

                            {/* Game Body */}
                            <div className="p-4 md:p-6 flex flex-col sm:flex-row gap-4 items-center flex-1">
                                {/* Score & Logos Section */}
                                <div className="flex-1 w-full flex items-center justify-between px-2">
                                    {/* Team A (Away) */}
                                    <Link href={`/equipos/${game.awayTeam?.id}`} className="flex flex-col items-center gap-2 flex-1 relative z-10 w-24 group hover:-translate-y-1 transition-transform">
                                        <div className="w-14 h-14 md:w-20 md:h-20 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-2xl shrink-0 group-hover:border-primary/50 transition-colors">
                                            {game.awayTeam?.logoUrl ? <img src={game.awayTeam.logoUrl} alt="A" className="w-full h-full object-cover" /> : game.awayTeam?.shortName || game.awayTeam?.name?.substring(0, 2)}
                                        </div>
                                        <span className="text-[10px] md:text-sm font-black text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{game.awayTeam?.name}</span>
                                    </Link>

                                    {/* Score Indicator */}
                                    <div className="flex flex-col items-center justify-center flex-shrink-0 px-2 md:px-6 relative z-10">
                                        {game.status === 'in_progress' && (
                                            <span className="text-[10px] font-black tracking-widest uppercase text-red-500 animate-pulse mb-1 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> EN VIVO
                                            </span>
                                        )}
                                        <div className="bg-surface/60 backdrop-blur-md border border-muted/20 px-4 py-2 rounded-2xl">
                                            <div className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter text-foreground text-center drop-shadow-sm flex items-center justify-center gap-3">
                                                <span className={!isHome && winStatus === 'win' ? 'text-emerald-500' : ''}>{game.awayScore ?? '-'}</span>
                                                <span className="text-muted-foreground/30 font-light text-2xl md:text-4xl">-</span>
                                                <span className={isHome && winStatus === 'win' ? 'text-emerald-500' : ''}>{game.homeScore ?? '-'}</span>
                                            </div>
                                        </div>
                                        {game.status === 'finished' && (
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 bg-muted/10 px-2 py-0.5 rounded">Finalizado</span>
                                        )}
                                    </div>

                                    {/* Team B (Home) */}
                                    <Link href={`/equipos/${game.homeTeam?.id}`} className="flex flex-col items-center gap-2 flex-1 relative z-10 w-24 group hover:-translate-y-1 transition-transform">
                                        <div className="w-14 h-14 md:w-20 md:h-20 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-2xl shrink-0 group-hover:border-primary/50 transition-colors">
                                            {game.homeTeam?.logoUrl ? <img src={game.homeTeam.logoUrl} alt="H" className="w-full h-full object-cover" /> : game.homeTeam?.shortName || game.homeTeam?.name?.substring(0, 2)}
                                        </div>
                                        <span className="text-[10px] md:text-sm font-black text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{game.homeTeam?.name}</span>
                                    </Link>
                                </div>

                                {/* Info & Divider */}
                                <div className="max-sm:w-full max-sm:h-px sm:w-px sm:h-24 bg-black/10 dark:bg-white/10 my-2 sm:my-0 sm:mx-2 block"></div>

                                {/* Stats & Actions Area */}
                                <div className="flex w-full sm:w-32 flex-col justify-between items-center sm:items-end shrink-0 gap-3">

                                    {/* Highlights area */}
                                    <div className="flex flex-col gap-1.5 items-center sm:items-end w-full">
                                        {winStatus === 'live' ? (
                                            <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded w-full text-center sm:text-right border border-red-500/20">
                                                {game.half === 'top' ? 'Alta' : 'Baja'} {game.currentInning}
                                            </span>
                                        ) : game.status === 'finished' ? (
                                            <>
                                                {game.winningPitcher ? (
                                                    <div className="flex items-center gap-1.5 text-[10px] md:text-sm bg-amber-500/10 px-2 py-1 rounded w-full sm:w-auto sm:justify-end border border-amber-500/20">
                                                        <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                                                        <span className="font-bold text-amber-600 dark:text-amber-400 capitalize truncate w-full sm:w-auto">{game.winningPitcher.firstName.charAt(0) + '. ' + game.winningPitcher.lastName}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-muted-foreground italic h-[22px]"></div>
                                                )}

                                                <div className="flex items-center sm:mt-0 md:mt-2 gap-3 justify-center sm:justify-end md:justify-center w-full">
                                                    {(game.mvpBatter1 || game.mvpBatter2) && (
                                                        <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">MVP</span>
                                                    )}
                                                    {game.mvpBatter1 && (
                                                        <div className="w-6 h-6 md:w-12 md:h-12 rounded-full bg-surface border border-blue-400 overflow-hidden" title={game.mvpBatter1.firstName + ' ' + game.mvpBatter1.lastName}>
                                                            <img src={game.mvpBatter1.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.mvpBatter1.firstName}`} alt="MVP" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    {game.mvpBatter2 && (
                                                        <div className="w-6 h-6 md:w-12 md:h-12 rounded-full bg-surface border border-blue-400 overflow-hidden" title={game.mvpBatter2.firstName + ' ' + game.mvpBatter2.lastName}>
                                                            <img src={game.mvpBatter2.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.mvpBatter2.firstName}`} alt="MVP2" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    {!(game.mvpBatter1 || game.mvpBatter2) && (
                                                        <div className="h-8 md:h-8 w-full"></div>
                                                    )}
                                                </div>
                                            </>
                                        ) : null}
                                    </div>

                                    {/* Main button */}
                                    <Link href={game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`} className="w-full">
                                        <button className={`w-full px-4 py-2.5 text-[10px] md:text-xs font-black rounded-lg uppercase tracking-widest transition shadow-sm border ${winStatus === 'live' ? 'bg-red-600 hover:bg-red-500 text-white border-red-500' : 'bg-surface hover:bg-muted/5 border-muted/30 text-foreground hover:border-primary/50'
                                            }`}>
                                            {winStatus === 'live' ? 'Ver en Vivo' : 'Boxscore'}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderScheduledGames = () => {
        if (scheduledGames.length === 0) {
            return (
                <div className="bg-surface border border-muted/30 rounded-xl p-8 text-center text-muted-foreground font-medium text-sm">
                    No hay partidos programados próximamente.
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {scheduledGames.map(game => (
                    <div key={game.id} className="bg-surface hover:-translate-y-1.5 transition-transform duration-300 hover:bg-gradient-to-br hover:from-muted/50 hover:to-transparent border border-muted/20 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-primary/40 transition-colors">
                        {/* Schedule Header */}
                        <div className="px-5 py-3 border-b border-muted/20 flex justify-between items-center bg-muted/5 gap-2">
                            <div className="text-[10px] md:text-xs font-black tracking-widest uppercase text-muted-foreground w-1/3 text-left">
                                JDA {game.round || '-'}
                            </div>
                            <div className="text-[10px] md:text-xs font-bold font-mono opacity-80 flex items-center justify-center gap-2 w-1/3">
                                {new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} <span className="opacity-50">|</span> {new Date(game.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate w-1/3 text-right">
                                {game.location || 'Sede Local'}
                            </div>
                        </div>

                        {/* Schedule Body */}
                        <div className="p-4 md:p-6 flex justify-between items-center relative">
                            {/* Team Away */}
                            <Link href={`/equipos/${game.awayTeam?.id}`} className="flex flex-col items-center gap-3 w-5/12 z-10 group hover:-translate-y-1 transition-transform">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-surface rounded-2xl md:rounded-3xl shadow flex items-center justify-center border-2 border-muted/10 overflow-hidden font-black text-xl group-hover:border-primary/50 transition-colors">
                                    {game.awayTeam?.logoUrl ? <img src={game.awayTeam.logoUrl} alt="A" className="w-full h-full object-cover" /> : game.awayTeam?.shortName || game.awayTeam?.name?.substring(0, 2)}
                                </div>
                                <div className="text-center w-full">
                                    <span className="text-xs md:text-sm font-black line-clamp-2 md:line-clamp-1 h-8 md:h-auto group-hover:text-primary transition-colors">{game.awayTeam?.name}</span>
                                    <span className="text-[10px] inline-flex items-center gap-1 text-muted-foreground font-bold mt-1 bg-muted/10 px-2 py-0.5 rounded-full border border-muted/20">
                                        {game.awayTeam?.wins}G - {game.awayTeam?.losses}P
                                    </span>
                                </div>
                            </Link>

                            {/* VS Badge */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                <div className="text-4xl md:text-6xl font-black italic text-muted-foreground/10 select-none">VS</div>
                                <div className="absolute font-black text-2xl md:text-3xl text-red-500 drop-shadow-md italic pr-1 tracking-tighter mix-blend-mode-multiply dark:mix-blend-screen">VA</div>
                            </div>

                            {/* Team Home */}
                            <Link href={`/equipos/${game.homeTeam?.id}`} className="flex flex-col items-center gap-3 w-5/12 z-10 group hover:-translate-y-1 transition-transform">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-surface rounded-2xl md:rounded-3xl shadow flex items-center justify-center border-2 border-muted/10 overflow-hidden font-black text-xl group-hover:border-primary/50 transition-colors">
                                    {game.homeTeam?.logoUrl ? <img src={game.homeTeam.logoUrl} alt="H" className="w-full h-full object-cover" /> : game.homeTeam?.shortName || game.homeTeam?.name?.substring(0, 2)}
                                </div>
                                <div className="text-center w-full">
                                    <span className="text-xs md:text-sm font-black line-clamp-2 md:line-clamp-1 h-8 md:h-auto group-hover:text-primary transition-colors">{game.homeTeam?.name}</span>
                                    <span className="text-[10px] inline-flex items-center gap-1 text-muted-foreground font-bold mt-1 bg-muted/10 px-2 py-0.5 rounded-full border border-muted/20">
                                        {game.homeTeam?.wins}G - {game.homeTeam?.losses}P
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24">
            <Navbar />

            <main className="max-w-7xl mx-auto md:px-4 md:py-8 animate-fade-in-up">
                {/* Header Back Button */}
                <div className="mb-6 px-4 md:px-0">
                    <Link href={`/equipos/${team.id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        Volver al Perfil del Equipo
                    </Link>
                </div>

                {/* Team Info Banner */}
                <div className="bg-[#1f2937] p-6 rounded-2xl flex items-center gap-6 shadow-md mb-8 mx-4 md:mx-0">
                    <div className="w-20 h-20 bg-red-600 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border-2 border-[#1f2937]/50">
                        {team.logoUrl ? (
                            <img src={team.logoUrl} alt="Team Logo" className="w-full h-full object-contain bg-white" />
                        ) : (
                            <span className="font-black text-white text-2xl">{team.shortName || team.name.substring(0,2)}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{team.name}</h1>
                        <span className="text-white/70 font-bold uppercase tracking-widest text-xs">Historial de Partidos</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-muted/20 mb-8 mx-4 md:mx-0">
                    <button 
                        onClick={() => setActiveSubTab('recientes')}
                        className={`py-3 px-6 font-black uppercase tracking-widest text-sm transition-colors ${activeSubTab === 'recientes' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Recientes ({recentGames.length})
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('programados')}
                        className={`py-3 px-6 font-black uppercase tracking-widest text-sm transition-colors ${activeSubTab === 'programados' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Programados ({scheduledGames.length})
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 md:px-0">
                    {activeSubTab === 'recientes' ? renderRecentGames() : renderScheduledGames()}
                </div>
            </main>
        </div>
    );
}
