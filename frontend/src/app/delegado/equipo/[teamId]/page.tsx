'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Users, Settings, Upload, Download, AlertTriangle, CheckCircle, XCircle, Search, Plus, Lock, UserMinus } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

type TabType = 'perfil' | 'jugadores' | 'importar';

interface TeamData {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    managerName?: string;
    tournament: { id: string; name: string; status: string; season: string };
}

interface RosterEntry {
    id: string;        // RosterEntry ID — usado para dar de baja
    number?: number;
    position?: string;
    player: {
        id: string;
        firstName: string;
        lastName: string;
        photoUrl?: string;
        bats?: string;
        throws?: string;
        isVerified?: boolean;
    };
}

type ImportRowStatus = 'pending_confirm' | 'duplicate_global' | 'duplicate_tournament' | 'duplicate_team';
interface ImportRow {
    row: number;
    status: ImportRowStatus;
    firstName: string;
    lastName: string;
    secondLastName?: string;
    existing?: { id: string; firstName: string; lastName: string; secondLastName?: string; isVerified: boolean; team: { name: string; tournament: { name: string } } };
}

export default function DelegatePage() {
    const { teamId } = useParams<{ teamId: string }>();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>('perfil');
    const [team, setTeam] = useState<TeamData | null>(null);
    const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
    const [rosterLimit, setRosterLimit] = useState<number>(25);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [editingJerseyEntryId, setEditingJerseyEntryId] = useState<string | null>(null);
    const [jerseyDraft, setJerseyDraft] = useState('');
    const [savingJerseyEntryId, setSavingJerseyEntryId] = useState<string | null>(null);

    // Perfil form
    const [profileForm, setProfileForm] = useState({ name: '', managerName: '', logoUrl: '' });

    // Add player modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addTab, setAddTab] = useState<'manual' | 'buscar'>('manual');
    const [newPlayerForm, setNewPlayerForm] = useState({ firstName: '', lastName: '', secondLastName: '', number: '', position: 'INF', bats: 'R', throws: 'R', photoUrl: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [liveValidation, setLiveValidation] = useState<any>(null);
    const [checkingLive, setCheckingLive] = useState(false);

    // Import CSV
    const [csvRows, setCsvRows] = useState<ImportRow[]>([]);
    const [importError, setImportError] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    // ─── Auth check ────────────────────────────────────────────────
    useEffect(() => {
        const user = getUser();
        if (!user || user.role !== 'delegado') {
            router.replace('/login');
        }
    }, [router]);

    // ─── Fetch team ─────────────────────────────────────────────────
    const fetchTeam = useCallback(async () => {
        try {
            const { data } = await api.get(`/teams/${teamId}`);
            setTeam(data);
            setProfileForm({ name: data.name, managerName: data.managerName || '', logoUrl: data.logoUrl || '' });
            if (data.tournament?.status !== 'upcoming') setIsBlocked(true);
        } catch { router.replace('/login'); }
        finally { setLoading(false); }
    }, [teamId, router]);

    // ─── Fetch roster (RosterEntries activos) ──────────────────────
    // FIX: usar GET /api/roster/team/:teamId en vez de GET /api/players?teamId
    const fetchRoster = useCallback(async () => {
        if (!team?.tournament?.id) return;
        try {
            const { data } = await api.get(`/roster/team/${teamId}`, {
                params: { tournamentId: team.tournament.id },
            });
            setRosterEntries(data || []);
        } catch { /* silencioso */ }
    }, [teamId, team?.tournament?.id]);

    // ─── Fetch plan limit ──────────────────────────────────────────
    const fetchRosterLimit = useCallback(async () => {
        if (!team?.tournament?.id) return;
        try {
            // El organizador de la liga tiene maxPlayersPerTeam en su perfil
            // Lo obtenemos del torneo → liga → admin
            const { data: tournamentData } = await api.get(`/torneos/${team.tournament.id}`);
            const leagueAdminMaxPlayers = tournamentData?.league?.admin?.maxPlayersPerTeam;
            if (leagueAdminMaxPlayers && leagueAdminMaxPlayers > 0) {
                setRosterLimit(leagueAdminMaxPlayers);
            }
        } catch { /* usa default 25 */ }
    }, [team?.tournament?.id]);

    const beginJerseyEdit = (entryId: string, currentNumber?: number | null) => {
        if (isBlocked) return;
        setEditingJerseyEntryId(entryId);
        setJerseyDraft(currentNumber == null ? '' : String(currentNumber));
    };

    const saveJerseyNumber = async (entryId: string) => {
        if (isBlocked) return;

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
            setRosterEntries(prev => prev.map((entry) =>
                entry.id === entryId
                    ? { ...entry, number: data?.number ?? payload.number ?? undefined }
                    : entry,
            ));
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
        fetchTeam();
    }, [fetchTeam]);

    useEffect(() => {
        if (team) {
            fetchRoster();
            fetchRosterLimit();
        }
    }, [team, fetchRoster, fetchRosterLimit]);

    // ─── Live validation while typing new player ────────────────────
    useEffect(() => {
        if (!showAddModal || addTab !== 'manual') return;
        const fn = newPlayerForm.firstName.trim();
        const ln = newPlayerForm.lastName.trim();
        if (fn.length < 2 || ln.length < 2) { setLiveValidation(null); return; }
        const t = setTimeout(() => {
            setCheckingLive(true);
            const p = new URLSearchParams({ fn, ln, sln: newPlayerForm.secondLastName.trim(), teamId, tourneyId: team?.tournament.id || '' });
            api.get(`/players/check-duplicate?${p}`)
                .then(r => setLiveValidation(r.data))
                .catch(() => { })
                .finally(() => setCheckingLive(false));
        }, 500);
        return () => clearTimeout(t);
    }, [newPlayerForm.firstName, newPlayerForm.lastName, newPlayerForm.secondLastName, showAddModal, addTab, teamId, team]);

    // ─── Handlers ───────────────────────────────────────────────────
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/teams/${teamId}`, {
                name: profileForm.name,
                managerName: profileForm.managerName || null,
                logoUrl: profileForm.logoUrl || null,
            });
            await fetchTeam();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al guardar cambios');
        } finally { setSaving(false); }
    };

    const handleAddPlayerManual = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/players', {
                firstName: newPlayerForm.firstName,
                lastName: newPlayerForm.lastName,
                secondLastName: newPlayerForm.secondLastName || undefined,
                number: newPlayerForm.number ? parseInt(newPlayerForm.number) : null,
                position: newPlayerForm.position,
                bats: newPlayerForm.bats,
                throws: newPlayerForm.throws,
                photoUrl: newPlayerForm.photoUrl || null,
                teamId,
                tournamentId: team?.tournament.id,
            });
            setShowAddModal(false);
            setNewPlayerForm({ firstName: '', lastName: '', secondLastName: '', number: '', position: 'INF', bats: 'R', throws: 'R', photoUrl: '' });
            setLiveValidation(null);
            await fetchRoster();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al agregar jugador');
        } finally { setSaving(false); }
    };

    const handleSearchVerified = async () => {
        if (!searchQuery.trim()) return;
        try {
            const { data } = await api.get('/players/search', { params: { q: searchQuery } });
            setSearchResults((data || []).filter((p: any) => p.isVerified));
        } catch { setSearchResults([]); }
    };

    // FIX: usar POST /api/roster en vez de /roster-entries
    const handleAddVerified = async (player: any) => {
        setSaving(true);
        try {
            await api.post('/roster', {
                playerId: player.id,
                teamId,
                tournamentId: team?.tournament.id,
            });
            setSearchResults(prev => prev.filter(p => p.id !== player.id));
            await fetchRoster();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al agregar jugador al roster');
        } finally { setSaving(false); }
    };

    // FIX: dar de baja usando el RosterEntry ID
    const handleRemoveFromRoster = async (entryId: string, playerName: string) => {
        if (!confirm(`¿Dar de baja a ${playerName} del roster? El jugador seguirá existiendo en la plataforma.`)) return;
        setSaving(true);
        try {
            await api.delete(`/roster/${entryId}`);
            await fetchRoster();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al dar de baja al jugador');
        } finally { setSaving(false); }
    };

    // ─── CSV Import ──────────────────────────────────────────────────
    const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError('');
        setImportLoading(true);
        const text = await file.text();
        const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
        const rows = lines.slice(1).map(l => {
            const cols = l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            return { firstName: cols[0] || '', lastName: cols[1] || '', number: cols[2] || '', position: cols[3] || 'INF', bats: cols[4] || 'R', throws: cols[5] || 'R' };
        }).filter(r => r.firstName || r.lastName);

        if (rows.length === 0) { setImportError('No se encontraron jugadores válidos en el archivo.'); setImportLoading(false); return; }

        try {
            const { data } = await api.post('/players/import', {
                players: rows.map(r => ({ ...r, teamId, tournamentId: team?.tournament.id, number: r.number ? parseInt(r.number) : null })),
            });
            setCsvRows(data.rows || []);
        } catch (err: any) {
            setImportError(err?.response?.data?.message || 'Error al procesar el archivo');
        } finally { setImportLoading(false); e.target.value = ''; }
    };

    const handleConfirmImport = async (row: ImportRow) => {
        try {
            await api.post('/players/confirm-import', {
                firstName: row.firstName, lastName: row.lastName,
                teamId, tournamentId: team?.tournament.id,
            });
            setCsvRows(prev => prev.filter(r => r.row !== row.row));
            await fetchRoster();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al confirmar jugador');
        }
    };

    const downloadTemplate = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/template/players`, '_blank');
    };

    // ─── Render ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!team) return null;

    const inputCls = 'w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm';
    const labelCls = 'block text-xs font-bold text-muted-foreground mb-1 uppercase';
    const atLimit = rosterEntries.length >= rosterLimit;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-16 h-16 rounded-2xl object-contain bg-surface border border-muted/30 p-1" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl border border-primary/20">
                            {team.name.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-black text-foreground">{team.name}</h1>
                        <p className="text-sm text-muted-foreground">{team.tournament.name} · {team.tournament.season}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-teal-500/10 text-teal-400">Delegado</span>
                            {isBlocked && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400">
                                    <Lock className="w-3 h-3" /> Torneo activo — solo lectura
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {isBlocked && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-400">Acceso de edición suspendido</p>
                            <p className="text-xs text-muted-foreground mt-0.5">El torneo ya inició. Las modificaciones de roster ahora son autorizadas solo por el organizador o presidente.</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-muted/20 pb-0 overflow-x-auto scrollbar-hide">
                    {([
                        { id: 'perfil', label: 'Perfil del Equipo', icon: <Settings className="w-4 h-4" /> },
                        { id: 'jugadores', label: `Mi Plantilla (${rosterEntries.length}/${rosterLimit})`, icon: <Users className="w-4 h-4" /> },
                        { id: 'importar', label: 'Importar CSV', icon: <Upload className="w-4 h-4" /> },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB: PERFIL */}
                {activeTab === 'perfil' && (
                    <div className="animate-fade-in-up">
                        <form onSubmit={handleSaveProfile} className="bg-surface border border-muted/30 rounded-2xl p-6 space-y-5">
                            <h2 className="text-lg font-black text-foreground">Información del Equipo</h2>
                            <div>
                                <label className={labelCls}>Logo del Equipo</label>
                                {!isBlocked ? (
                                    <ImageUploader
                                        value={profileForm.logoUrl}
                                        onChange={(url: string) => setProfileForm(f => ({ ...f, logoUrl: url }))}
                                    />
                                ) : (
                                    profileForm.logoUrl
                                        ? <img src={profileForm.logoUrl} alt="logo" className="w-20 h-20 rounded-xl object-contain bg-background border border-muted/20 p-1" />
                                        : <p className="text-xs text-muted-foreground italic">Sin logo</p>
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>Nombre del Equipo</label>
                                <input
                                    required disabled={isBlocked}
                                    value={profileForm.name}
                                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                    className={inputCls + (isBlocked ? ' opacity-60 cursor-not-allowed' : '')}
                                    placeholder="Nombre del equipo"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Manager</label>
                                <input
                                    disabled={isBlocked}
                                    value={profileForm.managerName}
                                    onChange={e => setProfileForm(f => ({ ...f, managerName: e.target.value }))}
                                    className={inputCls + (isBlocked ? ' opacity-60 cursor-not-allowed' : '')}
                                    placeholder="Nombre del manager"
                                />
                            </div>
                            {!isBlocked && (
                                <button type="submit" disabled={saving} className={`w-full py-3 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 active:scale-95'}`}>
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {/* TAB: JUGADORES (MI PLANTILLA) */}
                {activeTab === 'jugadores' && (
                    <div className="animate-fade-in-up space-y-4">
                        {/* Indicador de cupo */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-sm text-muted-foreground">
                                    Cupo: <span className={`font-black ${atLimit ? 'text-red-400' : 'text-foreground'}`}>{rosterEntries.length}</span>
                                    <span className="text-muted-foreground"> / {rosterLimit}</span>
                                </div>
                                <div className="w-32 h-2 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : rosterEntries.length / rosterLimit > 0.8 ? 'bg-amber-500' : 'bg-primary'}`}
                                        style={{ width: `${Math.min((rosterEntries.length / rosterLimit) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            {!isBlocked && !atLimit && (
                                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm">
                                    <Plus className="w-4 h-4" /> Agregar Jugador
                                </button>
                            )}
                            {!isBlocked && atLimit && (
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                                    Cupo lleno — da de baja a un jugador primero
                                </span>
                            )}
                        </div>

                        {rosterEntries.length === 0 ? (
                            <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center">
                                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                <p className="text-muted-foreground font-bold">No hay jugadores en el roster.</p>
                                {!isBlocked && <p className="text-sm text-muted-foreground mt-1">Agrega jugadores manualmente o importa un CSV.</p>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {rosterEntries.map(entry => (
                                    <div key={entry.id} className="bg-surface border border-muted/30 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary shrink-0 overflow-hidden">
                                            {entry.player.photoUrl
                                                ? <img src={entry.player.photoUrl} alt="" className="w-full h-full object-cover" />
                                                : (entry.player.firstName[0] || '?')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-foreground text-sm truncate">
                                                {entry.player.firstName} {entry.player.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {entry.position || 'Sin posición'}
                                                {entry.player.bats ? ` · ${entry.player.bats}B / ${entry.player.throws}T` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {editingJerseyEntryId === entry.id ? (
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={99}
                                                    autoFocus
                                                    value={jerseyDraft}
                                                    onChange={(e) => setJerseyDraft(e.target.value)}
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
                                                    className="w-16 rounded-lg border border-primary/30 bg-background px-2 py-1 text-xs font-black text-foreground outline-none focus:border-primary"
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => beginJerseyEdit(entry.id, entry.number)}
                                                    disabled={isBlocked || savingJerseyEntryId === entry.id}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                                        isBlocked
                                                            ? 'bg-muted/10 text-muted-foreground'
                                                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                    }`}
                                                    title={isBlocked ? 'Edición bloqueada mientras el torneo está activo' : 'Editar jersey'}
                                                >
                                                    {savingJerseyEntryId === entry.id ? '...' : entry.number != null ? `#${entry.number}` : 'Asignar #'}
                                                </button>
                                            )}
                                            {entry.player.isVerified && (
                                                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">✓</span>
                                            )}
                                            {!isBlocked && (
                                                <button
                                                    onClick={() => handleRemoveFromRoster(entry.id, `${entry.player.firstName} ${entry.player.lastName}`)}
                                                    disabled={saving}
                                                    title="Dar de baja del roster"
                                                    className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: IMPORTAR */}
                {activeTab === 'importar' && (
                    <div className="animate-fade-in-up space-y-5">
                        <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                            <h2 className="text-lg font-black text-foreground mb-1">Importar desde CSV</h2>
                            <p className="text-sm text-muted-foreground mb-5">Descarga la plantilla, llénala con los datos de tus jugadores y súbela aquí.</p>
                            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-primary/40 text-primary hover:bg-primary/10 font-bold rounded-lg transition text-sm mb-5">
                                <Download className="w-4 h-4" /> Descargar plantilla CSV
                            </button>
                            {!isBlocked ? (
                                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-muted/30 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                    <span className="text-sm font-bold text-muted-foreground">Haz clic para subir tu CSV</span>
                                    <span className="text-xs text-muted-foreground/60 mt-1">Formato: Nombre, Apellido, Número, Posición, Batea, Tira</span>
                                    <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
                                </label>
                            ) : (
                                <div className="p-4 bg-muted/10 border border-muted/20 rounded-xl text-center text-sm text-muted-foreground">
                                    La importación está deshabilitada mientras el torneo esté activo.
                                </div>
                            )}
                            {importError && <p className="mt-3 text-xs text-red-400 font-bold">{importError}</p>}
                            {importLoading && <p className="mt-3 text-xs text-muted-foreground">Procesando archivo...</p>}
                        </div>

                        {csvRows.length > 0 && (
                            <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                                <h3 className="font-black text-foreground mb-4">Resultado del archivo ({csvRows.length} filas)</h3>
                                <div className="space-y-3">
                                    {csvRows.map(row => (
                                        <div key={row.row} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${row.status === 'pending_confirm' ? 'border-amber-500/30 bg-amber-500/5' : 'border-muted/20 bg-muted/5'}`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                {row.status === 'pending_confirm' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                                                {row.status === 'duplicate_team' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                                {(row.status === 'duplicate_global' || row.status === 'duplicate_tournament') && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground">{row.firstName} {row.lastName}</p>
                                                    {row.existing && <p className="text-xs text-muted-foreground truncate">Ya existe en {row.existing.team?.name} · {row.existing.team?.tournament?.name}</p>}
                                                    {row.status === 'duplicate_team' && <p className="text-xs text-red-400">Ya está en tu equipo</p>}
                                                </div>
                                            </div>
                                            {row.status === 'pending_confirm' && (
                                                <button onClick={() => handleConfirmImport(row)} className="shrink-0 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs rounded-lg transition">
                                                    Confirmar
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL: AGREGAR JUGADOR */}
            {showAddModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => { setShowAddModal(false); setLiveValidation(null); setSearchResults([]); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-xl font-black text-foreground mb-4 pb-3 border-b border-muted/20 uppercase tracking-tight">Agregar Jugador</h2>

                        <div className="flex gap-2 mb-5">
                            {(['manual', 'buscar'] as const).map(t => (
                                <button key={t} onClick={() => setAddTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${addTab === t ? 'bg-primary text-white' : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'}`}>
                                    {t === 'manual' ? 'Nuevo Jugador' : 'Buscar Verificado'}
                                </button>
                            ))}
                        </div>

                        {addTab === 'manual' && (
                            <form onSubmit={handleAddPlayerManual} className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className={labelCls}>Nombre *</label>
                                        <input required value={newPlayerForm.firstName} onChange={e => setNewPlayerForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} placeholder="Juan" />
                                    </div>
                                    <div className="flex-1">
                                        <label className={labelCls}>Apellido *</label>
                                        <input required value={newPlayerForm.lastName} onChange={e => setNewPlayerForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} placeholder="Pérez" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Segundo Apellido</label>
                                    <input value={newPlayerForm.secondLastName} onChange={e => setNewPlayerForm(f => ({ ...f, secondLastName: e.target.value }))} className={inputCls} placeholder="García (opcional)" />
                                </div>
                                {checkingLive && <p className="text-xs text-muted-foreground">Verificando duplicados...</p>}
                                {liveValidation && !checkingLive && (
                                    <div className={`p-3 rounded-xl border text-xs font-bold ${liveValidation.status === 'duplicate_team' ? 'border-red-500/30 bg-red-500/5 text-red-400' : liveValidation.status === 'duplicate_tournament' ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' : liveValidation.status === 'duplicate_global' ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-green-500/30 bg-green-500/5 text-green-400'}`}>
                                        {liveValidation.status === 'duplicate_team' && '⛔ Este jugador ya está en tu equipo'}
                                        {liveValidation.status === 'duplicate_tournament' && '⚠️ Ya participa en este torneo con otro equipo'}
                                        {liveValidation.status === 'duplicate_global' && `ℹ️ Jugador encontrado en la plataforma (${liveValidation.existing?.team?.name})`}
                                        {liveValidation.status === 'ok' && '✓ Jugador disponible'}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className={labelCls}>Número</label>
                                        <input type="number" value={newPlayerForm.number} onChange={e => setNewPlayerForm(f => ({ ...f, number: e.target.value }))} className={inputCls} placeholder="5" min={0} max={99} />
                                    </div>
                                    <div className="flex-1">
                                        <label className={labelCls}>Posición</label>
                                        <select value={newPlayerForm.position} onChange={e => setNewPlayerForm(f => ({ ...f, position: e.target.value }))} className={inputCls}>
                                            {['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'P', 'DH', 'INF', 'UT'].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className={labelCls}>Batea</label>
                                        <select value={newPlayerForm.bats} onChange={e => setNewPlayerForm(f => ({ ...f, bats: e.target.value }))} className={inputCls}>
                                            <option value="R">Derecho</option><option value="L">Zurdo</option><option value="S">Switch</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className={labelCls}>Tira</label>
                                        <select value={newPlayerForm.throws} onChange={e => setNewPlayerForm(f => ({ ...f, throws: e.target.value }))} className={inputCls}>
                                            <option value="R">Derecho</option><option value="L">Zurdo</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" disabled={saving || liveValidation?.status === 'duplicate_team'} className={`w-full py-3 font-bold rounded-xl transition ${saving || liveValidation?.status === 'duplicate_team' ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-lg shadow-primary/20 active:scale-95'}`}>
                                    {saving ? 'Agregando...' : 'Agregar Jugador'}
                                </button>
                            </form>
                        )}

                        {addTab === 'buscar' && (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground">Busca jugadores verificados en la plataforma para agregarlos a tu roster.</p>
                                <div className="flex gap-2">
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchVerified()} className={inputCls} placeholder="Nombre del jugador..." />
                                    <button onClick={handleSearchVerified} className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition text-sm shrink-0">
                                        <Search className="w-4 h-4" />
                                    </button>
                                </div>
                                {searchResults.length === 0 && searchQuery && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No se encontraron jugadores verificados.</p>
                                )}
                                <div className="space-y-2">
                                    {searchResults.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-background border border-muted/20 rounded-xl">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 font-bold text-xs shrink-0 overflow-hidden">
                                                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.firstName[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground">{p.firstName} {p.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{p.position} · ✓ Verificado</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleAddVerified(p)} disabled={saving} className="shrink-0 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition">
                                                + Agregar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
