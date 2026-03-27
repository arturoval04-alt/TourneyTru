"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { getUser } from '@/lib/auth';
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
    Settings, Share2, ArrowLeft, Users, Trophy, Flag, MapPin, ExternalLink, Clock, Star, Activity, X, CheckCircle
} from "lucide-react";
import PlayerHoverCard from "@/components/PlayerHoverCard";
import ImageUploader from "@/components/ui/ImageUploader";

interface BattingStats {
    games: number; atBats: number; runs: number; hits: number; h2: number; h3: number; hr: number; rbi: number; bb: number; so: number; hbp: number; sac: number;
    avg: string; obp: string; slg: string; ops: string;
}

interface PitchingStats {
    games: number; wins: number; losses: number; ip: number; h: number; r: number; er: number; bb: number; so: number; era: string; whip: string;
}

interface PlayerItem {
    id: string;
    firstName: string;
    lastName: string;
    number?: number;
    position?: string;
    bats?: string;
    throws?: string;
    photoUrl?: string;
    stats?: { batting: BattingStats; pitching: PitchingStats };
}

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
    winningPitcher?: { id: string; firstName: string; lastName: string; photoUrl?: string };
    mvpBatter1?: { id: string; firstName: string; lastName: string; photoUrl?: string };
    mvpBatter2?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

interface TeamData {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    managerName?: string;
    tournament?: { id: string; name: string; category?: string };
    players: PlayerItem[];
    wins: number;
    losses: number;
    gamesPlayed: number;
    gamesAsHome: GameRecord[];
    gamesAsAway: GameRecord[];
    homeFieldId?: string;
    stats?: { batting: BattingStats; pitching: PitchingStats };
}

export default function TeamProfilePage() {
    const params = useParams();
    const teamId = params.id as string;

    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"juegos" | "jugadores" | "estadisticas">("juegos");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null);

    const [statsType, setStatsType] = useState<"bateo" | "pitcheo">("bateo");

    const router = useRouter();

    const [userRole, setUserRole] = useState<string | null>(null);
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    // Profile Editing State (Team)
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        shortName: '',
        managerName: '',
        logoUrl: '',
        homeFieldId: ''
    });

    // Player Editing State
    const [isEditingPlayer, setIsEditingPlayer] = useState(false);
    const [playerForm, setPlayerForm] = useState({
        firstName: '',
        lastName: '',
        number: '',
        position: '',
        bats: 'R',
        throws: 'R',
        photoUrl: ''
    });

    useEffect(() => {
        const user = getUser();
        setUserRole(user?.role || 'general');
    }, []);

    useEffect(() => {
        if (team) {
            setProfileForm({
                name: team.name,
                shortName: team.shortName || '',
                managerName: team.managerName || '',
                logoUrl: team.logoUrl || '',
                homeFieldId: team.homeFieldId || ''
            });
        }
    }, [team]);

    useEffect(() => {
        if (selectedPlayer) {
            setPlayerForm({
                firstName: selectedPlayer.firstName,
                lastName: selectedPlayer.lastName,
                number: selectedPlayer.number?.toString() || '',
                position: selectedPlayer.position || '',
                bats: selectedPlayer.bats || 'R',
                throws: selectedPlayer.throws || 'R',
                photoUrl: selectedPlayer.photoUrl || ''
            });
        }
    }, [selectedPlayer]);

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/players/${selectedPlayer?.id}`, {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                number: playerForm.number ? parseInt(playerForm.number) : null,
                position: playerForm.position,
                bats: playerForm.bats,
                throws: playerForm.throws,
                photoUrl: playerForm.photoUrl
            });

            alert('Información del Jugador Actualizada');
            setIsEditingPlayer(false);
            setSelectedPlayer(null);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar jugador');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/teams/${teamId}`, {
                name: profileForm.name,
                shortName: profileForm.shortName,
                managerName: profileForm.managerName,
                logoUrl: profileForm.logoUrl,
                homeFieldId: profileForm.homeFieldId || null
            });

            alert('Perfil del Equipo Actualizado');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };


    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const { data } = await api.get(`/teams/${teamId}`);
                setTeam(data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchTeamData();
    }, [teamId]);

    const tabs = [
        { id: "juegos", label: "JUEGOS" },
        { id: "jugadores", label: "JUGADORES" },
        { id: "estadisticas", label: "ESTADÍSTICAS" }
    ] as const;

    const allGames = [...(team?.gamesAsHome || []), ...(team?.gamesAsAway || [])].sort(
        (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-8">
                    <div className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse" />
                </main>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-8 text-center">
                    <p className="text-muted-foreground">Equipo no encontrado.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24 relative">

            {/* Copied Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-24 right-4 md:right-8 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl font-bold text-sm z-50 animate-fade-in-up flex items-center gap-2 border border-emerald-400/50">
                    <CheckCircle className="w-5 h-5" />
                    Perfil copiado al portapapeles
                </div>
            )}

            <Navbar />

            <main className="max-w-7xl mx-auto md:px-1 py-4 px-1 md:py-6 animate-fade-in-up">

                {/* Header Section (Unified Container) */}
                <div className="bg-surface border border-muted/30 md:rounded-xl overflow-hidden shadow-md mb-8 flex flex-col relative animate-fade-in-up">

                    {/* Top Banner (Participating In...) */}
                    <div className="bg-[#1a2d42] text-white py-12 md:py-24 px-6 md:px-8 text-center pl-6 md:pl-80 relative">
                        <div className="text-[10px] md:text-sm text-center md:text-left md:pl-60 font-black tracking-widest uppercase text-white/70 mb-1">Participando En:</div>
                        <h1 className="text-xl md:text-4xl font-black italic tracking-tighter uppercase drop-shadow-md flex flex-wrap items-center justify-center md:justify-start gap-2">
                            "{team.tournament?.name || 'Amistoso'}"
                            {team.tournament?.id && (
                                <Link href={`/torneos/${team.tournament.id}`} className="hover:text-blue-300 transition-colors">
                                    <ExternalLink className="w-5 h-5 md:w-6 md:h-6" />
                                </Link>
                            )}
                        </h1>
                    </div>

                    {/* Main Info Row (Grey Section) */}
                    <div className="bg-[#2a303c] p-5 md:pt-1 pt-24 flex flex-col md:flex-row items-center md:items-start gap-4 relative z-10">
                        {/* Logo Overlapping */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-8 w-32 h-32 md:w-56 md:h-56 bg-white rounded-lg md:rounded-2xl border-4 border-[#2a303c] shadow-xl overflow-hidden flex items-center justify-center shrink-0 text-[#2a303c] font-black text-4xl z-20">
                            {team.logoUrl ? (
                                <img src={team.logoUrl} alt="Team Logo" className="w-full h-full object-contain" />
                            ) : (
                                team.shortName || team.name.substring(0, 2).toUpperCase()
                            )}
                        </div>

                        {/* Share button next to logo on mobile */}
                        <div className="absolute top-20 right-4 md:hidden flex gap-2 z-30">
                            {userRole === 'admin' && (
                                <button onClick={() => setIsEditingProfile(true)} className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center transition-colors shrink-0 text-white/70" title="Configuración">
                                    <Settings className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setShowCopiedToast(true);
                                setTimeout(() => setShowCopiedToast(false), 2000);
                            }} className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center transition-colors shrink-0 text-white" title="Compartir Perfil">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 flex flex-col items-center md:items-start md:ml-64 w-full text-center md:text-left">
                            <div className="flex flex-col md:flex-row justify-between w-full md:items-start gap-2">
                                <div className="space-y-1">
                                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-1 tracking-tight">{team.name}</h1>
                                    <div className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {team.tournament?.category || team.tournament?.name || 'SEMIRÁPIDA'}
                                    </div>
                                </div>

                                {/* Desktop-only share buttons */}
                                <div className="hidden md:flex justify-end gap-3 shrink-0">
                                    {userRole === 'admin' && (
                                        <button onClick={() => setIsEditingProfile(true)} className="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 text-white/70 hover:text-white" title="Configuración">
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        setShowCopiedToast(true);
                                        setTimeout(() => setShowCopiedToast(false), 2000);
                                    }} className="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 text-white" title="Compartir Perfil">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Line Divider */}
                            <div className="w-full h-px bg-white/10 my-1 md:my-3"></div>

                            {/* Informacion Grid */}
                            <h3 className="text-white/70 font-bold text-xs mt-0 mb-3 tracking-widest uppercase text-center md:text-left">Información</h3>
                            <div className="grid grid-cols-3 md:flex md:flex-wrap items-center justify-center md:justify-start gap-3 md:gap-14 w-full">
                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 group bg-white/5 px-2 py-2 md:px-4 border border-white/10 rounded-xl md:bg-transparent md:border-none md:p-0 justify-center md:justify-start">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition-colors border border-white/5">
                                        <Users className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div className="text-center md:text-left">
                                        <p className="text-[9px] md:text-[10px] text-white/50 font-black uppercase tracking-wider mb-0.5">ROSTER</p>
                                        <p className="text-xs md:text-sm font-medium text-white">{team.players?.length || 0} Jugadores</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 group bg-white/5 px-2 py-2 md:px-4 border border-white/10 rounded-xl md:bg-transparent md:border-none md:p-0 justify-center md:justify-start">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 group-hover:bg-slate-300 group-hover:text-[#1f2937] transition-colors border border-white/5">
                                        <Flag className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div className="text-center md:text-left w-full overflow-hidden">
                                        <p className="text-[9px] md:text-[10px] text-white/50 font-black uppercase tracking-wider mb-0.5">MANAGER</p>
                                        <p className="text-xs md:text-sm font-medium text-white line-clamp-1">{team.managerName || 'Sin asignar'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 group bg-white/5 px-2 py-2 md:px-4 border border-white/10 rounded-xl md:bg-transparent md:border-none md:p-0 justify-center md:justify-start">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-[#1f2937] transition-colors border border-white/5">
                                        <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div className="text-center md:text-left">
                                        <p className="text-[9px] md:text-[10px] text-white/50 font-black uppercase tracking-wider mb-0.5">RÉCORD</p>
                                        <p className="text-xs md:text-sm font-medium text-white">{team.wins}G - {team.losses}P</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Subnavigation Area */}
                    <div className="w-full bg-[#2a303c] border-t border-black/20 flex flex-wrap justify-center px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex px-4 pt-1 w-full max-w-2xl mx-auto md:ml-64 gap-2 md:gap-8 justify-center">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 sm:px-8 py-4 text-xs md:text-sm font-black uppercase whitespace-nowrap transition-colors duration-200 tracking-widest ${activeTab === tab.id
                                        ? 'text-white border-b-2 border-white drop-shadow-sm'
                                        : 'text-white/40 hover:text-white/80 border-b-2 border-transparent'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content Rendering */}
                <div className="space-y-6 px-0 animate-fade-in-up">

                    {/* JUEGOS TAB */}
                    {activeTab === 'juegos' && (() => {
                        const recentGames = allGames.filter(g => g.status === 'in_progress' || g.status === 'finished');
                        const scheduledGames = allGames.filter(g => g.status === 'scheduled');

                        return (
                            <div className="animate-fade-in-up space-y-12">
                                {/* RECENT GAMES (In Progress + Finished) */}
                                <div>
                                    <div className="flex justify-between items-center mb-6 pl-2 border-l-4 border-primary">
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">
                                            Partidos Recientes
                                        </h3>
                                        {recentGames.length > 0 && (
                                            <Link href={`/equipos/${team.id}/juegos?tab=recientes`} className="text-xs md:text-sm font-bold text-primary hover:text-white transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                Ver más
                                            </Link>
                                        )}
                                    </div>
                                    {recentGames.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-xl p-8 text-center text-muted-foreground font-medium text-sm">
                                            No hay partidos recientes registrados.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 ">
                                            {recentGames.slice(0, 4).map(game => {
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
                                                    <div key={game.id} onClick={() => router.push(`/gamecast/${game.id}`)} className={`${bgGradient} border ${borderClass} rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow relative cursor-pointer`}>
                                                        {game.status === 'in_progress' && (
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                                                        )}

                                                        {/* Game Header */}
                                                        <div className="px-4 py-1 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
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
                                                        <div className="flex flex-col flex-1">
                                                            {/* Score & Logos Section */}
                                                            <div className="p-4 md:p-6 flex items-center justify-between px-4 md:px-6">
                                                                {/* Team A (Away) */}
                                                                <Link href={`/equipos/${game.awayTeam?.id}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2 flex-1 relative z-10 w-24 group hover:-translate-y-1 transition-transform">
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
                                                                <Link href={`/equipos/${game.homeTeam?.id}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2 flex-1 relative z-10 w-24 group hover:-translate-y-1 transition-transform">
                                                                    <div className="w-14 h-14 md:w-20 md:h-20 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-2xl shrink-0 group-hover:border-primary/50 transition-colors">
                                                                        {game.homeTeam?.logoUrl ? <img src={game.homeTeam.logoUrl} alt="H" className="w-full h-full object-cover" /> : game.homeTeam?.shortName || game.homeTeam?.name?.substring(0, 2)}
                                                                    </div>
                                                                    <span className="text-[10px] md:text-sm font-black text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{game.homeTeam?.name}</span>
                                                                </Link>
                                                            </div>

                                                            {/* Bottom Stats Bar */}
                                                            <div className="flex border-t border-black/10 dark:border-white/10">
                                                                <div className="flex-1 p-3 md:p-4 flex items-center gap-3 md:gap-4">
                                                                    {winStatus === 'live' ? (
                                                                        <>
                                                                            {/* Live: Current inning info */}
                                                                            <div className="flex items-center gap-2 w-full">
                                                                                <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 animate-pulse">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                                    {game.half === 'top' ? 'Alta' : 'Baja'} {game.currentInning || 1}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : game.status === 'finished' ? (
                                                                        <>
                                                                            {/* Winning Pitcher Section */}
                                                                            <div className="flex-1 flex items-center justify-start">
                                                                                {game.winningPitcher && (
                                                                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                                        <Link href={`/jugadores/${game.winningPitcher.id}`}>
                                                                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-amber-500/50 overflow-hidden shadow-md shrink-0 hover:border-amber-400 transition-colors">
                                                                                                <img src={game.winningPitcher.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.winningPitcher.firstName}`} alt="PG" className="w-full h-full object-cover" />
                                                                                            </div>
                                                                                        </Link>
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="text-[12px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                                                                                <Trophy className="w-3 h-3" /> P. Ganador
                                                                                            </span>
                                                                                            <span className="text-xs md:text-sm font-bold text-foreground capitalize truncate">{game.winningPitcher.firstName.charAt(0)}. {game.winningPitcher.lastName}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Divider */}
                                                                            {game.winningPitcher && (game.mvpBatter1 || game.mvpBatter2) && (
                                                                                <div className="w-px h-10 bg-white/10 shrink-0"></div>
                                                                            )}

                                                                            {/* MVPs Section */}
                                                                            <div className="flex-1 flex items-center justify-end">
                                                                                {(game.mvpBatter1 || game.mvpBatter2) && (
                                                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                        <span className="text-[12px] font-black uppercase text-blue-500 tracking-wider">MVP</span>
                                                                                        <div className="flex md:space-x-15 space-x-2">
                                                                                            {game.mvpBatter1 && (
                                                                                                <Link href={`/jugadores/${game.mvpBatter1.id}`}>
                                                                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-blue-400 overflow-hidden shadow-md hover:border-blue-300 transition-colors" title={game.mvpBatter1.firstName + ' ' + game.mvpBatter1.lastName}>
                                                                                                        <img src={game.mvpBatter1.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.mvpBatter1.firstName}`} alt="MVP" className="w-full h-full object-cover" />
                                                                                                    </div>
                                                                                                </Link>
                                                                                            )}
                                                                                            {game.mvpBatter2 && (
                                                                                                <Link href={`/jugadores/${game.mvpBatter2.id}`}>
                                                                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-blue-400 overflow-hidden shadow-md hover:border-blue-300 transition-colors" title={game.mvpBatter2.firstName + ' ' + game.mvpBatter2.lastName}>
                                                                                                        <img src={game.mvpBatter2.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.mvpBatter2.firstName}`} alt="MVP2" className="w-full h-full object-cover" />
                                                                                                    </div>
                                                                                                </Link>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* SCHEDULED GAMES */}
                                <div>
                                    <div className="flex justify-between items-center mb-6 pl-2 border-l-4 border-muted-foreground">
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">
                                            Partidos Programados
                                        </h3>
                                        {scheduledGames.length > 0 && (
                                            <Link href={`/equipos/${team.id}/juegos?tab=programados`} className="text-xs md:text-sm font-bold text-muted-foreground hover:text-white transition-colors bg-muted/10 hover:bg-muted/20 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                Ver más
                                            </Link>
                                        )}
                                    </div>
                                    {scheduledGames.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-xl p-8 text-center text-muted-foreground font-medium text-sm">
                                            No hay partidos programados próximamente.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {scheduledGames.slice(0, 4).map(game => (
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
                                                            {game.location || 'Sede'}
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
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* JUGADORES (ROSTER) TAB */}
                    {activeTab === 'jugadores' && (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in-up">
                            {team.players.length === 0 ? (
                                <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                    <p className="text-muted-foreground">No hay jugadores registrados.</p>
                                </div>
                            ) : team.players.map((p) => (
                                <PlayerHoverCard
                                    key={p.id}
                                    playerId={p.id}
                                    firstName={p.firstName}
                                    lastName={p.lastName}
                                    photoUrl={p.photoUrl}
                                    position={p.position}
                                    number={p.number}
                                    teamName={team.name}
                                >
                                    <div className="bg-surface border border-muted/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col items-center p-6 hover:-translate-y-1">
                                        <div className="w-20 h-20 bg-muted/5 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-colors shadow-inner">
                                            {p.photoUrl ? (
                                                <img src={p.photoUrl} alt={`${p.firstName} ${p.lastName}`} className="w-full h-full object-cover group-hover:scale-110 duration-300" />
                                            ) : (
                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={96} height={96} className="opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300" />
                                            )}
                                        </div>
                                        <h3 className="font-bold text-center group-hover:text-primary transition-colors text-sm">{p.firstName} {p.lastName}</h3>
                                        <div className="flex gap-2 items-center mt-2">
                                            {p.number && <span className="text-sm text-muted-foreground font-black text-center w-6">#{p.number}</span>}
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                                                {p.position || 'INF'}
                                            </span>
                                        </div>
                                    </div>
                                </PlayerHoverCard>
                            ))}
                        </div>
                    )}

                    {/* ESTADISTICAS TAB */}
                    {activeTab === 'estadisticas' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Stats Selector */}
                            <div className="flex gap-2 p-1 bg-surface border border-muted/30 rounded-xl w-fit mx-auto shadow-sm">
                                <button
                                    onClick={() => setStatsType('bateo')}
                                    className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${statsType === 'bateo' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                >
                                    BATEO
                                </button>
                                <button
                                    onClick={() => setStatsType('pitcheo')}
                                    className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${statsType === 'pitcheo' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                >
                                    PITCHEO
                                </button>
                            </div>

                            {/* Team Totals Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {statsType === 'bateo' ? (
                                    <>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">AVG Equipo</p>
                                            <p className="text-2xl font-black text-primary">{team.stats?.batting.avg || '.000'}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Carreras</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.batting.runs || 0}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Hits</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.batting.hits || 0}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">HR</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.batting.hr || 0}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ERA Equipo</p>
                                            <p className="text-2xl font-black text-primary">{team.stats?.pitching.era || '0.00'}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">IP</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.pitching.ip || '0.0'}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">K</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.pitching.so || 0}</p>
                                        </div>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">WHIP</p>
                                            <p className="text-2xl font-black text-foreground">{team.stats?.pitching.whip || '0.00'}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Detailed Stats Table */}
                            <div className="bg-surface border border-muted/30 rounded-2xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-muted/5 border-b border-muted/20">
                                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest sticky left-0 bg-surface z-10 w-48">Jugador</th>
                                                {statsType === 'bateo' ? (
                                                    <>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JJ</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">VB</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">C</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">H</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">2B</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">3B</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">HR</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">RBI</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">BB</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">K</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">AVG</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">OBP</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">OPS</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JJ</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JG</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JP</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">IP</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">H</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">R</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">BB</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">K</th>
                                                        <th className="px-5 py-4 text-xs font-black text-primary text-center bg-primary/5">ERA</th>
                                                        <th className="px-5 py-4 text-xs font-black text-primary text-center bg-primary/5">WHIP</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {team.players
                                                .filter(p => statsType === 'bateo' ? (p.stats?.batting.atBats || 0) > 0 : (p.stats?.pitching.ip || 0) > 0)
                                                .map((p) => (
                                                    <tr key={p.id} className="hover:bg-muted/5 transition-colors group">
                                                        <td className="px-6 py-4 sticky left-0 bg-surface z-10 group-hover:bg-muted/5 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                                    {p.photoUrl ? (
                                                                        <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="" width={32} height={32} />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-foreground leading-tight">{p.firstName} {p.lastName}</p>
                                                                    <p className="text-[10px] font-black text-muted-foreground uppercase">{p.position || 'INF'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {statsType === 'bateo' ? (
                                                            <>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.games}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.atBats}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.runs}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.hits}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.h2}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.h3}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.hr}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.rbi}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.bb}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.so}</td>
                                                                <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{p.stats?.batting.avg}</td>
                                                                <td className="px-4 py-4 text-sm font-bold text-primary/80 text-center bg-primary/5">{p.stats?.batting.obp}</td>
                                                                <td className="px-4 py-4 text-sm font-bold text-primary/80 text-center bg-primary/5">{p.stats?.batting.ops}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.games}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.wins}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.losses}</td>
                                                                <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{p.stats?.pitching.ip}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.h}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.r}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.bb}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.so}</td>
                                                                <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{p.stats?.pitching.era}</td>
                                                                <td className="px-5 py-4 text-sm font-bold text-primary/80 text-center bg-primary/5">{p.stats?.pitching.whip}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}

                                            {/* Team Row */}
                                            <tr className="bg-primary/10 border-t-2 border-primary/20">
                                                <td className="px-6 py-4 sticky left-0 bg-[#f8fafc] dark:bg-[#0f172a] z-10 font-black text-primary uppercase text-xs">TOTAL EQUIPO</td>
                                                {statsType === 'bateo' ? (
                                                    <>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.gamesPlayed}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.atBats}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.runs}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.hits}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.h2}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.h3}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.hr}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.rbi}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.bb}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.so}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.batting.avg}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.batting.obp}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.batting.ops}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.gamesPlayed}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.wins}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.losses}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.ip}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.h}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.r}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.bb}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.so}</td>
                                                        <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.era}</td>
                                                        <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.whip}</td>
                                                    </>
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {team.players.filter(p => statsType === 'bateo' ? (p.stats?.batting.atBats || 0) > 0 : (p.stats?.pitching.ip || 0) > 0).length === 0 && (
                                    <div className="py-20 text-center">
                                        <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground font-medium">No hay suficientes datos para generar esta tabla aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* MODAL EDITAR PERFIL EQUIPO */}
                {isEditingProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                        <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                                <h2 className="text-xl font-black text-foreground">Editar Datos del Equipo</h2>
                                <button onClick={() => setIsEditingProfile(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Equipo</label>
                                    <input required type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Abreviación</label>
                                        <input type="text" value={profileForm.shortName} onChange={e => setProfileForm({ ...profileForm, shortName: e.target.value.toUpperCase() })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Manager</label>
                                        <input type="text" value={profileForm.managerName} onChange={e => setProfileForm({ ...profileForm, managerName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo</label>
                                    <ImageUploader
                                        value={profileForm.logoUrl}
                                        onChange={url => setProfileForm({ ...profileForm, logoUrl: url })}
                                        shape="square"
                                        placeholder="🛡️"
                                    />
                                </div>

                                <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                    <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* MODAL EDITAR JUGADOR */}
                {isEditingPlayer && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                        <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                                <h2 className="text-xl font-black text-foreground">Editar Datos del Jugador</h2>
                                <button onClick={() => setIsEditingPlayer(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdatePlayer} className="p-6 space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                        <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido</label>
                                        <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Número (#)</label>
                                        <input type="text" value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value.replace(/[^0-9]/g, '') })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición</label>
                                        <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                            <option value="P">Lanzador (P)</option>
                                            <option value="C">Receptor (C)</option>
                                            <option value="1B">1ra Base (1B)</option>
                                            <option value="2B">2da Base (2B)</option>
                                            <option value="3B">3ra Base (3B)</option>
                                            <option value="SS">Short Stop (SS)</option>
                                            <option value="LF">Left Field (LF)</option>
                                            <option value="CF">Center Field (CF)</option>
                                            <option value="RF">Right Field (RF)</option>
                                            <option value="DH">Bateador Designado (DH)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Batea</label>
                                        <select value={playerForm.bats} onChange={e => setPlayerForm({ ...playerForm, bats: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                            <option value="R">Derecho</option>
                                            <option value="L">Zurdo</option>
                                            <option value="S">Ambidiestro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tira</label>
                                        <select value={playerForm.throws} onChange={e => setPlayerForm({ ...playerForm, throws: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                            <option value="R">Derecho</option>
                                            <option value="L">Zurdo</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Foto del Jugador</label>
                                    <ImageUploader
                                        value={playerForm.photoUrl}
                                        onChange={url => setPlayerForm({ ...playerForm, photoUrl: url })}
                                        shape="circle"
                                        placeholder="⚾"
                                    />
                                </div>

                                <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                    <button type="button" onClick={() => setIsEditingPlayer(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
