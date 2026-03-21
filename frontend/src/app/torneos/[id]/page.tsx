"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser } from '@/lib/auth';
import api from "@/lib/api";
import { ArrowLeft, MapPin, Calendar, Users, Target, Clock, Settings, Radio, X, CheckCircle2, ShieldAlert, ChevronRight, Trophy } from "lucide-react";

export default function TournamentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    interface TournamentData {
        id: string; name: string; season: string; category?: string; rulesType: string;
        description?: string;
        logoUrl?: string;
        leagueId?: string;
        league?: { name: string };
        teams: { id: string; name: string; shortName?: string; logoUrl?: string; managerName?: string; _count?: { players: number } }[];
        games: { id: string; homeTeam: { id: string; name: string; shortName?: string }; awayTeam: { id: string; name: string; shortName?: string }; homeScore: number; awayScore: number; currentInning: number; half: string; status: string; scheduledDate: string }[];
        fields: { id: string; name: string; location?: string }[];
        organizers: { id: string; user: { firstName?: string; lastName?: string; email: string } }[];
        news?: { id: string; title: string; description?: string; coverUrl?: string; facebookUrl?: string; type?: string; hasVideo?: boolean; createdAt: string }[];
    }
    const [tournament, setTournament] = useState<TournamentData | null>(null);
    const [loadingTournament, setLoadingTournament] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const { data } = await api.get(`/tournaments/${tournamentId}`);
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
    const [createStep, setCreateStep] = useState<1 | 2>(1);

    // Game Creation Form State
    const [gameForm, setGameForm] = useState({ homeTeamId: '', awayTeamId: '', scheduledDate: '', field: '' });
    const [createdGameId, setCreatedGameId] = useState<string | null>(null);
    const [gameTeamsData, setGameTeamsData] = useState<{
        home?: { id: string, name: string, players: any[] },
        away?: { id: string, name: string, players: any[] }
    }>({});
    const [awayLineupSetup, setAwayLineupSetup] = useState(Array(10).fill({ playerId: '', playerName: '', position: '', dhForPosition: '' }));
    const [homeLineupSetup, setHomeLineupSetup] = useState(Array(10).fill({ playerId: '', playerName: '', position: '', dhForPosition: '' }));

    const [umpireAssignment, setUmpireAssignment] = useState({ plate: '', base1: '', base2: '', base3: '' });

    const handleCreateGameSubmit = async () => {
        if (!gameForm.homeTeamId || !gameForm.awayTeamId || !gameForm.scheduledDate) {
            alert('Por favor selecciona los equipos y la fecha.');
            return;
        }

        try {
            // 1. Create Game
            const { data: newGame } = await api.post('/games', {
                tournamentId,
                homeTeamId: gameForm.homeTeamId,
                awayTeamId: gameForm.awayTeamId,
                scheduledDate: new Date(gameForm.scheduledDate).toISOString(),
                field: gameForm.field || null,
                status: 'scheduled',
                umpirePlate: umpireAssignment.plate || null,
                umpireBase1: umpireAssignment.base1 || null,
                umpireBase2: umpireAssignment.base2 || null,
                umpireBase3: umpireAssignment.base3 || null,
            });

            setCreatedGameId(newGame.id);

            // 2. Fetch rosters
            const [homeRes, awayRes] = await Promise.all([
                api.get(`/teams/${gameForm.homeTeamId}`),
                api.get(`/teams/${gameForm.awayTeamId}`),
            ]);

            setGameTeamsData({ home: homeRes.data, away: awayRes.data });
            setCreateStep(2);
        } catch (error) {
            console.error(error);
            alert('Hubo un problema al inicializar el juego.');
        }
    };

    const defensivePositions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    const normalizePosition = (pos: string) => {
        const raw = (pos || '').trim().toUpperCase();
        const map: Record<string, string> = {
            '1': 'P', 'P': 'P',
            '2': 'C', 'C': 'C',
            '3': '1B', '1B': '1B',
            '4': '2B', '2B': '2B',
            '5': '3B', '3B': '3B',
            '6': 'SS', 'SS': 'SS',
            '7': 'LF', 'LF': 'LF',
            '8': 'CF', 'CF': 'CF',
            '9': 'RF', 'RF': 'RF',
            'BD': 'DH', 'DH': 'DH',
        };
        return map[raw] || raw;
    };

    const validateLineupSetup = (lineupSetup: { playerId: string; position: string; dhForPosition?: string }[], label: string) => {
        const valid = lineupSetup.filter(item => item.playerId && item.position);
        if (valid.length === 0) return true;

        const selectedPositions = valid.map(item => normalizePosition(item.position)).filter(Boolean);
        for (const pos of defensivePositions) {
            if (selectedPositions.filter(p => p === pos).length > 1) {
                alert(`Error en ${label}: La posición ${pos} fue asignada a múltiples jugadores.`);
                return false;
            }
        }

        const dhEntries = valid.filter(item => normalizePosition(item.position) === 'DH');
        if (dhEntries.length > 1) {
            alert(`Error en ${label}: Solo se permite un DH estándar por equipo.`);
            return false;
        }
        if (dhEntries.length === 1) {
            const dh = dhEntries[0];
            const anchor = normalizePosition(dh.dhForPosition || '');
            if (!defensivePositions.includes(anchor)) {
                alert(`Error en ${label}: Si se usa DH, debe anclarse a una posición defensiva válida.`);
                return false;
            }
            if (!selectedPositions.includes(anchor)) {
                alert(`Error en ${label}: El DH debe anclarse a una posición defensiva presente en el lineup (${anchor}).`);
                return false;
            }
        }

        return true;
    };

    const handleConfirmGameLineups = async () => {
        if (!createdGameId) return;

        if (!validateLineupSetup(awayLineupSetup, `Lineup Visitante (${gameTeamsData.away?.name || 'Visitante'})`)) return;
        if (!validateLineupSetup(homeLineupSetup, `Lineup Local (${gameTeamsData.home?.name || 'Local'})`)) return;

        const homeLineup = homeLineupSetup.filter(item => item.playerId && item.position).map((item, index) => ({
            battingOrder: index + 1,
            position: item.position,
            dhForPosition: normalizePosition(item.position) === 'DH' ? (item.dhForPosition || null) : null,
            isStarter: true,
            playerId: item.playerId
        }));

        const awayLineup = awayLineupSetup.filter(item => item.playerId && item.position).map((item, index) => ({
            battingOrder: index + 1,
            position: item.position,
            dhForPosition: normalizePosition(item.position) === 'DH' ? (item.dhForPosition || null) : null,
            isStarter: true,
            playerId: item.playerId
        }));

        const confirmMsg = `¿Desea empezar el juego?\nEquipo Visitante (${gameTeamsData.away?.name}) jugará con ${awayLineup.length} jugadores.\nEquipo Local (${gameTeamsData.home?.name}) jugará con ${homeLineup.length} jugadores.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            if (homeLineup.length > 0) {
                await api.post(`/games/${createdGameId}/team/${gameForm.homeTeamId}/lineup`, { lineups: homeLineup });
            }
            if (awayLineup.length > 0) {
                await api.post(`/games/${createdGameId}/team/${gameForm.awayTeamId}/lineup`, { lineups: awayLineup });
            }
            router.push(`/game/${createdGameId}`);
        } catch (error) {
            console.error(error);
            alert('Error al guardar alineaciones.');
        }
    };

    const handleCloseGameWizard = () => {
        setIsCreatingGame(false);
        setCreateStep(1);
        setGameForm({ homeTeamId: '', awayTeamId: '', scheduledDate: '', field: '' });
        setCreatedGameId(null);
        setGameTeamsData({});
        setAwayLineupSetup(Array(10).fill({ playerId: '', playerName: '', position: '', dhForPosition: '' }));
        setHomeLineupSetup(Array(10).fill({ playerId: '', playerName: '', position: '', dhForPosition: '' }));
    };

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
            await api.post(`/tournaments/${tournamentId}/news`, {
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
        logoUrl: ''
    });

    useEffect(() => {
        if (tournament) {
            setProfileForm({
                name: tournament.name,
                season: tournament.season || '',
                description: tournament.description || '',
                rulesType: tournament.rulesType || '',
                category: tournament.category || '',
                logoUrl: tournament.logoUrl || ''
            });
        }
    }, [tournament]);

    const handleRemoveOrganizer = async (organizerId: string) => {
        if (!window.confirm('¿Deseas eliminar a este organizador?')) return;
        try {
            await api.delete(`/tournaments/${tournamentId}/organizers/${organizerId}`);
            setTournament(prev => prev ? { ...prev, organizers: prev.organizers.filter(o => o.id !== organizerId) } : null);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar organizador');
        }
    };

    const handleRemoveField = async (fieldId: string) => {
        if (!window.confirm('¿Deseas eliminar este campo?')) return;
        try {
            await api.delete(`/tournaments/${tournamentId}/fields/${fieldId}`);
            setTournament(prev => prev ? { ...prev, fields: prev.fields.filter(f => f.id !== fieldId) } : null);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar campo');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/tournaments/${tournamentId}`, {
                name: profileForm.name,
                season: profileForm.season,
                description: profileForm.description,
                rulesType: profileForm.rulesType,
                category: profileForm.category,
                logoUrl: profileForm.logoUrl,
            });

            alert('Perfil del Torneo Actualizado');
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
                    const { data } = await api.get(`/tournaments/${tournamentId}/standings`);
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
                        api.get(`/tournaments/${tournamentId}/stats/batting`),
                        api.get(`/tournaments/${tournamentId}/stats/pitching`),
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
        setUserRole(user?.role || 'general');
    }, []);

    const tabs = [
        { id: "informacion", label: "Información" },
        { id: "equipos", label: "Equipos" },
        { id: "juegos", label: "Juegos" },
        { id: "posiciones", label: "Posiciones" },
        { id: "estadisticas", label: "Estadísticas" },
    ] as const;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">

                <div className="mb-8">
                    <Link href="/torneos" className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Volver a torneos
                    </Link>

                    <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-8 pb-4">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-4 mb-3">
                                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-foreground tracking-tight break-all sm:break-normal">
                                    {tournament?.name || 'Cargando...'}
                                </h1>
                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                    <button
                                        onClick={() => setIsEditingProfile(true)}
                                        className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-all hover:rotate-90 shrink-0"
                                        title="Editar Perfil del Torneo"
                                    >
                                        <Settings className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                                <span className="flex items-center gap-1.5 text-foreground bg-muted/10 px-3 py-1.5 rounded-full border border-muted/20">
                                    <span className="text-base">{tournament?.rulesType?.includes('softball_7') ? '🥎' : '⚾'}</span> {tournament?.rulesType?.includes('softball') ? 'Softbol' : 'Béisbol'}
                                </span>
                                {tournament?.league?.name && (
                                    <span className="flex items-center gap-1.5 text-foreground">
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                        {tournament.league.name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 text-foreground">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    {tournament?.season || ''}
                                </span>
                            </div>
                        </div>

                        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-64 md:h-64 mx-auto md:mx-0 bg-white rounded-3xl md:rounded-[2.5rem] border-4 border-surface shadow-xl overflow-hidden flex items-center justify-center shrink-0 relative group">
                            <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors"></div>
                            {tournament?.logoUrl ? (
                                <img src={tournament.logoUrl} alt="Tournament Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Image src={`https://api.dicebear.com/7.x/shapes/svg?seed=Torneo${tournamentId}`} alt="Tournament Logo" width={192} height={192} className="object-cover" />
                            )}
                        </div>
                    </div>

                    <div className="flex overflow-x-auto scrollbar-hide gap-2 mt-8 pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? 'bg-muted/20 text-foreground border border-muted/30 shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    {activeTab === 'informacion' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            <div className="lg:col-span-2 space-y-6">
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-foreground">Descripción</h3>
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
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
                                                <div key={game.id} className="bg-muted/5 border border-muted/20 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{game.awayTeam.name} vs {game.homeTeam.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                                                {new Date(game.scheduledDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
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
                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                    <section className="bg-primary border border-primary-light rounded-2xl p-6 shadow-lg text-white">
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                            <Settings className="w-5 h-5 text-white/80" />
                                            Acciones Rápidas
                                        </h3>
                                        <div className="space-y-3 font-bold">
                                            <button onClick={() => { setIsCreatingGame(true); setCreateStep(1); }} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-white" /></div>
                                                Crear Nuevo Partido
                                            </button>
                                            {userRole === 'admin' && (
                                                <>
                                                    <button onClick={() => setIsAddingTeam(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-white" /></div>
                                                        Invitar / Agregar Equipo
                                                    </button>
                                                    <button onClick={() => setIsAddingField(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-white" /></div>
                                                        Añadir Campo de Juego
                                                    </button>
                                                    <button onClick={() => setIsCreatingNews(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Radio className="w-4 h-4 text-white" /></div>
                                                        Publicar Noticia
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                )}

                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-foreground">Organizadores</h3>
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                            <button
                                                onClick={async () => {
                                                    const email = window.prompt('Correo del nuevo organizador:');
                                                    if (email) {
                                                        try {
                                                            await api.post(`/tournaments/${tournamentId}/organizers`, { email });
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
                                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
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
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
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
                                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                                    <button onClick={() => handleRemoveField(field.id)} className="opacity-0 group-hover/field:opacity-100 p-2 text-muted-foreground hover:text-red-500 transition-all">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-6 text-foreground">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Equipos', val: tournament?.teams?.length || 0 },
                                            { label: 'Juegos', val: tournament?.games?.length || 0 },
                                            { label: 'En vivo', val: tournament?.games?.filter(g => g.status === 'in_progress').length || 0 },
                                            { label: 'Completados', val: tournament?.games?.filter(g => g.status === 'finished').length || 0 },
                                        ].map(s => (
                                            <div key={s.label} className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black text-foreground mb-1">{s.val}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
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

                    {activeTab === 'juegos' && (
                        <div className="animate-fade-in-up">
                            {!tournament?.games?.length ? (
                                <div className="bg-surface border border-muted/30 rounded-2xl p-6 md:p-12 text-center shadow-sm">
                                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-bold text-foreground mb-2">No hay juegos</h3>
                                    <p className="text-muted-foreground">Aún no se han programado juegos.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tournament.games.map((game) => {
                                        const inningLabel = game.status === 'scheduled' ? 'Programado'
                                            : game.status === 'finished' ? 'Final'
                                                : `${game.half === 'top' ? '▲' : '▼'}${game.currentInning}`;
                                        return (
                                            <Link href={game.status !== 'scheduled' ? `/gamecast/${game.id}` : '#'} key={game.id} className="block group">
                                                <div className="bg-surface border border-muted/30 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-2 sm:gap-6 w-full">
                                                        <div className="flex flex-col items-center w-[60px] sm:w-20 shrink-0">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary text-white font-black flex items-center justify-center text-sm sm:text-lg shadow-sm">{game.awayTeam.shortName || game.awayTeam.name.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-[10px] sm:text-xs font-semibold mt-1.5 text-foreground text-center line-clamp-1">{game.awayTeam.name}</span>
                                                        </div>
                                                        <div className="flex-1 flex justify-center items-center text-lg sm:text-2xl font-black text-foreground tracking-wider font-mono shrink-0 whitespace-nowrap">{game.awayScore} - {game.homeScore}</div>
                                                        <div className="flex flex-col items-center w-[60px] sm:w-20 shrink-0">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-700 text-white font-black flex items-center justify-center text-sm sm:text-lg shadow-sm">{game.homeTeam.shortName || game.homeTeam.name.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-[10px] sm:text-xs font-semibold mt-1.5 text-foreground text-center line-clamp-1">{game.homeTeam.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-sm font-bold px-2 py-0.5 rounded border border-muted/30 ${game.status === 'in_progress' ? 'text-primary animate-pulse bg-surface' : game.status === 'finished' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'text-muted-foreground bg-surface'}`}>
                                                            {inningLabel}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{new Date(game.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

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
                        <div className="animate-fade-in-up space-y-8">
                            <div className="flex justify-center">
                                <div className="flex gap-1 p-1 bg-surface border border-muted/30 rounded-2xl shadow-sm">
                                    <button onClick={() => setStatsView('batting')} className={`px-8 py-2.5 text-sm font-black rounded-xl transition-all ${statsView === 'batting' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}>BATEO</button>
                                    <button onClick={() => setStatsView('pitching')} className={`px-8 py-2.5 text-sm font-black rounded-xl transition-all ${statsView === 'pitching' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}>PITCHEO</button>
                                </div>
                            </div>

                            {!statsLoaded ? (
                                <div className="p-20 text-center">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-muted-foreground font-bold italic">Calculando estadísticas del torneo...</p>
                                </div>
                            ) : statsView === 'batting' ? (
                                <>
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Líderes de Bateo</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                            {[
                                                { label: 'AVG', key: 'avg', sort: (a: any, b: any) => parseFloat(b.avg) - parseFloat(a.avg) },
                                                { label: 'HITS', key: 'h', sort: (a: any, b: any) => b.h - a.h },
                                                { label: 'HR', key: 'hr', sort: (a: any, b: any) => b.hr - a.hr },
                                                { label: 'RBI', key: 'rbi', sort: (a: any, b: any) => b.rbi - a.rbi },
                                                { label: 'BB', key: 'bb', sort: (a: any, b: any) => b.bb - a.bb }
                                            ].map(cat => {
                                                const top4 = [...(battingStats || [])].sort(cat.sort).slice(0, 4);
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
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* CREAR PARTIDO WIZARD MODAL */}
            {isCreatingGame && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-3xl rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-foreground">Programar Nuevo Partido</h2>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    {createStep === 1 ? 'Paso 1: Configuración' : 'Paso 2: Alineaciones Previas'}
                                </p>
                            </div>
                            <button onClick={() => setIsCreatingGame(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {createStep === 1 ? (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipo Visitante (Away)</label>
                                            <select className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold" value={gameForm.awayTeamId} onChange={(e) => setGameForm({ ...gameForm, awayTeamId: e.target.value })}>
                                                <option value="">Selecciona Visitante...</option>
                                                {tournament?.teams?.map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipo Local (Home)</label>
                                            <select className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold" value={gameForm.homeTeamId} onChange={(e) => setGameForm({ ...gameForm, homeTeamId: e.target.value })}>
                                                <option value="">Selecciona Local...</option>
                                                {tournament?.teams?.map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha y Hora</label>
                                            <input type="datetime-local" className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold" value={gameForm.scheduledDate} onChange={(e) => setGameForm({ ...gameForm, scheduledDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estadio / Sede</label>
                                            <select className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold" value={gameForm.field} onChange={(e) => setGameForm({ ...gameForm, field: e.target.value })}>
                                                <option value="">Selecciona Campo...</option>
                                                {tournament?.fields?.map(f => (<option key={f.id} value={f.name}>{f.name}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Asignación de Umpires</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['plate', 'base1', 'base2', 'base3'] as const).map(role => (
                                                <div key={role} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        {role === 'plate' ? 'Plato' : role === 'base1' ? '1ra Base' : role === 'base2' ? '2da Base' : '3ra Base'}
                                                    </label>
                                                    <input type="text" placeholder="Nombre del Umpire" className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-2.5 outline-none focus:border-primary transition-colors font-bold" value={umpireAssignment[role]} onChange={(e) => setUmpireAssignment({ ...umpireAssignment, [role]: e.target.value })} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl text-sm font-bold flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                        La estructura del juego ha sido creada. Ahora puedes definir el lineup titular tentativo o ir directamente al panel de administración.
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mt-4">
                                        {[
                                            { label: 'Lineup Visitante', setup: awayLineupSetup, setSetup: setAwayLineupSetup, players: gameTeamsData.away?.players || [], listId: 'away-players-list' },
                                            { label: 'Lineup Local', setup: homeLineupSetup, setSetup: setHomeLineupSetup, players: gameTeamsData.home?.players || [], listId: 'home-players-list' },
                                        ].map(({ label, setup, setSetup, players, listId }) => (
                                            <div key={label}>
                                                <h4 className="font-black text-foreground mb-3 text-center border-b border-muted/20 pb-2">{label}</h4>
                                                <div className="space-y-2">
                                                    {setup.map((item: any, index: number) => (
                                                        <div key={`${listId}-${index}`} className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                                            <input
                                                                list={listId}
                                                                className="flex-1 bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none"
                                                                placeholder="Seleccionar Bateador..."
                                                                value={item.playerName}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const player = players.find((p: any) => `${p.firstName} ${p.lastName}` === val) || null;
                                                                    const newSetup = [...setup];
                                                                    newSetup[index] = { ...newSetup[index], playerName: val, playerId: player?.id || '' };
                                                                    setSetup(newSetup);
                                                                }}
                                                            />
                                                            <datalist id={listId}>
                                                                {players.map((p: any) => (<option key={p.id} value={`${p.firstName} ${p.lastName}`} />))}
                                                            </datalist>
                                                            <select
                                                                className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-20"
                                                                value={item.position}
                                                                onChange={(e) => {
                                                                    const newSetup = [...setup];
                                                                    newSetup[index] = { ...newSetup[index], position: e.target.value, dhForPosition: normalizePosition(e.target.value) !== 'DH' ? '' : newSetup[index].dhForPosition };
                                                                    setSetup(newSetup);
                                                                }}
                                                            >
                                                                <option value="">Pos...</option>
                                                                {['P','C','1B','2B','3B','SS','LF','CF','RF','DH','EH'].map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                                            </select>
                                                            {normalizePosition(item.position) === 'DH' && (
                                                                <select className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-24" value={item.dhForPosition || ''} onChange={(e) => { const newSetup = [...setup]; newSetup[index] = { ...newSetup[index], dhForPosition: e.target.value }; setSetup(newSetup); }}>
                                                                    <option value="">DH por...</option>
                                                                    {defensivePositions.map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-muted/20 bg-muted/5 flex justify-end gap-3 shrink-0">
                            <button onClick={handleCloseGameWizard} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">Cancelar</button>
                            {createStep === 1 ? (
                                <button onClick={handleCreateGameSubmit} className="px-6 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-light transition-colors shadow-md text-sm flex items-center gap-2">
                                    Guardar y Ajustar Alineaciones <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button onClick={handleConfirmGameLineups} className="px-8 py-2.5 rounded-xl font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Confirmar e Ir al Marcador
                                </button>
                            )}
                        </div>
                    </div>
                </div>
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
                                            await api.post(`/tournaments/${tournamentId}/fields`, {
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
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo (URL o Subir)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={profileForm.logoUrl} onChange={e => setProfileForm({ ...profileForm, logoUrl: e.target.value })} className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs" placeholder="URL de la imagen" />
                                    <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                        Subir
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, profileForm, setProfileForm, 'logoUrl')} />
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
                                            <div className="flex gap-2">
                                                <input type="text" value={teamForm.logoUrl} onChange={e => setTeamForm({ ...teamForm, logoUrl: e.target.value })} className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary transition text-xs" placeholder="URL del logo" />
                                                <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                                    Subir
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, teamForm, setTeamForm, 'logoUrl')} />
                                                </label>
                                            </div>
                                            {teamForm.logoUrl && (
                                                <div className="flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                                    <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                                        <img src={teamForm.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                                    </div>
                                                    <button type="button" onClick={() => setTeamForm({ ...teamForm, logoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Logo</button>
                                                </div>
                                            )}
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
                                                        {['P','C','1B','2B','3B','SS','LF','CF','RF','INF','OF','UT'].map(pos => (<option key={pos} value={pos}>{pos}</option>))}
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
