"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { getUser } from '@/lib/auth';
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import {
    Settings, Share2, ArrowLeft, Users, Trophy, Flag, MapPin, ExternalLink, Clock, Star, Activity, X
} from "lucide-react";

interface BattingStats {
    atBats: number; runs: number; hits: number; h2: number; h3: number; hr: number; rbi: number; bb: number; so: number; hbp: number; sac: number;
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
    homeTeam?: { id: string; name: string };
    awayTeam?: { id: string; name: string };
    winningPitcher?: { firstName: string; lastName: string };
    mvpBatter1?: { firstName: string; lastName: string };
    mvpBatter2?: { firstName: string; lastName: string };
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
    const [activeTab, setActiveTab] = useState<"resumen" | "juegos" | "jugadores" | "estadisticas">("resumen");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null);

    const [statsType, setStatsType] = useState<"bateo" | "pitcheo">("bateo");

    const router = useRouter();

    const [userRole, setUserRole] = useState<string | null>(null);

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
            const { error } = await supabase
                .from('players')
                .update({
                    first_name: playerForm.firstName,
                    last_name: playerForm.lastName,
                    number: playerForm.number ? parseInt(playerForm.number) : null,
                    position: playerForm.position,
                    bats: playerForm.bats,
                    throws: playerForm.throws,
                    photo_url: playerForm.photoUrl
                })
                .eq('id', selectedPlayer?.id);

            if (error) throw error;
            
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
            const { error } = await supabase
                .from('teams')
                .update({
                    name: profileForm.name,
                    short_name: profileForm.shortName,
                    manager_name: profileForm.managerName,
                    logo_url: profileForm.logoUrl,
                    home_field_id: profileForm.homeFieldId || null
                })
                .eq('id', teamId);

            if (error) throw error;

            alert('Perfil del Equipo Actualizado');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, form: any, setForm: Function, field: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, [field]: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const { data, error } = await supabase
                    .from('teams')
                    .select(`
                        *,
                        tournament:tournaments(id, name, category),
                        players(*),
                        gamesAsHome:games!home_team_id(*, homeTeam:teams!home_team_id(id, name), awayTeam:teams!away_team_id(id, name)),
                        gamesAsAway:games!away_team_id(*, homeTeam:teams!home_team_id(id, name), awayTeam:teams!away_team_id(id, name))
                    `)
                    .eq('id', teamId)
                    .single();

                if (error) throw error;

                // Simple record calculation
                const games = [...(data.gamesAsHome || []), ...(data.gamesAsAway || [])].filter(g => g.status === 'finished');
                let wins = 0;
                let losses = 0;
                games.forEach(g => {
                    const isHome = g.home_team_id === teamId;
                    const won = isHome ? (g.home_score > g.away_score) : (g.away_score > g.home_score);
                    if (won) wins++; else losses++;
                });

                setTeam({
                    ...data,
                    name: data.name,
                    shortName: data.short_name,
                    logoUrl: data.logo_url,
                    managerName: data.manager_name,
                    homeFieldId: data.home_field_id,
                    wins,
                    losses,
                    gamesPlayed: games.length,
                    players: data.players.map((p: any) => ({
                        ...p,
                        firstName: p.first_name,
                        lastName: p.last_name,
                        photoUrl: p.photo_url
                    }))
                } as any);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchTeamData();
    }, [teamId]);

    const tabs = [
        { id: "resumen", label: "Resumen" },
        { id: "juegos", label: "Juegos" },
        { id: "jugadores", label: "Jugadores" },
        { id: "estadisticas", label: "Estadísticas" }
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
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24">
            <Navbar />

            <main className="max-w-4xl mx-auto md:px-4 md:py-8 animate-fade-in-up">

                {/* Header Section */}
                <div className="bg-surface border-x border-b border-muted/30 md:border-t md:rounded-2xl overflow-hidden shadow-sm relative mb-6">

                    {/* Cover Photo acting as Link to Tournament */}
                    <div className="h-48 md:h-64 relative bg-slate-900 overflow-hidden group">
                        <Link href={team.tournament ? `/torneos/${team.tournament.id}` : '/torneos'} className="block absolute inset-0 z-10 cursor-pointer">
                            <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-gradient-to-r from-primary to-blue-900 group-hover:scale-105 transition-transform duration-700"></div>

                            {/* Return arrow */}
                            <div className="absolute top-4 left-4 z-20">
                                <div className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </div>
                            </div>

                            {/* "Participando En" Wrapper */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 transition-transform duration-300">
                                <h3 className="text-white text-sm font-bold tracking-[0.2em] mb-2 drop-shadow-md">PARTICIPANDO EN:</h3>
                                <h2 className="text-3xl md:text-5xl font-black text-white/90 tracking-tighter text-center uppercase drop-shadow-lg px-4 flex flex-wrap justify-center items-center gap-2 sm:gap-3">
                                    {team.tournament?.name || 'Sin Torneo'}
                                    <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-2 sm:-mt-3 shrink-0" />
                                </h2>
                            </div>
                        </Link>
                    </div>

                    {/* Profile Overlay and Info */}
                    <div className="px-4 sm:px-6 relative pb-6">
                        <div className="flex justify-between items-end -mt-12 sm:-mt-16 mb-4 relative z-30 pointer-events-none">
                            <div className="relative pointer-events-auto">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-primary rounded-full sm:rounded-2xl border-4 border-surface shadow-md overflow-hidden flex items-center justify-center relative text-white font-black text-3xl">
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} alt="Team Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        team.shortName || team.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pointer-events-auto">
                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                    <button 
                                        onClick={() => setIsEditingProfile(true)}
                                        className="w-10 h-10 rounded-full border border-muted/30 flex items-center justify-center text-muted-foreground hover:bg-muted/10 transition-colors"
                                        title="Configuración del Equipo"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                )}
                                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-colors shadow">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-30">
                            <h1 className="text-2xl sm:text-3xl font-black text-foreground break-words">{team.name}</h1>
                            <p className="text-muted-foreground text-sm uppercase tracking-wide mt-1 font-bold break-words">
                                {team.tournament?.category || team.tournament?.name || ''}
                            </p>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex overflow-x-auto scrollbar-hide border-t border-muted/20 px-2 sm:px-6 relative z-30 pb-1 sm:pb-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 sm:px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab === tab.id
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/5'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-md" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content Rendering */}
                <div className="space-y-6 px-4 md:px-0">

                    {/* RESUMEN TAB */}
                    {activeTab === 'resumen' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                            <div className="md:col-span-1 space-y-6">
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-4 text-foreground">Información</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-bold uppercase">Roster</p>
                                                <p className="text-sm font-medium text-foreground">{team.players.length} Jugadores</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <Flag className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-bold uppercase">Manager</p>
                                                <p className="text-sm font-medium text-foreground">{team.managerName || 'No asignado'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-bold uppercase">Récord</p>
                                                <p className="text-sm font-medium text-foreground">{team.wins}G - {team.losses}P</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-lg font-bold text-foreground">Partidos Recientes</h3>
                                {allGames.length === 0 ? (
                                    <div className="bg-surface border border-muted/30 rounded-xl p-6 text-center">
                                        <p className="text-muted-foreground">No hay partidos registrados.</p>
                                    </div>
                                ) : allGames.slice(0, 5).map((game) => {
                                    const isHome = game.homeTeam?.id === team.id;
                                    const opponent = isHome ? game.awayTeam?.name : game.homeTeam?.name;
                                    const teamScore = isHome ? game.homeScore : game.awayScore;
                                    const opponentScore = isHome ? game.awayScore : game.homeScore;
                                    const won = teamScore > opponentScore;
                                    const dateStr = new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });

                                    return (
                                        <div key={game.id} className="bg-surface border border-muted/30 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm hover:border-primary/40 hover:shadow-md cursor-pointer transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center w-12 border-r border-muted/20 pr-4">
                                                    <p className="text-xs sm:text-sm font-black text-foreground">{dateStr}</p>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 opacity-70">
                                                        <div className="w-4 h-4 rounded-full bg-muted/20" />
                                                        <span className="text-sm font-medium text-muted-foreground">{opponent || 'Rival'}</span>
                                                        <span className="text-sm font-black ml-auto">{opponentScore}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full bg-primary" />
                                                        <span className="text-sm font-bold text-foreground">{team.name}</span>
                                                        <span className="text-sm font-black text-primary ml-auto">{teamScore}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {game.status === 'finished' && (
                                                    <span className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wider ${won ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                                        <span className="hidden sm:inline">{won ? 'Victoria' : 'Derrota'}</span>
                                                        <span className="sm:hidden">{won ? 'V' : 'D'}</span>
                                                    </span>
                                                )}
                                                {game.status === 'in_progress' && (
                                                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-primary/10 text-primary text-[10px] sm:text-xs font-bold rounded uppercase tracking-wider animate-pulse">Vivo</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* JUEGOS TAB */}
                    {activeTab === 'juegos' && (() => {
                        const liveGames = allGames.filter(g => g.status === 'in_progress');
                        const otherGames = allGames.filter(g => g.status !== 'in_progress');

                        return (
                            <div className="animate-fade-in-up space-y-8">
                                {/* LIVE GAMES SECTION */}
                                <div>
                                    <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                        Juegos en Vivo
                                    </h3>
                                    {liveGames.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-xl p-6 text-center shadow-sm">
                                            <p className="text-muted-foreground font-medium text-sm">No hay juegos en vivo en este momento.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {liveGames.map(game => {
                                                const isHome = game.homeTeam?.id === team.id;
                                                const teamScore = isHome ? game.homeScore : game.awayScore;
                                                const opponentScore = isHome ? game.awayScore : game.homeScore;
                                                
                                                return (
                                                    <div key={game.id} className="bg-surface border border-red-500/30 rounded-xl overflow-hidden shadow-md shadow-red-500/5 relative group">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                                                        <div className="p-4 border-b border-muted/20 flex justify-between items-center bg-red-500/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
                                                                <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">
                                                                    {game.half === 'top' ? 'Alta' : 'Baja'} {game.currentInning || 1}
                                                                </span>
                                                            </div>
                                                            <Link href={`/(score)/game/${game.id}`}>
                                                                <button className="text-[10px] font-black uppercase tracking-widest bg-surface border border-muted/30 px-3 py-1 rounded hover:bg-muted/10 transition-colors">
                                                                    Scorecast
                                                                </button>
                                                            </Link>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full ${!isHome ? 'bg-primary' : 'bg-muted/20'}`} />
                                                                    <span className={`font-bold ${!isHome ? 'text-foreground' : 'text-muted-foreground'}`}>{game.awayTeam?.name}</span>
                                                                </div>
                                                                <span className="text-xl font-black">{game.awayScore}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full ${isHome ? 'bg-primary' : 'bg-muted/20'}`} />
                                                                    <span className={`font-bold ${isHome ? 'text-foreground' : 'text-muted-foreground'}`}>{game.homeTeam?.name}</span>
                                                                </div>
                                                                <span className="text-xl font-black">{game.homeScore}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* OTHERS EXPERIENCES SECTION */}
                                <div>
                                    <h3 className="text-xl font-black text-foreground mb-4">Calendario y Resultados</h3>
                                    {otherGames.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-6 md:p-12 text-center shadow-sm">
                                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                            <h3 className="text-lg font-bold text-foreground mb-2">No hay juegos</h3>
                                            <p className="text-muted-foreground">Este equipo aún no tiene partidos programados o finalizados.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {otherGames.map((game) => {
                                        const isHome = game.homeTeam?.id === team.id;
                                        const opponent = isHome ? game.awayTeam?.name : game.homeTeam?.name;
                                        const teamScore = isHome ? game.homeScore : game.awayScore;
                                        const opponentScore = isHome ? game.awayScore : game.homeScore;
                                        const won = teamScore > opponentScore;
                                        const inningLabel = game.status === 'scheduled' ? 'Programado'
                                            : game.status === 'finished' ? 'Final'
                                                : `${game.half === 'top' ? '▲' : '▼'}${game.currentInning}`;

                                        return (
                                            <div key={game.id} className="bg-surface border border-muted/30 rounded-xl overflow-hidden shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-stretch">
                                                {/* Left side: Game Info */}
                                                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center min-w-0">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="text-xs font-black tracking-widest uppercase text-muted-foreground bg-muted/10 px-2 py-1 rounded">
                                                            {new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded border border-muted/30 ml-2 shrink-0 ${game.status === 'in_progress' ? 'text-primary animate-pulse bg-surface' : game.status === 'finished' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'text-muted-foreground bg-surface'}`}>
                                                            {inningLabel}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 shrink-0 rounded-full ${!isHome ? 'bg-primary' : 'bg-muted/20'}`} />
                                                                <span className={`text-sm sm:text-base font-bold truncate ${!isHome ? 'text-foreground' : 'text-muted-foreground'}`}>{game.awayTeam?.name}</span>
                                                            </div>
                                                            <span className="text-xl font-black">{game.awayScore ?? '-'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 shrink-0 rounded-full ${isHome ? 'bg-primary' : 'bg-muted/20'}`} />
                                                                <span className={`text-sm sm:text-base font-bold truncate ${isHome ? 'text-foreground' : 'text-muted-foreground'}`}>{game.homeTeam?.name}</span>
                                                            </div>
                                                            <span className="text-xl font-black">{game.homeScore ?? '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle: MVPs (Only if finished) */}
                                                <div className="border-t border-muted/20 md:border-t-0 md:border-l md:w-64 bg-muted/5 p-4 flex flex-col gap-2 justify-center">
                                                    {game.status === 'finished' && game.winningPitcher ? (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                                <span className="text-xs font-bold text-foreground truncate w-full">{'W: ' + game.winningPitcher.firstName.charAt(0) + '. ' + game.winningPitcher.lastName}</span>
                                                            </div>
                                                            {game.mvpBatter1 && (
                                                                <div className="flex items-center gap-2">
                                                                    <Star className="w-3.5 h-3.5 text-blue-400" />
                                                                    <span className="text-xs font-bold text-foreground truncate w-full">{'MVP: ' + game.mvpBatter1.firstName.charAt(0) + '. ' + game.mvpBatter1.lastName}</span>
                                                                </div>
                                                            )}
                                                            {game.mvpBatter2 && (
                                                                <div className="flex items-center gap-2">
                                                                    <Star className="w-3.5 h-3.5 text-blue-400" />
                                                                    <span className="text-xs font-bold text-foreground truncate w-full">{'MVP: ' + game.mvpBatter2.firstName.charAt(0) + '. ' + game.mvpBatter2.lastName}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : game.status === 'finished' ? (
                                                        <div className="text-xs text-muted-foreground text-center italic opacity-70">
                                                            Sin MVP registrado
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                                                            <Activity className="w-6 h-6 text-muted-foreground mb-1" />
                                                            <span className="text-xs font-bold text-muted-foreground">Pendiente</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right edge: Action Button */}
                                                <div className="p-4 border-t border-muted/20 md:border-t-0 md:border-l flex items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors">
                                                    <Link href={`/gamecast/${game.id}`} className="w-full h-full">
                                                        <button className={`w-full md:w-auto h-full px-4 py-2 text-white text-xs font-bold rounded shadow transition-colors ${game.status === 'finished' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-primary hover:bg-primary-light shadow-primary/20'}`}>
                                                            {game.status === 'finished' ? 'Boxscore' : 'Gamecast'}
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* JUGADORES (ROSTER) TAB */}
                    {activeTab === 'jugadores' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
                            {team.players.length === 0 ? (
                                <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                    <p className="text-muted-foreground">No hay jugadores registrados.</p>
                                </div>
                            ) : team.players.map((p) => (
                                <div key={p.id} onClick={() => setSelectedPlayer(p)} className="bg-surface border border-muted/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col items-center p-6 hover:-translate-y-1">
                                    <div className="w-24 h-24 bg-muted/5 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-colors shadow-inner">
                                        {p.photoUrl ? (
                                            <img src={p.photoUrl} alt={`${p.firstName} ${p.lastName}`} className="w-full h-full object-cover group-hover:scale-110 duration-300" />
                                        ) : (
                                            <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={96} height={96} className="opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300" />
                                        )}
                                    </div>
                                    <h3 className="font-bold text-center group-hover:text-primary transition-colors text-lg">{p.firstName} {p.lastName}</h3>
                                    <div className="flex gap-2 items-center mt-2">
                                        {p.number && <span className="text-sm text-muted-foreground font-black text-center w-6">#{p.number}</span>}
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                                            {p.position || 'INF'}
                                        </span>
                                    </div>
                                </div>
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

                {/* Player Preview Modal Overlay */}
                {selectedPlayer !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in-up">
                        <div className="bg-surface border border-muted/30 rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
                            <button onClick={() => setSelectedPlayer(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-muted/10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors z-10 cursor-pointer">
                                ✕
                            </button>
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left mb-8 relative z-10 pt-4">
                                <div className="w-32 h-32 rounded-full bg-muted/10 overflow-hidden border-4 border-surface shadow-xl ring-2 ring-primary/30 shrink-0">
                                    {selectedPlayer.photoUrl ? (
                                        <img src={selectedPlayer.photoUrl} alt="Player" className="w-full h-full object-cover" />
                                    ) : (
                                        <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPlayer.firstName}${selectedPlayer.lastName}`} alt="Player" width={128} height={128} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 mt-2 md:mt-0">
                                    <div className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                                        {selectedPlayer.position || 'INF'}
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground mb-1 leading-none tracking-tight">{selectedPlayer.firstName} {selectedPlayer.lastName}</h2>
                                    <p className="text-base text-muted-foreground font-medium mb-4">{team?.name || 'Sin equipo'}</p>

                                    {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                        <button 
                                            onClick={() => setIsEditingPlayer(true)}
                                            className="text-xs font-bold text-primary hover:underline mb-4 block"
                                        >
                                            Editar Jugador
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Número</p>
                                            <p className="font-bold text-foreground text-sm">#{selectedPlayer.number || '-'}</p>
                                        </div>
                                        <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Batea</p>
                                            <p className="font-bold text-foreground text-sm">{selectedPlayer.bats === 'L' ? 'Zurdo' : selectedPlayer.bats === 'S' ? 'Ambos' : 'Derecho'}</p>
                                        </div>
                                        <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Tira</p>
                                            <p className="font-bold text-foreground text-sm">{selectedPlayer.throws === 'L' ? 'Zurdo' : 'Derecho'}</p>
                                        </div>
                                        <div className="bg-background/50 border border-muted/20 rounded-xl p-3  w-112 text-center">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Estadisticas AVG-RBI</p>
                                            <p className="font-bold text-foreground text-sm">{selectedPlayer.stats?.batting.avg} - {selectedPlayer.stats?.batting.rbi}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo (URL o Subir)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={profileForm.logoUrl} 
                                            onChange={e => setProfileForm({ ...profileForm, logoUrl: e.target.value })} 
                                            className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs" 
                                            placeholder="URL de la imagen" 
                                        />
                                        <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                            Subir
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={e => handleImageChange(e, profileForm, setProfileForm, 'logoUrl')} 
                                            />
                                        </label>
                                    </div>
                                    {profileForm.logoUrl && (
                                        <div className="mt-2 flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                            <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                                <img src={profileForm.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <button type="button" onClick={() => setProfileForm({ ...profileForm, logoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Imagen</button>
                                        </div>
                                    )}
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
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Foto del Jugador (URL o Subir)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={playerForm.photoUrl} 
                                            onChange={e => setPlayerForm({ ...playerForm, photoUrl: e.target.value })} 
                                            className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs" 
                                            placeholder="URL de la imagen" 
                                        />
                                        <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                            Subir
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={e => handleImageChange(e, playerForm, setPlayerForm, 'photoUrl')} 
                                            />
                                        </label>
                                    </div>
                                    {playerForm.photoUrl && (
                                        <div className="mt-2 flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                            <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                                <img src={playerForm.photoUrl} alt="Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <button type="button" onClick={() => setPlayerForm({ ...playerForm, photoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Imagen</button>
                                        </div>
                                    )}
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
