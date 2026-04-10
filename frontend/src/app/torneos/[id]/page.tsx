"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser } from '@/lib/auth';
import api from "@/lib/api";
import { ArrowLeft, MapPin, Calendar, Users, Target, Clock, Settings, Radio, X, CheckCircle2, CheckCircle, ChevronRight, Trophy, Lock, Download, Edit3, Check, ChevronDown, Swords, Upload, FileText, Plus, Trash2 } from "lucide-react";
import CreateGameWizard from "@/components/game/CreateGameWizard";
import CalendarioTab from "@/components/game/CalendarioTab";
import FieldsReport from "@/components/fields/FieldsReport";
import ImageUploader from "@/components/ui/ImageUploader";
import { uploadFileToCloudinary } from "@/lib/cloudinary";

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
        scheduleBgUrl?: string;
        leagueId?: string;
        status?: string;
        startDate?: string;
        isPrivate?: boolean;
        league?: { name: string };
        teams: { id: string; name: string; shortName?: string; logoUrl?: string; managerName?: string; _count?: { rosterEntries: number } }[];
        games: { id: string; homeTeam: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number }; awayTeam: { id: string; name: string; shortName?: string; logoUrl?: string; wins?: number; losses?: number }; homeScore: number; awayScore: number; currentInning: number; half: string; status: string; scheduledDate: string; startTime?: string | null; endTime?: string | null; field?: string; fieldId?: string | null; round?: string; winningPitcher?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null; mvpBatter1?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null; mvpBatter2?: { id: string; firstName: string; lastName: string; photoUrl?: string } | null }[];
        fields: { id: string; name: string; location?: string; sportsUnit?: { id: string; name: string } | null }[];
        organizers: { id: string; user: { firstName?: string; lastName?: string; email: string } }[];
        news?: { id: string; title: string; description?: string; coverUrl?: string; facebookUrl?: string; type?: string; hasVideo?: boolean; createdAt: string }[];
    }
    const [tournament, setTournament] = useState<TournamentData | null>(null);
    const [loadingTournament, setLoadingTournament] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const { data } = await api.get(`/torneos/${tournamentId}`);
                setTournament(data);
                setLoadingTournament(false);
            } catch (err: any) {
                if (err?.response?.status === 403) setAccessDenied(true);
                console.error("Error fetching tournament:", err);
                setLoadingTournament(false);
            }
        };
        fetchTournament();
    }, [tournamentId]);

    // Actions & Modal State
    const [isCreatingGame, setIsCreatingGame] = useState(false);
    const [calendarPrefill, setCalendarPrefill] = useState<{ fieldId?: string; scheduledDate?: string; startTime?: string } | undefined>(undefined);
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

    // ── Documentos ────────────────────────────────────────────────────
    interface TournamentDoc {
        id: string;
        name: string;
        fileUrl: string;
        fileType: string;
        category: string;
        createdAt: string;
        uploadedBy?: { firstName: string; lastName: string };
    }
    const [documents, setDocuments] = useState<TournamentDoc[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await api.get(`/documents/tournament/${tournamentId}`);
            setDocuments(data || []);
        } catch { /* público, silencioso */ }
    }, [tournamentId]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const name = window.prompt('Nombre del documento:', file.name.replace(/\.[^.]+$/, ''));
        if (!name) { e.target.value = ''; return; }
        const categoryInput = window.prompt('Categoría (convocatoria / reglas / modo_juego / general):', 'general');
        const category = ['convocatoria', 'reglas', 'modo_juego', 'general'].includes(categoryInput || '') ? (categoryInput || 'general') : 'general';
        setUploadingDoc(true);
        try {
            const fileUrl = await uploadFileToCloudinary(file);
            const fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';
            await api.post('/documents', { tournamentId, name, fileUrl, fileType, category });
            await fetchDocuments();
        } catch (err: any) {
            alert(err?.message || 'Error al subir documento');
        } finally { setUploadingDoc(false); e.target.value = ''; }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!window.confirm('¿Eliminar este documento?')) return;
        try {
            await api.delete(`/documents/${docId}`);
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al eliminar documento');
        }
    };

    const downloadPlayerTemplate = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/template/players`, '_blank');
    };

    const CATEGORY_LABELS: Record<string, string> = {
        convocatoria: 'Convocatoria',
        reglas: 'Reglamento',
        modo_juego: 'Modo de Juego',
        general: 'General',
    };

    const [isAddingField, setIsAddingField] = useState(false);
    const [fieldForm, setFieldForm] = useState({ name: '', location: '', sportsUnitId: '' });
    const [leagueUnits, setLeagueUnits] = useState<{ id: string; name: string }[]>([]);
    const [addingFieldLoading, setAddingFieldLoading] = useState(false);

    const [isAddingTeam, setIsAddingTeam] = useState(false);

    const [userRole, setUserRole] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);

    const [teamForm, setTeamForm] = useState({
        name: '',
        shortName: '',
        managerName: '',
        homeFieldId: '',
        logoUrl: '',
        players: [] as { firstName: string; lastName: string; number: string; position: string }[]
    });
    const [teamCsvError, setTeamCsvError] = useState('');

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        season: '',
        description: '',
        rulesType: '',
        category: '',
        logoUrl: '',
        startDate: '',
        isPrivate: false,
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
                startDate: tournament.startDate ? tournament.startDate.substring(0, 10) : '',
                isPrivate: tournament.isPrivate ?? false,
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
                isPrivate: profileForm.isPrivate,
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
        const newPlayers = [...teamForm.players];
        newPlayers.splice(index, 1);
        setTeamForm({ ...teamForm, players: newPlayers });
    };

    const handleTeamCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTeamCsvError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { setTeamCsvError('El archivo no tiene datos de jugadores'); return; }
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                return { firstName: cols[0] || '', lastName: cols[1] || '', number: cols[2] || '', position: cols[3] || 'INF' };
            }).filter(r => r.firstName || r.lastName);
            if (rows.length === 0) { setTeamCsvError('No se encontraron jugadores válidos'); return; }
            setTeamForm(f => ({ ...f, players: rows }));
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    const downloadTeamCsvTemplate = () => {
        const csv = 'Nombre,Apellido,Número,Posición\nJuan,Pérez,5,SS\nMaría,López,12,OF';
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'plantilla_jugadores.csv'; a.click();
        URL.revokeObjectURL(url);
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
                    tournamentId: tournamentId,
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

    const [activeTab, setActiveTab] = useState<"informacion" | "equipos" | "juegos" | "calendario" | "posiciones" | "estadisticas">("informacion");
    const [calendarioSubTab, setCalendarioSubTab] = useState<'calendario' | 'ocupacion'>('calendario');

    // ── Calendar / Jornadas ────────────────────────────────────────────────────
    const [selectedRound, setSelectedRound] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // 'YYYY-MM-DD'
    const [weekOffset, setWeekOffset] = useState(0);
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [editRoundValue, setEditRoundValue] = useState('');
    const [exportingJornada, setExportingJornada] = useState(false);
    const calendarExportRef = useRef<HTMLDivElement>(null);

    const handleUpdateScheduleBg = async (url: string) => {
        try {
            await api.patch(`/torneos/${params.id}`, { scheduleBgUrl: url });
            setTournament(prev => prev ? { ...prev, scheduleBgUrl: url } : null);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar el fondo');
        }
    };

    const handleUpdateGameRound = async (gameId: string, round: string) => {
        try {
            await api.patch(`/games/${gameId}`, { round });
            setTournament(prev => prev ? {
                ...prev,
                games: prev.games.map(g => g.id === gameId ? { ...g, round } : g)
            } : null);
            setEditingGameId(null);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar jornada');
        }
    };

    const handleExportJornada = useCallback(async () => {
        if (!calendarExportRef.current) return;
        setExportingJornada(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(calendarExportRef.current, {
                backgroundColor: '#09090b',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `${tournament?.name || 'torneo'}-${selectedRound || 'calendario'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.92);
            link.click();
        } catch (err) {
            console.error(err);
            alert('Error al exportar imagen');
        } finally {
            setExportingJornada(false);
        }
    }, [calendarExportRef, selectedRound, tournament?.name]);

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
        gp: number; ab: number; h: number; h2: number; h3: number; hr: number; r: number; rbi: number;
        bb: number; hbp: number; so: number; sb: number; roe: number; avg: string;
        obp: string; slg: string; ops: string; pa: number; qualified: boolean;
    }
    interface PitchingRow {
        playerId: string; firstName: string; lastName: string; teamName: string; photoUrl?: string;
        gp: number; ip: string; ipOuts: number; h: number; r: number; er: number; bb: number; so: number;
        w: number; l: number; sv: number; qs: number; cg: number; sho: number; wp: number; bk: number;
        era: string; whip: string; k9: string; bb9: string; baa: string; qualified: boolean;
    }
    const [battingStats, setBattingStats] = useState<BattingRow[] | null>(null);
    const [pitchingStats, setPitchingStats] = useState<PitchingRow[] | null>(null);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [statsView, setStatsView] = useState<'batting' | 'pitching'>('batting');
    const [statsMinAB, setStatsMinAB] = useState(0);
    const [statsMinIPOuts, setStatsMinIPOuts] = useState(0);
    const [editingMinAB, setEditingMinAB] = useState('');
    const [editingMinIP, setEditingMinIP] = useState('');
    const [savingStatsConfig, setSavingStatsConfig] = useState(false);

    useEffect(() => {
        const fetchTournamentStats = async () => {
            if (activeTab === 'estadisticas' && !statsLoaded) {
                try {
                    const [battingRes, pitchingRes] = await Promise.all([
                        api.get(`/torneos/${tournamentId}/stats/batting`),
                        api.get(`/torneos/${tournamentId}/stats/pitching`),
                    ]);
                    setBattingStats(battingRes.data?.rows || []);
                    setPitchingStats(pitchingRes.data?.rows || []);
                    const minAB = battingRes.data?.minAB ?? 0;
                    const minIPOuts = battingRes.data?.minIPOuts ?? 0;
                    setStatsMinAB(minAB);
                    setStatsMinIPOuts(minIPOuts);
                    setEditingMinAB(String(minAB));
                    setEditingMinIP(String(Math.floor(minIPOuts / 3)));
                    setStatsLoaded(true);
                } catch (err: any) {
                    console.error("Error fetching tournament stats:", err);
                    setStatsLoaded(true);
                }
            }
        };
        fetchTournamentStats();
    }, [activeTab, statsLoaded, tournamentId]);

    const handleSaveStatsConfig = async () => {
        setSavingStatsConfig(true);
        try {
            const minAB = parseInt(editingMinAB) || 0;
            const minIPOuts = (parseInt(editingMinIP) || 0) * 3;
            await api.patch(`/torneos/${tournamentId}`, { minAB, minIPOuts });
            setStatsMinAB(minAB);
            setStatsMinIPOuts(minIPOuts);
            setStatsLoaded(false); // reload stats with new filters
        } catch (e) {
            console.error('Error saving stats config', e);
        } finally {
            setSavingStatsConfig(false);
        }
    };

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

    const tournamentRounds = useMemo(() => {
        const allGames = tournament?.games || [];
        const PLAYOFF_KEYWORDS = ['final', 'semi', 'cuarto', 'dieciseisavo', 'octavo', 'playoff', 'eliminacion'];
        const isPlayoff = (r?: string | null) => r ? PLAYOFF_KEYWORDS.some(k => r.toLowerCase().includes(k)) : false;
        const regularGames = allGames.filter((g: any) => !isPlayoff(g.round));
        return Array.from(new Set(regularGames.map((g: any) => g.round || 'Sin Jornada'))).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB || a.localeCompare(b);
        });
    }, [tournament]);

    const tabs = [
        { id: "informacion", label: "Información" },
        { id: "equipos", label: "Equipos" },
        { id: "juegos", label: "Juegos" },
        { id: "calendario", label: "Calendario" },
        { id: "posiciones", label: "Posiciones" },
        { id: "estadisticas", label: "Estadísticas" },
    ] as const;

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Torneo Privado</h2>
                    <p className="text-muted-foreground text-sm mb-6">Este torneo es privado. Solo los organizadores pueden acceder.</p>
                    <Link href="/torneos" className="text-primary hover:underline text-sm font-bold">Volver a torneos</Link>
                </main>
            </div>
        );
    }

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
                    <div className="bg-surface border border-muted/30 md:rounded-3xl overflow-hidden shadow-sm flex flex-col relative mb-8">

                        {/* Top Banner */}
                        <div className="relative h-48 md:h-64 bg-slate-800 overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-850" />
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />

                            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-20 md:pl-72 bg-gradient-to-t from-slate-900/90 to-transparent">
                                {(tournament?.location_city || tournament?.location_state) && (
                                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-primary font-black uppercase tracking-widest mb-2 drop-shadow-sm">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {[tournament?.location_city, tournament?.location_state].filter(Boolean).join(', ')}
                                    </div>
                                )}
                                <div className="text-[10px] md:text-xs text-left font-black uppercase tracking-[0.2em] text-white/40 mb-1">Pertenece a</div>
                                <h1 className="text-2xl md:text-4xl text-left font-black uppercase tracking-tight text-white drop-shadow-2xl leading-tight max-w-2xl">
                                    {tournament?.league?.name || tournament?.name}
                                    {tournament?.isPrivate && (
                                        <span className="ml-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-full border border-amber-500/30 uppercase tracking-widest align-middle">
                                            <Lock className="w-3 h-3" /> Privado
                                        </span>
                                    )}
                                </h1>
                            </div>
                        </div>

                        {/* Info Section - Now cleaner */}
                        <div className="bg-surface p-6 pb-8 md:pb-6 flex flex-col md:flex-row items-center md:items-end gap-6 relative">

                            {/* Logo Overlapping */}
                            <div className="md:absolute -top-25 left-6 w-32 h-32 md:w-56 md:h-56 bg-surface rounded-2xl md:rounded-3xl border-1 md:border-1 border-surface shadow-2xl overflow-hidden flex items-center justify-center shrink-0 z-20">
                                {tournament?.logoUrl ? (
                                    <img src={tournament.logoUrl} alt="Logo" className="w-full h-full bg-white object-contain p-2 hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                                        <Trophy className="w-12 h-12 text-muted-foreground opacity-20" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col items-center md:items-start md:ml-64 w-full text-center md:text-left">
                                <div className="flex flex-col md:flex-row justify-between w-full md:items-center gap-4">
                                    <div className="space-y-3">
                                        <h2 className="text-3xl text-xl md:text-4xl font-black text-foreground leading-none tracking-tighter">{tournament?.name}</h2>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                            <span className="w-32 sm:w-36 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground bg-muted/10 p-2 rounded-xl border border-muted/20 shadow-inner">
                                                <span className="text-base">{tournament?.rulesType?.includes('softball') ? '🥎' : '⚾'}</span>
                                                {tournament?.rulesType?.includes('softball') ? 'Softbol' : 'Béisbol'}
                                            </span>
                                            <span className="w-32 sm:w-36 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground bg-muted/10 p-2 rounded-xl border border-muted/20 shadow-inner">
                                                <Users className="w-3.5 h-3.5 text-primary" />
                                                {tournament?.teams?.length || 0} Equipos
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop action buttons */}
                                    <div className="hidden md:flex gap-3 shrink-0 self-end">
                                        <button className="h-12 w-12 rounded-2xl border border-muted/30 bg-muted/5 hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300" title="Compartir">
                                            <Radio className="w-5 h-5" />
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => setIsEditingProfile(true)} className="h-12 w-12 rounded-2xl border border-muted/30 bg-muted/5 hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300" title="Configuración">
                                                <Settings className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ NAVIGATION & ACTIONS ROW (OUTSIDE) ═══ */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                        {/* Mobile-First Tabs List */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 md:mx-0 md:px-0">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap rounded-xl transition-all duration-300 ${activeTab === tab.id
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Quick Actions Dropdown */}
                        {(canEdit || userRole === 'scorekeeper') && (
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                                    className={`w-full md:w-auto px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${isActionsOpen
                                        ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105'
                                        : 'bg-surface border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/50'
                                        }`}
                                >
                                    <Settings className={`w-4 h-4 transition-transform duration-500 ${isActionsOpen ? 'rotate-180' : ''}`} />
                                    Acciones del Torneo
                                </button>

                                <div className={`absolute right-0 top-full mt-3 w-64 bg-surface border border-muted/30 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 origin-top transform z-[100] ${isActionsOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
                                    <div className="p-3 space-y-1">
                                        <button onClick={() => { setIsCreatingGame(true); setIsActionsOpen(false); }} className="w-full group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all text-xs font-black uppercase tracking-widest">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            Programar Partido
                                        </button>

                                        {canEdit && (
                                            <>
                                                <button onClick={() => { setIsAddingTeam(true); setIsActionsOpen(false); setTeamForm({ name: '', shortName: '', managerName: '', homeFieldId: '', logoUrl: '', players: [] }); setTeamCsvError(''); }} className="w-full group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all text-xs font-black uppercase tracking-widest">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    Registrar Equipo
                                                </button>
                                                <button onClick={() => { setIsAddingField(true); setIsActionsOpen(false); }} className="w-full group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all text-xs font-black uppercase tracking-widest">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    Gestionar Campos
                                                </button>
                                                <button onClick={() => { setIsCreatingNews(true); setIsActionsOpen(false); }} className="w-full group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all text-xs font-black uppercase tracking-widest">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                        <Radio className="w-4 h-4" />
                                                    </div>
                                                    Nueva Noticia
                                                </button>

                                                {tournament?.status !== 'completed' && (
                                                    <button
                                                        onClick={() => { setIsActionsOpen(false); handleFinalizeTournament(); }}
                                                        className="w-full group flex items-center gap-4 p-3.5 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all text-xs font-black uppercase tracking-widest border-t border-muted/20 mt-2 pt-4"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </div>
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

                {/* ═══ MAIN LAYOUT ═══ */}
                <div className="max-w-7xl mx-auto px-1 md:px-4 py-6">

                    {/* Main Content Area */}
                    <div className="w-full min-w-0">
                        {activeTab === 'informacion' && (
                            <div className="animate-fade-in-up space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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


                                    {/* ══ CALENDARIO / TEMPORADA ACTUAL ══ */}
                                    {(() => {
                                        const allGames = tournament?.games || [];
                                        // Group by round; ungrouped goes to "Sin Jornada"
                                        const PLAYOFF_KEYWORDS = ['final', 'semi', 'cuarto', 'dieciseisavo', 'octavo', 'playoff', 'eliminacion'];
                                        const isPlayoff = (r?: string | null) => r ? PLAYOFF_KEYWORDS.some(k => r.toLowerCase().includes(k)) : false;

                                        const regularGames = allGames.filter(g => !isPlayoff(g.round));
                                        const playoffGames = allGames.filter(g => isPlayoff(g.round));

                                        // Unique rounds for regular season, sorted
                                        const rounds = tournamentRounds;

                                        const activeRound = selectedRound ?? rounds[0] ?? null;

                                        // ── Week navigator helpers ─────────────────────────────────────
                                        const today = new Date();
                                        const getWeekDays = (offset: number) => {
                                            const monday = new Date(today);
                                            const day = today.getDay(); // 0=Sun,1=Mon...
                                            const diffToMon = day === 0 ? -6 : 1 - day;
                                            monday.setDate(today.getDate() + diffToMon + offset * 7);
                                            return Array.from({ length: 7 }, (_, i) => {
                                                const d = new Date(monday);
                                                d.setDate(monday.getDate() + i);
                                                return d;
                                            });
                                        };
                                        const weekDays = getWeekDays(weekOffset);
                                        const toYMD = (d: Date) => d.toISOString().slice(0, 10);
                                        const todayYMD = toYMD(today);

                                        // Days that have games (in current jornada or all if no jornada)
                                        const gamesInRound = activeRound ? regularGames.filter(g => (g.round || 'Sin Jornada') === activeRound) : regularGames;
                                        const daysWithGames = new Set(gamesInRound.map(g => toYMD(new Date(g.scheduledDate))));

                                        // Final visible games: filter by round then by date
                                        const visibleGames = gamesInRound.filter(g => !selectedDate || toYMD(new Date(g.scheduledDate)) === selectedDate);

                                        // Playoff bracket rounds order
                                        const playoffRoundOrder = ['Dieciseisavos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'];
                                        const playoffRounds = Array.from(new Set(playoffGames.map(g => g.round!))).sort((a, b) => {
                                            const ia = playoffRoundOrder.findIndex(r => a.toLowerCase().includes(r.toLowerCase().split(' ')[0]));
                                            const ib = playoffRoundOrder.findIndex(r => b.toLowerCase().includes(r.toLowerCase().split(' ')[0]));
                                            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                                        });

                                        const CompactGameCard = ({ game }: { game: typeof allGames[0] }) => {
                                            const isEditing = editingGameId === game.id;
                                            const dest = game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`;
                                            const fieldName = tournament?.fields?.find(f => f.id === game.field)?.name || game.field || null;

                                            return (
                                                <div className="relative group">
                                                    <Link href={dest} className="block bg-muted/5 border border-muted/20 rounded-xl overflow-hidden hover:border-primary/40 hover:bg-muted/10 transition-all duration-200 cursor-pointer">
                                                        {/* Card Header */}
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b border-muted/10">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(game.scheduledDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                &nbsp;&bull;&nbsp;
                                                                {new Date(game.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {game.status === 'in_progress' && (
                                                                <span className="text-[9px] font-black text-red-500 flex items-center gap-1 animate-pulse">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> EN VIVO
                                                                </span>
                                                            )}
                                                            {game.status === 'finished' && (
                                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Final</span>
                                                            )}
                                                        </div>
                                                        {/* Teams Row */}
                                                        <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                                                            {/* Away */}
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className="w-7 h-7 rounded-full bg-surface border border-muted/30 flex items-center justify-center overflow-hidden shrink-0 text-[9px] font-black">
                                                                    {game.awayTeam.logoUrl ? <img src={game.awayTeam.logoUrl} alt="" className="w-full h-full object-cover" /> : (game.awayTeam.shortName || game.awayTeam.name.substring(0, 2))}
                                                                </div>
                                                                <span className="text-xs font-black truncate leading-tight">{game.awayTeam.shortName || game.awayTeam.name}</span>
                                                            </div>
                                                            {/* Score or VS */}
                                                            <div className="flex items-center gap-1 shrink-0 px-1">
                                                                {game.status === 'scheduled' ? (
                                                                    <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest">VS</span>
                                                                ) : (
                                                                    <span className="text-sm font-black tabular-nums">{game.awayScore} - {game.homeScore}</span>
                                                                )}
                                                            </div>
                                                            {/* Home */}
                                                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                                <span className="text-xs font-black truncate leading-tight text-right">{game.homeTeam.shortName || game.homeTeam.name}</span>
                                                                <div className="w-7 h-7 rounded-full bg-surface border border-muted/30 flex items-center justify-center overflow-hidden shrink-0 text-[9px] font-black">
                                                                    {game.homeTeam.logoUrl ? <img src={game.homeTeam.logoUrl} alt="" className="w-full h-full object-cover" /> : (game.homeTeam.shortName || game.homeTeam.name.substring(0, 2))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Field */}
                                                        {fieldName && (
                                                            <div className="px-3 pb-2 flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                <span className="truncate">{fieldName}</span>
                                                            </div>
                                                        )}
                                                    </Link>
                                                    {/* Organizer: Edit Jornada inline */}
                                                    {canEdit && (
                                                        <div className="absolute top-1.5 right-2 z-10">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                                                                    <input
                                                                        autoFocus
                                                                        value={editRoundValue}
                                                                        onChange={e => setEditRoundValue(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateGameRound(game.id, editRoundValue); if (e.key === 'Escape') setEditingGameId(null); }}
                                                                        className="w-24 text-[10px] bg-background border border-primary/50 rounded-md px-1.5 py-1 text-foreground outline-none"
                                                                        placeholder="Ej: J1"
                                                                    />
                                                                    <button onClick={() => handleUpdateGameRound(game.id, editRoundValue)} className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={e => { e.preventDefault(); setEditingGameId(game.id); setEditRoundValue(game.round || ''); }}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/20 border border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/50 flex items-center gap-0.5"
                                                                    title="Asignar jornada"
                                                                >
                                                                    <Edit3 className="w-2.5 h-2.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm space-y-5">
                                                {/* ── Header ── */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <h3 className="text-lg font-bold text-foreground">Calendario</h3>
                                                    <div className="flex items-center gap-4">
                                                        {canEdit && (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fondo del Póster</span>
                                                                <div className="scale-75 origin-right">
                                                                    <ImageUploader
                                                                        value={tournament?.scheduleBgUrl || ''}
                                                                        onChange={handleUpdateScheduleBg}
                                                                        size="sm"
                                                                        placeholder="🏔️"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={handleExportJornada}
                                                            disabled={exportingJornada || !activeRound}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all disabled:opacity-40"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                            {exportingJornada ? 'Exportando...' : 'Exportar Jornada'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* ── Jornada Tabs ── */}
                                                {rounds.length > 0 && (
                                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                                                        <button
                                                            onClick={() => { setSelectedRound(null); setSelectedDate(null); }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 shrink-0 ${!activeRound ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-muted/10 text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
                                                        >
                                                            Todas
                                                        </button>
                                                        {rounds.map(r => (
                                                            <button
                                                                key={r}
                                                                onClick={() => { setSelectedRound(r); setSelectedDate(null); }}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 shrink-0 ${activeRound === r ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-muted/10 text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
                                                            >
                                                                {r}
                                                            </button>
                                                        ))}
                                                        {canEdit && (
                                                            <span className="text-[9px] text-muted-foreground/50 font-medium whitespace-nowrap ml-2 shrink-0">
                                                                Hover sobre un juego para asignar jornada
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Week Date Navigator ── */}
                                                <div className="flex items-center gap-0 border border-muted/20 rounded-xl overflow-hidden bg-muted/5">
                                                    {/* Prev week */}
                                                    <button
                                                        onClick={() => { setWeekOffset(w => w - 1); setSelectedDate(null); }}
                                                        className="flex items-center justify-center w-9 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors shrink-0 border-r border-muted/20"
                                                    >
                                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                                    </button>

                                                    {/* Days */}
                                                    <div className="flex flex-1 overflow-x-auto scrollbar-hide md:grid md:grid-cols-7">
                                                        {weekDays.map(d => {
                                                            const ymd = toYMD(d);
                                                            const isToday = ymd === todayYMD;
                                                            const isSelected = selectedDate === ymd;
                                                            const hasGames = daysWithGames.has(ymd);
                                                            const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
                                                            return (
                                                                <button
                                                                    key={ymd}
                                                                    onClick={() => setSelectedDate(isSelected ? null : ymd)}
                                                                    className={`flex flex-col items-center justify-center px-3 py-2 min-w-[52px] transition-all duration-200 relative
                                                                        ${isSelected ? 'bg-primary text-white' : isToday ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                                                >
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                                                                        {dayNames[d.getDay()]}
                                                                    </span>
                                                                    <span className={`text-sm leading-tight ${isToday && !isSelected ? 'font-black' : 'font-bold'}`}>
                                                                        {d.getDate()}
                                                                    </span>
                                                                    <span className={`text-[8px] font-bold uppercase ${isSelected ? 'text-white/70' : 'text-muted-foreground/50'}`}>
                                                                        {d.toLocaleDateString('es-MX', { month: 'short' })}
                                                                    </span>
                                                                    {/* Dot indicator */}
                                                                    {hasGames && !isSelected && (
                                                                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Next week */}
                                                    <button
                                                        onClick={() => { setWeekOffset(w => w + 1); setSelectedDate(null); }}
                                                        className="flex items-center justify-center w-9 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors shrink-0 border-l border-muted/20"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>

                                                    {/* Calendar icon / go to today */}
                                                    <button
                                                        onClick={() => { setWeekOffset(0); setSelectedDate(todayYMD); }}
                                                        title="Ir a hoy"
                                                        className="flex items-center justify-center w-9 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors shrink-0 border-l border-muted/20"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* ── Export Template (hidden, captured by html2canvas) ── */}
                                                <div
                                                    ref={calendarExportRef}
                                                    style={{
                                                        position: 'fixed', top: '-9999px', left: '-9999px',
                                                        width: '1080px',
                                                        minHeight: '1920px',
                                                        backgroundColor: '#09090b',
                                                        backgroundImage: tournament?.scheduleBgUrl ? `url(${tournament.scheduleBgUrl})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        overflow: 'hidden',
                                                        fontFamily: 'system-ui, sans-serif',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    aria-hidden
                                                >
                                                    {/* Dark overlay for readability if custom bg is used */}
                                                    {tournament?.scheduleBgUrl && (
                                                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 0 }} />
                                                    )}

                                                    {/* Background Stripes Decorations (Only if no custom bg) */}
                                                    {!tournament?.scheduleBgUrl && (
                                                        <>
                                                            <div style={{ position: 'absolute', top: '-150px', left: '-150px', width: '600px', height: '300px', background: 'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 50px, #09090b 50px, #09090b 100px)', transform: 'rotate(-45deg)', zIndex: 0 }} />
                                                            <div style={{ position: 'absolute', top: '-150px', right: '-150px', width: '600px', height: '300px', background: 'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 50px, #09090b 50px, #09090b 100px)', transform: 'rotate(45deg)', zIndex: 0 }} />
                                                            <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '600px', height: '300px', background: 'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 50px, #09090b 50px, #09090b 100px)', transform: 'rotate(45deg)', zIndex: 0 }} />
                                                            <div style={{ position: 'absolute', bottom: '-150px', right: '-150px', width: '600px', height: '300px', background: 'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 50px, #09090b 50px, #09090b 100px)', transform: 'rotate(-45deg)', zIndex: 0 }} />
                                                        </>
                                                    )}

                                                    {/* Main Content container */}
                                                    <div style={{ position: 'relative', zIndex: 10, width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '140px 80px 80px' }}>
                                                        
                                                        {/* Logo */}
                                                        {tournament?.logoUrl ? (
                                                            <div style={{ width: '120px', height: '120px', backgroundColor: 'white', borderRadius: '15px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                                                <img src={tournament.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                            </div>
                                                        ) : (
                                                            <Trophy style={{ width: '120px', height: '120px', color: '#ffffff', marginBottom: '15px' }} />
                                                        )}

                                                        {/* LEAGUE NAME */}
                                                        <p style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ffffff', margin: '0 0 25px 0', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                                            {tournament?.league?.name || tournament?.name}
                                                        </p>

                                                        {/* MATCH SCHEDULE TEXT */}
                                                        <h1 style={{ fontSize: '90px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', margin: '0 0 60px 0', lineHeight: 1, textAlign: 'center', letterSpacing: '-2px', textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
                                                            {activeRound || 'MATCH SCHEDULE'}
                                                        </h1>

                                                        {/* Games List (Table-like grid without borders) */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', width: '100%' }}>
                                                            {visibleGames.slice(0, 10).map(game => {
                                                                const fn = tournament?.fields?.find(f => f.id === game.field)?.name || game.field || 'Estadio Por Definir';
                                                                return (
                                                                    <div key={game.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                        {/* Teams Row */}
                                                                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                                                                            {/* Away Team */}
                                                                            <div style={{ flex: 1, backgroundColor: '#f59e0b', padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', minHeight: '60px' }}>
                                                                                <span style={{ fontSize: '24px', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                    {game.awayTeam.name}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {/* VS */}
                                                                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', flexShrink: 0, userSelect: 'none', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>VS</span>
                                                                            
                                                                            {/* Home Team */}
                                                                            <div style={{ flex: 1, backgroundColor: '#f59e0b', padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', minHeight: '60px' }}>
                                                                                <span style={{ fontSize: '24px', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                    {game.homeTeam.name}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Stadium & Date */}
                                                                        <div style={{ textAlign: 'center', color: '#e4e4e7', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
                                                                            <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{fn}</p>
                                                                            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
                                                                                {new Date(game.scheduledDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} <span style={{opacity:0.5}}>•</span> {new Date(game.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Force Footer to bottom */}
                                                        <div style={{ flex: 1 }}></div>

                                                        {/* Footer */}
                                                        <p style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginTop: '60px', letterSpacing: '0.05em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                                            www.tourneytru.com
                                                        </p>
                                                    </div>
                                                </div>


                                                {/* ── Games Grid ── */}
                                                {visibleGames.length === 0 ? (
                                                    <div className="bg-muted/5 border border-muted/20 rounded-xl p-8 text-center">
                                                        <p className="text-muted-foreground text-sm font-medium">
                                                            {rounds.length === 0 ? 'Aún no hay juegos programados.' : selectedDate ? 'No hay juegos en esta fecha.' : 'No hay juegos en esta jornada.'}
                                                        </p>
                                                        {selectedDate && (
                                                            <button onClick={() => setSelectedDate(null)} className="mt-2 text-[11px] text-primary font-bold hover:underline">
                                                                Ver todos los juegos de la jornada
                                                            </button>
                                                        )}
                                                        {canEdit && rounds.length === 0 && (
                                                            <p className="text-[11px] text-muted-foreground/60 mt-1">Programa juegos y asígnales una jornada desde el menú Acciones.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {visibleGames.map(game => (
                                                            <CompactGameCard key={game.id} game={game} />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* ── Playoffs Bracket ── */}
                                                {playoffGames.length > 0 && (
                                                    <div className="pt-4 border-t border-muted/20">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Swords className="w-4 h-4 text-amber-500" />
                                                            <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Playoffs</h4>
                                                        </div>
                                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                                            {playoffRounds.map(pr => (
                                                                <div key={pr} className="shrink-0 min-w-[180px]">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-2">{pr}</p>
                                                                    <div className="space-y-2">
                                                                        {playoffGames.filter(g => g.round === pr).map(game => {
                                                                            const dest = game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`;
                                                                            const awayWon = game.status === 'finished' && game.awayScore > game.homeScore;
                                                                            const homeWon = game.status === 'finished' && game.homeScore > game.awayScore;
                                                                            return (
                                                                                <Link key={game.id} href={dest} className="block bg-muted/5 border border-muted/20 rounded-xl overflow-hidden hover:border-amber-500/40 transition-colors">
                                                                                    {[{ team: game.awayTeam, score: game.awayScore, won: awayWon }, { team: game.homeTeam, score: game.homeScore, won: homeWon }].map(({ team, score, won }) => (
                                                                                        <div key={team.id} className={`flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 border-muted/10 ${won ? 'bg-amber-500/5' : ''}`}>
                                                                                            <div className="w-5 h-5 rounded-full bg-surface border border-muted/30 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black">
                                                                                                {team.logoUrl ? <img src={team.logoUrl} alt="" className="w-full h-full object-cover" /> : (team.shortName || team.name.substring(0, 2))}
                                                                                            </div>
                                                                                            <span className={`text-xs font-black truncate flex-1 ${won ? 'text-amber-500' : 'text-foreground'}`}>{team.shortName || team.name}</span>
                                                                                            {game.status !== 'scheduled' && <span className={`text-xs font-black tabular-nums shrink-0 ${won ? 'text-amber-500' : 'text-muted-foreground'}`}>{score}</span>}
                                                                                        </div>
                                                                                    ))}
                                                                                </Link>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        );
                                    })()}

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
                                                        <Link href={game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`} key={game.id} className="block group">
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
                                    {/* ══ DOCUMENTOS ══ */}
                                    {(tournament?.status === 'upcoming' || tournament?.status === 'active') && (
                                        <section className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-5">
                                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-primary" /> Documentos
                                                </h3>
                                                {canEdit && (
                                                    <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer px-3 py-1.5 rounded-lg border transition ${uploadingDoc ? 'border-muted/20 text-muted-foreground cursor-not-allowed' : 'border-primary/40 text-primary hover:bg-primary/10'}`}>
                                                        {uploadingDoc ? 'Subiendo...' : <><Plus className="w-3.5 h-3.5" /> Subir documento</>}
                                                        {!uploadingDoc && <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={handleUploadDocument} className="hidden" />}
                                                    </label>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {/* Plantilla de jugadores — siempre presente */}
                                                <div className="flex items-center justify-between p-3 bg-muted/5 border border-muted/20 rounded-xl hover:border-primary/30 transition-colors group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                                            <FileText className="w-4 h-4 text-green-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-foreground truncate">Plantilla de Jugadores</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">CSV · Para importar roster</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={downloadPlayerTemplate} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-500/10 rounded-lg transition">
                                                        <Download className="w-3.5 h-3.5" /> Descargar
                                                    </button>
                                                </div>

                                                {/* Documentos subidos */}
                                                {documents.map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/5 border border-muted/20 rounded-xl hover:border-primary/30 transition-colors group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                                <FileText className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                                                                    {CATEGORY_LABELS[doc.category] || doc.category} · {doc.fileType.toUpperCase()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition">
                                                                <Download className="w-3.5 h-3.5" /> Abrir
                                                            </a>
                                                            {canEdit && (
                                                                <button onClick={() => handleDeleteDocument(doc.id)} className="p-1.5 text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {documents.length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic text-center py-3">
                                                        {canEdit ? 'Sube la convocatoria, el reglamento y el modo de juego.' : 'No hay documentos publicados aún.'}
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    )}

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
                                                <button
                                                    onClick={async () => {
                                                        setIsAddingField(true);
                                                        if (tournament?.leagueId && leagueUnits.length === 0) {
                                                            try {
                                                                const { data } = await api.get(`/leagues/${tournament.leagueId}/sports-units`);
                                                                setLeagueUnits(data.map((u: any) => ({ id: u.id, name: u.name })));
                                                            } catch {}
                                                        }
                                                    }}
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
                                                            {field.sportsUnit && (
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{field.sportsUnit.name}</p>
                                                            )}
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
                                                            <p className="text-sm text-muted-foreground">{team._count?.rosterEntries || 0} jugadores</p>
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
                                    onClick={() => router.push(game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`)}
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
                                            {tournament?.fields?.find(f => f.id === game.field)?.name || game.field || 'Sede Local'}
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
                                                                        <div className="w-10 h-10 text-xs md:w-12 md:h-12 rounded-full bg-surface border-2 border-amber-500/50 overflow-hidden shadow-md shrink-0">
                                                                            <img src={game.winningPitcher.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.winningPitcher.firstName}`} alt="PG" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    </Link>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                                                            <Trophy className="w-3 h-3" /> PG
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
                                                href={game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`}
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

                        {activeTab === 'calendario' && tournament && (
                            <div className="animate-fade-in-up space-y-4">
                                {/* Sub-tabs */}
                                <div className="flex gap-1 border-b border-muted/20 pb-0">
                                    <button
                                        onClick={() => setCalendarioSubTab('calendario')}
                                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-t-lg transition-colors ${calendarioSubTab === 'calendario' ? 'bg-primary/10 text-primary border border-b-0 border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        📅 Calendario
                                    </button>
                                    {tournament.leagueId && canEdit && (
                                        <button
                                            onClick={() => setCalendarioSubTab('ocupacion')}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-t-lg transition-colors ${calendarioSubTab === 'ocupacion' ? 'bg-primary/10 text-primary border border-b-0 border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            📊 Ocupación de campos
                                        </button>
                                    )}
                                </div>

                                {calendarioSubTab === 'calendario' && (
                                    <CalendarioTab
                                        tournamentId={tournamentId}
                                        leagueId={tournament.leagueId ?? ''}
                                        canEdit={canEdit}
                                        games={tournament.games as any}
                                        rounds={tournamentRounds}
                                        onOpenCreateWizard={(prefill) => {
                                            setCalendarPrefill(prefill);
                                            setIsCreatingGame(true);
                                        }}
                                        onGameClick={(gameId) => {
                                            const game = tournament.games.find(g => g.id === gameId);
                                            if (!game) return;
                                            if (game.status === 'scheduled') router.push(`/gamescheduled/${gameId}`);
                                            else if (game.status === 'live') router.push(`/gamecast/${gameId}`);
                                            else if (game.status === 'finished') router.push(`/gamefinalizado/${gameId}`);
                                        }}
                                        onRefresh={() => window.location.reload()}
                                    />
                                )}

                                {calendarioSubTab === 'ocupacion' && tournament.leagueId && canEdit && (
                                    <FieldsReport
                                        leagueId={tournament.leagueId}
                                        tournamentId={tournamentId}
                                        tournamentName={tournament.name}
                                        leagueName={tournament.league?.name}
                                        rounds={tournamentRounds}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'posiciones' && (
                            <div className="space-y-6 animate-fade-in-up">

                                {/* ── PODIO (solo torneo finalizado) ── */}
                                {tournament?.status === 'finished' && standingsLoaded && standings && standings.length >= 1 && (() => {
                                    const [first, second, third] = standings;
                                    const TeamLogo = ({ s, size }: { s: typeof standings[0]; size: string }) => (
                                        <div className={`${size} rounded-2xl bg-surface border-2 border-muted/30 flex items-center justify-center font-black text-foreground overflow-hidden shadow-lg`}>
                                            {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain p-1" /> : (s.shortName || s.name.substring(0, 2).toUpperCase())}
                                        </div>
                                    );
                                    return (
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-8 shadow-sm">
                                            <h3 className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest mb-8">Campeones del Torneo</h3>
                                            <div className="flex items-end justify-center gap-4 sm:gap-8">
                                                {/* 2do lugar */}
                                                {second && (
                                                    <div className="flex flex-col items-center gap-3 pb-2">
                                                        <TeamLogo s={second} size="w-16 h-16 sm:w-20 sm:h-20" />
                                                        <div className="text-center">
                                                            <p className="text-2xl">🥈</p>
                                                            <p className="font-black text-foreground text-sm mt-1 max-w-[100px] truncate">{second.name}</p>
                                                            <p className="text-xs text-muted-foreground">{second.w}G · {second.l}P</p>
                                                        </div>
                                                        <div className="w-20 sm:w-24 h-14 bg-muted/20 border-t-2 border-muted/30 rounded-t-xl flex items-center justify-center">
                                                            <span className="text-2xl font-black text-muted-foreground">2</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* 1er lugar */}
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="relative">
                                                        <TeamLogo s={first} size="w-20 h-20 sm:w-28 sm:h-28 border-amber-500/50" />
                                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl">🏆</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-3xl">🥇</p>
                                                        <p className="font-black text-foreground text-base mt-1 max-w-[130px] truncate">{first.name}</p>
                                                        <p className="text-xs text-amber-400 font-bold">{first.w}G · {first.l}P · {first.pct}</p>
                                                    </div>
                                                    <div className="w-20 sm:w-24 h-20 bg-amber-500/10 border-t-2 border-amber-500/40 rounded-t-xl flex items-center justify-center">
                                                        <span className="text-3xl font-black text-amber-400">1</span>
                                                    </div>
                                                </div>
                                                {/* 3er lugar */}
                                                {third && (
                                                    <div className="flex flex-col items-center gap-3 pb-2">
                                                        <TeamLogo s={third} size="w-14 h-14 sm:w-18 sm:h-18" />
                                                        <div className="text-center">
                                                            <p className="text-2xl">🥉</p>
                                                            <p className="font-black text-foreground text-sm mt-1 max-w-[100px] truncate">{third.name}</p>
                                                            <p className="text-xs text-muted-foreground">{third.w}G · {third.l}P</p>
                                                        </div>
                                                        <div className="w-20 sm:w-24 h-10 bg-amber-900/10 border-t-2 border-amber-900/30 rounded-t-xl flex items-center justify-center">
                                                            <span className="text-xl font-black text-amber-700">3</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ── TABLA GENERAL ── */}
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-6 border-b border-muted/20">
                                        <h3 className="text-lg font-bold text-foreground">Tabla General</h3>
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
                                                            <td className="px-6 py-4 font-black text-foreground flex items-center gap-2">
                                                                {i === 0 && <span className="text-amber-400">🥇</span>}
                                                                {i === 1 && <span className="text-muted-foreground">🥈</span>}
                                                                {i === 2 && <span className="text-amber-700">🥉</span>}
                                                                {i > 2 && i + 1}
                                                            </td>
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
                            </div>
                        )}

                        {activeTab === 'estadisticas' && tournament?.status === 'finished' && statsLoaded && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-foreground mb-1">Campeones Individuales</h3>
                                    <p className="text-sm text-muted-foreground">{tournament?.name} · {tournament?.season}</p>
                                </div>

                                {/* Bateo */}
                                <div>
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-muted/40 inline-block" /> Líderes de Bateo <span className="w-6 h-px bg-muted/40 inline-block" />
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Promedio de Bateo', key: 'avg', icon: '⚾', sort: (a: any, b: any) => parseFloat(b.avg) - parseFloat(a.avg), qualified: true },
                                            { label: 'Home Runs', key: 'hr', icon: '💥', sort: (a: any, b: any) => b.hr - a.hr, qualified: false },
                                            { label: 'Carreras Impulsadas', key: 'rbi', icon: '🏃', sort: (a: any, b: any) => b.rbi - a.rbi, qualified: false },
                                            { label: 'OPS', key: 'ops', icon: '📊', sort: (a: any, b: any) => parseFloat(b.ops) - parseFloat(a.ops), qualified: true },
                                            { label: 'Hits', key: 'h', icon: '🎯', sort: (a: any, b: any) => b.h - a.h, qualified: false },
                                            { label: 'Bases Robadas', key: 'sb', icon: '💨', sort: (a: any, b: any) => (b.sb || 0) - (a.sb || 0), qualified: false },
                                        ].map(cat => {
                                            const pool = cat.qualified ? (battingStats || []).filter(p => p.qualified) : (battingStats || []);
                                            const champion = [...pool].sort(cat.sort)[0];
                                            if (!champion) return null;
                                            return (
                                                <div key={cat.label} className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 text-center">
                                                    <p className="text-2xl mb-2">{cat.icon}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">{cat.label}</p>
                                                    <div className="w-14 h-14 rounded-full mx-auto mb-3 overflow-hidden border-2 border-amber-500/30 shadow-md bg-muted/20">
                                                        <img src={champion.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${champion.firstName}${champion.lastName}`} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="font-black text-foreground text-sm leading-tight">{champion.firstName} {champion.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground mb-2">{champion.teamName}</p>
                                                    <p className="text-2xl font-black text-amber-400">{(champion as any)[cat.key]}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pitcheo */}
                                <div>
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-muted/40 inline-block" /> Líderes de Pitcheo <span className="w-6 h-px bg-muted/40 inline-block" />
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'ERA Más Baja', key: 'era', icon: '🏆', sort: (a: any, b: any) => parseFloat(a.era) - parseFloat(b.era), qualified: true },
                                            { label: 'Más Victorias', key: 'w', icon: '✅', sort: (a: any, b: any) => b.w - a.w, qualified: true },
                                            { label: 'Más Ponches', key: 'so', icon: '🔥', sort: (a: any, b: any) => b.so - a.so, qualified: true },
                                            { label: 'Más Salvados', key: 'sv', icon: '🛡️', sort: (a: any, b: any) => (b.sv || 0) - (a.sv || 0), qualified: false },
                                        ].map(cat => {
                                            const pool = cat.qualified ? (pitchingStats || []).filter(p => p.qualified) : (pitchingStats || []);
                                            const champion = [...pool].sort(cat.sort)[0];
                                            if (!champion) return null;
                                            return (
                                                <div key={cat.label} className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 text-center">
                                                    <p className="text-2xl mb-2">{cat.icon}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">{cat.label}</p>
                                                    <div className="w-14 h-14 rounded-full mx-auto mb-3 overflow-hidden border-2 border-primary/30 shadow-md bg-muted/20">
                                                        <img src={champion.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${champion.firstName}${champion.lastName}`} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="font-black text-foreground text-sm leading-tight">{champion.firstName} {champion.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground mb-2">{champion.teamName}</p>
                                                    <p className="text-2xl font-black text-primary">{(champion as any)[cat.key]}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'estadisticas' && tournament?.status !== 'finished' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Stats config for organizers/presi/admin */}
                                {canEdit && (
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm">
                                        <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Mínimos para Lideratos</h4>
                                        <div className="flex flex-wrap gap-4 items-end">
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Mín. AB (bateo)</label>
                                                <input
                                                    type="number" min="0" value={editingMinAB}
                                                    onChange={e => setEditingMinAB(e.target.value)}
                                                    className="w-24 px-3 py-2 bg-background border border-muted/30 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Mín. IP (picheo)</label>
                                                <input
                                                    type="number" min="0" value={editingMinIP}
                                                    onChange={e => setEditingMinIP(e.target.value)}
                                                    className="w-24 px-3 py-2 bg-background border border-muted/30 rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSaveStatsConfig}
                                                disabled={savingStatsConfig}
                                                className="px-5 py-2 bg-primary rounded-xl text-xs font-black text-white hover:bg-primary-light transition-all disabled:opacity-50"
                                            >
                                                {savingStatsConfig ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <p className="text-[10px] text-muted-foreground self-end pb-2">SV (salvamentos) no requieren mínimo de IP.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-center">
                                    <div className="bg-surface border border-muted/30 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                                        <button onClick={() => setStatsView('batting')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statsView === 'batting' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/5'}`}>Bateo</button>
                                        <button onClick={() => setStatsView('pitching')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statsView === 'pitching' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/5'}`}>Pitcheo</button>
                                    </div>
                                </div>

                                {statsView === 'batting' ? (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Líderes de Bateo</h3>
                                                {statsMinAB > 0 && (
                                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/10 border border-muted/20 px-3 py-1 rounded-full uppercase tracking-wider">Mín. {statsMinAB} AB calificados</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'AVG', key: 'avg', sort: (a: any, b: any) => parseFloat(b.avg) - parseFloat(a.avg) },
                                                    { label: 'OPS', key: 'ops', sort: (a: any, b: any) => parseFloat(b.ops) - parseFloat(a.ops) },
                                                    { label: 'HR', key: 'hr', sort: (a: any, b: any) => b.hr - a.hr },
                                                    { label: 'RBI', key: 'rbi', sort: (a: any, b: any) => b.rbi - a.rbi }
                                                ].map(cat => {
                                                    const qualified = (battingStats || []).filter(p => p.qualified);
                                                    const top4 = [...qualified].sort(cat.sort).slice(0, 4);
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
                                            <div className="p-6 border-b border-muted/20 flex items-center justify-between flex-wrap gap-2">
                                                <h3 className="text-lg font-bold text-foreground">Estadísticas Detalladas de Bateo</h3>
                                                {statsMinAB > 0 && <span className="text-[10px] text-muted-foreground">* No calificado (menos de {statsMinAB} AB)</span>}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-muted/5">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Jugador</th>
                                                            <th className="px-4 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">Equipo</th>
                                                            {['JJ', 'PA', 'AB', 'H', '2B', '3B', 'HR', 'R', 'RBI', 'BB', 'HBP', 'SO', 'SB', 'ROE', 'AVG', 'OBP', 'SLG', 'OPS'].map(h => (
                                                                <th key={h} className="px-3 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-muted/10">
                                                        {battingStats?.map((p, i) => (
                                                            <tr key={`${p.playerId}-${i}`} className={`hover:bg-muted/5 transition-colors ${!p.qualified && statsMinAB > 0 ? 'opacity-50' : ''}`}>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/20 border border-muted/30 shrink-0">
                                                                            <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="" className="w-full object-cover h-full" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{p.firstName} {p.lastName}{!p.qualified && statsMinAB > 0 ? ' *' : ''}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 text-[11px] text-muted-foreground text-center font-medium">{p.teamName}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.gp}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.pa}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.ab}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-bold text-foreground">{p.h}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.h2}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.h3}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-primary">{p.hr}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.r}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.rbi}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.bb}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.hbp}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.so}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.sb}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).roe ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.avg}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.obp}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.slg}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-primary bg-primary/10">{p.ops}</td>
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
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Líderes de Pitcheo</h3>
                                                {statsMinIPOuts > 0 && (
                                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/10 border border-muted/20 px-3 py-1 rounded-full uppercase tracking-wider">Mín. {Math.floor(statsMinIPOuts / 3)} IP calificados · SV sin mínimo</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'ERA', key: 'era', sort: (a: any, b: any) => parseFloat(a.era) - parseFloat(b.era), requiresIP: true },
                                                    { label: 'WHIP', key: 'whip', sort: (a: any, b: any) => parseFloat(a.whip) - parseFloat(b.whip), requiresIP: true },
                                                    { label: 'K (PONCHES)', key: 'so', sort: (a: any, b: any) => b.so - a.so, requiresIP: true },
                                                    { label: 'W (VICTORIAS)', key: 'w', sort: (a: any, b: any) => b.w - a.w, requiresIP: true },
                                                    { label: 'SV (SALVADOS)', key: 'sv', sort: (a: any, b: any) => (b.sv || 0) - (a.sv || 0), requiresIP: false },
                                                    { label: 'QS (ARRANQUES)', key: 'qs', sort: (a: any, b: any) => (b.qs || 0) - (a.qs || 0), requiresIP: true },
                                                ].map(cat => {
                                                    const pool = cat.requiresIP
                                                        ? (pitchingStats || []).filter(p => p.qualified)
                                                        : (pitchingStats || []);
                                                    const top4 = [...pool].sort(cat.sort).slice(0, 4);
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
                                            <div className="p-6 border-b border-muted/20 flex items-center justify-between flex-wrap gap-2">
                                                <h3 className="text-lg font-bold text-foreground">Estadísticas Detalladas de Pitcheo</h3>
                                                {statsMinIPOuts > 0 && <span className="text-[10px] text-muted-foreground">* No calificado (menos de {Math.floor(statsMinIPOuts / 3)} IP)</span>}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-muted/5">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Lanzador</th>
                                                            {['Equipo', 'JJ', 'W', 'L', 'SV', 'IP', 'H', 'CL', 'CL-L', 'BB', 'K', 'QS', 'CG', 'SHO', 'WP', 'BK', 'ERA', 'WHIP', 'K/9', 'BB/9'].map(h => (
                                                                <th key={h} className="px-3 py-3 font-bold text-center text-muted-foreground text-[10px] uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-muted/10">
                                                        {pitchingStats?.map((p, i) => (
                                                            <tr key={`${p.playerId}-${i}`} className={`hover:bg-muted/5 transition-colors ${!p.qualified && statsMinIPOuts > 0 ? 'opacity-50' : ''}`}>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/20 border border-muted/30 shrink-0">
                                                                            <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="" className="w-full object-cover h-full" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{p.firstName} {p.lastName}{!p.qualified && statsMinIPOuts > 0 ? ' *' : ''}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 text-[11px] text-muted-foreground text-center font-medium">{p.teamName}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.gp}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-emerald-600">{(p as any).w ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-red-500">{(p as any).l ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-amber-500">{(p as any).sv ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-bold text-foreground">{p.ip}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.h}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.r}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.er}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.bb}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-bold text-foreground">{p.so}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).qs ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).cg ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).sho ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).wp ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{(p as any).bk ?? 0}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.era}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-black text-foreground bg-primary/5">{p.whip}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.k9}</td>
                                                                <td className="px-3 py-3 text-sm text-center font-medium text-muted-foreground">{p.bb9}</td>
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
                    leagueId={tournament?.leagueId}
                    calendarPrefill={calendarPrefill}
                    onClose={() => { setIsCreatingGame(false); setCalendarPrefill(undefined); }}
                    onGameCreated={() => { setIsCreatingGame(false); setCalendarPrefill(undefined); window.location.reload(); }}
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
                            <h2 className="text-xl font-black text-foreground">Añadir Campo a la Liga</h2>
                            <button onClick={() => { setIsAddingField(false); setFieldForm({ name: '', location: '', sportsUnitId: '' }); }} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            {leagueUnits.length > 0 ? (
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Unidad Deportiva</label>
                                    <select
                                        value={fieldForm.sportsUnitId}
                                        onChange={e => setFieldForm({ ...fieldForm, sportsUnitId: e.target.value })}
                                        className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium"
                                    >
                                        <option value="">— Selecciona una unidad —</option>
                                        {leagueUnits.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground bg-muted/10 rounded-lg p-3">
                                    Los campos pertenecen a la liga y se comparten entre todos los torneos. Ve a <strong>Unid. Deportivas</strong> en el panel de administración para gestionar unidades.
                                </p>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Campo</label>
                                <input type="text" placeholder="Ej. Estadio Mobil Super" value={fieldForm.name} onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Dirección / Enlace Google Maps</label>
                                <input type="text" placeholder="Ej. Av. Manuel L. Barragán o https://maps.google.com/..." value={fieldForm.location} onChange={e => setFieldForm({ ...fieldForm, location: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                            </div>
                            <div className="flex justify-end pt-4 gap-3 border-t border-muted/10 mt-6">
                                <button onClick={() => { setIsAddingField(false); setFieldForm({ name: '', location: '', sportsUnitId: '' }); }} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">Cancelar</button>
                                <button
                                    disabled={addingFieldLoading || !fieldForm.name.trim()}
                                    className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
                                    onClick={async () => {
                                        if (!tournament?.leagueId || !fieldForm.name.trim()) return;
                                        setAddingFieldLoading(true);
                                        try {
                                            await api.post(`/leagues/${tournament.leagueId}/fields`, {
                                                name: fieldForm.name.trim(),
                                                location: fieldForm.location.trim() || undefined,
                                                sportsUnitId: fieldForm.sportsUnitId || undefined,
                                            });
                                            setIsAddingField(false);
                                            setFieldForm({ name: '', location: '', sportsUnitId: '' });
                                            // Refrescar datos del torneo
                                            const { data } = await api.get(`/torneos/${tournamentId}`);
                                            setTournament(data);
                                        } catch (err: any) {
                                            alert(err?.response?.data?.message ?? 'Error al registrar campo');
                                        } finally {
                                            setAddingFieldLoading(false);
                                        }
                                    }}
                                >
                                    {addingFieldLoading ? 'Guardando…' : 'Guardar Campo'}
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
                            {/* Toggle privacidad */}
                            <div className="flex items-center justify-between p-4 bg-muted/5 border border-muted/20 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Torneo Privado</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Solo los organizadores podrán ver este torneo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setProfileForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${profileForm.isPrivate ? 'bg-amber-500' : 'bg-muted/30'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profileForm.isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
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

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-muted/20 pb-2">
                                        <h3 className="text-lg font-bold text-primary">
                                            Jugadores <span className="text-muted-foreground font-medium text-sm">(opcional)</span>
                                            {teamForm.players.length > 0 && <span className="ml-2 text-foreground text-base">— {teamForm.players.length}</span>}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {/* CSV import */}
                                            <button type="button" onClick={downloadTeamCsvTemplate} className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                <Download className="w-3.5 h-3.5" />
                                                Plantilla
                                            </button>
                                            <label className="text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                                                <Upload className="w-3.5 h-3.5" />
                                                Importar CSV
                                                <input type="file" accept=".csv" onChange={handleTeamCsvFile} className="hidden" />
                                            </label>
                                            <button type="button" onClick={handleAddPlayerToForm} className="text-xs font-bold bg-muted/20 hover:bg-muted/30 text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                <Plus className="w-3.5 h-3.5" />
                                                Añadir Fila
                                            </button>
                                        </div>
                                    </div>

                                    {teamCsvError && (
                                        <p className="text-sm text-red-400 font-medium">{teamCsvError}</p>
                                    )}

                                    {teamForm.players.length === 0 ? (
                                        <div className="py-8 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted/20 rounded-2xl text-center">
                                            <FileText className="w-8 h-8 text-muted-foreground/50" />
                                            <div>
                                                <p className="text-sm font-bold text-muted-foreground">Sin jugadores agregados</p>
                                                <p className="text-xs text-muted-foreground/70 mt-0.5">Puedes agregar filas manualmente o importar un CSV</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {teamForm.players.map((player: any, index: number) => (
                                                <div key={index} className="flex flex-col sm:flex-row gap-3 bg-muted/5 p-3 rounded-xl border border-muted/10 relative group transition-colors hover:border-primary/30">
                                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-muted/20 rounded-full flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm">{index + 1}</div>
                                                    <div className="flex-1 ml-4 sm:ml-2">
                                                        <input type="text" placeholder="Nombre" value={player.firstName} onChange={e => handleTeamPlayerChange(index, 'firstName', e.target.value)} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-bold transition-colors" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input type="text" placeholder="Apellido" value={player.lastName} onChange={e => handleTeamPlayerChange(index, 'lastName', e.target.value)} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-bold transition-colors" />
                                                    </div>
                                                    <div className="w-full sm:w-20">
                                                        <input type="text" placeholder="Dorsal" maxLength={3} value={player.number} onChange={e => handleTeamPlayerChange(index, 'number', e.target.value.replace(/[^0-9]/g, ''))} className="w-full text-sm bg-transparent border-b border-muted/30 focus:border-primary outline-none py-1.5 font-mono text-center font-bold transition-colors placeholder:font-sans" />
                                                    </div>
                                                    <div className="w-full sm:w-24">
                                                        <select value={player.position} onChange={e => handleTeamPlayerChange(index, 'position', e.target.value)} className="w-full text-sm bg-surface border border-muted/30 focus:border-primary outline-none rounded py-1.5 px-2 font-bold transition-colors appearance-none">
                                                            {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'INF', 'OF', 'UT'].map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                                        </select>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemovePlayerFromForm(index)} className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-500/10 border border-red-500/20 rounded-full items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors hidden group-hover:flex">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <div className="flex justify-end pt-4 border-t border-muted/20">
                                    <button type="submit" className="px-8 py-3 rounded-xl font-black bg-primary text-white hover:bg-primary-light transition-colors shadow-lg shadow-primary/20">
                                        {teamForm.players.filter((p: any) => p.firstName && p.lastName).length > 0
                                            ? `Registrar Equipo con ${teamForm.players.filter((p: any) => p.firstName && p.lastName).length} jugadores`
                                            : 'Registrar Equipo'}
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
