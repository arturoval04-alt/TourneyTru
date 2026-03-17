"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from '@/lib/auth';
import {
    ArrowLeft, MapPin, Calendar, Users, Target, Clock, Settings, Radio, X, CheckCircle2, ShieldAlert, ChevronRight
} from "lucide-react";

export default function TournamentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    // Tournament data from API
    interface TournamentData {
        id: string; name: string; season: string; category?: string; rulesType: string;
        description?: string;
        logoUrl?: string;
        league?: { name: string };
        teams: { id: string; name: string; shortName?: string; logoUrl?: string; managerName?: string; _count?: { players: number } }[];
        games: { id: string; homeTeam: { id: string; name: string; shortName?: string }; awayTeam: { id: string; name: string; shortName?: string }; homeScore: number; awayScore: number; currentInning: number; half: string; status: string; scheduledDate: string }[];
        fields: { id: string; name: string; location?: string }[];
        organizers: { id: string; user: { firstName?: string; lastName?: string; email: string } }[];
    }
    const [tournament, setTournament] = useState<TournamentData | null>(null);
    const [loadingTournament, setLoadingTournament] = useState(true);


    useEffect(() => {
        apiFetch(`/tournaments/${tournamentId}`)
            .then(res => res.json())
            .then((data: TournamentData) => { setTournament(data); setLoadingTournament(false); })
            .catch(() => setLoadingTournament(false));
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

    const handleCreateGameSubmit = async () => {
        if (!gameForm.homeTeamId || !gameForm.awayTeamId || !gameForm.scheduledDate) {
            alert('Por favor selecciona los equipos y la fecha.');
            return;
        }

        try {
            // 1. Create Game
            const res = await apiFetch(`/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId,
                    homeTeamId: gameForm.homeTeamId,
                    awayTeamId: gameForm.awayTeamId,
                    scheduledDate: new Date(gameForm.scheduledDate).toISOString(),
                    field: gameForm.field || undefined
                })
            });

            if (!res.ok) throw new Error('Error al crear juego');
            const newGame = await res.json();
            setCreatedGameId(newGame.id);

            // 2. Fetch rosters for the selected teams
            const homeRes = await apiFetch(`/teams/${gameForm.homeTeamId}`);
            const awayRes = await apiFetch(`/teams/${gameForm.awayTeamId}`);
            const homeData = await homeRes.json();
            const awayData = await awayRes.json();

            setGameTeamsData({ home: homeData, away: awayData });
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
            const count = selectedPositions.filter(p => p === pos).length;
            if (count > 1) {
                alert(`Error en ${label}: La posiciÃ³n ${pos} fue asignada a mÃºltiples jugadores. Las posiciones defensivas deben ser Ãºnicas.`);
                return false;
            }
        }

        const dhEntries = valid.filter(item => normalizePosition(item.position) === 'DH');
        if (dhEntries.length > 1) {
            alert(`Error en ${label}: Solo se permite un DH estÃ¡ndar por equipo.`);
            return false;
        }
        if (dhEntries.length === 1) {
            const dh = dhEntries[0];
            const anchor = normalizePosition(dh.dhForPosition || '');
            if (!defensivePositions.includes(anchor)) {
                alert(`Error en ${label}: Si se usa DH, debe anclarse a una posiciÃ³n defensiva vÃ¡lida.`);
                return false;
            }
            if (!selectedPositions.includes(anchor)) {
                alert(`Error en ${label}: El DH debe anclarse a una posiciÃ³n defensiva presente en el lineup (${anchor}).`);
                return false;
            }
        }

        return true;
    };

    const handleConfirmGameLineups = async () => {
        if (!createdGameId) return;

        if (!validateLineupSetup(awayLineupSetup, `Lineup Visitante (${gameTeamsData.away?.name || 'Visitante'})`)) return;
        if (!validateLineupSetup(homeLineupSetup, `Lineup Local (${gameTeamsData.home?.name || 'Local'})`)) return;

        // Cleanup empty spots
        const homeLineup = homeLineupSetup.filter(item => item.playerId && item.position).map((item, index) => ({
            battingOrder: index + 1,
            position: item.position,
            dhForPosition: normalizePosition(item.position) === 'DH' ? (item.dhForPosition || undefined) : undefined,
            isStarter: true,
            teamId: gameForm.homeTeamId,
            playerId: item.playerId
        }));

        const awayLineup = awayLineupSetup.filter(item => item.playerId && item.position).map((item, index) => ({
            battingOrder: index + 1,
            position: item.position,
            dhForPosition: normalizePosition(item.position) === 'DH' ? (item.dhForPosition || undefined) : undefined,
            isStarter: true,
            teamId: gameForm.awayTeamId,
            playerId: item.playerId
        }));

        const confirmMsg = `¿Desea empezar el juego?\nEquipo Visitante (${gameTeamsData.away?.name}) jugará con ${awayLineup.length} jugadores.\nEquipo Local (${gameTeamsData.home?.name}) jugará con ${homeLineup.length} jugadores.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            // Save home lineup if not empty
            if (homeLineup.length > 0) {
                await apiFetch(`/games/${createdGameId}/team/${gameForm.homeTeamId}/lineup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lineups: homeLineup })
                });
            }

            // Save away lineup if not empty
            if (awayLineup.length > 0) {
                await apiFetch(`/games/${createdGameId}/team/${gameForm.awayTeamId}/lineup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lineups: awayLineup })
                });
            }

            // Redirect to Game scoring page
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
    const [newsForm, setNewsForm] = useState({ title: '', facebook_url: '', cover_url: '', type: 'Noticia', has_video: false, description: '' });

    const [isAddingField, setIsAddingField] = useState(false);
    const [fieldForm, setFieldForm] = useState({ name: '', address: '', maps_url: '' });

    const [isAddingTeam, setIsAddingTeam] = useState(false);

    // Role state
    const [userRole, setUserRole] = useState<string | null>(null);

    // Team Bulk Creation State
    const [teamForm, setTeamForm] = useState({
        name: '',
        shortName: '',
        managerName: '',
        homeFieldId: '',
        logoUrl: '',
        players: Array(9).fill({ firstName: '', lastName: '', number: '', position: 'INF' })
    });

    // Profile Editing State
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
                season: tournament.season,
                description: tournament.description || '',
                rulesType: tournament.rulesType,
                category: tournament.category || '',
                logoUrl: tournament.logoUrl || ''
            });
        }
    }, [tournament]);

    const handleRemoveOrganizer = async (organizerId: string) => {
        if (!window.confirm('¿Deseas eliminar a este organizador?')) return;
        try {
            const res = await apiFetch(`/tournaments/${tournamentId}/organizers/${organizerId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setTournament(prev => prev ? { ...prev, organizers: prev.organizers.filter(o => o.id !== organizerId) } : null);
            } else {
                alert('Error al eliminar organizador');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveField = async (fieldId: string) => {
        if (!window.confirm('¿Deseas eliminar este campo?')) return;
        try {
            const res = await apiFetch(`/tournaments/${tournamentId}/fields/${fieldId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setTournament(prev => prev ? { ...prev, fields: prev.fields.filter(f => f.id !== fieldId) } : null);
            } else {
                alert('Error al eliminar campo');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiFetch(`/tournaments/${tournamentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileForm)
            });
            if (res.ok) {
                alert('Perfil del Torneo Actualizado');
                setIsEditingProfile(false);
                // Refresh data
                const updatedRes = await apiFetch(`/tournaments/${tournamentId}`);
                const updatedData = await updatedRes.json();
                setTournament(updatedData);
            } else {
                alert('Error al actualizar perfil');
            }
        } catch (error) {
            console.error(error);
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

    const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setTeamForm({ ...teamForm, logoUrl: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    const handleAddPlayerToForm = () => {
        setTeamForm({
            ...teamForm,
            players: [...teamForm.players, { firstName: '', lastName: '', number: '', position: 'INF' }]
        });
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
            const validPlayers = teamForm.players.filter(p => p.firstName && p.lastName);
            if (validPlayers.length < 9) {
                alert('Asegúrate de registrar al menos 9 jugdores completos (Nombre y Apellido)');
                return;
            }

            const formattedPlayers = validPlayers.map(p => ({
                ...p,
                number: p.number ? parseInt(p.number) : undefined
            }));

            const res = await apiFetch(`/teams/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...teamForm,
                    tournamentId,
                    players: formattedPlayers
                })
            });

            if (res.ok) {
                alert('Equipo Registrado y Creado Satisfactoriamente');
                setIsAddingTeam(false);
                setTeamForm({
                    name: '',
                    shortName: '',
                    managerName: '',
                    homeFieldId: '',
                    logoUrl: '',
                    players: Array(9).fill({ firstName: '', lastName: '', number: '', position: 'INF' })
                });
                // TODO: Refresh teams list
            } else {
                alert('Hubo un error al registrar el equipo');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Tab state
    const [activeTab, setActiveTab] = useState<"informacion" | "equipos" | "juegos" | "posiciones">("informacion");

    // Fetch Role on Mount
    useEffect(() => {
        setUserRole(localStorage.getItem('userRole') || 'general');
    }, []);

    const tabs = [
        { id: "informacion", label: "Información" },
        { id: "equipos", label: "Equipos" },
        { id: "juegos", label: "Juegos" },
        { id: "posiciones", label: "Posiciones" }
    ] as const;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-24">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">

                {/* Header Section */}
                <div className="mb-8">
                    <Link href="/torneos" className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Volver a torneos
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                                <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
                                    {tournament?.name || 'Cargando...'}
                                </h1>
                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                    <button
                                        onClick={() => setIsEditingProfile(true)}
                                        className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-all hover:rotate-90"
                                        title="Editar Perfil del Torneo"
                                    >
                                        <Settings className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                                <span className="flex items-center gap-1.5 text-foreground bg-muted/10 px-3 py-1.5 rounded-full border border-muted/20">
                                    <span className="text-base">{tournament?.rulesType?.includes('softball') ? '🥎' : '⚾'}</span> {tournament?.rulesType?.includes('softball') ? 'Softbol' : 'Béisbol'}
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

                        {/* Tournament Avatar / Logo */}
                        <div className="w-32 h-32 md:w-68 md:h-68 bg-white rounded-[2.5rem] border-4 border-surface shadow-xl overflow-hidden flex items-center justify-center shrink-0 relative group">
                            <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors"></div>
                            {tournament?.logoUrl ? (
                                <img src={tournament.logoUrl} alt="Tournament Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Image src={`https://api.dicebear.com/7.x/shapes/svg?seed=Torneo${tournamentId}`} alt="Tournament Logo" width={192} height={192} className="object-cover" />
                            )}
                        </div>
                    </div>

                    {/* Pill Tabs Navigation */}
                    <div className="flex overflow-x-auto scrollbar-hide gap-2 mt-8">
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

                {/* Tab Content Rendering */}
                <div>
                    {activeTab === 'informacion' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">

                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Descripción */}
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-foreground">Descripción</h3>
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                            <button
                                                onClick={() => setIsEditingProfile(true)}
                                                className="text-[10px] font-bold text-primary hover:underline"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {(tournament as any)?.description || 'No hay descripción disponible para este torneo.'}
                                    </p>
                                </section>

                                {/* Juegos en Vivo */}
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

                                {/* Próximos Juegos */}
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

                                {/* Resultados Recientes */}
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

                                {/* Noticias (Vacío para torneo nuevo) */}
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-6 text-foreground">Noticias</h3>
                                    <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                        <p className="text-muted-foreground text-sm font-medium">No hay noticias publicadas recientemente.</p>
                                    </div>
                                </section>

                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">

                                {/* Acciones Rápidas (Organizador/Scorekeeper) */}
                                {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                    <section className="bg-primary border border-primary-light rounded-2xl p-6 shadow-lg text-white">
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                            <Settings className="w-5 h-5 text-white/80" />
                                            Acciones Rápidas
                                        </h3>
                                        <div className="space-y-3 font-bold">
                                            <button onClick={() => { setIsCreatingGame(true); setCreateStep(1); }} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                    <Calendar className="w-4 h-4 text-white" />
                                                </div>
                                                Crear Nuevo Partido
                                            </button>

                                            {userRole === 'admin' && (
                                                <>
                                                    <button onClick={() => setIsAddingTeam(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                            <Users className="w-4 h-4 text-white" />
                                                        </div>
                                                        Invitar / Agregar Equipo
                                                    </button>
                                                    <button onClick={() => setIsAddingField(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                            <MapPin className="w-4 h-4 text-white" />
                                                        </div>
                                                        Añadir Campo de Juego
                                                    </button>
                                                    <button onClick={() => setIsCreatingNews(true)} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-left text-sm">
                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                            <Radio className="w-4 h-4 text-white" />
                                                        </div>
                                                        Publicar Noticia
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Organizadores */}
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-foreground">Organizadores</h3>
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                            <button
                                                onClick={() => {
                                                    const email = window.prompt('Correo del nuevo organizador:');
                                                    if (email) {
                                                        apiFetch(`/tournaments/${tournamentId}/organizers`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ email })
                                                        }).then(res => {
                                                            if (res.ok) {
                                                                alert('Organizador añadido');
                                                                window.location.reload();
                                                            } else {
                                                                alert('Usuario no encontrado');
                                                            }
                                                        });
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
                                                        <p className="text-sm font-bold text-foreground">
                                                            {org.user.firstName} {org.user.lastName}
                                                        </p>
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

                                {/* Campos */}
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-foreground">Campos</h3>
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                            <button
                                                onClick={() => setIsAddingField(true)}
                                                className="text-[10px] font-bold text-primary hover:underline"
                                            >
                                                + Añadir
                                            </button>
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
                                                                href={`https://maps.google.com/?q=${encodeURIComponent(field.location)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-primary hover:underline mt-0.5 block"
                                                            >
                                                                {field.location}
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

                                {/* Estadísticas Summary */}
                                <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-6 text-foreground">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-foreground mb-1">{tournament?.teams?.length || 0}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Equipos</span>
                                        </div>
                                        <div className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-foreground mb-1">{tournament?.games?.length || 0}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Juegos</span>
                                        </div>
                                        <div className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-foreground mb-1">{tournament?.games?.filter(g => g.status === 'in_progress').length || 0}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">En vivo</span>
                                        </div>
                                        <div className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-foreground mb-1">{tournament?.games?.filter(g => g.status === 'finished').length || 0}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completados</span>
                                        </div>
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
                                                        {team.logoUrl ? (
                                                            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            team.shortName || team.name.substring(0, 2).toUpperCase()
                                                        )}
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
                                                <div className="bg-surface border border-muted/30 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-10 h-10 rounded-lg bg-primary text-white font-black flex items-center justify-center text-lg shadow-sm">{game.awayTeam.shortName || game.awayTeam.name.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-xs font-semibold mt-1.5 text-foreground">{game.awayTeam.name}</span>
                                                        </div>
                                                        <div className="text-2xl font-black text-foreground tracking-wider font-mono">{game.awayScore} - {game.homeScore}</div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-700 text-white font-black flex items-center justify-center text-lg shadow-sm">{game.homeTeam.shortName || game.homeTeam.name.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-xs font-semibold mt-1.5 text-foreground">{game.homeTeam.name}</span>
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

                    {activeTab === 'posiciones' && (() => {
                        // Compute standings from finished games
                        const standings: Record<string, { name: string; shortName: string; w: number; l: number }> = {};
                        for (const team of tournament?.teams || []) {
                            standings[team.id] = { name: team.name, shortName: team.shortName || team.name.substring(0, 2).toUpperCase(), w: 0, l: 0 };
                        }
                        for (const g of tournament?.games?.filter(g => g.status === 'finished') || []) {
                            if (g.homeScore > g.awayScore) {
                                if (standings[g.homeTeam.id]) standings[g.homeTeam.id].w += 1;
                                if (standings[g.awayTeam.id]) standings[g.awayTeam.id].l += 1;
                            } else if (g.awayScore > g.homeScore) {
                                if (standings[g.awayTeam.id]) standings[g.awayTeam.id].w += 1;
                                if (standings[g.homeTeam.id]) standings[g.homeTeam.id].l += 1;
                            }
                        }
                        const sorted = Object.values(standings).sort((a, b) => {
                            const pctA = a.w + a.l > 0 ? a.w / (a.w + a.l) : 0;
                            const pctB = b.w + b.l > 0 ? b.w / (b.w + b.l) : 0;
                            return pctB - pctA;
                        });
                        return (
                            <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
                                <div className="p-6 border-b border-muted/20">
                                    <h3 className="text-lg font-bold text-foreground">Tabla de Posiciones</h3>
                                </div>
                                {sorted.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                        <p className="text-muted-foreground">No hay equipos registrados.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted/5">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">#</th>
                                                    <th className="px-6 py-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Equipo</th>
                                                    <th className="px-6 py-4 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">JJ</th>
                                                    <th className="px-6 py-4 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">JG</th>
                                                    <th className="px-6 py-4 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">JP</th>
                                                    <th className="px-6 py-4 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">PCT</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-muted/10">
                                                {sorted.map((s, i) => (
                                                    <tr key={s.name} className="hover:bg-muted/5 transition-colors">
                                                        <td className="px-6 py-4 font-black text-foreground">{i + 1}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold flex items-center justify-center text-xs">{s.shortName}</div>
                                                                <span className="font-bold text-foreground">{s.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{s.w + s.l}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{s.w}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-red-600 dark:text-red-400">{s.l}</td>
                                                        <td className="px-6 py-4 text-center font-black text-foreground">{(s.w + s.l > 0) ? (s.w / (s.w + s.l)).toFixed(3) : '.000'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </main>

            {/* CREAR PARTIDO WIZARD MODAL */}
            {isCreatingGame && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-3xl rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
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

                        {/* Modal Body - Scrollable */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {createStep === 1 ? (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipo Visitante (Away)</label>
                                            <select
                                                className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold"
                                                value={gameForm.awayTeamId}
                                                onChange={(e) => setGameForm({ ...gameForm, awayTeamId: e.target.value })}
                                            >
                                                <option value="">Selecciona Vistante...</option>
                                                {tournament?.teams?.map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipo Local (Home)</label>
                                            <select
                                                className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold"
                                                value={gameForm.homeTeamId}
                                                onChange={(e) => setGameForm({ ...gameForm, homeTeamId: e.target.value })}
                                            >
                                                <option value="">Selecciona Local...</option>
                                                {tournament?.teams?.map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha y Hora</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold"
                                                value={gameForm.scheduledDate}
                                                onChange={(e) => setGameForm({ ...gameForm, scheduledDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estadio / Sede</label>
                                            <select
                                                className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold"
                                                value={gameForm.field}
                                                onChange={(e) => setGameForm({ ...gameForm, field: e.target.value })}
                                            >
                                                <option value="">Selecciona Campo...</option>
                                                <option value="Estadio Municipal">Estadio Municipal</option>
                                                <option value="Campo Principal">Campo Principal</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4" /> Asignación de Umpires
                                        </label>
                                        <input type="text" placeholder="Ej. Juan Pérez (Principal), Carlos Gómez (Bases)" className="w-full bg-muted/10 border border-muted/20 text-foreground text-sm rounded-xl p-3 outline-none focus:border-primary transition-colors font-bold" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl text-sm font-bold flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                        La estructura del juego ha sido creada. Ahora puedes definir el lineup titular tentativo para cada equipo o brincar directamente al panel de administración del juego.
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mt-4">
                                        <div>
                                            <h4 className="font-black text-foreground mb-3 text-center border-b border-muted/20 pb-2">Lineup Visitante</h4>
                                            <div className="space-y-2">
                                                {awayLineupSetup.map((item, index) => (
                                                    <div key={`away-${index}`} className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                                        <input
                                                            list={`away-players-list`}
                                                            className="flex-1 bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none"
                                                            placeholder="Seleccionar Bateador..."
                                                            value={item.playerName}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const player = gameTeamsData.away?.players.find(p => `${p.firstName} ${p.lastName}` === val) || null;
                                                                const newSetup = [...awayLineupSetup];
                                                                newSetup[index] = { ...newSetup[index], playerName: val, playerId: player?.id || '' };
                                                                setAwayLineupSetup(newSetup);
                                                            }}
                                                        />
                                                        <datalist id={`away-players-list`}>
                                                            {gameTeamsData.away?.players.map(p => (
                                                                <option key={p.id} value={`${p.firstName} ${p.lastName}`} />
                                                            ))}
                                                        </datalist>
                                                        <select
                                                            className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-20"
                                                            value={item.position}
                                                            onChange={(e) => {
                                                                const newSetup = [...awayLineupSetup];
                                                                const nextPos = e.target.value;
                                                                newSetup[index].position = nextPos;
                                                                if (normalizePosition(nextPos) !== 'DH') {
                                                                    newSetup[index].dhForPosition = '';
                                                                }
                                                                setAwayLineupSetup(newSetup);
                                                            }}
                                                        >
                                                            <option value="">Pos...</option>
                                                            <option value="P">P</option>
                                                            <option value="C">C</option>
                                                            <option value="1B">1B</option>
                                                            <option value="2B">2B</option>
                                                            <option value="3B">3B</option>
                                                            <option value="SS">SS</option>
                                                            <option value="LF">LF</option>
                                                            <option value="CF">CF</option>
                                                            <option value="RF">RF</option>
                                                            <option value="DH">DH</option>
                                                            <option value="EH">EH</option>
                                                        </select>
                                                        {normalizePosition(item.position) === 'DH' && (
                                                            <select
                                                                className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-24"
                                                                value={item.dhForPosition || ''}
                                                                onChange={(e) => {
                                                                    const newSetup = [...awayLineupSetup];
                                                                    newSetup[index].dhForPosition = e.target.value;
                                                                    setAwayLineupSetup(newSetup);
                                                                }}
                                                            >
                                                                <option value="">DH por...</option>
                                                                {defensivePositions.map(pos => (
                                                                    <option key={pos} value={pos}>{pos}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-foreground mb-3 text-center border-b border-muted/20 pb-2">Lineup Local</h4>
                                            <div className="space-y-2">
                                                {homeLineupSetup.map((item, index) => (
                                                    <div key={`home-${index}`} className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                                        <input
                                                            list={`home-players-list`}
                                                            className="flex-1 bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none"
                                                            placeholder="Seleccionar Bateador..."
                                                            value={item.playerName}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const player = gameTeamsData.home?.players.find(p => `${p.firstName} ${p.lastName}` === val) || null;
                                                                const newSetup = [...homeLineupSetup];
                                                                newSetup[index] = { ...newSetup[index], playerName: val, playerId: player?.id || '' };
                                                                setHomeLineupSetup(newSetup);
                                                            }}
                                                        />
                                                        <datalist id={`home-players-list`}>
                                                            {gameTeamsData.home?.players.map(p => (
                                                                <option key={p.id} value={`${p.firstName} ${p.lastName}`} />
                                                            ))}
                                                        </datalist>
                                                        <select
                                                            className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-20"
                                                            value={item.position}
                                                            onChange={(e) => {
                                                                const newSetup = [...homeLineupSetup];
                                                                const nextPos = e.target.value;
                                                                newSetup[index].position = nextPos;
                                                                if (normalizePosition(nextPos) !== 'DH') {
                                                                    newSetup[index].dhForPosition = '';
                                                                }
                                                                setHomeLineupSetup(newSetup);
                                                            }}
                                                        >
                                                            <option value="">Pos...</option>
                                                            <option value="P">P</option>
                                                            <option value="C">C</option>
                                                            <option value="1B">1B</option>
                                                            <option value="2B">2B</option>
                                                            <option value="3B">3B</option>
                                                            <option value="SS">SS</option>
                                                            <option value="LF">LF</option>
                                                            <option value="CF">CF</option>
                                                            <option value="RF">RF</option>
                                                            <option value="DH">DH</option>
                                                            <option value="EH">EH</option>
                                                        </select>
                                                        {normalizePosition(item.position) === 'DH' && (
                                                            <select
                                                                className="bg-muted/5 border border-muted/20 text-xs rounded p-2 text-foreground outline-none w-24"
                                                                value={item.dhForPosition || ''}
                                                                onChange={(e) => {
                                                                    const newSetup = [...homeLineupSetup];
                                                                    newSetup[index].dhForPosition = e.target.value;
                                                                    setHomeLineupSetup(newSetup);
                                                                }}
                                                            >
                                                                <option value="">DH por...</option>
                                                                {defensivePositions.map(pos => (
                                                                    <option key={pos} value={pos}>{pos}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-muted/20 bg-muted/5 flex justify-end gap-3 shrink-0">
                            <button onClick={handleCloseGameWizard} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">
                                Cancelar
                            </button>
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
                            <div>
                                <h2 className="text-xl font-black text-foreground">Publicar Nueva Noticia</h2>
                            </div>
                            <button onClick={() => setIsCreatingNews(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Título corto de la noticia" value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                <input type="text" placeholder="URL del Enlace (Link de Facebook)" value={newsForm.facebook_url} onChange={e => setNewsForm({ ...newsForm, facebook_url: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="URL de la Foto de portada" value={newsForm.cover_url} onChange={e => setNewsForm({ ...newsForm, cover_url: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />

                                <div className="flex items-center gap-4 bg-background border border-muted/30 rounded-lg p-1 w-full justify-between">
                                    <select value={newsForm.type} onChange={e => setNewsForm({ ...newsForm, type: e.target.value })} className="bg-transparent border-none outline-none text-foreground text-sm font-bold p-2 flex-1">
                                        <option value="Noticia">Actualización / Noticia</option>
                                        <option value="Destacado">Jugador Destacado</option>
                                        <option value="Aviso">Aviso Importante</option>
                                    </select>
                                    <div className="h-6 w-px bg-muted/20 hidden sm:block"></div>
                                    <label className="flex items-center gap-2 pr-3 cursor-pointer">
                                        <input type="checkbox" checked={newsForm.has_video} onChange={e => setNewsForm({ ...newsForm, has_video: e.target.checked })} className="w-4 h-4 rounded" />
                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">Tiene Ícono de Video</span>
                                    </label>
                                </div>
                            </div>

                            <textarea
                                placeholder="Escribe una breve descripción del suceso (Máx 200 caracteres idealmente)..."
                                value={newsForm.description}
                                onChange={e => setNewsForm({ ...newsForm, description: e.target.value })}
                                rows={4}
                                className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium resize-none"
                            ></textarea>

                            <div className="flex justify-end pt-2">
                                <button className="px-6 py-2.5 rounded-xl font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 text-sm flex items-center gap-2" onClick={() => { alert('Noticia Publicada'); setIsCreatingNews(false); }}>
                                    + Publicar Ahora
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
                            <button onClick={() => setIsAddingField(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
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
                                <input type="text" placeholder="https://maps.google.com/..." value={fieldForm.maps_url} onChange={e => setFieldForm({ ...fieldForm, maps_url: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>

                            <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                <button onClick={() => setIsAddingField(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">
                                    Cancelar
                                </button>
                                <button
                                    className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm"
                                    onClick={async () => {
                                        try {
                                            const res = await apiFetch(`/tournaments/${tournamentId}/fields`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: fieldForm.name, location: fieldForm.address })
                                            });
                                            if (res.ok) {
                                                alert('Campo Registrado');
                                                setIsAddingField(false);
                                                window.location.reload();
                                            } else {
                                                alert('Error al registrar campo');
                                            }
                                        } catch (error) {
                                            console.error(error);
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
                            <button onClick={() => setIsEditingProfile(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
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

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Descripción</label>
                                <textarea
                                    rows={4}
                                    value={profileForm.description}
                                    onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium resize-none"
                                    placeholder="Escribe los detalles del torneo..."
                                ></textarea>
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

            {/* MODAL AGREGAR EQUIPO EN BULK */}
            {isAddingTeam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-muted/30 flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0 sticky top-0 z-10 bg-surface/90 backdrop-blur">
                            <h2 className="text-xl font-black text-foreground">Dar de Alta Equipo y Jugadores</h2>
                            <button onClick={() => setIsAddingTeam(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 flex-1">
                            <form onSubmit={submitTeamForm} className="space-y-8">
                                {/* Team Info Section */}
                                <section className="space-y-5">
                                    <h3 className="text-lg font-bold text-primary border-b border-muted/20 pb-2">Información del Equipo</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre (Obligatorio)</label>
                                            <input required type="text" placeholder="Ej. Diablos Rojos" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Sede / Campo Corto</label>
                                            <input type="text" placeholder="Ej. Campo 1 Sur" value={teamForm.homeFieldId} onChange={e => setTeamForm({ ...teamForm, homeFieldId: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Manager</label>
                                            <input type="text" placeholder="Ej. Juan Pérez" value={teamForm.managerName} onChange={e => setTeamForm({ ...teamForm, managerName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                        </div>

                                        <div className="row-span-2 space-y-2">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo (u Opcional)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={teamForm.logoUrl}
                                                    onChange={e => setTeamForm({ ...teamForm, logoUrl: e.target.value })}
                                                    className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs"
                                                    placeholder="URL del logo"
                                                />
                                                <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                                    Subir
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={e => handleImageChange(e, teamForm, setTeamForm, 'logoUrl')}
                                                    />
                                                </label>
                                            </div>
                                            {teamForm.logoUrl && (
                                                <div className="mt-2 flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                                    <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                                        <img src={teamForm.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                                    </div>
                                                    <button type="button" onClick={() => setTeamForm({ ...teamForm, logoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Logo</button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Abreviación (3-4 letras)</label>
                                            <input type="text" placeholder="Ej. DIA" maxLength={4} value={teamForm.shortName} onChange={e => setTeamForm({ ...teamForm, shortName: e.target.value.toUpperCase() })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium uppercase" />
                                        </div>
                                    </div>
                                </section>

                                {/* Players Section */}
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between border-b border-muted/20 pb-2">
                                        <h3 className="text-lg font-bold text-primary">Roster Mínimo (<span className="text-foreground">{teamForm.players.length}</span>)</h3>
                                        <button type="button" onClick={handleAddPlayerToForm} className="text-xs font-bold bg-muted/20 hover:bg-muted/30 text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                            + Añadir Fila
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {teamForm.players.map((player, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row gap-3 bg-muted/5 p-3 rounded-xl border border-muted/10 relative group transition-colors hover:border-primary/30">
                                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-muted/20 rounded-full flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm">
                                                    {index + 1}
                                                </div>
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
                                                        <option value="P">P</option>
                                                        <option value="C">C</option>
                                                        <option value="1B">1B</option>
                                                        <option value="2B">2B</option>
                                                        <option value="3B">3B</option>
                                                        <option value="SS">SS</option>
                                                        <option value="LF">LF</option>
                                                        <option value="CF">CF</option>
                                                        <option value="RF">RF</option>
                                                        <option value="DH">DH</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-end justify-center">
                                                    <button type="button" onClick={() => handleRemovePlayerFromForm(index)} className="w-8 h-8 rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-4 opacity-70">Deben haber mínimo 9 jugadores registrados por equipo.</p>
                                </section>

                                <div className="border-t border-muted/20 pt-6 flex justify-end gap-3 sticky bottom-0 bg-surface/90 backdrop-blur py-4">
                                    <button type="button" onClick={() => setIsAddingTeam(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-8 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm">
                                        Crear Equipo y Jugadores
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
