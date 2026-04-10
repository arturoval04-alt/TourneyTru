"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { getUser } from '@/lib/auth';
import api from "@/lib/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Settings, Share2, ArrowLeft, Users, Trophy, Flag, MapPin, ExternalLink, Clock, Star, Activity, X, CheckCircle, UserPlus, Search, Plus, Upload, Download, FileText, AlertTriangle, XCircle
} from "lucide-react";
import PlayerHoverCard from "@/components/PlayerHoverCard";
import ImageUploader from "@/components/ui/ImageUploader";

type ImportRowStatus = 'pending_confirm' | 'duplicate_global' | 'duplicate_tournament' | 'duplicate_team';

interface ImportRowResult {
    row: number;
    status: ImportRowStatus;
    firstName: string;
    lastName: string;
    secondLastName?: string | null;
    existing?: {
        id: string;
        firstName: string;
        lastName: string;
        secondLastName?: string | null;
        photoUrl?: string | null;
        birthPlace?: string | null;
        isVerified: boolean;
        team: { id: string; name: string; shortName?: string | null; tournament: { id: string; name: string; season: string } };
    };
}

interface DuplicateModalState {
    level: 'global' | 'team' | 'tournament';
    existing: ImportRowResult['existing'];
    pendingData: {
        firstName: string; lastName: string; secondLastName?: string;
        number?: number; position?: string; bats?: string; throws?: string; teamId: string;
    };
}

interface BattingStats {
    games: number; atBats: number; runs: number; hits: number; h2: number; h3: number; hr: number; rbi: number; bb: number; so: number; hbp: number; sac: number;
    avg: string; obp: string; slg: string; ops: string; gs?: number;
}

interface PitchingStats {
    games: number; wins: number; losses: number; ip: number; h: number; r: number; er: number; bb: number; so: number; era: string; whip: string;
    gs?: number; k9?: string; bb9?: string;
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

interface RosterEntry {
    id: string;
    playerId: string;
    number?: number;
    position?: string;
    player: {
        id: string; firstName: string; lastName: string;
        secondLastName?: string | null;
        position?: string; photoUrl?: string;
        bats?: string; throws?: string; isVerified: boolean;
        stats?: { batting: BattingStats; pitching: PitchingStats };
    };
    joinedAt: string;
}

interface TeamData {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    managerName?: string;
    tournament?: { id: string; name: string; category?: string };
    rosterEntries: RosterEntry[];
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
    const validTabs = ["juegos", "jugadores", "estadisticas"] as const;

    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"juegos" | "jugadores" | "estadisticas">("juegos");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null);

    const [statsType, setStatsType] = useState<"bateo" | "pitcheo">("bateo");

    const router = useRouter();
    const searchParams = useSearchParams();

    const [canEdit, setCanEdit] = useState(false);
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    // Restore the current tab from the URL and auto-open CSV import if requested.
    useEffect(() => {
        const requestedTab = searchParams?.get('tab');
        if (requestedTab && validTabs.includes(requestedTab as typeof validTabs[number])) {
            setActiveTab(requestedTab as typeof validTabs[number]);
        }
        if (searchParams?.get('import') === 'true') {
            setShowAddPlayerModal(true);
            setAddPlayerTab('csv');
            setActiveTab('jugadores');
            writeTeamUrlState('jugadores');
        }
    }, [searchParams]);

    useEffect(() => {
        writeTeamUrlState(activeTab);
    }, [activeTab]);

    // Add Verified Player modal state
    const [showAddVerifiedModal, setShowAddVerifiedModal] = useState(false);
    const [verifiedSearch, setVerifiedSearch] = useState('');
    const [verifiedResults, setVerifiedResults] = useState<any[]>([]);
    const [searchingVerified, setSearchingVerified] = useState(false);
    const [addingRoster, setAddingRoster] = useState<string | null>(null);

    // Add Player Modal state
    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
    const [addPlayerTab, setAddPlayerTab] = useState<'manual' | 'csv'>('manual');
    const [newPlayerForm, setNewPlayerForm] = useState({ firstName: '', lastName: '', secondLastName: '', number: '', position: 'INF', bats: 'R', throws: 'R', curp: '', birthDate: '', birthPlace: '' });
    const [addingPlayer, setAddingPlayer] = useState(false);
    const [csvRows, setCsvRows] = useState<{ firstName: string; lastName: string; secondLastName: string; number: string; position: string; bats: string; throws: string; curp: string; birthDate: string; birthPlace: string }[]>([]);
    const [csvError, setCsvError] = useState('');
    const [importingCsv, setImportingCsv] = useState(false);

    // Import preview state (2-step CSV flow)
    const [importPreview, setImportPreview] = useState<ImportRowResult[] | null>(null);
    const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
    const [importChecked, setImportChecked] = useState<Set<number>>(new Set());
    const [importSummary, setImportSummary] = useState<{ pendingConfirm: number; globalWarnings: number; blocked: number } | null>(null);
    const [confirmingImport, setConfirmingImport] = useState(false);
    const [liveValidation, setLiveValidation] = useState<any>(null);
    const [checkingLive, setCheckingLive] = useState(false);

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
    const [editingJerseyEntryId, setEditingJerseyEntryId] = useState<string | null>(null);
    const [jerseyDraft, setJerseyDraft] = useState('');
    const [savingJerseyEntryId, setSavingJerseyEntryId] = useState<string | null>(null);

    const writeTeamUrlState = (tab: typeof validTabs[number], includeImport = false) => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        params.set("tab", tab);
        if (includeImport) params.set("import", "true");
        else params.delete("import");
        const query = params.toString();
        const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: nextUrl, url: nextUrl }, "", nextUrl);
    };

    const refreshTeamData = async (tabToKeep: typeof validTabs[number] = activeTab) => {
        try {
            const { data } = await api.get(`/teams/${teamId}`);
            setTeam(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setActiveTab(tabToKeep);
            writeTeamUrlState(tabToKeep);
        }
    };

    const beginJerseyEdit = (entryId: string, currentNumber?: number | null) => {
        if (!canEdit) return;
        setEditingJerseyEntryId(entryId);
        setJerseyDraft(currentNumber == null ? '' : String(currentNumber));
    };

    const saveJerseyNumber = async (entryId: string) => {
        if (!canEdit) return;

        const trimmed = jerseyDraft.trim();
        if (trimmed !== '') {
            const parsed = Number(trimmed);
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
                alert('El número de jersey debe estar entre 0 y 99.');
                return;
            }
        }

        setSavingJerseyEntryId(entryId);
        try {
            const payload = { number: trimmed === '' ? null : Number(trimmed) };
            const { data } = await api.patch(`/roster/${entryId}`, payload);
            setTeam(prev => prev ? {
                ...prev,
                rosterEntries: prev.rosterEntries.map((entry) =>
                    entry.id === entryId
                        ? { ...entry, number: data?.number ?? payload.number ?? undefined }
                        : entry,
                ),
            } : prev);
        } catch (error) {
            console.error(error);
            alert('No se pudo actualizar el número de jersey.');
            return;
        } finally {
            setSavingJerseyEntryId(null);
            setEditingJerseyEntryId(null);
            setJerseyDraft('');
        }
    };


    useEffect(() => {
        if (!team) return;
        const user = getUser();
        if (!user) return;
        if (user.role === 'admin') { setCanEdit(true); return; }
        if ((user.role === 'organizer' || user.role === 'presi') && team.tournament?.id) {
            api.get(`/torneos/${team.tournament.id}`)
                .then(({ data: t }) => {
                    if (t?.organizers?.some((o: any) => o.user?.id === user.id || o.userId === user.id)) {
                        setCanEdit(true);
                    }
                })
                .catch(() => { });
        }
    }, [team]);

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

    // Live Validation for Manual Player Creation
    useEffect(() => {
        if (!showAddPlayerModal || addPlayerTab !== 'manual') return;

        const fn = newPlayerForm.firstName.trim();
        const ln = newPlayerForm.lastName.trim();
        if (fn.length < 2 || ln.length < 2) {
            setLiveValidation(null);
            return;
        }

        const timeoutId = setTimeout(() => {
            setCheckingLive(true);
            const params = new URLSearchParams({
                fn: fn,
                ln: ln,
                sln: newPlayerForm.secondLastName?.trim() || '',
                teamId: team?.id || '',
                tourneyId: team?.tournament?.id || ''
            });
            api.get(`/players/check-duplicate?${params}`)
                .then(res => setLiveValidation(res.data))
                .catch(err => console.error(err))
                .finally(() => setCheckingLive(false));
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [newPlayerForm.firstName, newPlayerForm.lastName, newPlayerForm.secondLastName, showAddPlayerModal, addPlayerTab, team]);

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
                photoUrl: playerForm.photoUrl,
                teamId,
                tournamentId: team?.tournament?.id
            });

            alert('Información del Jugador Actualizada');
            setIsEditingPlayer(false);
            setSelectedPlayer(null);
            await refreshTeamData(activeTab);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar jugador');
        }
    };

    const handleVerifiedSearch = async (q: string) => {
        setVerifiedSearch(q);
        if (q.trim().length < 2) { setVerifiedResults([]); return; }
        setSearchingVerified(true);
        try {
            const { data } = await api.get(`/players/verified?q=${encodeURIComponent(q)}&excludeTeamId=${teamId}`);
            setVerifiedResults(data);
        } catch { setVerifiedResults([]); }
        finally { setSearchingVerified(false); }
    };

    const handleAddToRoster = async (player: any) => {
        if (!team?.tournament?.id) return;
        setAddingRoster(player.id);
        try {
            await api.post('/roster', {
                playerId: player.id,
                teamId,
                tournamentId: team.tournament.id,
            });
            setShowAddVerifiedModal(false);
            setVerifiedSearch('');
            setVerifiedResults([]);
            await refreshTeamData(activeTab);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Error al agregar jugador';
            alert(msg);
        } finally { setAddingRoster(null); }
    };

    const handleDeactivatePlayer = async (rosterEntryId: string, playerName: string) => {
        if (!confirm(`¿Dar de baja a ${playerName} de este equipo? El jugador seguirá existiendo en el sistema y su historial se conservará.`)) return;
        try {
            await api.delete(`/roster/${rosterEntryId}`);
            setTeam(prev => prev ? { ...prev, rosterEntries: prev.rosterEntries.filter(e => e.id !== rosterEntryId) } : prev);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al dar de baja al jugador');
        }
    };

    const handleAddPlayerManual = async (e: React.FormEvent, forceCreate = false) => {
        e.preventDefault();
        setAddingPlayer(true);
        const payload = {
            firstName: newPlayerForm.firstName,
            lastName: newPlayerForm.lastName,
            secondLastName: newPlayerForm.secondLastName || undefined,
            number: newPlayerForm.number ? parseInt(newPlayerForm.number) : undefined,
            position: newPlayerForm.position || undefined,
            bats: newPlayerForm.bats,
            throws: newPlayerForm.throws,
            curp: newPlayerForm.curp || undefined,
            birthDate: newPlayerForm.birthDate || undefined,
            birthPlace: newPlayerForm.birthPlace || undefined,
            teamId,
            tournamentId: team?.tournament?.id,
            ...(forceCreate ? { forceCreate: true } : {}),
        };
        try {
            await api.post('/players', payload);
            setNewPlayerForm({ firstName: '', lastName: '', secondLastName: '', number: '', position: 'INF', bats: 'R', throws: 'R', curp: '', birthDate: '', birthPlace: '' });
            setShowAddPlayerModal(false);
            await refreshTeamData(activeTab);
        } catch (err: any) {
            const data = err?.response?.data;
            alert(data?.message || 'Error al agregar jugador');
        } finally { setAddingPlayer(false); }
    };

    const downloadCsvTemplate = () => {
        const csv = 'Nombre,Apellido,ApellidoMaterno,Número,Posición,Bats,Throws,CURP,FechaNacimiento,LugarNacimiento\nJuan,Pérez,García,5,SS,R,R,,1990-05-24,Hermosillo\nMaría,López,,12,OF,L,R,AAAA000000AAAAAA00,,';
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_jugadores.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvError('');
        setImportPreview(null);
        setImportStep('upload');
        setImportChecked(new Set());
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { setCsvError('El archivo no tiene datos de jugadores'); return; }
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                return {
                    firstName: cols[0] || '',
                    lastName: cols[1] || '',
                    secondLastName: cols[2] || '',
                    number: cols[3] || '',
                    position: cols[4] || 'INF',
                    bats: cols[5] || 'R',
                    throws: cols[6] || 'R',
                    curp: cols[7] || '',
                    birthDate: cols[8] || '',
                    birthPlace: cols[9] || '',
                };
            }).filter(r => r.firstName || r.lastName);
            if (rows.length === 0) { setCsvError('No se encontraron jugadores válidos'); return; }
            setCsvRows(rows);
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    // Etapa 1: enviar al backend para obtener preview con estados por fila
    const handleCsvPreview = async () => {
        const valid = csvRows.filter(r => r.firstName && r.lastName);
        if (valid.length === 0) { setCsvError('Cada jugador necesita al menos nombre y apellido'); return; }
        setImportingCsv(true);
        setCsvError('');
        try {
            const { data } = await api.post('/players/import', {
                teamId,
                tournamentId: team?.tournament?.id,
                players: valid.map(r => ({
                    firstName: r.firstName,
                    lastName: r.lastName,
                    secondLastName: r.secondLastName || undefined,
                    number: r.number ? parseInt(r.number) : undefined,
                    position: r.position || undefined,
                    bats: ['R', 'L', 'S'].includes(r.bats) ? r.bats : undefined,
                    throws: ['R', 'L'].includes(r.throws) ? r.throws : undefined,
                    curp: r.curp || undefined,
                    birthDate: r.birthDate || undefined,
                    birthPlace: r.birthPlace || undefined,
                })),
            });
            setImportPreview(data.results);
            setImportSummary(data.summary);
            // Pre-seleccionar todos los elegibles (verde y amarillo)
            const eligible = new Set<number>(
                (data.results as ImportRowResult[])
                    .filter(r => r.status === 'pending_confirm' || r.status === 'duplicate_global')
                    .map(r => r.row)
            );
            setImportChecked(eligible);
            setImportStep('preview');
        } catch (err: any) {
            setCsvError(err?.response?.data?.message || 'Error al verificar jugadores');
        } finally { setImportingCsv(false); }
    };

    // Etapa 2: confirmar los seleccionados
    const handleConfirmImport = async () => {
        if (!importPreview) return;
        setConfirmingImport(true);
        const selected = importPreview.filter(r => importChecked.has(r.row));
        const toCreate = selected
            .filter(r => r.status === 'pending_confirm')
            .map(r => {
                const orig = csvRows.find(c => c.firstName === r.firstName && c.lastName === r.lastName);
                return {
                    firstName: r.firstName,
                    lastName: r.lastName,
                    secondLastName: r.secondLastName || undefined,
                    number: orig?.number ? parseInt(orig.number) : undefined,
                    position: orig?.position || undefined,
                    bats: orig?.bats || undefined,
                    throws: orig?.throws || undefined,
                    curp: orig?.curp || undefined,
                    birthDate: orig?.birthDate || undefined,
                    birthPlace: orig?.birthPlace || undefined,
                };
            });
        const toRoster = selected
            .filter(r => r.status === 'duplicate_global' && r.existing)
            .map(r => ({ playerId: r.existing!.id }));
        try {
            await api.post('/players/confirm-import', { 
                teamId, 
                tournamentId: team?.tournament?.id,
                toCreate, 
                toRoster 
            });
            setShowAddPlayerModal(false);
            setCsvRows([]);
            setImportPreview(null);
            setImportStep('upload');
            await refreshTeamData(activeTab);
        } catch (err: any) {
            setCsvError(err?.response?.data?.message || 'Error al confirmar importación');
        } finally { setConfirmingImport(false); }
    };

    const resetCsvState = () => {
        setCsvRows([]);
        setCsvError('');
        setImportPreview(null);
        setImportStep('upload');
        setImportChecked(new Set());
        setImportSummary(null);
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
            await refreshTeamData(activeTab);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };


    useEffect(() => {
        const requestedTab = searchParams?.get('tab');
        const initialTab = requestedTab && validTabs.includes(requestedTab as typeof validTabs[number])
            ? (requestedTab as typeof validTabs[number])
            : 'juegos';
        refreshTeamData(initialTab);
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
                            {canEdit && (
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
                                    {canEdit && (
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
                                        <p className="text-xs md:text-sm font-medium text-white">{team.rosterEntries?.length || 0} Jugadores</p>
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
                                                    <div key={game.id} onClick={() => router.push(game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`)} className={`${bgGradient} border ${borderClass} rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow relative cursor-pointer`}>
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
                        <div className="animate-fade-in-up space-y-6">
                            {/* Header with Add buttons */}
                            {canEdit && team.tournament?.id && (
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                        onClick={() => { setShowAddPlayerModal(true); setAddPlayerTab('manual'); setCsvRows([]); setCsvError(''); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Jugador
                                    </button>
                                    <button
                                        onClick={() => { setShowAddVerifiedModal(true); setVerifiedSearch(''); setVerifiedResults([]); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Añadir Verificado
                                    </button>
                                </div>
                            )}

                            {/* Roster */}
                            {!team.rosterEntries || team.rosterEntries.length === 0 ? (
                                <div className="py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                    <p className="text-muted-foreground">No hay jugadores registrados.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
                                    {team.rosterEntries.map((entry) => {
                                        const p = entry.player;
                                        return (
                                            <div key={entry.id} className="group/card w-full">
                                                <PlayerHoverCard
                                                    playerId={p.id}
                                                    firstName={p.firstName}
                                                    lastName={p.lastName}
                                                    photoUrl={p.photoUrl}
                                                    position={entry.position || p.position}
                                                    number={entry.number ?? undefined}
                                                    teamName={team.name}
                                                >
                                                    <div className="relative bg-surface border border-muted/30 rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col items-center p-4 hover:-translate-y-1 h-full">
                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeactivatePlayer(entry.id, `${p.firstName} ${p.lastName}`); }}
                                                                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 hover:bg-amber-500/30 transition-all"
                                                                title="Dar de baja"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        {p.isVerified && (
                                                            <span className="absolute top-2 left-2 text-emerald-400" title="Verificado">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        <div className="w-16 h-16 bg-muted/5 rounded-full mb-3 mt-2 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-colors shadow-inner shrink-0">
                                                            {p.photoUrl ? (
                                                                <img src={p.photoUrl} alt={`${p.firstName} ${p.lastName}`} className="w-full h-full object-cover group-hover:scale-110 duration-300" />
                                                            ) : (
                                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={80} height={80} className="opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300" />
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-center group-hover:text-primary transition-colors text-sm leading-tight line-clamp-2 min-h-[2.5rem] flex items-center justify-center w-full">{p.firstName} {p.lastName}</h3>
                                                        <div className="flex gap-2 items-center mt-2">
                                                            {editingJerseyEntryId === entry.id ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={99}
                                                                    autoFocus
                                                                    value={jerseyDraft}
                                                                    onChange={(e) => setJerseyDraft(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onBlur={() => void saveJerseyNumber(entry.id)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            void saveJerseyNumber(entry.id);
                                                                        }
                                                                        if (e.key === 'Escape') {
                                                                            setEditingJerseyEntryId(null);
                                                                            setJerseyDraft('');
                                                                        }
                                                                    }}
                                                                    disabled={savingJerseyEntryId === entry.id}
                                                                    className="w-16 rounded-md border border-primary/30 bg-background px-2 py-1 text-xs font-black text-foreground outline-none focus:border-primary"
                                                                />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        beginJerseyEdit(entry.id, entry.number);
                                                                    }}
                                                                    disabled={!canEdit || savingJerseyEntryId === entry.id}
                                                                    className={`rounded-md px-2 py-1 text-xs font-black transition ${
                                                                        canEdit
                                                                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                                            : 'bg-muted/10 text-muted-foreground'
                                                                    }`}
                                                                    title={canEdit ? 'Editar jersey' : 'Número de jersey'}
                                                                >
                                                                    {savingJerseyEntryId === entry.id ? '...' : entry.number != null ? `#${entry.number}` : canEdit ? 'Asignar #' : '#-'}
                                                                </button>
                                                            )}
                                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                                                                {entry.position || p.position || 'INF'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </PlayerHoverCard>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">GS</th>
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
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">SLG</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/10">OPS</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JJ</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">GS</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JG</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">JP</th>
                                                        <th className="px-4 py-4 text-xs font-black text-primary text-center bg-primary/5">IP</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">H</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">R</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">BB</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">K</th>
                                                        <th className="px-5 py-4 text-xs font-black text-primary text-center bg-primary/5">ERA</th>
                                                        <th className="px-5 py-4 text-xs font-black text-primary text-center bg-primary/5">WHIP</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">K/9</th>
                                                        <th className="px-3 py-4 text-xs font-black text-muted-foreground text-center">BB/9</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {team.rosterEntries
                                                .map(e => e.player)
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
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.batting.gs || 0}</td>
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
                                                                <td className="px-4 py-4 text-sm font-bold text-primary/80 text-center bg-primary/5">{p.stats?.batting.slg}</td>
                                                                <td className="px-4 py-4 text-sm font-black text-primary/90 text-center bg-primary/10">{p.stats?.batting.ops}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.games}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.gs || 0}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.wins}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.losses}</td>
                                                                <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{p.stats?.pitching.ip}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.h}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.r}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.bb}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-foreground text-center">{p.stats?.pitching.so}</td>
                                                                <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{p.stats?.pitching.era}</td>
                                                                <td className="px-5 py-4 text-sm font-bold text-primary/80 text-center bg-primary/5">{p.stats?.pitching.whip}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-muted-foreground text-center">{p.stats?.pitching.k9}</td>
                                                                <td className="px-3 py-4 text-sm font-medium text-muted-foreground text-center">{p.stats?.pitching.bb9}</td>
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
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.batting.gs || 0}</td>
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
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.batting.slg}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/10">{team.stats?.batting.ops}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.gamesPlayed}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.gs || 0}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.wins}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.losses}</td>
                                                        <td className="px-4 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.ip}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.h}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.r}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.bb}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.so}</td>
                                                        <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.era}</td>
                                                        <td className="px-5 py-4 text-sm font-black text-primary text-center bg-primary/5">{team.stats?.pitching.whip}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.k9}</td>
                                                        <td className="px-3 py-4 text-sm font-black text-primary text-center">{team.stats?.pitching.bb9}</td>
                                                    </>
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {team.rosterEntries.map(e => e.player).filter(p => statsType === 'bateo' ? (p.stats?.batting.atBats || 0) > 0 : (p.stats?.pitching.ip || 0) > 0).length === 0 && (
                                    <div className="py-20 text-center">
                                        <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground font-medium">No hay suficientes datos para generar esta tabla aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* MODAL AGREGAR JUGADOR (MANUAL / CSV) */}
                {showAddPlayerModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                        <div className="bg-surface w-full max-w-3xl rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-foreground">Agregar Jugadores</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Uno por uno o importa el roster completo desde un archivo</p>
                                </div>
                                <button onClick={() => setShowAddPlayerModal(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-muted/20 shrink-0">
                                <button
                                    onClick={() => setAddPlayerTab('manual')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${addPlayerTab === 'manual' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Plus className="w-4 h-4" />
                                    Manual
                                </button>
                                <button
                                    onClick={() => setAddPlayerTab('csv')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${addPlayerTab === 'csv' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Upload className="w-4 h-4" />
                                    Importar CSV
                                </button>
                            </div>

                            {/* Tab: Manual */}
                            {addPlayerTab === 'manual' && (
                                <div className="flex flex-col lg:flex-row overflow-y-auto h-full">
                                    <form onSubmit={handleAddPlayerManual} className="p-6 space-y-4 flex-1 border-b lg:border-b-0 lg:border-r border-muted/20">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre *</label>
                                                <input required type="text" value={newPlayerForm.firstName} onChange={e => setNewPlayerForm({ ...newPlayerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" placeholder="Juan" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Paterno *</label>
                                                <input required type="text" value={newPlayerForm.lastName} onChange={e => setNewPlayerForm({ ...newPlayerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" placeholder="Pérez" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Materno <span className="normal-case font-normal">(opcional)</span></label>
                                            <input type="text" value={newPlayerForm.secondLastName} onChange={e => setNewPlayerForm({ ...newPlayerForm, secondLastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" placeholder="García" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">CURP <span className="normal-case font-normal">(opcional)</span></label>
                                                <input type="text" maxLength={18} value={newPlayerForm.curp} onChange={e => setNewPlayerForm({ ...newPlayerForm, curp: e.target.value.toUpperCase() })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium font-mono tracking-wide" placeholder="AAAA000000AAAAAA00" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fecha de Nac. <span className="normal-case font-normal">(opcional)</span></label>
                                                <input type="date" value={newPlayerForm.birthDate} onChange={e => setNewPlayerForm({ ...newPlayerForm, birthDate: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Lugar de Nacimiento <span className="normal-case font-normal">(opcional)</span></label>
                                            <input type="text" maxLength={100} value={newPlayerForm.birthPlace} onChange={e => setNewPlayerForm({ ...newPlayerForm, birthPlace: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" placeholder="Ej: Hermosillo, Sonora" />
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 sm:gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Dorsal</label>
                                                <input type="number" min={0} max={99} value={newPlayerForm.number} onChange={e => setNewPlayerForm({ ...newPlayerForm, number: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium" placeholder="5" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Pos.</label>
                                                <select value={newPlayerForm.position} onChange={e => setNewPlayerForm({ ...newPlayerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                                    <option value="INF">INF</option>
                                                    <option value="OF">OF</option>
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
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Bat.</label>
                                                <select value={newPlayerForm.bats} onChange={e => setNewPlayerForm({ ...newPlayerForm, bats: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                                    <option value="R">R</option>
                                                    <option value="L">L</option>
                                                    <option value="S">S</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tira</label>
                                                <select value={newPlayerForm.throws} onChange={e => setNewPlayerForm({ ...newPlayerForm, throws: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-medium">
                                                    <option value="R">R</option>
                                                    <option value="L">L</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-muted/10">
                                            <button 
                                                type="submit" 
                                                disabled={addingPlayer || checkingLive || (liveValidation?.level === 'team') || (liveValidation?.level === 'tournament')} 
                                                className="px-6 py-3 w-full sm:w-auto bg-primary text-primary-foreground rounded-xl font-black text-sm transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {addingPlayer ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                                                Agregar Jugador
                                            </button>
                                        </div>
                                    </form>

                                    {/* Verification Column */}
                                    <div className="w-full lg:w-[280px] shrink-0 bg-muted/5 flex flex-col p-6">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                                            Verificación
                                        </h3>
                                        
                                        {checkingLive ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                                <span className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-3"></span>
                                                <p className="text-xs font-bold">Analizando perfil...</p>
                                            </div>
                                        ) : !liveValidation ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground/40 space-y-3">
                                                <Search className="w-8 h-8" />
                                                <p className="text-xs font-medium px-4">Ingresa el nombre y apellido para verificar la identidad del jugador.</p>
                                            </div>
                                        ) : liveValidation.level === 'none' ? (
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                                                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                                                </div>
                                                <h4 className="text-sm font-black text-emerald-500 mb-1">Perfil Único</h4>
                                                <p className="text-xs text-emerald-500/80 font-medium leading-relaxed">
                                                    No hay coincidencias en la base de datos. Se creará un registro nuevo.
                                                </p>
                                            </div>
                                        ) : liveValidation.level === 'global' ? (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                </div>
                                                <h4 className="text-sm font-black text-amber-500 mb-1">Homónimo / Existente</h4>
                                                <div className="bg-surface border border-amber-500/20 rounded-xl p-3 mt-3 w-full mb-3 text-left">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/30 shrink-0 bg-muted/10">
                                                            {liveValidation.existing?.photoUrl ? (
                                                                <img src={liveValidation.existing.photoUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${liveValidation.existing?.firstName}${liveValidation.existing?.lastName}`} alt="" className="w-full h-full" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">{liveValidation.existing?.firstName} {liveValidation.existing?.lastName} {liveValidation.existing?.secondLastName || ''}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                Juega en: {liveValidation.existing?.team?.name || 'Agente Libre'}
                                                            </p>
                                                            {liveValidation.existing?.birthPlace && (
                                                                <p className="text-[10px] text-muted-foreground truncate">📍 {liveValidation.existing.birthPlace}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <a href={`/jugadores/${liveValidation.existing?.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-amber-500 hover:text-amber-400 underline underline-offset-2 transition-colors">
                                                        Ver perfil completo →
                                                    </a>
                                                </div>
                                                <div className="flex flex-col gap-2 w-full">
                                                    <button 
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!team?.tournament?.id) return;
                                                            setAddingPlayer(true);
                                                            try {
                                                                await api.post('/roster', {
                                                                    playerId: liveValidation.existing.id,
                                                                    teamId,
                                                                    tournamentId: team.tournament.id,
                                                                });
                                                                setShowAddPlayerModal(false);
                                                                await refreshTeamData(activeTab);
                                                            } catch (err: any) {
                                                                alert(err?.response?.data?.message || 'Error al vincular jugador');
                                                            } finally { setAddingPlayer(false); }
                                                        }}
                                                        disabled={addingPlayer}
                                                        className="w-full py-2 bg-amber-500 text-amber-950 text-[11px] font-black rounded-lg hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                                                    >
                                                        Sí, es él (Añadir al roster)
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={async () => {
                                                            await handleAddPlayerManual({ preventDefault: () => {} } as any, true);
                                                        }}
                                                        disabled={addingPlayer}
                                                        className="w-full py-2 border border-amber-500/30 text-amber-500/80 text-[11px] font-bold rounded-lg hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-50"
                                                    >
                                                        No, crear una variante nueva
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                                                    <XCircle className="w-6 h-6 text-red-500" />
                                                </div>
                                                <h4 className="text-sm font-black text-red-500 mb-1">No Permitido</h4>
                                                <p className="text-xs text-red-500/80 font-medium mb-3">
                                                    Este jugador ya se encuentra en el roster de {liveValidation.level === 'team' ? 'este equipo' : 'este torneo'}.
                                                </p>
                                                <div className="bg-surface border border-red-500/20 rounded-xl p-3 w-full text-left">
                                                    <p className="text-xs font-bold text-foreground truncate">{liveValidation.existing?.firstName} {liveValidation.existing?.lastName}</p>
                                                    <p className="text-[10px] text-red-400 mt-0.5 truncate font-medium">
                                                        Equipo: {liveValidation.existing?.team?.name || 'Desconocido'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab: CSV */}
                            {addPlayerTab === 'csv' && (
                                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                    {/* Download template */}
                                    <div className="flex items-center justify-between p-3 bg-muted/10 border border-muted/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <FileText className="w-4 h-4 shrink-0" />
                                            <span>Descarga la plantilla y llénala en Excel o Google Sheets</span>
                                        </div>
                                        <button onClick={downloadCsvTemplate} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-colors">
                                            <Download className="w-3.5 h-3.5" />
                                            Plantilla
                                        </button>
                                    </div>

                                    {/* PASO 1: Subir archivo */}
                                    {importStep === 'upload' && csvRows.length === 0 && (
                                        <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-muted/30 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-foreground">Seleccionar archivo CSV</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Columnas: Nombre, Apellido, Ap. Materno, Número, Posición, Bats, Throws</p>
                                            </div>
                                            <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
                                        </label>
                                    )}

                                    {/* Archivo cargado — verificar */}
                                    {importStep === 'upload' && csvRows.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-foreground">{csvRows.length} jugador{csvRows.length !== 1 ? 'es' : ''} en el archivo</p>
                                                <button onClick={resetCsvState} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cambiar archivo</button>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-muted/20 max-h-48">
                                                <table className="w-full text-xs">
                                                    <thead className="sticky top-0 bg-surface">
                                                        <tr className="bg-muted/10 border-b border-muted/20">
                                                            <th className="text-left p-2.5 font-bold text-muted-foreground uppercase tracking-wider">Nombre</th>
                                                            <th className="text-left p-2.5 font-bold text-muted-foreground uppercase tracking-wider">Apellidos</th>
                                                            <th className="text-center p-2.5 font-bold text-muted-foreground uppercase tracking-wider">#</th>
                                                            <th className="text-center p-2.5 font-bold text-muted-foreground uppercase tracking-wider">Pos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {csvRows.map((r, i) => (
                                                            <tr key={i} className={`border-b border-muted/10 last:border-0 ${!r.firstName || !r.lastName ? 'bg-red-500/5' : ''}`}>
                                                                <td className="p-2.5 font-medium text-foreground">{r.firstName || <span className="text-red-400">—</span>}</td>
                                                                <td className="p-2.5 font-medium text-foreground">{r.lastName}{r.secondLastName ? ` ${r.secondLastName}` : ''}</td>
                                                                <td className="p-2.5 text-center text-muted-foreground">{r.number || '—'}</td>
                                                                <td className="p-2.5 text-center text-muted-foreground">{r.position || 'INF'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <button onClick={handleCsvPreview} disabled={importingCsv} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-sm transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                                                    {importingCsv ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                                                    Verificar duplicados
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* PASO 2: Preview con colores */}
                                    {importStep === 'preview' && importPreview && (
                                        <>
                                            {/* Resumen */}
                                            {importSummary && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {importSummary.pendingConfirm > 0 && (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                            {importSummary.pendingConfirm} nuevos
                                                        </span>
                                                    )}
                                                    {importSummary.globalWarnings > 0 && (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-400">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                            {importSummary.globalWarnings} ya en sistema
                                                        </span>
                                                    )}
                                                    {importSummary.blocked > 0 && (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-bold text-red-400">
                                                            <span className="w-2 h-2 rounded-full bg-red-400" />
                                                            {importSummary.blocked} bloqueados
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="overflow-x-auto rounded-xl border border-muted/20 max-h-64">
                                                <table className="w-full text-xs">
                                                    <thead className="sticky top-0 bg-surface">
                                                        <tr className="bg-muted/10 border-b border-muted/20">
                                                            <th className="p-2.5 w-8" />
                                                            <th className="text-left p-2.5 font-bold text-muted-foreground uppercase tracking-wider">Jugador</th>
                                                            <th className="text-left p-2.5 font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {importPreview.map((r) => {
                                                            const isBlocked = r.status === 'duplicate_team' || r.status === 'duplicate_tournament';
                                                            const isWarning = r.status === 'duplicate_global';
                                                            const isNew = r.status === 'pending_confirm';
                                                            const rowBg = isBlocked ? 'bg-red-500/5' : isWarning ? 'bg-amber-500/5' : 'bg-emerald-500/5';
                                                            return (
                                                                <tr key={r.row} className={`border-b border-muted/10 last:border-0 ${rowBg}`}>
                                                                    <td className="p-2.5 text-center">
                                                                        {isBlocked ? (
                                                                            <span className="w-4 h-4 flex items-center justify-center mx-auto text-red-400">✕</span>
                                                                        ) : (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={importChecked.has(r.row)}
                                                                                onChange={e => {
                                                                                    const next = new Set(importChecked);
                                                                                    e.target.checked ? next.add(r.row) : next.delete(r.row);
                                                                                    setImportChecked(next);
                                                                                }}
                                                                                className="accent-primary"
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5 font-medium text-foreground">
                                                                        <div className="flex items-center gap-2">
                                                                            {isWarning && r.existing?.photoUrl && (
                                                                                <img src={r.existing.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-amber-500/30 shrink-0" />
                                                                            )}
                                                                            <span>{r.firstName} {r.lastName}{r.secondLastName ? ` ${r.secondLastName}` : ''}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        {isNew && <span className="text-emerald-400 font-bold">Nuevo</span>}
                                                                        {isWarning && (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-amber-400 font-bold" title={`Ya registrado en: ${r.existing?.team?.name} (${r.existing?.team?.tournament?.name})`}>
                                                                                    En: {r.existing?.team?.name}
                                                                                </span>
                                                                                {r.existing?.birthPlace && (
                                                                                    <span className="text-[10px] text-muted-foreground">📍 {r.existing.birthPlace}</span>
                                                                                )}
                                                                                <a href={`/jugadores/${r.existing?.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:text-amber-400 underline underline-offset-2">
                                                                                    Ver perfil →
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                        {r.status === 'duplicate_team' && <span className="text-red-400 font-bold">Ya en este equipo</span>}
                                                                        {r.status === 'duplicate_tournament' && (
                                                                            <span className="text-red-400 font-bold">En torneo: {r.existing?.team?.name}</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <button onClick={resetCsvState} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                    Volver a cargar archivo
                                                </button>
                                                <button
                                                    onClick={handleConfirmImport}
                                                    disabled={confirmingImport || importChecked.size === 0}
                                                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-sm transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {confirmingImport ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    Confirmar ({importChecked.size} jugadores)
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {csvError && (
                                        <p className="text-sm text-red-400 font-medium text-center">{csvError}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL AÑADIR JUGADOR VERIFICADO */}
                {showAddVerifiedModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
                        <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-foreground">Añadir Jugador Verificado</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Busca un jugador verificado para invitar a este equipo</p>
                                </div>
                                <button onClick={() => setShowAddVerifiedModal(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Buscar por nombre..."
                                        value={verifiedSearch}
                                        onChange={e => handleVerifiedSearch(e.target.value)}
                                        className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
                                    />
                                    {searchingVerified && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    )}
                                </div>

                                {/* Results */}
                                {verifiedSearch.trim().length >= 2 && verifiedResults.length === 0 && !searchingVerified && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No se encontraron jugadores verificados.
                                    </div>
                                )}
                                {verifiedResults.length > 0 && (
                                    <div className="space-y-2">
                                        {verifiedResults.map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-3 p-3 bg-background border border-muted/20 rounded-xl hover:border-emerald-500/30 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-muted/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-sm border border-muted/20">
                                                    {p.photoUrl ? (
                                                        <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        `${p.firstName[0]}${p.lastName[0]}`
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-bold text-foreground truncate">{p.firstName} {p.lastName}</p>
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {p.position && <span className="font-bold">{p.position} · </span>}
                                                        {p.team?.name || 'Sin equipo'}
                                                        {p.team?.tournament && <span> · {p.team.tournament.name}</span>}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToRoster(p)}
                                                    disabled={addingRoster === p.id}
                                                    className="shrink-0 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                >
                                                    {addingRoster === p.id ? '...' : 'Agregar'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {verifiedSearch.trim().length < 2 && (
                                    <div className="text-center py-6 text-muted-foreground text-xs font-medium">
                                        Escribe al menos 2 caracteres para buscar
                                    </div>
                                )}
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
