"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser } from '@/lib/auth';
import api from "@/lib/api";
import { ArrowLeft, MapPin, Calendar, Users, Target, Clock, Settings, Radio, X, CheckCircle2, CheckCircle, ChevronRight, Trophy } from "lucide-react";
import CreateGameWizard from "@/components/game/CreateGameWizard";
import ImageUploader from "@/components/ui/ImageUploader";

export default function TournamentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    interface TournamentData {
        id: string; name: string; season: string; category?: string; rulesType: string;
        description?: string;
        location_city?: string;
        location_state?: string;
        logoUrl?: string;
        leagueId?: string;
        status?: string;
        startDate?: string;
        league?: { name: string };
        teams: { id: string; name: string; shortName?: string; logoUrl?: string; managerName?: string; _count?: { players: number } }[];
        games: { id: string; homeTeam: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number }; awayTeam: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number }; homeScore: number; awayScore: number; currentInning: number; half: string; status: string; scheduledDate: string; field?: string; round?: string; winningPitcher?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null; mvpBatter1?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null; mvpBatter2?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null }[];
        fields: { id: string; name: string; location?: string }[];
        organizers: { id: string; user: { firstName?: string; lastName?: string; email: string } }[];
        news?: { id: string; title: string; description?: string; coverUrl?: string; facebookUrl?: string; type?: string; hasVideo?: boolean; createdAt: string }[];
    }
    const [tournament, setTournament] = useState<TournamentData | null>(null);
    const [loadingTournament, setLoadingTournament] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const { data } = await api.get(`/torneos/${tournamentId}`);
                setTournament(data);
                setLoadingTournament(false);
            } catch (err) {
                console.error("Error fetching tournament:", err);
                setLoadingTournament(false);
            }
        };
        fetchTournament();
    }, [tournamentId]);

    // Actions & Modal State
    const [isCreatingGame, setIsCreatingGame] = useState(false);
    const [lineupGameId, setLineupGameId] = useState<string | null>(null);
    const [isActionsOpen, setIsActionsOpen] = useState(false);

    const [isCreatingNews, setIsCreatingNews] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newsForm, setNewsForm] = useState({ title: '', facebookUrl: '', coverUrl: '', type: 'Noticia', hasVideo: false, description: '' });

    const handleCreateNews = async () => {
        if (!newsForm.title) {
            alert('Por favor agrega un título a la noticia');
            return;
        }

        setSaving(true);
        try {
            const user = getUser();
            await api.post(`/torneos/${tournamentId}/news`, {
                title: newsForm.title,
                description: newsForm.description,
                coverUrl: newsForm.coverUrl,
                facebookUrl: newsForm.facebookUrl,
                type: newsForm.type,
                hasVideo: newsForm.hasVideo,
                authorId: user?.id || null,
            });

            alert('Noticia Publicada con éxito');
            setIsCreatingNews(false);
            setNewsForm({ title: '', facebookUrl: '', coverUrl: '', type: 'Noticia', hasVideo: false, description: '' });
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error al publicar noticia');
        } finally {
            setSaving(false);
        }
    };

    const [isAddingField, setIsAddingField] = useState(false);
    const [fieldForm, setFieldForm] = useState({ name: '', address: '', mapsUrl: '' });

    const [isAddingTeam, setIsAddingTeam] = useState(false);

    const [userRole, setUserRole] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);

    const [teamForm, setTeamForm] = useState({
        name: '',
        shortName: '',
        managerName: '',
        homeFieldId: '',
        logoUrl: '',
        players: Array(9).fill({ firstName: '', lastName: '', number: '', position: 'INF' })
    });

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        season: '',
        description: '',
        rulesType: '',
        category: '',
        logoUrl: '',
        startDate: ''
    });

    useEffect(() => {
        if (tournament) {
            setProfileForm({
                name: tournament.name,
                season: tournament.season || '',
                description: tournament.description || '',
                rulesType: tournament.rulesType || '',
                category: tournament.category || '',
                logoUrl: tournament.logoUrl || '',
                startDate: tournament.startDate ? tournament.startDate.substring(0, 10) : ''
            });
        }
    }, [tournament]);

    const handleRemoveOrganizer = async (organizerId: string) => {
        if (!window.confirm('¿Deseas eliminar a este organizador?')) return;
        try {
            await api.delete(`/torneos/${tournamentId}/organizers/${organizerId}`);
            setTournament(prev => prev ? { ...prev, organizers: prev.organizers.filter(o => o.id !== organizerId) } : null);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar organizador');
        }
    };

    const handleRemoveField = async (fieldId: string) => {
        if (!window.confirm('¿Deseas eliminar este campo?')) return;
        try {
            await api.delete(`/torneos/${tournamentId}/fields/${fieldId}`);
            setTournament(prev => prev ? { ...prev, fields: prev.fields.filter(f => f.id !== fieldId) } : null);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar campo');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/torneos/${tournamentId}`, {
                name: profileForm.name,
                season: profileForm.season,
                description: profileForm.description,
                rulesType: profileForm.rulesType,
                category: profileForm.category,
                logoUrl: profileForm.logoUrl,
                startDate: profileForm.startDate || undefined,
            });

            alert('Perfil del Torneo Actualizado');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };

    const handleFinalizeTournament = async () => {
        if (!window.confirm('¿Finalizar este torneo? El estado cambiará a Completado y no podrá revertirse fácilmente.')) return;
        try {
            await api.patch(`/torneos/${tournamentId}/finalize`);
            setTournament(prev => prev ? { ...prev, status: 'completed' } : null);
        } catch (err) {
            console.error(err);
            alert('Error al finalizar el torneo');
        }
    };


    const handleAddPlayerToForm = () => {
        setTeamForm({ ...teamForm, players: [...teamForm.players, { firstName: '', lastName: '', number: '', position: 'INF' }] });
    };

    const handleRemovePlayerFromForm = (index: number) => {
        if (teamForm.players.length <= 9) {
            alert('Un equipo debe tener registrado mínimo 9 jugadores');
            return;
        }
        const newPlayers = [...teamForm.players];
        newPlayers.splice(index, 1);
        setTeamForm({ ...teamForm, players: newPlayers });
    };

    const handleTeamPlayerChange = (index: number, field: string, value: string) => {
        const newPlayers = [...teamForm.players];
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setTeamForm({ ...teamForm, players: newPlayers });
    };

    const submitTeamForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const validPlayers = teamForm.players.filter((p: any) => p.firstName && p.lastName);
            if (validPlayers.length < 9) {
                alert('Asegúrate de registrar al menos 9 jugadores completos (Nombre y Apellido)');
                return;
            }

            // 1. Create Team
            const { data: teamData } = await api.post('/teams', {
                name: teamForm.name,
                shortName: teamForm.shortName || null,
                managerName: teamForm.managerName || null,
                logoUrl: teamForm.logoUrl || null,
                tournamentId,
            });

            // 2. Create Players
            for (const p of validPlayers) {
                await api.post('/players', {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    number: p.number ? parseInt(p.number) : null,
                    position: p.position,
                    teamId: teamData.id,
                });
            }

            alert('Equipo Registrado y Creado Satisfactoriamente');
            setIsAddingTeam(false);
            setTeamForm({
                name: '', shortName: '', managerName: '', homeFieldId: '', logoUrl: '',
                players: Array(9).fill({ firstName: '', lastName: '', number: '', position: 'INF' })
            });
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Hubo un error al registrar el equipo');
        }
    };

    const [activeTab, setActiveTab] = useState<"informacion" | "equipos" | "juegos" | "posiciones" | "estadisticas">("informacion");

    interface StandingRow { teamId: string; name: string; shortName: string; logoUrl?: string | null; w: number; l: number; t: number; pct: string; gb: string | number; rs: number; ra: number; gp: number }
    const [standings, setStandings] = useState<StandingRow[] | null>(null);
    const [standingsLoaded, setStandingsLoaded] = useState(false);

    useEffect(() => {
        const fetchStandings = async () => {
            if (activeTab === 'posiciones' && !standingsLoaded) {
                try {
                    const { data } = await api.get(`/torneos/${tournamentId}/standings`);
                    setStandings(data || []);
                    setStandingsLoaded(true);
                } catch (err) {
                    console.error("Error fetching standings:", err);
                    setStandingsLoaded(true);
                }
            }
        };
        fetchStandings();
    }, [activeTab, standingsLoaded, tournamentId]);

    interface BattingRow {
        playerId: string; firstName: string; lastName: string; teamName: string; photoUrl?: string;
        gp: number; ab: number; h: number; h2: number; h3: number; hr: number; rbi: number; bb: number; so: number; avg: string;
    }
    interface PitchingRow {
        playerId: string; firstName: string; lastName: string; teamName: string; photoUrl?: string;
        gp: number; ip: string; ipOuts: number; h: number; r: number; er: number; bb: number; so: number; w: number; l: number; era: string;
    }
    const [battingStats, setBattingStats] = useState<BattingRow[] | null>(null);
    const [pitchingStats, setPitchingStats] = useState<PitchingRow[] | null>(null);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [statsView, setStatsView] = useState<'batting' | 'pitching'>('batting');

    useEffect(() => {
        const fetchTournamentStats = async () => {
            if (activeTab === 'estadisticas' && !statsLoaded) {
                try {
                    const [battingRes, pitchingRes] = await Promise.all([
                        api.get(`/torneos/${tournamentId}/stats/batting`),
                        api.get(`/torneos/${tournamentId}/stats/pitching`),
                    ]);
                    setBattingStats(battingRes.data || []);
                    setPitchingStats(pitchingRes.data || []);
                    setStatsLoaded(true);
                } catch (err: any) {
                    console.error("Error fetching tournament stats:", err);
                    setStatsLoaded(true);
                }
            }
        };
        fetchTournamentStats();
    }, [activeTab, statsLoaded, tournamentId]);

    useEffect(() => {
        const user = getUser();
        const role = user?.role || 'general';
        setUserRole(role);
        if (!user || !tournament) return;
        if (role === 'admin') { setCanEdit(true); return; }
        if (role === 'organizer' && tournament.organizers?.some((o: any) => o.user?.id === user.id || o.userId === user.id)) {
            setCanEdit(true);
        }
        if (role === 'presi' && tournament.organizers?.some((o: any) => o.user?.id === user.id || o.userId === user.id)) {
            setCanEdit(true);
        }
    }, [tournament]);

    const tabs = [
        { id: "informacion", label: "Información" },
        { id: "equipos", label: "Equipos" },
        { id: "juegos", label: "Juegos" },
        { id: "posiciones", label: "Posiciones" },
        { id: "estadisticas", label: "Estadísticas" },
    ] as const;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24">
            {/* Copied Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-24 right-4 md:right-8 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl font-bold text-sm z-50 animate-fade-in-up flex items-center gap-2 border border-emerald-400/50">
                    <CheckCircle className="w-5 h-5" />
                    Perfil copiado al portapapeles
                </div>
            )}
            <Navbar />

            <main className="animate-fade-in-up">
                {/* ═══ HEADER SECTION (PROFILE CARD) ═══ */}
                <div className="max-w-7xl mx-auto px-1 md:px-4 pt-4 pb-0">
                    <Link href="/torneos" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-3 px-3 md:px-0">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a torneos
                    </Link>

                    {/* Unified Profile Card */}
                    <div className="bg-surface border border-muted/30 md:rounded-xl overflow-hidden shadow-md flex flex-col relative">

                        {/* Top Banner */}
                        <div className="bg-[#1a2d42] text-white py-12 md:py-20 px-6 md:px-8 text-center md:text-left md:pl-72 relative">
                            {(tournament?.location_city || tournament?.location_state) && (
                                <div className="flex items-center justify-center md:justify-start gap-1.5 text-[10px] text-white/50 font-black uppercase tracking-widest mb-2">
                                    <MapPin className="w-3 h-3" />
                                    {[tournament?.location_city, tournament?.location_state].filter(Boolean).join(', ')}
                                </div>
                            )}
                            <h1 className="text-xl md:text-3xl font-black uppercase tracking-[0.15em] text-white drop-shadow-md leading-tight">
                                {tournament?.league?.name || tournament?.name}
                            </h1>
                            {tournament?.league?.name && tournament?.name !== tournament?.league?.name && (
                                <p className="text-white/50 text-xs font-bold mt-1.5 italic tracking-wider">{tournament?.name}</p>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="bg-[#2a303c] p-5 pt-20 md:pt-4 flex flex-col md:flex-row items-center md:items-start gap-4 relative z-10">

                            {/* Logo Overlapping */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-8 w-28 h-28 md:w-52 md:h-52 bg-white rounded-xl md:rounded-2xl border-4 border-[#2a303c] shadow-xl overflow-hidden flex items-center justify-center shrink-0 z-20">
                                {tournament?.logoUrl ? (
                                    <img src={tournament.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Image src={`https://api.dicebear.com/7.x/shapes/svg?seed=${tournamentId}`} alt="Logo" width={208} height={208} className="object-cover" />
                                )}
                            </div>

                            {/* Mobile action buttons */}
                            <div className="absolute top-16 right-4 md:hidden flex gap-2 z-30">
                                {canEdit && (
                                    <button onClick={() => setIsEditingProfile(true)} className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/70" title="Configuración">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                )}
                                <button className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white" title="Compartir">
                                    <Radio className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col items-center md:items-start md:ml-56 w-full text-center md:text-left">
                                <div className="flex flex-col md:flex-row justify-between w-full md:items-center gap-3">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">{tournament?.name}</h2>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                                                <span>{tournament?.rulesType?.includes('softball') ? '🥎' : '⚾'}</span>
                                                {tournament?.rulesType?.includes('softball') ? 'Softbol' : 'Béisbol'}
                                            </span>
                                            <span className="text-white/30 text-sm">·</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                                {tournament?.teams?.length || 0} {(tournament?.teams?.length || 0) === 1 ? 'Equipo' : 'Equipos'}
                                            </span>
                                            <span className="text-white/30 text-sm">·</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {tournament?.season || '2026'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop action buttons */}
                                    <div className="hidden md:flex gap-3 shrink-0">
                                        {canEdit && (
                                            <button onClick={() => setIsEditingProfile(true)} className="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors" title="Configuración">
                                                <Settings className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button className="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors" title="Compartir">
                                            <Radio className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ═══ TABS SECTION (inside card) ═══ */}
                        <div className="bg-[#2a303c] border-t border-black/20 flex items-center justify-between px-4 overflow-x-auto scrollbar-hide">
                            <div className="flex gap-1 md:gap-2 md:ml-56 overflow-x-auto scrollbar-hide">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 sm:px-6 py-4 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-200 ${activeTab === tab.id
                                            ? 'text-white border-b-2 border-white'
                                            : 'text-white/40 hover:text-white/80 border-b-2 border-transparent'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Actions Dropdown */}
                            {(canEdit || userRole === 'scorekeeper') && (
                                <div className="relative ml-4 shrink-0 py-2">
                                    <button
                                        onClick={() => setIsActionsOpen(!isActionsOpen)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isActionsOpen ? 'bg-primary text-white shadow-lg' : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20 hover:text-white'}`}
                                    >
                                        <Settings className={`w-4 h-4 transition-transform duration-300 ${isActionsOpen ? 'rotate-90' : ''}`} />
                                        <span className="hidden sm:inline">Acciones</span>
                                    </button>

                                    <div className={`absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top transform z-[60] ${isActionsOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
                                        <div className="p-2 space-y-1">
                                            <button onClick={() => { setIsCreatingGame(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                Crear Nuevo Partido
                                            </button>
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => { setIsAddingTeam(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold">
                                                        <Users className="w-4 h-4 text-primary" />
                                                        Agregar Equipo
                                                    </button>
                                                    <button onClick={() => { setIsAddingField(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold">
                                                        <MapPin className="w-4 h-4 text-primary" />
                                                        Añadir Campo
                                                    </button>
                                                    <button onClick={() => { setIsCreatingNews(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold">
                                                        <Radio className="w-4 h-4 text-primary" />
                                                        Publicar Noticia
                                                    </button>
                                                    {tournament?.status !== 'completed' && (
                                                        <button onClick={() => { setIsActionsOpen(false); handleFinalizeTournament(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-all text-xs font-bold border-t border-slate-800 mt-1 pt-3">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Finalizar Torneo
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══ MAIN LAYOUT ═══ */}
                <div className="max-w-7xl mx-auto px-1 md:px-4 py-6">

                    {/* Main Content Area */}
                    <div className="w-full min-w-0">
                        {activeTab === 'informacion' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                                <div className="lg:col-span-2 space-y-6">
                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-foreground">Descripción</h3>
                                            {canEdit && (
                                                <button onClick={() => setIsEditingProfile(true)} className="text-[10px] font-bold text-primary hover:underline">Editar</button>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {tournament?.description || 'No hay descripción disponible para este torneo.'}
                                        </p>
                                    </section>
                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <h3 className="text-lg font-bold text-foreground">Juegos en Vivo</h3>
                                        </div>
                                        {tournament?.games?.filter(g => g.status === 'in_progress').length === 0 ? (
                                            <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                                <p className="text-muted-foreground text-sm font-medium">No hay juegos en vivo en este momento.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tournament?.games?.filter(g => g.status === 'in_progress').map(game => (
                                                    <Link href={`/gamecast/${game.id}`} key={game.id} className="block group">
                                                        <div className="bg-muted/5 border border-muted/20 rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded mb-1">
                                                                        {game.half === 'top' ? 'Alta' : 'Baja'} {game.currentInning}
                                                                    </span>
                                                                    <div className="text-sm font-black text-foreground">{game.awayTeam.name} {game.awayScore} - {game.homeScore} {game.homeTeam.name}</div>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold mb-6 text-foreground">Temporada Actual</h3>
                                        {tournament?.games?.filter(g => g.status === 'scheduled').length === 0 ? (
                                            <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                                <p className="text-muted-foreground text-sm font-medium">Aún no hay juegos programados.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tournament?.games?.filter(g => g.status === 'scheduled').slice(0, 3).map(game => (
                                                    <div key={game.id} className="bg-muted/5 border border-muted/20 rounded-xl p-4 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-foreground truncate">{game.awayTeam.name} vs {game.homeTeam.name}</p>
                                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                                                    {new Date(game.scheduledDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => setLineupGameId(game.id)}
                                                                className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-300 hover:bg-blue-800/60 transition-colors whitespace-nowrap"
                                                            >
                                                                Configurar Lineup
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold mb-6 text-foreground">Resultados Recientes</h3>
                                        {tournament?.games?.filter(g => g.status === 'finished').length === 0 ? (
                                            <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                                <p className="text-muted-foreground text-sm font-medium">Aún no hay resultados registrados.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tournament?.games?.filter(g => g.status === 'finished')
                                                    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
                                                    .slice(0, 3)
                                                    .map(game => (
                                                        <Link href={`/gamecast/${game.id}`} key={game.id} className="block group">
                                                            <div className="bg-muted/5 border border-muted/20 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/30 transition-colors">
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-widest">Final</span>
                                                                        <span className="text-[10px] text-muted-foreground font-bold">{new Date(game.scheduledDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-sm ${game.awayScore > game.homeScore ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>{game.awayTeam.name}</span>
                                                                        <span className={`text-sm ${game.awayScore > game.homeScore ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>{game.awayScore}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-sm ${game.homeScore > game.awayScore ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>{game.homeTeam.name}</span>
                                                                        <span className={`text-sm ${game.homeScore > game.awayScore ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>{game.homeScore}</span>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 ml-4 transition-colors" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                            </div>
                                        )}
                                    </section>

                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold mb-6 text-foreground">Noticias</h3>
                                        {tournament?.news && tournament.news.length > 0 ? (
                                            <div className="space-y-4">
                                                {tournament.news
                                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                    .map((item) => (
                                                        <div key={item.id} className="p-4 bg-muted/5 border border-muted/10 rounded-xl hover:bg-muted/10 transition-colors">
                                                            <div className="flex flex-col md:flex-row gap-4">
                                                                {item.coverUrl && (
                                                                    <div className="w-full md:w-32 h-24 shrink-0 rounded-lg overflow-hidden border border-muted/20 bg-muted/5">
                                                                        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-md border border-primary/20">{item.type}</span>
                                                                        <span className="text-[10px] text-muted-foreground font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <h4 className="font-black text-foreground mb-1">{item.title}</h4>
                                                                    <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                                                                    {item.facebookUrl && (
                                                                        <a href={item.facebookUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-500 font-bold hover:underline">
                                                                            Ver en Facebook ↗
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                                <p className="text-muted-foreground text-sm font-medium">No hay noticias publicadas recientemente.</p>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <div className="space-y-6">


                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-bold text-foreground">Organizadores</h3>
                                            {canEdit && (
                                                <button
                                                    onClick={async () => {
                                                        const email = window.prompt('Correo del nuevo organizador:');
                                                        if (email) {
                                                            try {
                                                                await api.post(`/torneos/${tournamentId}/organizers`, { email });
                                                                alert('Organizador añadido');
                                                                window.location.reload();
                                                            } catch (err) {
                                                                console.error(err);
                                                                alert('Error al añadir organizador (verifica que el usuario exista)');
                                                            }
                                                        }
                                                    }}
                                                    className="text-[10px] font-bold text-primary hover:underline"
                                                >
                                                    + Añadir
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-5">
                                            {tournament?.organizers?.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">No hay organizadores asignados.</p>
                                            ) : tournament?.organizers?.map((org, idx) => (
                                                <div key={idx} className="flex items-center justify-between group/org">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                                            {org.user.firstName?.[0] || org.user.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{org.user.firstName} {org.user.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">{org.user.email}</p>
                                                        </div>
                                                    </div>
                                                    {canEdit && (
                                                        <button onClick={() => handleRemoveOrganizer(org.id)} className="opacity-0 group-hover/org:opacity-100 p-2 text-muted-foreground hover:text-red-500 transition-all">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-bold text-foreground">Campos</h3>
                                            {canEdit && (
                                                <button onClick={() => setIsAddingField(true)} className="text-[10px] font-bold text-primary hover:underline">+ Añadir</button>
                                            )}
                                        </div>
                                        <div className="space-y-5">
                                            {tournament?.fields?.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">No hay campos registrados.</p>
                                            ) : tournament?.fields?.map((field, idx) => (
                                                <div key={idx} className="flex items-center justify-between group/field">
                                                    <div className="flex gap-3">
                                                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{field.name}</p>
                                                            {field.location && (
                                                                <a
                                                                    href={field.location.startsWith('http') ? field.location : `https://maps.google.com/?q=${encodeURIComponent(field.location)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-primary hover:underline mt-0.5 block"
                                                                >
                                                                    {field.location.startsWith('http') ? 'Ver Ubicación' : field.location}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {canEdit && (
                                                        <button onClick={() => handleRemoveField(field.id)} className="opacity-0 group-hover/field:opacity-100 p-2 text-muted-foreground hover:text-red-500 transition-all">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>


                                </div>
                            </div>
                        )}

                        {activeTab === 'equipos' && (
                            <div className="animate-fade-in-up">
                                {!tournament?.teams?.length ? (
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-6 md:p-12 text-center shadow-sm">
                                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                        <h3 className="text-lg font-bold text-foreground mb-2">No hay equipos</h3>
                                        <p className="text-muted-foreground">Aún no se han registrado equipos en este torneo.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tournament.teams.map((team) => (
                                            <Link href={`/equipos/${team.id}`} key={team.id} className="block group">
                                                <div className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 cursor-pointer">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center font-bold text-xl text-white shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                                                            {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" /> : (team.shortName || team.name.substring(0, 2).toUpperCase())}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{team.name}</h3>
                                                            <p className="text-sm text-muted-foreground">{team._count?.players || 0} jugadores</p>
                                                        </div>
                                                    </div>
                                                    {team.managerName && <p className="text-sm text-muted-foreground">Manager: {team.managerName}</p>}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'juegos' && (() => {
                            if (!tournament?.games) return null;
                            const liveGames = tournament.games.filter(g => g.status === 'in_progress');
                            const finishedGames = tournament.games.filter(g => g.status === 'finished').sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
                            const scheduledGames = tournament.games.filter(g => g.status === 'scheduled').sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                            const GameCard = ({ game }: { game: typeof tournament.games[0] }) => (
                                <div
                                    key={game.id}
                                    onClick={() => router.push(`/gamecast/${game.id}`)}
                                    className="bg-gradient-to-br from-blue-500/20 to-surface border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                                >
                                    {game.status === 'in_progress' && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                                    )}
                                    {/* Header */}
                                    <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                                        <div className="text-xs font-bold opacity-70 flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} &bull; {new Date(game.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs font-bold opacity-50 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {game.field || 'Sede Local'}
                                        </div>
                                    </div>
                                    {/* Body */}
                                    <div className="flex flex-col flex-1">
                                        <div className="p-4 md:p-6 flex items-center justify-between">
                                            {/* Away Team */}
                                            <Link href={`/equipos/${game.awayTeam.id}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2 flex-1 group hover:-translate-y-1 transition-transform">
                                                <div className="w-14 h-14 md:w-20 md:h-20 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-2xl shrink-0 group-hover:border-primary/50 transition-colors">
                                                    {game.awayTeam.logoUrl ? <img src={game.awayTeam.logoUrl} alt="A" className="w-full h-full object-cover" /> : game.awayTeam.shortName || game.awayTeam.name.substring(0, 2)}
                                                </div>
                                                <span className="text-[10px] md:text-sm font-black text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{game.awayTeam.name}</span>
                                            </Link>
                                            {/* Score */}
                                            <div className="flex flex-col items-center justify-center flex-shrink-0 px-2 md:px-6">
                                                {game.status === 'in_progress' && (
                                                    <span className="text-[10px] font-black tracking-widest uppercase text-red-500 animate-pulse mb-1 flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> EN VIVO
                                                    </span>
                                                )}
                                                <div className="bg-surface/60 backdrop-blur-md border border-muted/20 px-4 py-2 rounded-2xl">
                                                    <div className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter text-foreground text-center drop-shadow-sm flex items-center justify-center gap-3">
                                                        <span>{game.status === 'scheduled' ? '-' : game.awayScore}</span>
                                                        <span className="text-muted-foreground/30 font-light text-2xl md:text-4xl">-</span>
                                                        <span>{game.status === 'scheduled' ? '-' : game.homeScore}</span>
                                                    </div>
                                                </div>
                                                {game.status === 'finished' && (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 bg-muted/10 px-2 py-0.5 rounded">Finalizado</span>
                                                )}
                                                {game.status === 'scheduled' && (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 bg-muted/10 px-2 py-0.5 rounded">Programado</span>
                                                )}
                                            </div>
                                            {/* Home Team */}
                                            <Link href={`/equipos/${game.homeTeam.id}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2 flex-1 group hover:-translate-y-1 transition-transform">
                                                <div className="w-14 h-14 md:w-20 md:h-20 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-2xl shrink-0 group-hover:border-primary/50 transition-colors">
                                                    {game.homeTeam.logoUrl ? <img src={game.homeTeam.logoUrl} alt="H" className="w-full h-full object-cover" /> : game.homeTeam.shortName || game.homeTeam.name.substring(0, 2)}
                                                </div>
                                                <span className="text-[10px] md:text-sm font-black text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{game.homeTeam.name}</span>
                                            </Link>
                                        </div>
                                        {/* Bottom Stats Bar */}
                                        <div className="flex border-t border-black/10 dark:border-white/10">
                                            <div className="flex-1 p-3 md:p-4 flex items-center gap-3 md:gap-4">
                                                {game.status === 'in_progress' ? (
                                                    <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 animate-pulse">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        {game.half === 'top' ? 'Alta' : 'Baja'} {game.currentInning || 1}
                                                    </span>
                                                ) : game.status === 'finished' ? (
                                                    <>
                                                        <div className="flex-1 flex items-center justify-start">
                                                            {game.winningPitcher && (
                                                                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                    <Link href={`/jugadores/${game.winningPitcher.id}`}>
                                                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-amber-500/50 overflow-hidden shadow-md shrink-0">
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
                                                        {game.winningPitcher && (game.mvpBatter1 || game.mvpBatter2) && (
                                                            <div className="w-px h-10 bg-white/10 shrink-0" />
                                                        )}
                                                        <div className="flex-1 flex items-center justify-end">
                                                            {(game.mvpBatter1 || game.mvpBatter2) && (
                                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <span className="text-[12px] font-black uppercase text-blue-500 tracking-wider">MVP</span>
                                                                    <div className="flex space-x-2">
                                                                        {game.mvpBatter1 && (
                                                                            <Link href={`/jugadores/${game.mvpBatter1.id}`}>
                                                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-blue-400 overflow-hidden shadow-md" title={`${game.mvpBatter1.firstName} ${game.mvpBatter1.lastName}`}>
                                                                                    <img src={game.mvpBatter1.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.mvpBatter1.firstName}`} alt="MVP1" className="w-full h-full object-cover" />
                                                                                </div>
                                                                            </Link>
                                                                        )}
                                                                        {game.mvpBatter2 && (
                                                                            <Link href={`/jugadores/${game.mvpBatter2.id}`}>
                                                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface border-2 border-blue-400 overflow-hidden shadow-md" title={`${game.mvpBatter2.firstName} ${game.mvpBatter2.lastName}`}>
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
                                            <Link
                                                href={`/gamecast/${game.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`px-4 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider border-l border-black/10 dark:border-white/10 transition-all hover:bg-muted/10 ${game.status === 'in_progress' ? 'bg-red-600 text-white hover:bg-red-700' : 'text-primary'}`}
                                            >
                                                {game.status === 'in_progress' ? (
                                                    <><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> GAMECAST</>
                                                ) : game.status === 'finished' ? (
                                                    <><CheckCircle2 className="w-3.5 h-3.5" /> BOXSCORE</>
                                                ) : (
                                                    <><Calendar className="w-3.5 h-3.5" /> VER</>
                                                )}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );

                            return (
                                <div className="animate-fade-in-up space-y-10">
                                    {tournament.games.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-6 md:p-12 text-center shadow-sm">
                                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                            <h3 className="text-lg font-bold text-foreground mb-2">No hay juegos</h3>
                                            <p className="text-muted-foreground">Aún no se han programado juegos.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {liveGames.length > 0 && (
                                                <div>
                                                    <div className="flex items-center mb-5 pl-2 border-l-4 border-red-500">
                                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> En Vivo
                                                        </h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        {liveGames.map(g => <GameCard key={g.id} game={g} />)}
                                                    </div>
                                                </div>
                                            )}
                                            {finishedGames.length > 0 && (
                                                <div>
                                                    <div className="flex items-center mb-5 pl-2 border-l-4 border-primary">
                                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Partidos Recientes</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        {finishedGames.map(g => <GameCard key={g.id} game={g} />)}
                                                    </div>
                                                </div>
                                            )}
                                            {scheduledGames.length > 0 && (
                                                <div>
                                                    <div className="flex items-center mb-5 pl-2 border-l-4 border-muted-foreground">
                                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Próximos Partidos</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        {scheduledGames.map(g => <GameCard key={g.id} game={g} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {activeTab === 'posiciones' && (
                            <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
                                <div className="p-6 border-b border-muted/20">
                                    <h3 className="text-lg font-bold text-foreground">Tabla de Posiciones</h3>
                                </div>
                                {!standingsLoaded ? (
                                    <div className="p-12 text-center text-muted-foreground text-sm">Cargando...</div>
                                ) : !standings || standings.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                        <p className="text-muted-foreground">No hay equipos registrados.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted/5">
                                                <tr>
                                                    {['#', 'Equipo', 'JJ', 'JG', 'JP', 'PCT', 'GB', 'CE', 'CA'].map(h => (
                                                        <th key={h} className="px-6 py-4 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center first:text-left">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-muted/10">
                                                {standings.map((s, i) => (
                                                    <tr key={s.teamId} className={`hover:bg-muted/5 transition-colors ${i === 0 ? 'bg-primary/5' : ''}`}>
                                                        <td className="px-6 py-4 font-black text-foreground">{i + 1}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                                                                    {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain" /> : s.shortName}
                                                                </div>
                                                                <span className="font-bold text-foreground">{s.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{s.gp}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{s.w}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-red-600 dark:text-red-400">{s.l}</td>
                                                        <td className="px-6 py-4 text-center font-black text-foreground">{s.pct}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{i === 0 ? '-' : s.gb}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{s.rs}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{s.ra}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'estadisticas' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex justify-center">
                                    <div className="bg-surface border border-muted/30 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                                        <button onClick={() => setStatsView('batting')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statsView === 'batting' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/5'}`}>Bateo</button>
                                        <button onClick={() => setStatsView('pitching')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statsView === 'pitching' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/5'}`}>Pitcheo</button>
                                    </div>
                                </div>

                                {statsView === 'batting' ? (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Líderes de Bateo</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'AVG', key: 'avg', sort: (a: any, b: any) => parseFloat(b.avg) - parseFloat(a.avg) },
                                                    { label: 'HR', key: 'hr', sort: (a: any, b: any) => b.hr - a.hr },
                                                    { label: 'RBI', key: 'rbi', sort: (a: any, b: any) => b.rbi - a.rbi },
                                                    { label: 'H (HITS)', key: 'h', sort: (a: any, b: any) => b.h - a.h }
                                                ].map(cat => {
                                                    const top4 = [...(battingStats || [])].sort(cat.sort).slice(0, 4);
                                                    return (
                                                        <div key={cat.label} className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all">
                                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 pb-2 border-b border-muted/10">{cat.label}</h4>
                                                            <div className="space-y-3">
                                                                {top4.length === 0 ? <p className="text-[10px] text-muted-foreground italic">Sin datos</p> : top4.map((p, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <div className="relative shrink-0">
                                                                            <div className="w-8 h-8 rounded-full bg-muted/20 border border-muted/30 overflow-hidden shrink-0">
                                                                                <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" className="w-full h-full object-cover" />
                                                                            </div>
                                                                            {idx === 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-[7px] text-white shadow-sm border border-surface">1</div>}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[11px] font-bold text-foreground truncate">{p.lastName}</p>
                                                                            <p className="text-[9px] text-muted-foreground truncate">{p.teamName}</p>
                                                                        </div>
                                                                        <span className="text-xs font-black text-primary ml-auto">{(p as any)[cat.key]}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="p-6 border-b border-muted/20">
                                                <h3 className="text-lg font-bold text-foreground">Estadísticas Detalladas de Bateo</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-muted/5">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Jugador</th>
                                                            <th className="px-4 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">Equipo</th>
                                                            {['JJ', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'AVG'].map(h => (
                                                                <th key={h} className="px-4 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-muted/10">
                                                        {battingStats?.map((p, i) => (
                                                            <tr key={`${p.playerId}-${i}`} className="hover:bg-muted/5 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/20 border border-muted/30 shrink-0">
                                                                            <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="" className="w-full object-cover h-full" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{p.firstName} {p.lastName}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] text-muted-foreground text-center font-medium">{p.teamName}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.gp}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.ab}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-bold text-foreground">{p.h}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.h2}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.h3}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-black text-primary">{p.hr}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.rbi}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.bb}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.so}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.avg}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Líderes de Pitcheo</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'ERA', key: 'era', sort: (a: any, b: any) => parseFloat(a.era) - parseFloat(b.era) },
                                                    { label: 'K (PONCHES)', key: 'so', sort: (a: any, b: any) => b.so - a.so },
                                                    { label: 'IP (INNINGS)', key: 'ip', sort: (a: any, b: any) => parseFloat(b.ip) - parseFloat(a.ip) },
                                                    { label: 'W (VICTORIAS)', key: 'w', sort: (a: any, b: any) => b.w - a.w }
                                                ].map(cat => {
                                                    const top4 = [...(pitchingStats || [])].sort(cat.sort).slice(0, 4);
                                                    return (
                                                        <div key={cat.label} className="bg-surface border border-muted/30 rounded-2xl p-4 shadow-sm">
                                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 pb-2 border-b border-muted/10">{cat.label}</h4>
                                                            <div className="space-y-3">
                                                                {top4.length === 0 ? <p className="text-[10px] text-muted-foreground italic">Sin datos</p> : top4.map((p, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <div className="relative">
                                                                            <div className="w-8 h-8 rounded-full bg-muted/20 border border-muted/30 overflow-hidden shrink-0">
                                                                                <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" className="w-full h-full object-cover" />
                                                                            </div>
                                                                            {idx === 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-[7px] text-white shadow-sm border border-surface">1</div>}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[11px] font-bold text-foreground truncate">{p.lastName}</p>
                                                                            <p className="text-[9px] text-muted-foreground truncate">{p.teamName}</p>
                                                                        </div>
                                                                        <span className="text-xs font-black text-primary ml-auto">{(p as any)[cat.key]}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm mt-8">
                                            <div className="p-6 border-b border-muted/20">
                                                <h3 className="text-lg font-bold text-foreground">Estadísticas Detalladas de Pitcheo</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-muted/5">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Lanzador</th>
                                                            {['Equipo', 'JJ', 'IP', 'H', 'CL', 'BB', 'K', 'W', 'ERA'].map(h => (
                                                                <th key={h} className="px-4 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-muted/10">
                                                        {pitchingStats?.map((p, i) => (
                                                            <tr key={`${p.playerId}-${i}`} className="hover:bg-muted/5 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/20 border border-muted/30 shrink-0">
                                                                            <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="" className="w-full object-cover h-full" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{p.firstName} {p.lastName}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] text-muted-foreground text-center font-medium">{p.teamName}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.gp}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-bold text-foreground">{p.ip}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.h}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.er}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-medium text-muted-foreground">{p.bb}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-bold text-foreground">{p.so}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-black text-emerald-600">{p.w}</td>
                                                                <td className="px-4 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.era}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                </div>
            </main>

            {/* CREAR PARTIDO WIZARD MODAL */}
            {isCreatingGame && (
                <CreateGameWizard
                    context="torneo"
                    tournamentId={tournamentId}
                    onClose={() => setIsCreatingGame(false)}
                />
            )}

            {/* CONFIGURAR LINEUP DE JUEGO PROGRAMADO */}
            {lineupGameId && (
                <CreateGameWizard
                    context="torneo"
                    tournamentId={tournamentId}
                    existingGameId={lineupGameId}
                    onClose={() => setLineupGameId(null)}
                />
            )}

            {/* MODAL NUEVA NOTICIA */}
            {isCreatingNews && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-3xl rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                            <h2 className="text-xl font-black text-foreground">Publicar Nueva Noticia</h2>
                            <button onClick={() => setIsCreatingNews(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Título corto de la noticia" value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                <input type="text" placeholder="URL del Enlace (Link de Facebook)" value={newsForm.facebookUrl} onChange={e => setNewsForm({ ...newsForm, facebookUrl: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="URL de la Foto de portada" value={newsForm.coverUrl} onChange={e => setNewsForm({ ...newsForm, coverUrl: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                <div className="flex items-center gap-4 bg-background border border-muted/30 rounded-lg p-1 w-full justify-between">
                                    <select value={newsForm.type} onChange={e => setNewsForm({ ...newsForm, type: e.target.value })} className="bg-transparent border-none outline-none text-foreground text-sm font-bold p-2 flex-1">
                                        <option value="Noticia">Actualización / Noticia</option>
                                        <option value="Destacado">Jugador Destacado</option>
                                        <option value="Aviso">Aviso Importante</option>
                                    </select>
                                    <label className="flex items-center gap-2 pr-3 cursor-pointer">
                                        <input type="checkbox" checked={newsForm.hasVideo} onChange={e => setNewsForm({ ...newsForm, hasVideo: e.target.checked })} className="w-4 h-4 rounded" />
                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">Tiene Ícono de Video</span>
                                    </label>
                                </div>
                            </div>
                            <textarea placeholder="Breve descripción..." value={newsForm.description} onChange={e => setNewsForm({ ...newsForm, description: e.target.value })} rows={4} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium"></textarea>
                            <div className="flex justify-end pt-2">
                                <button disabled={saving} className={`px-6 py-2.5 rounded-xl font-black transition-colors shadow-lg text-sm flex items-center gap-2 ${saving ? 'bg-muted text-muted-foreground' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20'}`} onClick={handleCreateNews}>
                                    {saving ? 'Publicando...' : '+ Publicar Ahora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL AÑADIR CAMPO */}
            {isAddingField && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                            <h2 className="text-xl font-black text-foreground">Añadir Nuevo Campo</h2>
                            <button onClick={() => setIsAddingField(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre de las Instalaciones</label>
                                <input type="text" placeholder="Ej. Estadio Mobil Super" value={fieldForm.name} onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Dirección Corta</label>
                                <input type="text" placeholder="Ej. Av. Manuel L. Barragán" value={fieldForm.address} onChange={e => setFieldForm({ ...fieldForm, address: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Enlace a Google Maps</label>
                                <input type="text" placeholder="https://maps.google.com/..." value={fieldForm.mapsUrl} onChange={e => setFieldForm({ ...fieldForm, mapsUrl: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                <button onClick={() => setIsAddingField(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">Cancelar</button>
                                <button
                                    className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm"
                                    onClick={async () => {
                                        try {
                                            await api.post(`/torneos/${tournamentId}/fields`, {
                                                name: fieldForm.name,
                                                location: fieldForm.address || null,
                                                mapsUrl: fieldForm.mapsUrl || null,
                                            });
                                            alert('Campo Registrado');
                                            setIsAddingField(false);
                                            window.location.reload();
                                        } catch (error) {
                                            console.error(error);
                                            alert('Error al registrar campo');
                                        }
                                    }}
                                >
                                    Guardar Campo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR PERFIL TORNEO */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                            <h2 className="text-xl font-black text-foreground">Editar Datos del Torneo</h2>
                            <button onClick={() => setIsEditingProfile(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Torneo</label>
                                <input required type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Temporada</label>
                                    <input required type="text" value={profileForm.season} onChange={e => setProfileForm({ ...profileForm, season: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Categoría</label>
                                    <input type="text" value={profileForm.category} onChange={e => setProfileForm({ ...profileForm, category: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fecha de Inicio</label>
                                <input type="date" value={profileForm.startDate} onChange={e => setProfileForm({ ...profileForm, startDate: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo</label>
                                <ImageUploader
                                    value={profileForm.logoUrl}
                                    onChange={url => setProfileForm({ ...profileForm, logoUrl: url })}
                                    shape="square"
                                    placeholder="🏆"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Descripción</label>
                                <textarea rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium resize-none" placeholder="Escribe los detalles del torneo..."></textarea>
                            </div>
                            <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL AGREGAR EQUIPO EN BULK */}
            {isAddingTeam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-muted/30 flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0 sticky top-0 z-10 bg-surface/90 backdrop-blur">
                            <h2 className="text-xl font-black text-foreground">Dar de Alta Equipo y Jugadores</h2>
                            <button onClick={() => setIsAddingTeam(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-8 flex-1">
                            <form onSubmit={submitTeamForm} className="space-y-8">
                                <section className="space-y-5">
                                    <h3 className="text-lg font-bold text-primary border-b border-muted/20 pb-2">Información del Equipo</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre (Obligatorio)</label>
                                            <input required type="text" placeholder="Ej. Diablos Rojos" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Manager</label>
                                            <input type="text" placeholder="Ej. Juan Pérez" value={teamForm.managerName} onChange={e => setTeamForm({ ...teamForm, managerName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Abreviación (3-4 letras)</label>
                                            <input type="text" placeholder="Ej. DIA" maxLength={4} value={teamForm.shortName} onChange={e => setTeamForm({ ...teamForm, shortName: e.target.value.toUpperCase() })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium uppercase" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo (Opcional)</label>
                                            <ImageUploader
                                                value={teamForm.logoUrl}
                                                onChange={url => setTeamForm({ ...teamForm, logoUrl: url })}
                                                shape="square"
                                                placeholder="🛡️"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-5">
                                    <div className="flex items-center justify-between border-b border-muted/20 pb-2">
                                        <h3 className="text-lg font-bold text-primary">Roster Mínimo (<span className="text-foreground">{teamForm.players.length}</span>)</h3>
                                        <button type="button" onClick={handleAddPlayerToForm} className="text-xs font-bold bg-muted/20 hover:bg-muted/30 text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">+ Añadir Fila</button>
                                    </div>
                                    <div className="space-y-3">
                                        {teamForm.players.map((player: any, index: number) => (
                                            <div key={index} className="flex flex-col sm:flex-row gap-3 bg-muted/5 p-3 rounded-xl border border-muted/10 relative group transition-colors hover:border-primary/30">
                                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-muted/20 rounded-full flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm">{index + 1}</div>
                                                <div className="flex-1 ml-4 sm:ml-2">
                                                    <input required type="text" placeholder="Nombre" value={player.firstName} onChange={e => handleTeamPlayerChange(index, 'firstName', e.target.value)} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-bold transition-colors" />
                                                </div>
                                                <div className="flex-1">
                                                    <input required type="text" placeholder="Apellido" value={player.lastName} onChange={e => handleTeamPlayerChange(index, 'lastName', e.target.value)} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-bold transition-colors" />
                                                </div>
                                                <div className="w-full sm:w-20">
                                                    <input type="text" placeholder="Dorsal" maxLength={3} value={player.number} onChange={e => handleTeamPlayerChange(index, 'number', e.target.value.replace(/[^0-9]/g, ''))} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-mono text-center font-bold transition-colors placeholder:font-sans" />
                                                </div>
                                                <div className="w-full sm:w-24">
                                                    <select value={player.position} onChange={e => handleTeamPlayerChange(index, 'position', e.target.value)} className="w-full text-sm bg-surface border border-muted/30 focus:border-primary outline-none rounded py-1.5 px-2 font-bold transition-colors appearance-none">
                                                        {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'INF', 'OF', 'UT'].map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                                    </select>
                                                </div>
                                                {teamForm.players.length > 9 && (
                                                    <button type="button" onClick={() => handleRemovePlayerFromForm(index)} className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-500/10 border border-red-500/20 rounded-full items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors hidden group-hover:flex">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="flex justify-end pt-4 border-t border-muted/20">
                                    <button type="submit" className="px-8 py-3 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20">
                                        Registrar Equipo y Jugadores
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
