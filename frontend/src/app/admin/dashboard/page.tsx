'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, saveSession, clearSession, AuthUser } from '@/lib/auth';
import CreateGameWizard from '@/components/game/CreateGameWizard';
import SportsUnitsManager from '@/components/fields/SportsUnitsManager';
import FieldsReport from '@/components/fields/FieldsReport';
import ImageUploader from '@/components/ui/ImageUploader';
import api from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CheckCircle, AlertTriangle, XCircle, Search, Plus, MapPin, ChevronLeft, ChevronRight, Upload, Download, FileText } from 'lucide-react';

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

export default function AdminDashboard() {
    const router = useRouter();

    // -- Types --
    type TabType = 'perfil' | 'ligas' | 'torneos' | 'equipos' | 'jugadores' | 'juegos' | 'usuarios' | 'plan' | 'delegados' | 'campos';
    const validTabs: TabType[] = ['perfil', 'ligas', 'torneos', 'equipos', 'jugadores', 'juegos', 'usuarios', 'plan', 'delegados', 'campos'];

    interface GameData {
        id: string;
        status: string;
        awayTeam: { id: string; name: string };
        homeTeam: { id: string; name: string };
        awayScore: number;
        homeScore: number;
        currentInning: number;
        tournament?: { id: string; name: string; league?: { id: string; name: string } };
    }

    interface TournamentData {
        id: string;
        name: string;
        season: string;
        locationCity?: string;
        locationState?: string;
        locationCountry?: string;
        sport: string;
        branch: string;
        category?: string;
        description?: string;
        logoUrl?: string;
        rulesType?: string;
        league?: { name: string; id: string };
    }

    interface LeagueData {
        id: string;
        name: string;
        shortName?: string;
        logoUrl?: string;
        description?: string;
        city?: string;
        state?: string;
        sport?: string;
        isVerified: boolean;
        adminId: string;
        _count: { tournaments: number };
    }

    interface TeamData {
        id: string;
        name: string;
        logoUrl?: string;
        managerName?: string;
        tournament?: { id: string; name: string; season?: string; status?: string; logoUrl?: string };
        _count?: { rosterEntries?: number };
        rosterEntries?: any[];
    }

    interface PlayerData {
        id: string;
        firstName: string;
        lastName: string;
        secondLastName?: string;
        curp?: string;
        birthDate?: string;
        birthPlace?: string;
        number?: string | number | null;
        position: string;
        photoUrl?: string;
        rosterEntryId?: string;
        rosterEntries?: Array<{ id: string; team?: { id: string; name: string } }>;
        _count?: { rosterEntries?: number };
    }

    interface UserData {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        planLabel: string;
        maxLeagues: number;
        maxTournamentsPerLeague: number;
        maxTeamsPerTournament: number;
        maxPlayersPerTeam: number;
        organizerRequestNote?: string | null;
        organizerRequestedAt?: string | null;
        scorekeeperLeagueId?: string | null;
        usedLeagues?: number;
        usedTournaments?: number;
        assignedTournaments?: { id: string; name: string }[];
    }

    // -- State: Navigation --
    const [activeTab, setActiveTab] = useState<TabType>('perfil');
    const [camposSubTab, setCamposSubTab] = useState<'gestion' | 'reporte'>('gestion');
    const [saving, setSaving] = useState(false);

    // -- State: Modals --
    const [showGameModal, setShowGameModal] = useState(false);
    const [lineupGameId, setLineupGameId] = useState<string | null>(null);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [addPlayerTab, setAddPlayerTab] = useState<'manual' | 'csv'>('manual');
    const [csvRows, setCsvRows] = useState<{ firstName: string; lastName: string; secondLastName: string; number: string; position: string; bats: string; throws: string; curp: string; birthDate: string; birthPlace: string }[]>([]);
    const [csvError, setCsvError] = useState('');
    const [importingCsv, setImportingCsv] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportRowResult[] | null>(null);
    const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
    const [importChecked, setImportChecked] = useState<Set<number>>(new Set());
    const [importSummary, setImportSummary] = useState<{ pendingConfirm: number; globalWarnings: number; blocked: number } | null>(null);
    const [confirmingImport, setConfirmingImport] = useState(false);
    const [csvTeamId, setCsvTeamId] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [accessForm, setAccessForm] = useState({ role: 'general', planLabel: 'public', maxLeagues: 0, maxTournamentsPerLeague: 0, maxTeamsPerTournament: 0, maxPlayersPerTeam: 25 });
    const [accessSearch, setAccessSearch] = useState('');
    const [accessRoleFilter, setAccessRoleFilter] = useState('all');
    const [showEditTournModal, setShowEditTournModal] = useState(false);
    const [editingTourn, setEditingTourn] = useState<TournamentData | null>(null);

    // -- Role State --
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userTournamentId, setUserTournamentId] = useState<string | null>(null);
    const [userPhone, setUserPhone] = useState<string>('');
    const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    // ── Estados AISLADOS para el directorio de jugadores (no comparten nada con otros tabs) ──
    const [dirTournamentId, setDirTournamentId] = useState('');
    const [dirTeamId, setDirTeamId] = useState('');
    const [dirTeams, setDirTeams] = useState<TeamData[]>([]);
    const [editingRosterNumberId, setEditingRosterNumberId] = useState<string | null>(null);
    const [rosterNumberDraft, setRosterNumberDraft] = useState('');
    const [savingRosterNumberId, setSavingRosterNumberId] = useState<string | null>(null);

    // -- Profile Editing State --
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [newPhone, setNewPhone] = useState('');

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            // Refrescar el perfil desde el servidor para obtener IDs relacionales si faltan en sesión local
            const needsScorekeeperRefresh = storedUser.role === 'scorekeeper' && !storedUser.scorekeeperLeagueId;
            const needsDelegateRefresh = storedUser.role === 'delegado' && !(storedUser.delegateAssignments?.length);
            
            if (needsScorekeeperRefresh || needsDelegateRefresh) {
                api.get('/auth/me').then(({ data }) => {
                    const refreshed = { 
                        ...storedUser, 
                        scorekeeperLeagueId: data.scorekeeperLeagueId ?? null,
                        delegateTeamId: data.delegateTeamId ?? null,
                        delegateTournamentId: data.delegateTournamentId ?? null,
                        delegateTeamIds: data.delegateTeamIds ?? [],
                        delegateTournamentIds: data.delegateTournamentIds ?? [],
                        delegateAssignments: data.delegateAssignments ?? [],
                        isDelegateActive: data.isDelegateActive ?? false,
                    };
                    saveSession(refreshed);
                    setCurrentUser(refreshed);
                }).catch(() => setCurrentUser(storedUser));
            } else {
                setCurrentUser(storedUser);
            }
        }
        if (typeof window !== 'undefined') {
            setUserTournamentId(localStorage.getItem('userTournamentId') || null);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        // Solo restauramos el tab activo — los filtros de cada sub-pestaña son independientes
        // y NO se persisten en la URL para evitar contaminación cruzada entre pestañas.
        if (tab && validTabs.includes(tab as TabType)) {
            setActiveTab(tab as TabType);
        }
    }, []);

    // Solo persiste el tab activo en la URL — los filtros internos de cada sub-pestaña son aislados
    const writeDashboardUrlState = (nextTab: TabType = activeTab) => {
        if (typeof window === 'undefined') return;
        const nextUrl = `${window.location.pathname}?tab=${nextTab}`;
        window.history.replaceState({ ...window.history.state, as: nextUrl, url: nextUrl }, '', nextUrl);
    };

    useEffect(() => {
        writeDashboardUrlState(activeTab);
    }, [activeTab]);

    // El usuario ya está en el store JWT vía getUser() en el siguiente useEffect

    useEffect(() => {
        if (!currentUser) {
            setUserRole('general');
            setUserName('Usuario Invitado');
            setUserEmail('');
            setUserPhone('');
            setUserProfilePicture(null);
            return;
        }

        const fullName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();
        setUserRole(currentUser.role || 'general');
        setUserName(fullName || currentUser.email);
        setUserEmail(currentUser.email);
        setUserPhone(currentUser.phone ?? '');
        setUserProfilePicture(currentUser.profilePicture ?? null);
    }, [currentUser]);

    const delegateAssignments = currentUser?.delegateAssignments ?? [];
    const delegateHasMultipleAssignments = delegateAssignments.length > 1;
    const delegateHasMultipleTournaments = new Set(delegateAssignments.map((assignment) => assignment.tournamentId)).size > 1;

    const resolveDelegateTournamentForTeam = (teamId?: string) => {
        if (!teamId) return '';
        return delegateAssignments.find((assignment) => assignment.teamId === teamId)?.tournamentId || '';
    };

    const handleTournamentFilterChange = (nextTournamentId: string, options?: { resetDirectoryPage?: boolean }) => {
        setSelectedTournament(nextTournamentId);

        if (userRole === 'delegado') {
            const keepCurrentTeam = !!selectedTeam && delegateAssignments.some((assignment) =>
                assignment.teamId === selectedTeam && (!nextTournamentId || assignment.tournamentId === nextTournamentId),
            );

            if (!keepCurrentTeam) {
                setSelectedTeam('');
            }
        } else {
            setSelectedTeam('');
        }

        if (options?.resetDirectoryPage) {
            setDirectoryPage(1);
        }
    };

    const canEditRosterJersey = userRole === 'admin' || userRole === 'organizer' || userRole === 'presi' || (userRole === 'delegado' && currentUser?.isDelegateActive !== false);

    const beginRosterNumberEdit = (rosterEntryId?: string, currentNumber?: string | number | null) => {
        if (!rosterEntryId || !canEditRosterJersey) return;
        setEditingRosterNumberId(rosterEntryId);
        setRosterNumberDraft(currentNumber == null ? '' : String(currentNumber));
    };

    const saveRosterNumber = async (rosterEntryId?: string) => {
        if (!rosterEntryId || !canEditRosterJersey) return;

        const trimmed = rosterNumberDraft.trim();
        if (trimmed !== '') {
            const parsed = Number(trimmed);
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
                alert('El número de jersey debe estar entre 0 y 99.');
                return;
            }
        }

        setSavingRosterNumberId(rosterEntryId);
        try {
            const payload = { number: trimmed === '' ? null : Number(trimmed) };
            const { data } = await api.patch(`/roster/${rosterEntryId}`, payload);
            const nextNumber = data?.number ?? payload.number;

            setPlayers(prev => prev.map((player) =>
                player.rosterEntryId === rosterEntryId
                    ? { ...player, number: nextNumber == null ? '' : String(nextNumber) }
                    : player,
            ));
            setDirectoryPlayers(prev => prev.map((player: any) => {
                const currentRosterEntryId = player.rosterEntryId || player.rosterEntries?.[0]?.id;
                if (currentRosterEntryId !== rosterEntryId) {
                    return player;
                }

                return {
                    ...player,
                    number: nextNumber == null ? '' : String(nextNumber),
                    rosterEntries: Array.isArray(player.rosterEntries) && player.rosterEntries.length > 0
                        ? player.rosterEntries.map((entry: any, index: number) =>
                            index === 0 ? { ...entry, number: nextNumber } : entry,
                        )
                        : player.rosterEntries,
                };
            }));
        } catch (error) {
            console.error(error);
            alert('No se pudo actualizar el número de jersey.');
            return;
        } finally {
            setSavingRosterNumberId(null);
            setEditingRosterNumberId(null);
            setRosterNumberDraft('');
        }
    };

    const calculateAge = (birthDate?: string | null) => {
        if (!birthDate) return '-';
        const birth = new Date(birthDate);
        if (Number.isNaN(birth.getTime())) return '-';
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age -= 1;
        }
        return age >= 0 ? String(age) : '-';
    };

    const formatBirthDate = (birthDate?: string | null) => {
        if (!birthDate) return '-';
        const date = new Date(birthDate);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-MX');
    };

    const imageUrlToDataUrl = async (url?: string | null) => {
        if (!url) return null;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    };

    const getPdfImageFormat = (dataUrl: string) => dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';

    const generateRosterPdf = async (team: TeamData) => {
        setGeneratingRosterTeamId(team.id);
        try {
            const { data } = await api.get(`/teams/${team.id}`);
            const { jsPDF } = await import('jspdf');

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 12;
            const contentWidth = pageWidth - margin * 2;

            const delegateName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Delegado asignado';
            const teamLogo = await imageUrlToDataUrl(data.logoUrl);
            const tournamentLogo = await imageUrlToDataUrl(data.tournament?.logoUrl);

            const drawHeader = () => {
                pdf.setFillColor(15, 28, 46);
                pdf.rect(0, 0, pageWidth, 32, 'F');

                if (tournamentLogo) {
                    pdf.addImage(tournamentLogo, getPdfImageFormat(tournamentLogo), margin, 5, 18, 18);
                } else {
                    pdf.setFillColor(70, 132, 219);
                    pdf.roundedRect(margin, 5, 18, 18, 3, 3, 'F');
                }

                if (teamLogo) {
                    pdf.addImage(teamLogo, getPdfImageFormat(teamLogo), pageWidth - margin - 22, 4, 22, 22);
                } else {
                    pdf.setFillColor(70, 132, 219);
                    pdf.roundedRect(pageWidth - margin - 22, 4, 22, 22, 3, 3, 'F');
                }

                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.text(data.tournament?.name || 'Torneo', pageWidth / 2, 10.5, { align: 'center' });
                pdf.setFontSize(13);
                pdf.text(data.name || 'Equipo', pageWidth / 2, 17.5, { align: 'center' });
                pdf.setFontSize(9);
                pdf.text(`Delegado: ${delegateName}`, pageWidth / 2, 24, { align: 'center' });

                pdf.setTextColor(32, 39, 54);
                pdf.setFontSize(8);
                pdf.text(`Generado: ${new Date().toLocaleString('es-MX')}`, margin, 39);
            };

            const columns = [
                { key: 'index', label: '#', width: 10 },
                { key: 'name', label: 'Nombre(s) y apellidos', width: 82 },
                { key: 'birthDate', label: 'Fecha de nacimiento', width: 34 },
                { key: 'age', label: 'Edad', width: 18 },
                { key: 'curp', label: 'CURP', width: 48 },
                { key: 'signature', label: 'Firma', width: contentWidth - (10 + 82 + 34 + 18 + 48) },
            ] as const;

            const roster: Array<{
                index: string;
                name: string;
                birthDate: string;
                age: string;
                curp: string;
                signature: string;
            }> = (data.rosterEntries || []).map((entry: any, index: number) => ({
                index: String(index + 1),
                name: [entry.player?.firstName, entry.player?.lastName, entry.player?.secondLastName].filter(Boolean).join(' '),
                birthDate: formatBirthDate(entry.player?.birthDate),
                age: calculateAge(entry.player?.birthDate),
                curp: entry.player?.curp || '-',
                signature: '',
            }));

            let y = 46;
            const rowHeight = 10;

            const drawTableHeader = () => {
                let x = margin;
                pdf.setDrawColor(160, 173, 190);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8.5);

                columns.forEach((column) => {
                    pdf.setFillColor(34, 43, 60);
                    pdf.setTextColor(255, 255, 255);
                    pdf.rect(x, y, column.width, rowHeight, 'FD');
                    pdf.text(column.label, x + 2, y + 6.5);
                    x += column.width;
                });
                y += rowHeight;
            };

            const ensurePageSpace = () => {
                if (y + rowHeight > pageHeight - 15) {
                    pdf.addPage();
                    drawHeader();
                    y = 46;
                    drawTableHeader();
                }
            };

            drawHeader();
            drawTableHeader();

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(32, 39, 54);

            if (roster.length === 0) {
                pdf.setTextColor(95, 105, 120);
                pdf.text('No hay jugadores activos en el roster de este equipo.', margin, y + 8);
            } else {
                roster.forEach((row) => {
                    ensurePageSpace();
                    let x = margin;
                    pdf.setTextColor(32, 39, 54);
                    columns.forEach((column) => {
                        pdf.setDrawColor(210, 217, 226);
                        pdf.rect(x, y, column.width, rowHeight);
                        const value = row[column.key] || '-';

                        if (column.key === 'signature') {
                            pdf.line(x + 4, y + 7, x + column.width - 4, y + 7);
                        } else {
                            pdf.text(String(value), x + 2, y + 6.5, {
                                maxWidth: column.width - 4,
                            });
                        }
                        x += column.width;
                    });
                    y += rowHeight;
                });
            }

            pdf.save(`roster-${(data.name || 'equipo').replace(/\s+/g, '-').toLowerCase()}.pdf`);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'No se pudo generar el PDF del roster.');
        } finally {
            setGeneratingRosterTeamId(null);
        }
    };

    // -- Data Stores --
    const [myScorekeepers, setMyScorekeepers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);

    // -- Delegados --
    interface DelegateData {
        id: string;
        isActive: boolean;
        createdAt: string;
        user: { id: string; firstName: string; lastName: string; email: string; phone?: string };
        team: { id: string; name: string; logoUrl?: string };
        createdBy: { id: string; firstName: string; lastName: string };
    }
    const [delegates, setDelegates] = useState<DelegateData[]>([]);
    const [delegateTournamentId, setDelegateTournamentId] = useState('');
    const [showDelegateModal, setShowDelegateModal] = useState(false);
    const [delegateForm, setDelegateForm] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '', teamId: '', tournamentId: '', linkExistingAccount: false,
    });
    const [delegateTeams, setDelegateTeams] = useState<TeamData[]>([]);
    const [generatingRosterTeamId, setGeneratingRosterTeamId] = useState<string | null>(null);

    // -- Filtros de juegos --
    const [filterLeague, setFilterLeague] = useState('');
    const [filterTournament, setFilterTournament] = useState('');
    const [filterTeam, setFilterTeam] = useState('');
    const [tournaments, setTournaments] = useState<TournamentData[]>([]);
    const [leagues, setLeagues] = useState<LeagueData[]>([]);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);

    // -- Form: Create Game --
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    
    // -- Admin Directory Jugadores --
    const [directoryPlayers, setDirectoryPlayers] = useState<any[]>([]);
    const [directoryMeta, setDirectoryMeta] = useState<any>({ total: 0, page: 1, limit: 12, totalPages: 1 });
    const [directoryPage, setDirectoryPage] = useState(1);
    const [directorySearch, setDirectorySearch] = useState("");
    const [directorySearchDebounced, setDirectorySearchDebounced] = useState("");
    const [directoryLoading, setDirectoryLoading] = useState(false);

    const refreshPlayersViews = async (teamIdOverride?: string, tournamentIdOverride?: string) => {
        const resolvedTeamId = teamIdOverride || selectedTeam;
        const resolvedTournamentId = tournamentIdOverride || selectedTournament;

        setActiveTab('jugadores');
        // Actualizar estados AISLADOS del directorio (no tocar selectedTournament/selectedTeam)
        if (resolvedTournamentId) setDirTournamentId(resolvedTournamentId);
        if (resolvedTeamId) setDirTeamId(resolvedTeamId);
        writeDashboardUrlState('jugadores');

        if (resolvedTeamId) {
            try {
                const { data } = await api.get('/players', { params: { teamId: resolvedTeamId } });
                setPlayers(data || []);
            } catch (err) {
                console.error(err);
            }
        }

        try {
            const params: any = { page: directoryPage, limit: 12 };
            if (directorySearchDebounced.length >= 2) params.q = directorySearchDebounced;
            if (resolvedTeamId) params.teamId = resolvedTeamId;
            else if (resolvedTournamentId) params.tournamentId = resolvedTournamentId;
            const { data } = await api.get('/players/directory', { params });
            setDirectoryPlayers(data.data || []);
            setDirectoryMeta(data.meta || { total: 0, page: 1, limit: 12, totalPages: 1 });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => setDirectorySearchDebounced(directorySearch), 400);
        return () => clearTimeout(handler);
    }, [directorySearch]);

    useEffect(() => {
        if (activeTab !== 'jugadores') return;
        setDirectoryLoading(true);
        const params: any = { page: directoryPage, limit: 12 };
        if (directorySearchDebounced.length >= 2) params.q = directorySearchDebounced;
        // Usar estados AISLADOS del directorio — independientes de otros tabs
        if (dirTeamId) params.teamId = dirTeamId;
        else if (dirTournamentId) params.tournamentId = dirTournamentId;

        api.get('/players/directory', { params })
            .then(({ data }) => {
                setDirectoryPlayers(data.data || []);
                setDirectoryMeta(data.meta || { total: 0, page: 1, limit: 12, totalPages: 1 });
            })
            .catch(console.error)
            .finally(() => setDirectoryLoading(false));
    }, [activeTab, directoryPage, directorySearchDebounced, dirTeamId, dirTournamentId]);

    // -- Form: Create Tournament --
    const [tournForm, setTournForm] = useState({
        name: '',
        season: '',
        location_city: '',
        location_state: '',
        location_country: 'México',
        sport: 'Béisbol',
        branch: 'Varonil',
        category: 'Libre',
        description: '',
        logoUrl: '',
        leagueId: '',
        isPrivate: false,
        startDate: '',
    });

    // -- Form: Create Team --
    const [teamForm, setTeamForm] = useState({ name: '', manager: '', logoUrl: '', tournament_id: '' });

    // -- Form: Create Player --
    const [playerForm, setPlayerForm] = useState({
        firstName: '', lastName: '', secondLastName: '', curp: '', birthDate: '', birthPlace: '', number: '', position: 'INF', bats: 'R', throws: 'R', photoUrl: '', team_id: ''
    });
    const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<any>(null);
    const [liveValidation, setLiveValidation] = useState<any>(null);
    const [checkingLive, setCheckingLive] = useState(false);

    // FUSIÓN STATES
    const [mergeMode, setMergeMode] = useState(false);
    const [mergePrimary, setMergePrimary] = useState<any>(null);
    const [mergeDuplicate, setMergeDuplicate] = useState<any>(null);
    
    // Live Validation for Dashboard
    useEffect(() => {
        if (!showPlayerModal) return;

        const fn = playerForm.firstName.trim();
        const ln = playerForm.lastName.trim();
        
        if (fn.length < 2 || ln.length < 2 || !playerForm.team_id) {
            setLiveValidation(null);
            return;
        }
        
        const allTeams = [...teams, ...dirTeams.filter(dt => !teams.some(t => t.id === dt.id))];
        const team = allTeams.find(t => t.id === playerForm.team_id);
        const tourneyId = team?.tournament?.id || '';

        const timeoutId = setTimeout(() => {
            setCheckingLive(true);
            const params = new URLSearchParams({
                fn: fn,
                ln: ln,
                sln: playerForm.secondLastName?.trim() || '',
                teamId: playerForm.team_id,
                tourneyId: tourneyId
            });
            api.get(`/players/check-duplicate?${params}`)
                .then(res => setLiveValidation(res.data))
                .catch(err => console.error(err))
                .finally(() => setCheckingLive(false));
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [playerForm.firstName, playerForm.lastName, playerForm.secondLastName, playerForm.team_id, showPlayerModal, teams]);

    // -- Form: Create User --
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'general', tournament_id: '', tournament_ids: [] as string[] });

    // -- Form: Create / Edit League --
    const [showLeagueModal, setShowLeagueModal] = useState(false);
    const [editingLeague, setEditingLeague] = useState<LeagueData | null>(null);
    const [leagueDropdownOpen, setLeagueDropdownOpen] = useState<string | null>(null);
    const [leagueDropdownPos, setLeagueDropdownPos] = useState<{ top: number; right: number } | null>(null);
    const [leagueForm, setLeagueForm] = useState({
        name: '', shortName: '', city: '', state: '',
        sport: 'softball', description: '', logoUrl: '',
        isPrivate: false,
    });

    // --- API Fetchers ---
    const fetchGames = async (adminId?: string, leagueId?: string) => {
        try {
            const params: Record<string, string> = {};
            if (adminId) params.adminId = adminId;
            if (leagueId) params.leagueId = leagueId;
            const { data } = await api.get('/games', { params });
            setGames(data || []);
        } catch (err) { console.error("Error fetching games:", err); }
    };

    const handleDeleteGame = async (gameId: string, homeTeam: string, awayTeam: string) => {
        const confirmed = window.confirm(
            `¿Eliminar el partido ${awayTeam} vs ${homeTeam}?\n\nEsto eliminará el juego y todas sus estadísticas permanentemente.`
        );
        if (!confirmed) return;
        try {
            await api.delete(`/games/${gameId}`);
            setGames(prev => prev.filter(g => g.id !== gameId));
        } catch (err) {
            console.error(err);
            alert('No se pudo eliminar el juego. Intenta de nuevo.');
        }
    };

    const fetchTournaments = async (adminId?: string, leagueId?: string) => {
        try {
            const params: Record<string, string> = {};
            if (adminId) params.adminId = adminId;
            if (leagueId) params.leagueId = leagueId;
            const { data } = await api.get('/torneos', { params });
            setTournaments(data || []);
        } catch (err) { console.error("Error fetching tournaments:", err); }
    }

    const fetchLeagues = async (adminId?: string) => {
        try {
            const params = adminId ? { adminId } : {};
            const { data } = await api.get('/leagues', { params });
            setLeagues(data || []);
        } catch (err) { console.error("Error fetching leagues:", err); }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users');
            setUsers(data || []);
        } catch (err) { console.error("Error fetching users:", err); }
    };

    const fetchMyScorekeepers = async () => {
        try {
            const { data } = await api.get('/users/my-scorekeepers');
            setMyScorekeepers(data || []);
        } catch (err) { console.error("Error fetching scorekeepers:", err); }
    };

    const fetchDelegates = async (tournamentId: string) => {
        if (!tournamentId) return;
        try {
            const { data } = await api.get(`/delegates/tournament/${tournamentId}`);
            setDelegates(data || []);
        } catch (err) { console.error('Error fetching delegates:', err); }
    };

    const handleCreateDelegate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/delegates', {
                ...delegateForm,
                tournamentId: delegateForm.tournamentId || delegateTournamentId,
            });
            fetchDelegates(delegateForm.tournamentId || delegateTournamentId);
            setShowDelegateModal(false);
            setDelegateForm({ firstName: '', lastName: '', email: '', password: '', phone: '', teamId: '', tournamentId: '', linkExistingAccount: false });
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al crear o vincular delegado');
        } finally { setSaving(false); }
    };

    const handleToggleDelegate = async (delegate: DelegateData) => {
        try {
            const { data } = await api.patch(`/delegates/${delegate.id}/toggle`);
            setDelegates(prev => prev.map(d => d.id === delegate.id ? { ...d, isActive: data.isActive } : d));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al cambiar estado del delegado');
        }
    };

    const handleDeleteDelegate = async (delegate: DelegateData) => {
        const name = `${delegate.user.firstName} ${delegate.user.lastName}`;
        if (!confirm(`¿Desvincular a "${name}" de este equipo?\nLa cuenta seguirá existiendo si también participa en otros equipos o ligas.`)) return;
        try {
            await api.delete(`/delegates/${delegate.id}`);
            setDelegates(prev => prev.filter(d => d.id !== delegate.id));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al desvincular delegado');
        }
    };

    const handleDeleteStaff = async (user: UserData) => {
        const name = `${user.firstName} ${user.lastName}`;
        const roleLabel = user.role === 'presi' ? 'Presidente' : 'ScoreKeeper';
        if (!confirm(`¿Eliminar la cuenta de ${roleLabel} "${name}"?\nEsta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/users/staff/${user.id}`);
            setMyScorekeepers(prev => prev.filter(u => u.id !== user.id));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al eliminar la cuenta');
        }
    };

    useEffect(() => {
        if (!userRole) return;
        if (userRole === 'admin') {
            // Admin: ve todo sin filtros
            fetchGames();
            fetchTournaments();
            fetchLeagues();
            fetchUsers();
        } else if (userRole === 'organizer') {
            // Organizer: ve solo los recursos de sus propias ligas
            const adminId = currentUser?.id;
            fetchGames(adminId);
            fetchTournaments(adminId);
            fetchLeagues(adminId);
            fetchMyScorekeepers();
        } else if (userRole === 'scorekeeper') {
            // Scorekeeper: ve solo recursos de la liga que le fue asignada
            const leagueId = currentUser?.scorekeeperLeagueId ?? undefined;
            fetchGames(undefined, leagueId);
            fetchTournaments(undefined, leagueId);
        } else if (userRole === 'presi') {
            // Presi: ve los torneos a los que fue asignado (revisado en el backend con su userId)
            const adminId = currentUser?.id;
            fetchGames(adminId);
            fetchTournaments(adminId);
            fetchMyScorekeepers();
        } else if (userRole === 'delegado') {
            const assignments = currentUser?.delegateAssignments ?? [];

            if (assignments.length === 0) {
                setTournaments([]);
                setTeams([]);
                setSelectedTournament('');
                setSelectedTeam('');
                return;
            }

            const tournamentMap = new Map<string, TournamentData>();
            assignments.forEach((assignment) => {
                if (!tournamentMap.has(assignment.tournamentId)) {
                    tournamentMap.set(assignment.tournamentId, {
                        id: assignment.tournamentId,
                        name: assignment.tournamentName || 'Torneo asignado',
                        season: assignment.tournamentSeason || '',
                        status: assignment.tournamentStatus || 'upcoming',
                        sport: 'Béisbol',
                        branch: 'Varonil',
                    } as TournamentData);
                }
            });

            const selectedAssignment = selectedTeam
                ? assignments.find((assignment) => assignment.teamId === selectedTeam)
                : null;
            const requestedTournamentId = selectedTournament && tournamentMap.has(selectedTournament)
                ? selectedTournament
                : '';
            const effectiveTournamentId = requestedTournamentId || selectedAssignment?.tournamentId || (assignments.length === 1 ? assignments[0]?.tournamentId || '' : '');

            setTournaments(Array.from(tournamentMap.values()));
            if (effectiveTournamentId !== selectedTournament) {
                setSelectedTournament(effectiveTournamentId);
            }

            const loadDelegateTeams = async () => {
                const relevantAssignments = assignments.filter((assignment) =>
                    !effectiveTournamentId || assignment.tournamentId === effectiveTournamentId,
                );

                if (relevantAssignments.length === 0) {
                    setTeams([]);
                    if (selectedTeam) setSelectedTeam('');
                    return;
                }

                const tournamentIds = Array.from(new Set(relevantAssignments.map((assignment) => assignment.tournamentId)));
                const responses = await Promise.all(
                    tournamentIds.map((tournamentId) =>
                        api.get('/teams', { params: { tournamentId } })
                            .then(({ data }) => data || [])
                            .catch(() => []),
                    ),
                );

                const allowedTeamIds = new Set(relevantAssignments.map((assignment) => assignment.teamId));
                const fullTeams = responses
                    .flat()
                    .filter((team: TeamData) => allowedTeamIds.has(team.id))
                    .sort((a: TeamData, b: TeamData) => a.name.localeCompare(b.name));

                setTeams(fullTeams);

                const validSelectedTeam = fullTeams.some((team: TeamData) => team.id === selectedTeam)
                    ? selectedTeam
                    : (!effectiveTournamentId && assignments.length > 1 ? '' : fullTeams[0]?.id || '');

                if (validSelectedTeam !== selectedTeam) {
                    setSelectedTeam(validSelectedTeam);
                }
            };

            loadDelegateTeams().catch(console.error);
        }
    }, [userRole, currentUser, selectedTournament, selectedTeam]);

    // Fetch Teams when Game Creation Tournament changes
    useEffect(() => {
        if (userRole === 'delegado') return; // Delegado's team is pre-fetched and shouldn't be overwritten
        if (!selectedTournament) {
            setTeams([]);
            return;
        }
        api.get('/teams', { params: { tournamentId: selectedTournament } })
            .then(({ data }) => setTeams(data || []))
            .catch(err => console.error(err));
    }, [selectedTournament, userRole]);

    // Fetch Players when Selected Team changes
    useEffect(() => {
        if (!selectedTeam) {
            setPlayers([]);
            return;
        }
        api.get('/players', { params: { teamId: selectedTeam } })
            .then(({ data }) => setPlayers(data || []))
            .catch(err => console.error(err));
    }, [selectedTeam]);

    // ── Equipos del DIRECTORIO (aislados del tab jugadores) ──────────────────
    useEffect(() => {
        if (userRole === 'delegado') {
            // Para delegado: filtrar sus assignments según dirTournamentId
            const filtered = delegateAssignments
                .filter(a => !dirTournamentId || a.tournamentId === dirTournamentId)
                .map(a => ({ id: a.teamId, name: a.teamName ?? a.teamId } as any));
            setDirTeams(filtered);
            if (dirTeamId && !filtered.some((t: any) => t.id === dirTeamId)) setDirTeamId('');
            return;
        }
        if (!dirTournamentId) {
            setDirTeams([]);
            setDirTeamId('');
            return;
        }
        api.get('/teams', { params: { tournamentId: dirTournamentId } })
            .then(({ data }) => setDirTeams(data || []))
            .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dirTournamentId, userRole]);

    useEffect(() => {
        if (!selectedTeam) return;

        if (userRole === 'delegado') {
            const isValidDelegateTeam = delegateAssignments.some((assignment) =>
                assignment.teamId === selectedTeam && (!selectedTournament || assignment.tournamentId === selectedTournament),
            );

            if (!isValidDelegateTeam) {
                setSelectedTeam('');
            }
            return;
        }

        if (!teams.some((team) => team.id === selectedTeam)) {
            setSelectedTeam('');
        }
    }, [selectedTeam, selectedTournament, teams, userRole, delegateAssignments]);

    // Cerrar dropdown de liga al hacer clic fuera
    useEffect(() => {
        if (!leagueDropdownOpen) return;
        const close = () => { setLeagueDropdownOpen(null); setLeagueDropdownPos(null); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [leagueDropdownOpen]);

    // --- Handlers ---
    const updateStoredUser = (patch: Partial<AuthUser>) => {
        const base = getUser();
        if (!base) return;
        const updated = { ...base, ...patch } as AuthUser;
        localStorage.setItem('user', JSON.stringify(updated));
        setCurrentUser(updated);
    };
    const handleCreateGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTournament || !homeTeamId || !awayTeamId) {
            alert('Por favor completa todos los campos');
            return;
        }
        if (homeTeamId === awayTeamId) {
            alert('Un equipo no puede jugar contra sí mismo');
            return;
        }

        setSaving(true);
        try {
            const { data: newGame } = await api.post('/games', {
                tournamentId: selectedTournament,
                homeTeamId,
                awayTeamId,
                status: 'scheduled',
                scheduledDate: new Date().toISOString(),
            });
            alert('Partido Creado');
            setShowGameModal(false);
            fetchGames(
                userRole === 'organizer' ? currentUser?.id : undefined,
                userRole === 'scorekeeper' ? (currentUser?.scorekeeperLeagueId ?? undefined) : undefined,
            );
            router.push(`/admin/games/${newGame.id}/roster`);
        } catch (err) { 
            console.error(err);
            alert('Error al crear partido');
        } finally { setSaving(false); }
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!currentUser) {
                alert('Sesión no válida o usuario no encontrado');
                setSaving(false);
                return;
            }

            const { data: newTourn } = await api.post('/torneos', {
                name: tournForm.name,
                season: tournForm.season,
                rulesType: tournForm.sport === 'Softbol' ? 'softball_7' : 'baseball_9',
                category: tournForm.category,
                adminId: currentUser.id,
                leagueId: tournForm.leagueId || null,
                locationCity: tournForm.location_city,
                locationState: tournForm.location_state,
                locationCountry: tournForm.location_country,
                description: tournForm.description,
                logoUrl: tournForm.logoUrl,
                isPrivate: tournForm.isPrivate,
                startDate: tournForm.startDate || undefined,
            });
            if (newTourn) {
                alert('Torneo Creado Satisfactoriamente');
                setShowTournamentModal(false);
                setTournForm({
                    name: '',
                    season: '',
                    location_city: '',
                    location_state: '',
                    location_country: 'México',
                    sport: 'Béisbol',
                    branch: 'Varonil',
                    category: 'Libre',
                    description: '',
                    logoUrl: '',
                    leagueId: '',
                    isPrivate: false,
                    startDate: '',
                });
                fetchTournaments(
                    (userRole === 'organizer' || userRole === 'presi') ? currentUser?.id : undefined,
                    userRole === 'scorekeeper' ? (currentUser?.scorekeeperLeagueId ?? undefined) : undefined,
                );
                router.push(`/torneos/${newTourn.id}`);
            }
        } catch (err: any) {
            console.error(err);
            const data = err?.response?.data;
            if (data?.code === 'QUOTA_EXCEEDED') {
                alert(`Límite alcanzado: ${data.message}`);
            } else {
                alert('Error al crear torneo');
            }
        } finally { setSaving(false); }
    };

    const handleUpdateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTourn) return;
        setSaving(true);
        try {
            await api.patch(`/torneos/${editingTourn.id}`, {
                name: tournForm.name,
                season: tournForm.season,
                rulesType: tournForm.sport === 'Softbol' ? 'softball_7' : 'baseball_9',
                category: tournForm.category,
                leagueId: tournForm.leagueId || undefined,
                locationCity: tournForm.location_city,
                locationState: tournForm.location_state,
                locationCountry: tournForm.location_country,
                description: tournForm.description,
                logoUrl: tournForm.logoUrl,
            });
            alert('Torneo Actualizado');
            setShowEditTournModal(false);
            setEditingTourn(null);
            setTournForm({
                name: '',
                season: '',
                location_city: '',
                location_state: '',
                location_country: 'México',
                sport: 'Béisbol',
                branch: 'Varonil',
                category: 'Libre',
                description: '',
                logoUrl: '',
                leagueId: '',
                isPrivate: false,
                startDate: '',
            });
            fetchTournaments(
                (userRole === 'organizer' || userRole === 'presi') ? currentUser?.id : undefined,
                userRole === 'scorekeeper' ? (currentUser?.scorekeeperLeagueId ?? undefined) : undefined,
            );
        } catch (err) {
            console.error(err);
            alert('Error al actualizar torneo');
        } finally { setSaving(false); }
    };

    const handleDeleteTournament = async (tourn: TournamentData) => {
        if (!window.confirm(`¿Eliminar el torneo "${tourn.name}"?\n\nEsto eliminará permanentemente todos sus equipos, jugadores, juegos y estadísticas.\n\nEsta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/torneos/${tourn.id}`);
            setShowEditTournModal(false);
            setEditingTourn(null);
            fetchTournaments(
                (userRole === 'organizer' || userRole === 'presi') ? currentUser?.id : undefined,
                userRole === 'scorekeeper' ? (currentUser?.scorekeeperLeagueId ?? undefined) : undefined,
            );
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al eliminar el torneo');
        }
    };

    const handleEditTourn = (tourn: TournamentData) => {
        setEditingTourn(tourn);
        setTournForm({
            name: tourn.name,
            season: tourn.season || '',
            location_city: tourn.locationCity || '',
            location_state: tourn.locationState || '',
            location_country: tourn.locationCountry || 'México',
            sport: tourn.rulesType === 'softball_7' ? 'Softbol' : 'Béisbol',
            branch: tourn.branch || 'Varonil',
            category: tourn.category || 'Libre',
            description: tourn.description || '',
            logoUrl: tourn.logoUrl || '',
            leagueId: tourn.league?.id || '',
            isPrivate: (tourn as any).isPrivate ?? false,
            startDate: (tourn as any).startDate ? new Date((tourn as any).startDate).toISOString().split('T')[0] : '',
        });
        setShowEditTournModal(true);
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/teams', {
                name: teamForm.name,
                tournamentId: teamForm.tournament_id,
                managerName: teamForm.manager || null,
                logoUrl: teamForm.logoUrl || null,
            });
            alert('Equipo Creado y Asignado Satisfactoriamente');
            setShowTeamModal(false);
            setTeamForm({ name: '', manager: '', logoUrl: '', tournament_id: '' });
            if (selectedTournament === teamForm.tournament_id) {
                api.get('/teams', { params: { tournamentId: selectedTournament } })
                    .then(({ data }) => setTeams(data || []))
                    .catch(console.error);
            }
        } catch (err: any) {
            console.error(err);
            const data = err?.response?.data;
            if (data?.code === 'QUOTA_EXCEEDED') {
                alert(`Límite alcanzado: ${data.message}`);
            } else {
                alert('Error al crear equipo');
            }
        } finally { setSaving(false); }
    };

    const handleDeleteTeam = async (team: any) => {
        if (!window.confirm(`¿Eliminar el equipo "${team.name}"?\n\nEsto eliminará permanentemente todos sus jugadores, juegos y estadísticas.\n\nEsta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/teams/${team.id}`);
            setShowTeamModal(false);
            setEditingTeam(null);
            setTeamForm({ name: '', manager: '', logoUrl: '', tournament_id: '' });
            if (selectedTournament) {
                api.get('/teams', { params: { tournamentId: selectedTournament } })
                    .then(({ data }) => setTeams(data || []))
                    .catch(console.error);
            }
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al eliminar el equipo');
        }
    };

    const openEditTeam = (team: any) => {
        setEditingTeam(team);
        setTeamForm({ name: team.name, manager: team.managerName || '', logoUrl: team.logoUrl || '', tournament_id: team.tournament?.id || '' });
        setShowTeamModal(true);
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam) return;
        setSaving(true);
        try {
            await api.patch(`/teams/${editingTeam.id}`, {
                name: teamForm.name,
                managerName: teamForm.manager || null,
                logoUrl: teamForm.logoUrl || null,
            });
            alert('Equipo Actualizado');
            setShowTeamModal(false);
            setEditingTeam(null);
            setTeamForm({ name: '', manager: '', logoUrl: '', tournament_id: '' });
            if (userRole === 'delegado') {
                const activeDelegateTeams = (currentUser?.delegateAssignments ?? [])
                    .filter((assignment) => !selectedTournament || assignment.tournamentId === selectedTournament)
                    .map((assignment) => ({
                        id: assignment.teamId,
                        name: assignment.teamName || 'Equipo asignado',
                        tournament: {
                            id: assignment.tournamentId,
                            name: assignment.tournamentName || 'Torneo asignado',
                            season: assignment.tournamentSeason || '',
                            status: assignment.tournamentStatus || 'upcoming',
                        },
                    })) as TeamData[];
                setTeams(activeDelegateTeams);
            } else if (selectedTournament) {
                api.get('/teams', { params: { tournamentId: selectedTournament } })
                    .then(({ data }) => setTeams(data || []))
                    .catch(console.error);
            }
        } catch (err) {
            alert('Error al actualizar equipo');
        } finally { setSaving(false); }
    };

    const handleCreatePlayer = async (e: React.FormEvent, forceCreate = false) => {
        e.preventDefault();
        setSaving(true);
        try {
            const targetTeamId = playerForm.team_id;
            const targetTournamentId =
                selectedTournament ||
                resolveDelegateTournamentForTeam(targetTeamId) ||
                teams.find(t => t.id === targetTeamId)?.tournament?.id ||
                '';

            await api.post('/players', {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                secondLastName: playerForm.secondLastName || undefined,
                curp: playerForm.curp || undefined,
                birthDate: playerForm.birthDate || undefined,
                number: playerForm.number ? parseInt(playerForm.number) : null,
                teamId: targetTeamId,
                tournamentId: targetTournamentId,
                position: playerForm.position,
                bats: playerForm.bats,
                throws: playerForm.throws,
                photoUrl: playerForm.photoUrl || null,
                birthPlace: playerForm.birthPlace || undefined,
                ...(forceCreate ? { forceCreate: true } : {}),
            });
            alert('Jugador Registrado Satisfactoriamente');
            setShowPlayerModal(false);
            setPlayerForm({ firstName: '', lastName: '', secondLastName: '', curp: '', birthDate: '', birthPlace: '', number: '', position: 'INF', bats: 'R', throws: 'R', photoUrl: '', team_id: '' });
            await refreshPlayersViews(targetTeamId, targetTournamentId);
        } catch (err: any) {
            console.error(err);
            const data = err?.response?.data;
            if (data?.code === 'QUOTA_EXCEEDED') {
                alert(`Limite alcanzado: ${data.message}`);
            } else {
                alert('Error al crear jugador');
            }
        } finally { setSaving(false); }
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

    const handleCsvPreview = async () => {
        const teamId = csvTeamId || playerForm.team_id;
        const tournamentId = selectedTournament || resolveDelegateTournamentForTeam(teamId) || teams.find(t => t.id === teamId)?.tournament?.id;
        if (!teamId) { setCsvError('Selecciona un equipo destino'); return; }
        const valid = csvRows.filter(r => r.firstName && r.lastName);
        if (valid.length === 0) { setCsvError('Cada jugador necesita al menos nombre y apellido'); return; }
        setImportingCsv(true);
        setCsvError('');
        try {
            const { data } = await api.post('/players/import', {
                teamId,
                tournamentId,
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

    const handleConfirmImport = async () => {
        if (!importPreview) return;
        const teamId = csvTeamId || playerForm.team_id;
        const tournamentId = selectedTournament || resolveDelegateTournamentForTeam(teamId) || teams.find(t => t.id === teamId)?.tournament?.id;
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
            await api.post('/players/confirm-import', { teamId, tournamentId, toCreate, toRoster });
            setShowPlayerModal(false);
            resetCsvState();
            await refreshPlayersViews(teamId, tournamentId);
        } catch (err: any) {
            setCsvError(err?.response?.data?.message || 'Error al confirmar importacion');
        } finally { setConfirmingImport(false); }
    };

    const resetCsvState = () => {
        setCsvRows([]);
        setCsvError('');
        setImportPreview(null);
        setImportStep('upload');
        setImportChecked(new Set());
        setImportSummary(null);
        setCsvTeamId('');
    };

    const handleEditPlayer = (player: any) => {
        setEditingPlayer(player);
        setPlayerForm({
            firstName: player.firstName || player.first_name,
            lastName: player.lastName || player.last_name,
            secondLastName: player.secondLastName || '',
            curp: player.curp || '',
            birthDate: player.birthDate ? new Date(player.birthDate).toISOString().split('T')[0] : '',
            birthPlace: player.birthPlace || '',
            number: player.number?.toString() || '',
            position: player.position || 'INF',
            bats: player.bats || 'R',
            throws: player.throws || 'R',
            photoUrl: player.photoUrl || player.photo_url || '',
            team_id: player.team_id
        });
        setShowEditPlayerModal(true);
    };

    const handleDeletePlayer = async (player: any) => {
        const name = `${player.firstName || player.first_name} ${player.lastName || player.last_name}`;
        
        // Determinar el ID del roster entry si está disponible
        const targetRosterEntryId = player.rosterEntryId || player.rosterEntries?.[0]?.id;
        const fallbackTeamId = player.rosterEntries?.[0]?.team?.id || player.team_id || currentUser?.delegateTeamId;

        if (!selectedTeam && userRole !== 'delegado') {
            if (userRole === 'admin') {
                if (!confirm(`ADMINISTRADOR:\n¿Eliminar permanentemente a ${name} de toda la base de datos?\nEsto destruirá sus registros globales.`)) return;
                try {
                    await api.delete(`/players/${player.id}`);
                    setPlayers(prev => prev.filter((p: any) => p.id !== player.id));
                    setDirectoryPlayers(prev => prev.filter((p: any) => p.id !== player.id));
                    alert('Jugador eliminado del sistema.');
                } catch (err: any) {
                    alert(err?.response?.data?.message || 'Error al eliminar jugador maestro');
                }
            } else {
                alert('Por favor selecciona un equipo específico en los filtros superiores para dar de baja a un jugador del roster de ese equipo.');
            }
            return;
        }

        if (!confirm(`¿Dar de baja a ${name} de este equipo?\nSe marcará como inactivo pero su historial estadístico se mantendrá.`)) return;
        
        try {
            if (targetRosterEntryId) {
                await api.delete(`/roster/${targetRosterEntryId}`); // Soft delete
            } else if (selectedTeam || fallbackTeamId) {
                const teamIdToUse = selectedTeam || fallbackTeamId;
                await api.delete(`/roster/player/${player.id}/team/${teamIdToUse}`); // Contextual Soft Delete
            } else {
                alert('Error crítico: Falta contexto de equipo para dar de baja.');
                return;
            }
            
            // Actualizar estado local
            setPlayers(prev => prev.filter((p: any) => p.id !== player.id));
            setDirectoryPlayers(prev => prev.filter((p: any) => p.id !== player.id));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al dar de baja al jugador del equipo');
        }
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer) return;
        setSaving(true);
        try {
            const targetTeamId = playerForm.team_id || selectedTeam || editingPlayer.team_id || '';
            const targetTournamentId =
                selectedTournament ||
                teams.find(t => t.id === targetTeamId)?.tournament?.id ||
                resolveDelegateTournamentForTeam(targetTeamId) ||
                '';

            await api.patch(`/players/${editingPlayer.id}`, {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                secondLastName: playerForm.secondLastName || undefined,
                curp: playerForm.curp || undefined,
                birthDate: playerForm.birthDate || undefined,
                number: playerForm.number && playerForm.number.trim() !== '' ? parseInt(playerForm.number) : undefined,
                teamId: targetTeamId || undefined,
                tournamentId: targetTournamentId || undefined,
                position: playerForm.position || undefined,
                bats: playerForm.bats || 'R',
                throws: playerForm.throws || 'R',
                photoUrl: playerForm.photoUrl || undefined,
                birthPlace: playerForm.birthPlace || undefined,
            });
            alert('Jugador Actualizado');
            setShowEditPlayerModal(false);
            setEditingPlayer(null);
            setPlayerForm({ firstName: '', lastName: '', secondLastName: '', curp: '', birthDate: '', birthPlace: '', number: '', position: 'INF', bats: 'R', throws: 'R', photoUrl: '', team_id: '' });
            await refreshPlayersViews(targetTeamId, targetTournamentId);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar jugador');
        } finally { setSaving(false); }
    };

    const handleDeleteGlobalPlayer = async () => {
        if (!editingPlayer) return;
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente a este jugador de la base de datos maestra?')) return;
        setSaving(true);
        try {
            await api.delete(`/players/${editingPlayer.id}`);
            alert('Jugador eliminado permanentemente del sistema.');
            setShowEditPlayerModal(false);
            setEditingPlayer(null);
            
            // Refrescar vistas locales
            setDirectoryPlayers(prev => prev.filter((p: any) => p.id !== editingPlayer.id));
            setPlayers(prev => prev.filter((p: any) => p.id !== editingPlayer.id));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al eliminar. Probablemente participando en torneos que no administras.');
        } finally {
            setSaving(false);
        }
    };

    const handleMergePlayers = async () => {
        if (!mergePrimary || !mergeDuplicate) return;
        if (!confirm(`ESTÁS A PUNTO DE FUSIONAR AL JUGADOR DUPLICADO [${mergeDuplicate.firstName} ${mergeDuplicate.lastName}] 
HACIA EL JUGADOR PRINCIPAL [${mergePrimary.firstName} ${mergePrimary.lastName}].

ESTA ACCIÓN SUMARÁ TODO SU HISTORIAL AL PRINCIPAL Y ELIMINARÁ AL DUPLICADO PARA SIEMPRE.
No se puede deshacer. ¿Deseas continuar?`)) return;

        setSaving(true);
        try {
            await api.post('/players/merge', {
                primaryId: mergePrimary.id,
                duplicateId: mergeDuplicate.id
            });
            alert('¡Fusión completada con éxito!');
            
            // Cleanup UI
            setMergePrimary(null);
            setMergeDuplicate(null);
            setMergeMode(false);
            
            // Reload directory explicitly to show merged stats/rosters
            const params: any = { page: directoryPage, limit: 12 };
            if (directorySearchDebounced.length >= 2) params.q = directorySearchDebounced;
            if (selectedTeam) params.teamId = selectedTeam;
            else if (selectedTournament) params.tournamentId = selectedTournament;
            
            const { data } = await api.get('/players/directory', { params });
            setDirectoryPlayers(data.data || []);
            setDirectoryMeta(data.meta || { total: 0, page: 1, limit: 12, totalPages: 1 });
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al fusionar jugadores. Revisa permisos.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Organizer p Presi: crea personal via endpoint dedicado
            if (userRole === 'organizer' || userRole === 'presi') {
                const myLeague = leagues.find(l => l.adminId === currentUser?.id) || (userRole === 'presi' && currentUser?.scorekeeperLeagueId ? { id: currentUser.scorekeeperLeagueId } : null);
                if (!myLeague) { alert('No tienes una liga activa vinculada.'); setSaving(false); return; }
                const nameParts = userForm.name.trim().split(/\s+/);
                
                if (userForm.role === 'presi' && userRole === 'organizer') {
                    await api.post('/users/president', {
                        email: userForm.email,
                        password: userForm.password,
                        firstName: nameParts[0] || '',
                        lastName: nameParts.slice(1).join(' ') || ' ',
                        leagueId: myLeague.id,
                        tournamentIds: userForm.tournament_ids,
                    });
                    alert('Presidente de Liga creado correctamente');
                } else {
                    await api.post('/users/scorekeeper', {
                        email: userForm.email,
                        password: userForm.password,
                        firstName: nameParts[0] || '',
                        lastName: nameParts.slice(1).join(' ') || ' ',
                        leagueId: myLeague.id,
                    });
                    alert('Scorekeeper creado correctamente');
                }
                
                setShowUserModal(false);
                setUserForm({ name: '', email: '', password: '', role: 'general', tournament_id: '', tournament_ids: [] });
                fetchMyScorekeepers();
                return;
            }

            // Admin: flujo original
            const nameParts = userForm.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || ' ';
            await api.post('/auth/register', {
                email: userForm.email,
                password: userForm.password,
                firstName,
                lastName,
                role: userForm.role,
                tournamentId: userForm.role === 'scorekeeper' ? userForm.tournament_id : undefined,
            });
            alert('Cuenta Registrada Satisfactoriamente');
            setShowUserModal(false);
            setUserForm({ name: '', email: '', password: '', role: 'general', tournament_id: '', tournament_ids: [] });
            fetchUsers();
        } catch (err: any) {
            console.error('[CreateUser Error]', err);
            const data = err.response?.data;
            let errorMsg = 'Error desconocido';
            if (data?.message) {
                errorMsg = Array.isArray(data.message)
                    ? data.message.map((m: any) => typeof m === 'string' ? m : Object.values(m.constraints || {}).join(', ')).join('\n')
                    : data.message;
            }
            alert('Error al crear cuenta:\n' + errorMsg);
        } finally { setSaving(false); }
    };

    const PLAN_QUOTAS: Record<string, { maxLeagues: number; maxTournamentsPerLeague: number; maxTeamsPerTournament: number; maxPlayersPerTeam: number }> = {
        public:   { maxLeagues: 0, maxTournamentsPerLeague: 0, maxTeamsPerTournament: 0,  maxPlayersPerTeam: 25 },
        demo:     { maxLeagues: 1, maxTournamentsPerLeague: 1, maxTeamsPerTournament: 6,  maxPlayersPerTeam: 25 },
        standard: { maxLeagues: 1, maxTournamentsPerLeague: 3, maxTeamsPerTournament: 10, maxPlayersPerTeam: 30 },
        pro:      { maxLeagues: 1, maxTournamentsPerLeague: 10, maxTeamsPerTournament: 50, maxPlayersPerTeam: 50 },
        admin:    { maxLeagues: 999, maxTournamentsPerLeague: 999, maxTeamsPerTournament: 999, maxPlayersPerTeam: 999 },
    };

    const openAccessModal = (user: UserData) => {
        setEditingUser(user);
        setAccessForm({
            role: user.role,
            planLabel: user.planLabel,
            maxLeagues: user.maxLeagues,
            maxTournamentsPerLeague: user.maxTournamentsPerLeague,
            maxTeamsPerTournament: user.maxTeamsPerTournament,
            maxPlayersPerTeam: user.maxPlayersPerTeam,
        });
        setShowAccessModal(true);
    };

    const handlePlanChange = (planLabel: string) => {
        const quotas = PLAN_QUOTAS[planLabel] ?? PLAN_QUOTAS['public'];
        setAccessForm(prev => ({ ...prev, planLabel, ...quotas }));
    };

    const handleUpdateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSaving(true);
        try {
            await api.patch(`/users/${editingUser.id}/access`, {
                role: accessForm.role,
                planLabel: accessForm.planLabel,
                maxLeagues: accessForm.maxLeagues,
                maxTournamentsPerLeague: accessForm.maxTournamentsPerLeague,
                maxTeamsPerTournament: accessForm.maxTeamsPerTournament,
                maxPlayersPerTeam: accessForm.maxPlayersPerTeam,
            });
            setShowAccessModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert('Error al actualizar el acceso');
        } finally { setSaving(false); }
    };

    const handleCreateLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leagueForm.name) return;
        setSaving(true);
        try {
            if (!currentUser) {
                alert('Sesión no válida.');
                setSaving(false);
                return;
            }
            await api.post('/leagues', {
                name: leagueForm.name,
                shortName: leagueForm.shortName || undefined,
                city: leagueForm.city || undefined,
                state: leagueForm.state || undefined,
                sport: leagueForm.sport || undefined,
                description: leagueForm.description || undefined,
                logoUrl: leagueForm.logoUrl || undefined,
                adminId: currentUser.id,
                isPrivate: leagueForm.isPrivate,
            });
            alert('Liga Creada');
            setLeagueForm({ name: '', shortName: '', city: '', state: '', sport: 'softball', description: '', logoUrl: '', isPrivate: false });
            setShowLeagueModal(false);
            fetchLeagues(userRole === 'organizer' ? currentUser?.id : undefined);
        } catch (err: any) {
            console.error(err);
            const data = err?.response?.data;
            if (data?.code === 'QUOTA_EXCEEDED') {
                alert(`Límite alcanzado: ${data.message}`);
            } else {
                alert('Error al crear liga');
            }
        } finally { setSaving(false); }
    };

    const openEditLeague = (league: LeagueData) => {
        setEditingLeague(league);
        setLeagueForm({
            name: league.name,
            shortName: league.shortName || '',
            city: league.city || '',
            state: league.state || '',
            sport: league.sport || 'softball',
            description: league.description || '',
            logoUrl: league.logoUrl || '',
            isPrivate: (league as any).isPrivate ?? false,
        });
        setLeagueDropdownOpen(null);
        setShowLeagueModal(true);
    };

    const handleUpdateLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLeague) return;
        setSaving(true);
        try {
            await api.patch(`/leagues/${editingLeague.id}`, {
                name: leagueForm.name,
                shortName: leagueForm.shortName || undefined,
                city: leagueForm.city || undefined,
                state: leagueForm.state || undefined,
                sport: leagueForm.sport || undefined,
                description: leagueForm.description || undefined,
                logoUrl: leagueForm.logoUrl || null,
                isPrivate: leagueForm.isPrivate,
            });
            alert('Liga Actualizada');
            setEditingLeague(null);
            setShowLeagueModal(false);
            setLeagueForm({ name: '', shortName: '', city: '', state: '', sport: 'softball', description: '', logoUrl: '', isPrivate: false });
            fetchLeagues(userRole === 'organizer' ? currentUser?.id : undefined);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar liga');
        } finally { setSaving(false); }
    };

    const handleDeleteLeague = async (league: LeagueData) => {
        if (!window.confirm(`¿Eliminar la liga "${league.name}"?\n\nEsto eliminará la liga permanentemente.`)) return;
        try {
            await api.delete(`/leagues/${league.id}`);
            setLeagueDropdownOpen(null);
            fetchLeagues(userRole === 'organizer' ? currentUser?.id : undefined);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al eliminar la liga');
        }
    };

    const handlePhoneUpdate = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            await api.patch('/users/profile', { phone: newPhone });
            setUserPhone(newPhone);
            updateStoredUser({ phone: newPhone });
            setIsEditingPhone(false);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar teléfono');
        } finally {
            setSaving(false);
        }
    };
    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        setSaving(true);
        try {
            const url = await uploadToCloudinary(file);
            await api.patch('/users/profile', { profilePicture: url });
            setUserProfilePicture(url);
            updateStoredUser({ profilePicture: url });
        } catch (error) {
            console.error(error);
            alert('Error al actualizar la foto de perfil');
        } finally {
            setSaving(false);
        }
    };

    // --- Partials ---
    const SideMenu = () => {
        const menuItems = [
            { id: 'perfil', label: 'Mi Perfil', icon: '👤', roles: null },
            { id: 'ligas', label: 'Ligas', icon: '🏟️', roles: ['admin', 'organizer'] },
            { id: 'torneos', label: 'Torneos', icon: '🏆', roles: ['admin', 'organizer', 'scorekeeper', 'presi'] },
            { id: 'equipos', label: userRole === 'delegado' ? 'Mi Equipo' : 'Equipos', icon: '🛡️', roles: null },
            { id: 'jugadores', label: userRole === 'delegado' ? 'Mi Plantilla' : 'Jugadores', icon: '⚾', roles: null },
            { id: 'juegos', label: 'Juegos & Stats', icon: '📊', roles: ['admin', 'organizer', 'presi', 'scorekeeper'] },
            { id: 'usuarios', label: (userRole === 'organizer' || userRole === 'presi') ? 'Mi Personal' : 'Control de Accesos', icon: '🔑', roles: ['admin', 'organizer', 'presi'] },
            { id: 'delegados', label: 'Delegados', icon: '🪪', roles: ['admin', 'organizer', 'presi'] },
            { id: 'campos', label: 'Unid. Deportivas', icon: '🏟️', roles: ['admin', 'organizer', 'presi'] },
            { id: 'plan', label: 'Mi Plan', icon: '💎', roles: ['organizer'] },
        ];
        return (
            <div className="w-full md:w-64 shrink-0 bg-surface border border-muted/30 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-hide">
                <div className="hidden md:block px-4 py-2 border-b border-muted/20 mb-2">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Dashboard</p>
                </div>
                {menuItems.filter(item => !item.roles || item.roles.includes(userRole ?? '')).map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as TabType)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-bold text-sm ${activeTab === item.id
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
        );
    };

    // Derivado a nivel de componente para que esté disponible en todo el JSX
    const isDelegateSuspended = userRole === 'delegado' && currentUser?.isDelegateActive === false;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 md:py-12">

                {/* Header */}
                <header className="flex items-center justify-between pb-4 sm:pb-8 border-b border-muted/20 gap-3 mb-4 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 text-base sm:text-xl">⚙️</div>
                            Panel de Control
                        </h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm font-medium hidden sm:block">Gestión integral de torneos, equipos y configuración del sistema.</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-3 sm:px-6 py-2 sm:py-2.5 bg-surface hover:bg-muted/10 text-foreground font-bold rounded-xl border border-muted/30 transition-all shadow-sm text-xs sm:text-sm shrink-0"
                    >
                        Ver Sitio
                    </button>
                </header>

                <div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start">
                    {/* Navigation Sidebar */}
                    <SideMenu />

                    {/* Content Area */}
                    <main className="flex-1 w-full min-w-0">
                        {userRole === 'delegado' && currentUser?.isDelegateActive === false && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <p className="text-red-500 font-black text-sm uppercase tracking-tight">Acceso Suspendido</p>
                                    <p className="text-red-400/80 text-xs font-medium">
                                        Tu permiso para gestionar la plantilla se desactiva cuando el torneo está activo. 
                                        Contacta al organizador si necesitas realizar cambios extraordinarios.
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* TAB: PERFIL */}
                        {activeTab === 'perfil' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Mi Perfil
                                    </h2>
                                    <button
                                        onClick={() => { clearSession(); router.push('/'); }}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg transition cursor-pointer"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-8 flex flex-col md:flex-row gap-4 sm:gap-8 items-center sm:items-start">
                                    <div className="shrink-0 flex flex-col items-center gap-4">
                                        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-primary text-5xl font-black shadow-inner border-4 border-surface overflow-hidden relative group">
                                            {userProfilePicture ? (
                                                <img src={userProfilePicture} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                userName ? userName.charAt(0).toUpperCase() : '?'
                                            )}
                                        </div>
                                        <label className={`px-4 py-2 bg-muted/10 hover:bg-muted/20 text-foreground text-xs font-bold rounded-lg transition cursor-pointer text-center ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {saving ? 'Guardando...' : 'Cambiar Foto'}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={saving} />
                                        </label>
                                    </div>
                                    <div className="flex-1 space-y-6 w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nombre Completo</label>
                                                <div className="font-bold text-lg">{userName}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Correo Electrónico</label>
                                                <div className="font-bold text-lg">{userEmail}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Rol de Acceso</label>
                                                <div className="inline-flex">
                                                    {userRole === 'admin' && <span className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-sm font-black uppercase">Administrador Total</span>}
                                                    {userRole === 'scorekeeper' && <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-black uppercase">ScoreKeeper Móvil</span>}
                                                    {userRole === 'general' && <span className="bg-muted/20 text-muted-foreground px-3 py-1.5 rounded-lg text-sm font-black uppercase">Público General</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Número de Teléfono</label>
                                                {isEditingPhone ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input
                                                            type="text"
                                                            value={newPhone}
                                                            onChange={e => setNewPhone(e.target.value)}
                                                            className="flex-1 bg-background border border-muted/30 text-foreground rounded-md px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                            placeholder="Ej. +52 81 1234 5678"
                                                        />
                                                        <button onClick={handlePhoneUpdate} disabled={saving} className="bg-primary hover:bg-primary-light text-white px-3 py-1.5 rounded-md text-xs font-bold transition disabled:opacity-50">Guardar</button>
                                                        <button onClick={() => setIsEditingPhone(false)} className="bg-muted/20 hover:bg-muted/30 text-muted-foreground px-3 py-1.5 rounded-md text-xs font-bold transition">Cancelar</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className={`font-bold text-lg ${!userPhone ? 'text-muted-foreground italic' : ''}`}>
                                                            {userPhone || 'No especificado'}
                                                        </div>
                                                        <button
                                                            onClick={() => { setIsEditingPhone(true); setNewPhone(userPhone || ''); }}
                                                            className="text-xs text-primary hover:underline font-bold"
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* TAB: LIGAS */}
                        {activeTab === 'ligas' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span>
                                        {userRole === 'admin' ? 'Todas las Ligas' : 'Mi Liga'}
                                    </h2>
                                    {(userRole === 'admin' || userRole === 'organizer') && (() => {
                                        const maxLeagues = currentUser?.maxLeagues ?? (userRole === 'admin' ? 999 : 0);
                                        const atQuota = userRole !== 'admin' && leagues.length >= maxLeagues;
                                        return (
                                            <button
                                                onClick={() => !atQuota && setShowLeagueModal(true)}
                                                disabled={atQuota}
                                                title={atQuota ? `Límite de tu plan: ${maxLeagues} liga(s)` : undefined}
                                                className={`px-5 py-2 font-black rounded-lg transition text-sm flex items-center gap-2 shrink-0 ${atQuota ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-md hover:shadow-amber-500/40 cursor-pointer'}`}
                                            >
                                                {atQuota ? `Límite alcanzado (${maxLeagues})` : '+ Nueva Liga'}
                                            </button>
                                        );
                                    })()}
                                </div>

                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Liga</th>
                                                <th className="px-6 py-4">Organizador</th>
                                                <th className="px-6 py-4">Torneos</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {leagues.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay ligas registradas.
                                                        {(userRole === 'admin' || userRole === 'organizer') && (
                                                            <button onClick={() => setShowLeagueModal(true)} className="ml-2 text-primary hover:underline font-bold">+ Crear primera liga</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : leagues.map(l => (
                                                <tr key={l.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-foreground">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden border border-muted/30 shrink-0">
                                                                {l.logoUrl ? (
                                                                    <img src={l.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs">🏟️</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="truncate">{l.shortName || l.name}</span>
                                                                    {l.isVerified && <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold shrink-0">✓</span>}
                                                                </div>
                                                                {l.shortName && <p className="text-[11px] text-muted-foreground truncate">{l.name}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-foreground">
                                                            {(l as any).admin ? `${(l as any).admin.firstName} ${(l as any).admin.lastName}`.trim() : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-foreground">{l._count?.tournaments ?? 0}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button className="text-primary hover:underline font-bold text-xs" onClick={() => router.push(`/ligas/${l.id}`)}>
                                                                Ver Liga
                                                            </button>
                                                            {(userRole === 'admin' || userRole === 'organizer') && (
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (leagueDropdownOpen === l.id) {
                                                                                setLeagueDropdownOpen(null);
                                                                                setLeagueDropdownPos(null);
                                                                            } else {
                                                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                                setLeagueDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                                                setLeagueDropdownOpen(l.id);
                                                                            }
                                                                        }}
                                                                        className="text-muted-foreground hover:text-foreground font-bold text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/10 transition"
                                                                    >
                                                                        Opciones ▾
                                                                    </button>
                                                                    {leagueDropdownOpen === l.id && leagueDropdownPos && (
                                                                        <div
                                                                            className="w-40 bg-surface border border-muted/30 rounded-xl shadow-xl overflow-hidden animate-fade-in-up origin-top-right"
                                                                            style={{ position: 'fixed', top: leagueDropdownPos.top, right: leagueDropdownPos.right, zIndex: 9999 }}
                                                                        >
                                                                            <button
                                                                                onClick={() => openEditLeague(l)}
                                                                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/10 font-medium transition-colors"
                                                                            >
                                                                                ✏️ Editar liga
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLeague(l)}
                                                                                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 font-medium transition-colors"
                                                                            >
                                                                                🗑️ Eliminar liga
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TAB: TORNEOS */}
                        {activeTab === 'torneos' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Mis Torneos
                                    </h2>
                                    {(userRole === 'admin' || userRole === 'organizer') && (() => {
                                        const maxT = currentUser?.maxTournamentsPerLeague ?? (userRole === 'admin' ? 999 : 0);
                                        const allLeaguesFull = userRole !== 'admin' && maxT > 0 && leagues.length > 0 &&
                                            leagues.every(l => tournaments.filter(t => t.league?.id === l.id).length >= maxT);
                                        return (
                                            <button
                                                onClick={() => !allLeaguesFull && setShowTournamentModal(true)}
                                                disabled={allLeaguesFull}
                                                title={allLeaguesFull ? `Límite de tu plan: ${maxT} torneo(s) por liga` : undefined}
                                                className={`px-5 py-2 font-bold rounded-lg transition text-sm flex items-center gap-2 shrink-0 ${allLeaguesFull ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-md hover:shadow-primary/40 cursor-pointer'}`}
                                            >
                                                {allLeaguesFull ? `Límite alcanzado (${maxT}/liga)` : '+ Registrar Torneo'}
                                            </button>
                                        );
                                    })()}
                                </div>
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Nombre / Temporada</th>
                                                <th className="px-6 py-4">Liga</th>
                                                <th className="px-6 py-4">Status / Datos</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {tournaments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay torneos registrados. Clic en &quot;Registrar Torneo&quot;.
                                                    </td>
                                                </tr>
                                            ) : tournaments.map((t: any) => (
                                                <tr key={t.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-foreground">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden border border-muted/30">
                                                                {t.logoUrl ? (
                                                                    <img src={t.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs">🏆</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                {t.name} <span className="text-muted-foreground font-normal ml-2">{t.season}</span>
                                                                <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                                                    📍 {t.locationCity || 'S/C'}, {t.locationState || 'S/E'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-xs text-foreground bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                                                            {t.league?.name || 'Independiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] uppercase font-black text-muted-foreground leading-tight">Equipos</span>
                                                                <span className="text-sm font-bold text-foreground">{(t as any)._count?.teams || 0}</span>
                                                            </div>
                                                            <div className="flex flex-col border-l border-muted/20 pl-3">
                                                                <span className="text-[10px] uppercase font-black text-muted-foreground leading-tight">Juegos</span>
                                                                <span className="text-sm font-bold text-foreground">{(t as any)._count?.games || 0}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-primary hover:underline font-bold text-xs mr-4" onClick={() => router.push(`/torneos/${t.id}`)}>Ver Perfil</button>
                                                        {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi') && (
                                                            <button className="text-muted-foreground hover:text-foreground font-bold text-xs" onClick={() => handleEditTourn(t)}>Editar</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TAB: EQUIPOS */}
                        {activeTab === 'equipos' && (
                            <section className="animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> {userRole === 'delegado' ? (delegateHasMultipleAssignments ? 'Mis Equipos' : 'Mi Equipo') : 'Equipos Registrados'}
                                    </h2>
                                    {(userRole !== 'delegado' || delegateHasMultipleAssignments) && (
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <select
                                                className="w-full sm:w-64 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                                value={selectedTournament}
                                                onChange={(e) => handleTournamentFilterChange(e.target.value)}
                                            >
                                                <option value="">{userRole === 'delegado' ? 'Todos mis torneos' : 'Filtrar por Torneo...'}</option>
                                                {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name} ({t.season})</option>)}
                                            </select>
                                            {userRole === 'delegado' && delegateHasMultipleAssignments && (
                                                <select
                                                    className="w-full sm:w-64 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                                    value={selectedTeam}
                                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                                >
                                                    <option value="">Todos mis equipos</option>
                                                    {teams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            )}
                                            {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi') && (() => {
                                                const maxTeams = (userRole === 'admin' || userRole === 'presi') ? 999 : (currentUser?.maxTeamsPerTournament ?? 0);
                                                const atTeamQuota = userRole !== 'admin' && !!selectedTournament && teams.length >= maxTeams;
                                                return (
                                                    <button
                                                        onClick={() => !atTeamQuota && setShowTeamModal(true)}
                                                        disabled={atTeamQuota}
                                                        title={atTeamQuota ? `Límite de tu plan: ${maxTeams} equipo(s) por torneo` : undefined}
                                                        className={`px-5 py-2 whitespace-nowrap font-bold rounded-lg transition text-sm flex items-center gap-2 ${atTeamQuota ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-md hover:shadow-primary/40 cursor-pointer'}`}
                                                    >
                                                        {atTeamQuota ? `Límite alcanzado (${maxTeams})` : '+ Añadir Equipo'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Equipo</th>
                                                <th className="px-6 py-4">Torneo</th>
                                                <th className="px-6 py-4">Roster</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {(!selectedTournament && userRole !== 'delegado') ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        Por favor, selecciona un torneo en el menú superior para ver sus equipos adscritos.
                                                    </td>
                                                </tr>
                                            ) : teams.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        {userRole === 'delegado' ? 'No tienes equipos asignados con los filtros actuales.' : 'No hay equipos registrados en este torneo. Clic en "Añadir Equipo".'}
                                                    </td>
                                                </tr>
                                            ) : teams
                                                .filter((team: any) => !selectedTeam || team.id === selectedTeam)
                                                .map((team: any) => (
                                                <tr key={team.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-foreground">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center text-foreground font-black overflow-hidden border border-muted/30">
                                                                {team.logoUrl ? (
                                                                    <img src={team.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    team.name.charAt(0)
                                                                )}
                                                            </div>
                                                            {team.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-muted-foreground bg-muted/10 px-2.5 py-1 rounded">
                                                            {team.tournament?.name || 'Sin Torneo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold">
                                                        <span className="text-primary">{(team as any)._count?.rosterEntries || 0} Jugadores</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-primary hover:underline font-bold text-xs mr-4" onClick={() => router.push(`/equipos/${team.id}`)}>Ver Perfil</button>
                                                        {userRole === 'delegado' && (
                                                            <button
                                                                className="text-primary hover:underline font-bold text-xs mr-4 disabled:text-muted-foreground disabled:no-underline"
                                                                onClick={() => generateRosterPdf(team)}
                                                                disabled={generatingRosterTeamId === team.id}
                                                            >
                                                                {generatingRosterTeamId === team.id ? 'Generando...' : 'Generar Roster'}
                                                            </button>
                                                        )}
                                                        {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi' || userRole === 'delegado') && (
                                                            <button className="text-muted-foreground hover:text-foreground font-bold text-xs" onClick={() => openEditTeam(team)}>Editar</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TAB: JUGADORES (DIRECTORIO GLOBAL DEL ADMIN) */}
                        {activeTab === 'jugadores' && (
                            <section className="animate-fade-in-up">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2 whitespace-nowrap">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> {userRole === 'delegado' ? 'Mi Plantilla' : 'Directorio de Jugadores'}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                                        <div className="relative flex-grow sm:flex-grow-0">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Buscar jugador..."
                                                className="w-full sm:w-48 pl-10 pr-3 py-2 bg-surface text-foreground border border-muted/30 rounded-lg outline-none focus:ring-1 focus:ring-primary text-sm transition"
                                                value={directorySearch}
                                                onChange={(e) => { setDirectorySearch(e.target.value); setDirectoryPage(1); }}
                                            />
                                        </div>
                                        {(userRole !== 'delegado' || delegateHasMultipleAssignments) && (
                                            <>
                                                <select
                                                    className="flex-grow sm:flex-grow-0 sm:w-40 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                                    value={dirTournamentId}
                                                    onChange={(e) => { setDirTournamentId(e.target.value); setDirTeamId(''); setDirectoryPage(1); }}
                                                >
                                                    <option value="">{userRole === 'delegado' ? 'Todos mis torneos' : 'Todos los Torneos'}</option>
                                                    {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <select
                                                    disabled={!dirTournamentId && userRole !== 'delegado'}
                                                    className="flex-grow sm:flex-grow-0 sm:w-40 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm disabled:opacity-50"
                                                    value={dirTeamId}
                                                    onChange={(e) => { setDirTeamId(e.target.value); setDirectoryPage(1); }}
                                                >
                                                    <option value="">{userRole === 'delegado' ? 'Todos mis equipos' : 'Todos los Equipos'}</option>
                                                    {dirTeams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </>
                                        )}
                                        {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi' || userRole === 'delegado') && (() => {
                                            const maxPlayers = (userRole === 'admin' || userRole === 'presi' || userRole === 'delegado') ? 999 : (currentUser?.maxPlayersPerTeam ?? 25);
                                            const atPlayerQuota = ((userRole !== 'admin' && userRole !== 'presi' && userRole !== 'delegado') && !!dirTeamId && players.length >= maxPlayers) || isDelegateSuspended;
                                            const isMissingTournament = !dirTournamentId && userRole !== 'delegado';

                                            return (
                                                <div className="flex gap-2 flex-grow sm:flex-grow-0">
                                                    {userRole !== 'delegado' && (
                                                        <button
                                                            onClick={() => {
                                                                setMergeMode(!mergeMode);
                                                                if (mergeMode) {
                                                                    setMergePrimary(null);
                                                                    setMergeDuplicate(null);
                                                                }
                                                            }}
                                                            className={`px-4 py-2 font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 border ${mergeMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/50' : 'bg-surface text-muted-foreground border-muted/30 hover:border-orange-500/30 hover:text-orange-500'}`}
                                                        >
                                                            {mergeMode ? 'Cancelar Fusión' : 'Modo Fusión'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { if (!atPlayerQuota) { setShowPlayerModal(true); setAddPlayerTab('manual'); resetCsvState(); } }}
                                                        disabled={atPlayerQuota || isMissingTournament}
                                                        title={isDelegateSuspended ? "Tu acceso para dar de alta jugadores está suspendido por el organizador" : isMissingTournament ? "Filtra por un Torneo primero para dar alta" : atPlayerQuota ? `Límite de tu plan: ${maxPlayers} jugador(es) por equipo` : undefined}
                                                        className={`px-5 py-2 min-w-max font-bold transition text-sm flex items-center justify-center gap-2 rounded-lg ${(atPlayerQuota || isMissingTournament) ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-md hover:shadow-primary/40 cursor-pointer'}`}
                                                    >
                                                        {isDelegateSuspended ? 'Acceso Suspendido' : atPlayerQuota ? `Límite alcanzado (${maxPlayers})` : '+ Alta Jugador'}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* FUSION BANNER */}
                                {mergeMode && (
                                    <div className="mb-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-up">
                                        <div className="flex-1 flex flex-col sm:flex-row gap-4 items-center w-full">
                                            <div className="flex-1 p-3 bg-surface rounded-lg border border-emerald-500/30 shadow-sm flex items-center gap-3 min-w-[200px] w-full relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Jugador Principal (Se queda)</p>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {mergePrimary ? `${mergePrimary.firstName} ${mergePrimary.lastName}` : <span className="opacity-50 font-normal">Aún no seleccionado...</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex-1 p-3 bg-surface rounded-lg border border-red-500/30 shadow-sm flex items-center gap-3 min-w-[200px] w-full relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-red-500 tracking-wider">Clón (Desaparecerá)</p>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {mergeDuplicate ? `${mergeDuplicate.firstName} ${mergeDuplicate.lastName}` : <span className="opacity-50 font-normal">Aún no seleccionado...</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleMergePlayers}
                                            disabled={!mergePrimary || !mergeDuplicate || saving}
                                            className="w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all uppercase tracking-wider text-xs"
                                        >
                                            {saving ? 'Fusionando...' : 'Ejecutar Fusión'}
                                        </button>
                                    </div>
                                )}

                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Jugador</th>
                                                <th className="px-4 py-4"># Jersey</th>
                                                <th className="px-6 py-4">Equipos Registrado</th>
                                                <th className="px-6 py-4">Posición</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {directoryLoading ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                        <div className="flex flex-col items-center justify-center opacity-60">
                                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                                            <span>Cargando directorio...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : directoryPlayers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                        No se encontraron jugadores que coincidan con la búsqueda o los filtros actuales.
                                                    </td>
                                                </tr>
                                            ) : directoryPlayers.map((player: any) => {
                                                const rosterEntryId = player.rosterEntryId || player.rosterEntries?.[0]?.id;
                                                const rosterNumber = player.number ?? player.rosterEntries?.[0]?.number ?? null;
                                                const canEditThisRosterNumber = canEditRosterJersey && !!selectedTeam && !!rosterEntryId;
                                                return (
                                                <tr key={player.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 min-w-[200px]">
                                                        <div className="font-bold text-foreground flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border border-muted/30 shrink-0">
                                                                {player.photoUrl ? (
                                                                    <img src={player.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.firstName}${player.lastName}`} alt="Avatar" className="w-full h-full opacity-60" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5 leading-none mb-1">
                                                                    <span>{player.firstName} {player.lastName} {player.secondLastName || ''}</span>
                                                                    {player.isVerified && (
                                                                        <span className="text-blue-500 shrink-0" title="Perfil Verificado">
                                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10.9 16.5L6.5 12.1l1.4-1.4 3 3 7.2-7.2 1.4 1.4-8.6 8.6z"/></svg>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground/70 font-semibold flex items-center gap-1 uppercase truncate max-w-[200px]" title={player.birthPlace || 'Sin lugar de nac.'}>
                                                                    <MapPin size={10} /> {player.birthPlace || 'Sin origen registrado'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 min-w-[110px]">
                                                        {editingRosterNumberId === rosterEntryId ? (
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={99}
                                                                autoFocus
                                                                value={rosterNumberDraft}
                                                                onChange={(e) => setRosterNumberDraft(e.target.value)}
                                                                onBlur={() => void saveRosterNumber(rosterEntryId)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        void saveRosterNumber(rosterEntryId);
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        setEditingRosterNumberId(null);
                                                                        setRosterNumberDraft('');
                                                                    }
                                                                }}
                                                                disabled={savingRosterNumberId === rosterEntryId}
                                                                className="w-20 rounded-lg border border-primary/30 bg-background px-2 py-1 text-sm font-black text-foreground outline-none focus:border-primary"
                                                            />
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => beginRosterNumberEdit(rosterEntryId, rosterNumber)}
                                                                disabled={!canEditThisRosterNumber || savingRosterNumberId === rosterEntryId}
                                                                className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-black transition ${
                                                                    canEditThisRosterNumber
                                                                        ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                                                        : 'border-muted/20 bg-muted/10 text-muted-foreground cursor-default'
                                                                }`}
                                                                title={canEditThisRosterNumber ? 'Editar jersey' : 'Filtra por un equipo para editar el jersey correcto'}
                                                            >
                                                                {savingRosterNumberId === rosterEntryId
                                                                    ? '...'
                                                                    : rosterNumber != null && String(rosterNumber).trim() !== ''
                                                                        ? `#${rosterNumber}`
                                                                        : canEditThisRosterNumber
                                                                            ? 'Asignar'
                                                                            : '-'}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">
                                                        <span className="bg-muted/10 px-2 py-1 rounded-md">
                                                            {player._count?.rosterEntries === 1 ? '1 Equipo' : `${player._count?.rosterEntries || 0} Equipos`}
                                                        </span>
                                                        {player.rosterEntries?.[0]?.team?.name && (
                                                            <div className="text-[10px] lowercase normal-case mt-1 font-medium italic opacity-70">
                                                                Ej: {player.rosterEntries[0].team.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">{player.position || 'INF'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {mergeMode ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                {mergePrimary?.id === player.id ? (
                                                                    <span className="bg-emerald-500/20 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                                                        Principal
                                                                    </span>
                                                                ) : mergeDuplicate?.id === player.id ? (
                                                                    <span className="bg-orange-500/20 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-500/30">
                                                                        Clón
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setMergePrimary(player)}
                                                                            disabled={!!mergePrimary}
                                                                            className="text-[10px] font-bold px-2 py-1 bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        >
                                                                            Elegir Principal
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setMergeDuplicate(player)}
                                                                            disabled={!!mergeDuplicate}
                                                                            className="text-[10px] font-bold px-2 py-1 bg-orange-500/5 hover:bg-orange-500/20 text-orange-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        >
                                                                            Elegir Clón
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Link href={`/jugadores/${player.id}`} className="text-muted-foreground hover:text-foreground font-bold text-xs mr-4 transition-colors">
                                                                    Ficha
                                                                </Link>
                                                                {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi' || (userRole === 'delegado' && !isDelegateSuspended)) && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleEditPlayer(player)}
                                                                            className="text-blue-500/70 hover:text-blue-500 font-bold text-xs transition-colors mr-3"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeletePlayer(player)}
                                                                            className="text-red-500/70 hover:text-red-500 font-bold text-xs transition-colors"
                                                                        >
                                                                            Baja
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {!directoryLoading && directoryMeta.totalPages > 1 && (
                                    <div className="flex justify-center mt-6">
                                        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-muted/20 shadow-sm">
                                            <button
                                                onClick={() => setDirectoryPage(p => Math.max(1, p - 1))}
                                                disabled={directoryPage === 1}
                                                className="p-1.5 rounded text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted/10 hover:text-foreground transition"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-xs font-bold px-3">Pág {directoryPage} de {directoryMeta.totalPages}</span>
                                            <button
                                                onClick={() => setDirectoryPage(p => Math.min(directoryMeta.totalPages, p + 1))}
                                                disabled={directoryPage === directoryMeta.totalPages}
                                                className="p-1.5 rounded text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted/10 hover:text-foreground transition"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* TAB: JUEGOS Y STATS */}
                        {activeTab === 'juegos' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Calendario & Partidos
                                    </h2>
                                    <div className="flex gap-2">
                                        {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi' || userRole === 'scorekeeper') && (
                                            <button onClick={() => router.push('/manual-stats/new')} className="hidden sm:block px-4 py-2 bg-surface hover:bg-muted/10 border border-muted/30 text-foreground font-bold rounded-lg transition text-sm">
                                                Añadir Estadísticas Manuales
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowGameModal(true)}
                                            className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm"
                                        >
                                            + Crear Ticket de Juego
                                        </button>
                                    </div>
                                </div>

                                {/* Filtros */}
                                {(() => {
                                    const leagueOptions = Array.from(
                                        new Map(
                                            games.filter(g => g.tournament?.league)
                                                .map(g => [g.tournament!.league!.id, g.tournament!.league!.name])
                                        ).entries()
                                    );
                                    const tournamentOptions = Array.from(
                                        new Map(
                                            games.filter(g => g.tournament && (!filterLeague || g.tournament.league?.id === filterLeague))
                                                .map(g => [g.tournament!.id, g.tournament!.name])
                                        ).entries()
                                    );
                                    const teamOptions = Array.from(
                                        new Map(
                                            games
                                                .filter(g => (!filterLeague || g.tournament?.league?.id === filterLeague) && (!filterTournament || g.tournament?.id === filterTournament))
                                                .flatMap(g => [
                                                    [g.homeTeam.id, g.homeTeam.name] as [string, string],
                                                    [g.awayTeam.id, g.awayTeam.name] as [string, string],
                                                ])
                                        ).entries()
                                    );
                                    const filteredGames = games.filter(g => {
                                        if (filterLeague && g.tournament?.league?.id !== filterLeague) return false;
                                        if (filterTournament && g.tournament?.id !== filterTournament) return false;
                                        if (filterTeam && g.homeTeam.id !== filterTeam && g.awayTeam.id !== filterTeam) return false;
                                        return true;
                                    });
                                    const hasFilters = filterLeague || filterTournament || filterTeam;

                                    return (
                                        <>
                                            <div className="flex flex-wrap gap-3 mb-4">
                                                <select
                                                    value={filterLeague}
                                                    onChange={e => { setFilterLeague(e.target.value); setFilterTournament(''); setFilterTeam(''); }}
                                                    className="px-3 py-2 bg-surface border border-muted/30 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="">Todas las ligas</option>
                                                    {leagueOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                                </select>
                                                <select
                                                    value={filterTournament}
                                                    onChange={e => { setFilterTournament(e.target.value); setFilterTeam(''); }}
                                                    className="px-3 py-2 bg-surface border border-muted/30 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="">Todos los torneos</option>
                                                    {tournamentOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                                </select>
                                                <select
                                                    value={filterTeam}
                                                    onChange={e => setFilterTeam(e.target.value)}
                                                    className="px-3 py-2 bg-surface border border-muted/30 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="">Todos los equipos</option>
                                                    {teamOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                                </select>
                                                {hasFilters && (
                                                    <button
                                                        onClick={() => { setFilterLeague(''); setFilterTournament(''); setFilterTeam(''); }}
                                                        className="px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-muted/20 hover:border-muted/40 rounded-lg transition"
                                                    >
                                                        Limpiar filtros ✕
                                                    </button>
                                                )}
                                            </div>

                                            <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                                <table className="w-full text-left text-sm text-muted-foreground">
                                                    <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                                        <tr>
                                                            <th className="px-6 py-4">Status</th>
                                                            <th className="px-6 py-4">Equipos</th>
                                                            <th className="px-6 py-4">Marcador</th>
                                                            <th className="px-6 py-4 text-right">Aplicativo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-muted/10">
                                                        {filteredGames.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                                    {hasFilters ? 'No hay partidos con los filtros seleccionados.' : 'No hay partidos programados. Clic en "Crear Ticket de Juego".'}
                                                                </td>
                                                            </tr>
                                                        ) : filteredGames.map((game: GameData) => (
                                                <tr key={game.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold">
                                                        {game.status === 'in_progress' ? (
                                                            <span className="text-red-500 bg-red-500/10 px-2.5 py-1 rounded text-xs gap-1 inline-flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> EN VIVO</span>
                                                        ) : game.status === 'scheduled' ? (
                                                            <span className="text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded text-xs">AGENDADO</span>
                                                        ) : (
                                                            <span className="text-muted-foreground bg-muted/20 px-2.5 py-1 rounded text-xs">FINALIZADO</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex font-bold text-foreground items-center">
                                                            <span className="w-24 truncate text-right text-muted-foreground">{game.awayTeam?.name}</span>
                                                            <span className="mx-3 text-[10px] uppercase text-muted-foreground">Vs</span>
                                                            <span className="w-24 truncate">{game.homeTeam?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                                                        {game.awayScore} - {game.homeScore}
                                                        <span className="ml-2 text-[10px] text-muted-foreground font-sans">
                                                            {game.status === 'finished' ? '(FINAL)' : `(${game.currentInning} INN)`}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                                                        {game.status === 'finished' ? (
                                                            <button
                                                                onClick={() => router.push(`/gamefinalizado/${game.id}`)}
                                                                className="px-4 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition text-xs font-black shadow-sm flex items-center gap-2"
                                                            >
                                                                Ver Boxscore
                                                            </button>
                                                        ) : game.status === 'in_progress' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => router.push(`/game/${game.id}`)}
                                                                    className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition text-xs font-bold"
                                                                >
                                                                    Llevar Juego
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/manual-stats/${game.id}`)}
                                                                    className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700 text-emerald-300 hover:bg-emerald-800/60 transition text-xs font-bold rounded-lg"
                                                                >
                                                                    📋 Stats Manuales
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => setLineupGameId(game.id)}
                                                                    className="px-3 py-1.5 bg-blue-900/40 border border-blue-700 text-blue-300 hover:bg-blue-800/60 transition text-xs font-bold rounded-lg"
                                                                >
                                                                    Configurar Lineups
                                                                </button>
                                                                {(userRole === 'organizer' || userRole === 'presi' || userRole === 'scorekeeper') && (
                                                                    <button
                                                                        onClick={() => router.push(`/gamescheduled/${game.id}?tab=stream`)}
                                                                        className="px-3 py-1.5 bg-fuchsia-900/40 border border-fuchsia-700 text-fuchsia-300 hover:bg-fuchsia-800/60 transition text-xs font-bold rounded-lg"
                                                                    >
                                                                        Panel Stream
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => router.push(`/game/${game.id}`)}
                                                                    className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition text-xs font-bold"
                                                                >
                                                                    Lanzar Scorekeeper
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/manual-stats/${game.id}`)}
                                                                    className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700 text-emerald-300 hover:bg-emerald-800/60 transition text-xs font-bold rounded-lg"
                                                                >
                                                                    📋 Stats Manuales
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteGame(game.id, game.homeTeam?.name ?? '', game.awayTeam?.name ?? '')}
                                                            title="Eliminar juego"
                                                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}
                            </section>
                        )}

                        {/* TAB: USUARIOS — CONTROL DE ACCESOS (admin) / MIS SCOREKEEPERS (organizer) */}
                        {activeTab === 'usuarios' && (userRole === 'organizer' || userRole === 'presi') && (() => {
                            const numTournaments = tournaments.length;
                            const maxTeams = currentUser?.maxTeamsPerTournament ?? 0;

                            // Cuotas según rol
                            const maxPresis = userRole === 'organizer' ? numTournaments : 0;
                            const maxSKOrganizer = userRole === 'organizer' ? Math.floor(maxTeams / 2) * numTournaments : 0;
                            const maxSKPresi = userRole === 'presi' ? 3 * numTournaments : 0;
                            const maxSK = userRole === 'organizer' ? maxSKOrganizer : maxSKPresi;

                            const currentPresis = myScorekeepers.filter(u => u.role === 'presi').length;
                            const currentSK = myScorekeepers.filter(u => u.role === 'scorekeeper').length;

                            const QuotaBadge = ({ label, used, max, color }: { label: string; used: number; max: number; color: string }) => {
                                const atLimit = max > 0 && used >= max;
                                return (
                                    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${atLimit ? 'border-red-500/30 bg-red-500/5' : 'border-muted/20 bg-muted/5'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
                                        <span className={`text-lg font-black ${atLimit ? 'text-red-400' : color}`}>{used}<span className="text-muted-foreground font-normal text-sm">/{max === 0 ? '—' : max}</span></span>
                                    </div>
                                );
                            };

                            return (
                                <section className="animate-fade-in-up">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                                        <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                            <span className="w-2 h-4 bg-primary rounded-full"></span> Mi Personal
                                        </h2>
                                        <button
                                            onClick={() => setShowUserModal(true)}
                                            className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2 shrink-0"
                                        >
                                            + Nuevo Personal
                                        </button>
                                    </div>

                                    {/* Contador de cuotas */}
                                    <div className={`grid gap-3 mb-6 ${userRole === 'organizer' ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                                        {userRole === 'organizer' && (
                                            <QuotaBadge label="Presidentes" used={currentPresis} max={maxPresis} color="text-amber-400" />
                                        )}
                                        <QuotaBadge label="Scorekeepers" used={currentSK} max={maxSK} color="text-primary" />
                                    </div>
                                    {numTournaments === 0 && (
                                        <p className="text-xs text-muted-foreground mb-4">⚠️ Crea un torneo primero para calcular cuántas cuentas puedes crear.</p>
                                    )}

                                    {myScorekeepers.length === 0 ? (
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center">
                                            <p className="text-4xl mb-3">🔑</p>
                                            <p className="text-muted-foreground mb-2 font-bold">No tienes personal agregado todavía.</p>
                                            <p className="text-sm text-muted-foreground mb-6">Agrega presidentes de liga o scorekeepers para delegar responsabilidades.</p>
                                            <button onClick={() => setShowUserModal(true)} className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition text-sm">
                                                + Agregar Personal
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {myScorekeepers.map((u: UserData) => (
                                                <div key={u.id} className="bg-surface border border-muted/30 rounded-2xl p-4 sm:p-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <span className="font-black text-foreground">{u.firstName} {u.lastName}</span>
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                                                    u.role === 'presi' ? 'bg-amber-500/10 text-amber-500' :
                                                                    u.role === 'streamer' ? 'bg-purple-500/10 text-purple-400' :
                                                                    'bg-primary/10 text-primary'
                                                                }`}>
                                                                    {u.role === 'presi' ? 'Presidente' : u.role === 'streamer' ? 'Streamer' : 'ScoreKeeper'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                                            {u.assignedTournaments && u.assignedTournaments.length > 0 && (
                                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                                    {u.assignedTournaments.map((t: any) => (
                                                                        <span key={t.id} className="text-[10px] border border-muted/30 px-1.5 py-0.5 rounded-md bg-muted/10 text-muted-foreground">🏆 {t.name}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" title="Activo" />
                                                            {(userRole === 'organizer' || (userRole === 'presi' && u.role === 'scorekeeper')) && (
                                                                <button
                                                                    onClick={() => handleDeleteStaff(u)}
                                                                    className="text-red-500/50 hover:text-red-500 text-xs font-bold transition-colors"
                                                                    title="Eliminar cuenta"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })()}

                        {/* TAB: MI PLAN (organizer) */}
                        {activeTab === 'plan' && userRole === 'organizer' && (() => {
                            const plan = currentUser?.planLabel ?? 'public';
                            const maxL = currentUser?.maxLeagues ?? 0;
                            const maxT = currentUser?.maxTournamentsPerLeague ?? 0;
                            const maxTeams = currentUser?.maxTeamsPerTournament ?? 0;
                            const maxPlayers = currentUser?.maxPlayersPerTeam ?? 25;
                            const usedLeagues = leagues.length;
                            // Torneos usados: contamos torneos de la primera liga (o todos si solo hay 1 liga)
                            const usedTournaments = tournaments.length;

                            const planColors: Record<string, string> = {
                                public: 'text-muted-foreground bg-muted/20 border-muted/30',
                                demo: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                                standard: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                                pro: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                                custom: 'text-green-400 bg-green-500/10 border-green-500/30',
                                admin: 'text-red-400 bg-red-500/10 border-red-500/30',
                            };
                            const planColor = planColors[plan] ?? planColors['public'];

                            // Slot de uso: muestra used/max con barra de progreso
                            const UsageSlot = ({ label, used, max }: { label: string; used: number; max: number }) => {
                                const isUnlimited = max >= 999;
                                const atLimit = !isUnlimited && used >= max;
                                const pct = !isUnlimited && max > 0 ? Math.min((used / max) * 100, 100) : 0;
                                return (
                                    <div className="bg-muted/5 border border-muted/10 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black text-foreground uppercase tracking-wide">{label}</span>
                                            <span className={`text-sm font-black ${atLimit ? 'text-red-400' : 'text-foreground'}`}>
                                                {isUnlimited ? <span>{used}<span className="text-muted-foreground font-normal">/∞</span></span> : <span className={atLimit ? 'text-red-400' : ''}>{used}<span className="text-muted-foreground font-normal">/{max}</span></span>}
                                            </span>
                                        </div>
                                        {!isUnlimited && (
                                            <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-400' : pct > 75 ? 'bg-amber-400' : 'bg-primary'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                        {atLimit && <p className="text-[10px] text-red-400 mt-1 font-bold">Límite alcanzado</p>}
                                    </div>
                                );
                            };

                            // Slot de límite: solo muestra el máximo permitido (sin conteo de uso)
                            const LimitSlot = ({ label, max, unit }: { label: string; max: number; unit: string }) => {
                                const isUnlimited = max >= 999;
                                return (
                                    <div className="bg-muted/5 border border-muted/10 rounded-xl p-4 flex justify-between items-center">
                                        <span className="text-xs font-black text-foreground uppercase tracking-wide">{label}</span>
                                        <span className="text-sm font-black text-foreground">
                                            {isUnlimited ? '∞' : max}
                                            <span className="text-[10px] text-muted-foreground font-normal ml-1">{unit}</span>
                                        </span>
                                    </div>
                                );
                            };

                            return (
                                <section className="animate-fade-in-up space-y-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Mi Plan
                                    </h2>

                                    {/* Plan badge */}
                                    <div className={`bg-surface border rounded-2xl p-5 flex items-center gap-4 ${planColor}`}>
                                        <div className={`text-3xl w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${planColor}`}>
                                            💎
                                        </div>
                                        <div>
                                            <span className={`text-lg font-black uppercase tracking-wide`}>
                                                Plan {plan}
                                            </span>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Tu cuenta tiene acceso a los recursos listados abajo según tu plan contratado.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Uso: ligas y torneos (con conteo real) */}
                                    <div>
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Uso Actual</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <UsageSlot label="Ligas creadas" used={usedLeagues} max={maxL} />
                                            <UsageSlot label="Torneos creados" used={usedTournaments} max={maxT} />
                                        </div>
                                    </div>

                                    {/* Límites por recurso */}
                                    <div>
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Límites de tu Plan</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <LimitSlot label="Equipos por torneo" max={maxTeams} unit="equipos máx." />
                                            <LimitSlot label="Jugadores por equipo" max={maxPlayers} unit="jugadores máx." />
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="font-black text-foreground mb-1">¿Necesitas más capacidad?</div>
                                            <p className="text-sm text-muted-foreground">
                                                Para ampliar tu plan o adquirir capacidad adicional de ligas, torneos o equipos, contacta al administrador de la plataforma.
                                            </p>
                                        </div>
                                        <a
                                            href="mailto:admin@tourneytru.com"
                                            className="shrink-0 px-5 py-2.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition shadow-md hover:shadow-primary/40 text-sm"
                                        >
                                            Contactar Admin
                                        </a>
                                    </div>
                                </section>
                            );
                        })()}

                        {activeTab === 'usuarios' && userRole === 'admin' && (
                            <section className="animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Control de Accesos
                                    </h2>
                                    <button
                                        onClick={() => setShowUserModal(true)}
                                        className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2 shrink-0"
                                    >
                                        + Generar Cuenta
                                    </button>
                                </div>

                                {/* Search + Role Filter */}
                                <div className="mb-4 flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o correo..."
                                        value={accessSearch}
                                        onChange={e => setAccessSearch(e.target.value)}
                                        className="flex-1 bg-surface border border-muted/30 text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                    />
                                    <select
                                        value={accessRoleFilter}
                                        onChange={e => setAccessRoleFilter(e.target.value)}
                                        className="sm:w-44 bg-surface border border-muted/30 text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                    >
                                        <option value="all">Todos los roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="organizer">Organizador</option>
                                        <option value="presi">Presidente</option>
                                        <option value="scorekeeper">Scorekeeper</option>
                                        <option value="streamer">Streamer</option>
                                        <option value="general">Público</option>
                                    </select>
                                </div>

                                {/* User cards */}
                                <div className="space-y-3">
                                    {users
                                        .filter(u => {
                                            if (accessRoleFilter !== 'all' && u.role !== accessRoleFilter) return false;
                                            if (!accessSearch) return true;
                                            const q = accessSearch.toLowerCase();
                                            return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                                        })
                                        .map((u: UserData) => {
                                            const isPending = !!u.organizerRequestNote && u.role === 'general';
                                            return (
                                                <div key={u.id} className={`bg-surface border rounded-2xl p-4 sm:p-5 transition-all ${isPending ? 'border-amber-500/40' : 'border-muted/30'}`}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <span className="font-black text-foreground">{u.firstName} {u.lastName}</span>
                                                                {/* Role badge */}
                                                                {u.role === 'admin' && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs font-bold uppercase">Admin</span>}
                                                                {u.role === 'organizer' && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-bold uppercase">Organizador</span>}
                                                                {u.role === 'presi' && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-xs font-bold uppercase">Presidente</span>}
                                                                {u.role === 'scorekeeper' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">ScoreKeeper</span>}
                                                                {u.role === 'streamer' && <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Streamer</span>}
                                                                {u.role === 'general' && <span className="bg-muted/20 text-muted-foreground px-2 py-0.5 rounded text-xs font-bold uppercase">Público</span>}
                                                                {/* Plan badge */}
                                                                {u.planLabel && u.planLabel !== 'public' && (
                                                                    <span className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-bold uppercase">{u.planLabel}</span>
                                                                )}
                                                                {/* Pending badge */}
                                                                {isPending && (
                                                                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase animate-pulse">PENDIENTE</span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                                            {/* Torneos asignados — presi, scorekeeper, streamer */}
                                                            {['presi', 'scorekeeper', 'streamer'].includes(u.role) && u.assignedTournaments && u.assignedTournaments.length > 0 && (
                                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                                    {u.assignedTournaments.map((t: any) => (
                                                                        <span key={t.id} className="text-[10px] border border-muted/30 px-1.5 py-0.5 rounded-md bg-muted/10 text-muted-foreground">🏆 {t.name}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {isPending && (
                                                                <div className="mt-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                                                                    Solicitud: Quiere organizar torneos
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            {isPending && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingUser(u);
                                                                        setAccessForm({ role: 'organizer', planLabel: 'demo', ...PLAN_QUOTAS['demo'] });
                                                                        setShowAccessModal(true);
                                                                    }}
                                                                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs rounded-lg transition border border-amber-500/30"
                                                                >
                                                                    Activar
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openAccessModal(u)}
                                                                className="px-4 py-2 bg-muted/10 hover:bg-muted/20 text-foreground font-bold text-xs rounded-lg transition border border-muted/30"
                                                            >
                                                                Editar
                                                            </button>
                                                            {currentUser?.id !== u.id && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!window.confirm(`¿Seguro que deseas eliminar la cuenta de ${u.firstName} ${u.lastName}? Esta acción no se puede deshacer.`)) return;
                                                                        try {
                                                                            await api.delete(`/users/${u.id}`);
                                                                            setUsers(prev => prev.filter(x => x.id !== u.id));
                                                                        } catch (err: any) {
                                                                            console.error(err);
                                                                            const msg = err.response?.data?.message || 'Error al eliminar la cuenta.';
                                                                            alert(msg);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-lg transition border border-red-500/30"
                                                                    title="Eliminar cuenta"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Quota info (only for organizer/admin) */}
                                                    {(u.role === 'organizer' || u.role === 'admin') && (
                                                        <div className="mt-3 pt-3 border-t border-muted/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                                            {[
                                                                { label: 'Ligas', used: u.usedLeagues ?? 0, max: u.maxLeagues },
                                                                { label: 'Torneos/Liga', used: u.usedTournaments ?? 0, max: u.maxTournamentsPerLeague },
                                                                { label: 'Equipos/Torn.', used: null, max: u.maxTeamsPerTournament },
                                                                { label: 'Jugadores/Eq.', used: null, max: u.maxPlayersPerTeam },
                                                            ].map(q => (
                                                                <div key={q.label} className="bg-muted/5 rounded-lg py-1.5">
                                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold">{q.label}</div>
                                                                    <div className="text-sm font-black text-foreground">
                                                                        {q.max >= 999 ? (
                                                                            q.used !== null ? <span>{q.used}<span className="text-muted-foreground font-normal">/∞</span></span> : '∞'
                                                                        ) : q.used !== null ? (
                                                                            <span className={q.used >= q.max ? 'text-red-400' : ''}>
                                                                                {q.used}<span className="text-muted-foreground font-normal">/{q.max}</span>
                                                                            </span>
                                                                        ) : q.max}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    {users.length === 0 && (
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center">
                                            <p className="text-muted-foreground">No hay cuentas registradas.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                        {/* TAB: DELEGADOS */}
                        {activeTab === 'delegados' && (userRole === 'admin' || userRole === 'organizer' || userRole === 'presi') && (
                            <section className="animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Delegados de Equipo
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setDelegateForm({ firstName: '', lastName: '', email: '', password: '', phone: '', teamId: '', tournamentId: delegateTournamentId, linkExistingAccount: false });
                                            setShowDelegateModal(true);
                                        }}
                                        disabled={!delegateTournamentId}
                                        className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        + Nuevo Delegado
                                    </button>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4">
                                    Un delegado gestiona el roster de un equipo específico durante la fase de inscripción (<span className="font-bold text-amber-400">Próximo</span>). Al activar el torneo, su acceso se desactiva automáticamente.
                                </p>

                                {/* Selector de torneo */}
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Filtrar por Torneo</label>
                                    <select
                                        value={delegateTournamentId}
                                        onChange={e => {
                                            setDelegateTournamentId(e.target.value);
                                            fetchDelegates(e.target.value);
                                            if (e.target.value) {
                                                api.get('/teams', { params: { tournamentId: e.target.value } })
                                                    .then(({ data }) => setDelegateTeams(data || []))
                                                    .catch(() => {});
                                            } else {
                                                setDelegateTeams([]);
                                            }
                                        }}
                                        className="w-full sm:w-72 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                    >
                                        <option value="">— Seleccionar torneo —</option>
                                        {tournaments.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.season})</option>
                                        ))}
                                    </select>
                                </div>

                                {!delegateTournamentId ? (
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center">
                                        <p className="text-4xl mb-3">🪪</p>
                                        <p className="text-muted-foreground font-bold">Selecciona un torneo para ver sus delegados.</p>
                                    </div>
                                ) : delegates.length === 0 ? (
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-12 text-center">
                                        <p className="text-4xl mb-3">🪪</p>
                                        <p className="text-muted-foreground font-bold mb-2">No hay delegados en este torneo.</p>
                                        <p className="text-sm text-muted-foreground mb-6">Crea un delegado por equipo para que cada representante gestione su propio roster.</p>
                                        <button
                                            onClick={() => {
                                                setDelegateForm({ firstName: '', lastName: '', email: '', password: '', phone: '', teamId: '', tournamentId: delegateTournamentId, linkExistingAccount: false });
                                                setShowDelegateModal(true);
                                            }}
                                            className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition text-sm"
                                        >
                                            + Crear primer delegado
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {delegates.map(d => {
                                            const tourney = tournaments.find(t => t.id === delegateTournamentId);
                                            const isUpcoming = (tourney as any)?.status === 'upcoming';
                                            return (
                                                <div key={d.id} className="bg-surface border border-muted/30 rounded-2xl p-4 sm:p-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <span className="font-black text-foreground">{d.user.firstName} {d.user.lastName}</span>
                                                                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-teal-500/10 text-teal-400">Delegado</span>
                                                                {!isUpcoming && (
                                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400">Torneo activo — acceso suspendido</span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{d.user.email}</div>
                                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                                <span className="text-[10px] border border-muted/30 px-1.5 py-0.5 rounded-md bg-muted/10 text-muted-foreground">🛡️ {d.team?.name || 'N/A'}</span>
                                                                <span className="text-[10px] border border-muted/30 px-1.5 py-0.5 rounded-md bg-muted/10 text-muted-foreground">Creado por {d.createdBy?.firstName || '—'} {d.createdBy?.lastName || ''}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {/* Toggle activo/inactivo */}
                                                            <button
                                                                onClick={() => handleToggleDelegate(d)}
                                                                disabled={!isUpcoming && !d.isActive}
                                                                title={!isUpcoming ? 'Solo se puede reactivar cuando el torneo esté en Próximo' : d.isActive ? 'Desactivar acceso' : 'Activar acceso'}
                                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${d.isActive && isUpcoming ? 'bg-green-500' : 'bg-muted/40'} ${!isUpcoming && !d.isActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            >
                                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${d.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                                                            </button>
                                                            <span className={`text-xs font-bold ${d.isActive && isUpcoming ? 'text-green-400' : 'text-muted-foreground'}`}>
                                                                {d.isActive && isUpcoming ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteDelegate(d)}
                                                                className="text-red-500/50 hover:text-red-500 text-xs font-bold transition-colors"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'campos' && (userRole === 'admin' || userRole === 'organizer' || userRole === 'presi') && (() => {
                            const myLeague = leagues.find(l => l.adminId === currentUser?.id)
                                ?? (userRole === 'presi' && currentUser?.scorekeeperLeagueId ? { id: currentUser.scorekeeperLeagueId } as any : null);
                            return (
                                <section className="animate-fade-in-up">
                                    <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                                        <div>
                                            <h2 className="text-xl font-black text-foreground flex items-center gap-2 mb-1">
                                                <span className="w-2 h-4 bg-primary rounded-full" /> Unidades Deportivas y Campos
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                Organiza los campos de tu liga en unidades deportivas.
                                            </p>
                                        </div>
                                        <div className="flex rounded-xl border border-muted/30 overflow-hidden">
                                            <button
                                                onClick={() => setCamposSubTab('gestion')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors ${camposSubTab === 'gestion' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}
                                            >
                                                🏟️ Gestión
                                            </button>
                                            <button
                                                onClick={() => setCamposSubTab('reporte')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-muted/30 ${camposSubTab === 'reporte' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}
                                            >
                                                📊 Ocupación
                                            </button>
                                        </div>
                                    </div>
                                    {myLeague ? (
                                        <>
                                            {camposSubTab === 'gestion' && (
                                                <SportsUnitsManager leagueId={myLeague.id} canEdit={true} />
                                            )}
                                            {camposSubTab === 'reporte' && (
                                                <FieldsReport leagueId={myLeague.id} leagueName={(myLeague as any).name} />
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-16 text-muted-foreground">
                                            <p className="font-bold">No tienes una liga activa vinculada.</p>
                                            <p className="text-sm mt-1">Crea o accede a una liga primero.</p>
                                        </div>
                                    )}
                                </section>
                            );
                        })()}

                    </main>
                </div>
            </div>

            {/* MODAL NUEVO TORNEO */}
            {showTournamentModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowTournamentModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Alta de Torneo
                        </h2>
                        <form onSubmit={handleCreateTournament} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-muted-foreground uppercase">Liga Perteneciente</label>
                                    {(() => {
                                        const maxL = currentUser?.maxLeagues ?? (userRole === 'admin' ? 999 : 0);
                                        const atLigaQuota = userRole !== 'admin' && leagues.length >= maxL;
                                        return !atLigaQuota ? (
                                            <button type="button" onClick={() => setShowLeagueModal(true)} className="text-[10px] text-primary hover:underline font-bold uppercase">+ Nueva Liga</button>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Límite de ligas alcanzado</span>
                                        );
                                    })()}
                                </div>
                                <select 
                                    required 
                                    value={tournForm.leagueId} 
                                    onChange={e => setTournForm({ ...tournForm, leagueId: e.target.value })} 
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                >
                                    <option value="">-- Seleccionar Liga --</option>
                                    {leagues.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Torneo</label>
                                <input required type="text" value={tournForm.name} onChange={e => setTournForm({ ...tournForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Liga de Verano MTY 2026" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Temporada</label>
                                    <input required type="text" value={tournForm.season} onChange={e => setTournForm({ ...tournForm, season: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 2026-I" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Ciudad</label>
                                    <input required type="text" value={tournForm.location_city} onChange={e => setTournForm({ ...tournForm, location_city: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Los Mochis" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Estado</label>
                                    <input type="text" value={tournForm.location_state} onChange={e => setTournForm({ ...tournForm, location_state: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Sinaloa" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">País</label>
                                    <input type="text" value={tournForm.location_country} onChange={e => setTournForm({ ...tournForm, location_country: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. México" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Deporte</label>
                                    <select value={tournForm.sport} onChange={e => setTournForm({ ...tournForm, sport: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="Béisbol">Béisbol</option>
                                        <option value="Softbol">Softbol</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Rama</label>
                                    <select value={tournForm.branch} onChange={e => setTournForm({ ...tournForm, branch: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="Varonil">Varonil</option>
                                        <option value="Femenil">Femenil</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Categoría</label>
                                <input required type="text" value={tournForm.category} onChange={e => setTournForm({ ...tournForm, category: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Libre, 1era Fuerza, Infantil" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo</label>
                                <ImageUploader
                                    value={tournForm.logoUrl}
                                    onChange={url => setTournForm({ ...tournForm, logoUrl: url })}
                                    shape="square"
                                    placeholder="🏆"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Descripción</label>
                                <textarea
                                    value={tournForm.description}
                                    onChange={e => setTournForm({ ...tournForm, description: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition h-24 resize-none"
                                    placeholder="Información relevante sobre el torneo, reglas especiales, premios, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fecha de Inicio</label>
                                <input
                                    type="date"
                                    value={tournForm.startDate}
                                    onChange={e => setTournForm({ ...tournForm, startDate: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition [color-scheme:dark]"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    A partir de esta fecha los delegados <strong>no podrán</strong> dar de alta jugadores. Organizador y Presi siempre pueden hacerlo.
                                </p>
                            </div>

                            {/* Toggle privacidad */}
                            <div className="flex items-center justify-between p-3 bg-muted/5 border border-muted/20 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-foreground">Torneo Privado</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Solo los organizadores podrán verlo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTournForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${tournForm.isPrivate ? 'bg-amber-500' : 'bg-muted/30'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tournForm.isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Verificando...' : 'Crear Torneo Base'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR TORNEO */}
            {showEditTournModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => { setShowEditTournModal(false); setEditingTourn(null); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Editar Torneo
                        </h2>
                        <form onSubmit={handleUpdateTournament} className="space-y-4">
                            {(userRole === 'admin' || userRole === 'organizer') && (
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Liga Perteneciente</label>
                                    <select 
                                        required 
                                        value={tournForm.leagueId} 
                                        onChange={e => setTournForm({ ...tournForm, leagueId: e.target.value })} 
                                        className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                    >
                                        <option value="">-- Seleccionar Liga --</option>
                                        {leagues.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Torneo</label>
                                <input required type="text" value={tournForm.name} onChange={e => setTournForm({ ...tournForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Liga de Verano MTY 2026" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Temporada</label>
                                    <input required type="text" value={tournForm.season} onChange={e => setTournForm({ ...tournForm, season: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 2026-I" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Ciudad</label>
                                    <input required type="text" value={tournForm.location_city} onChange={e => setTournForm({ ...tournForm, location_city: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Los Mochis" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Estado</label>
                                    <input type="text" value={tournForm.location_state} onChange={e => setTournForm({ ...tournForm, location_state: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Sinaloa" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">País</label>
                                    <input type="text" value={tournForm.location_country} onChange={e => setTournForm({ ...tournForm, location_country: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. México" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Deporte</label>
                                    <select value={tournForm.sport} onChange={e => setTournForm({ ...tournForm, sport: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="Béisbol">Béisbol</option>
                                        <option value="Softbol">Softbol</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Rama</label>
                                    <select value={tournForm.branch} onChange={e => setTournForm({ ...tournForm, branch: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="Varonil">Varonil</option>
                                        <option value="Femenil">Femenil</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Categoría</label>
                                <input required type="text" value={tournForm.category} onChange={e => setTournForm({ ...tournForm, category: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Libre, 1era Fuerza, Infantil" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo</label>
                                <ImageUploader
                                    value={tournForm.logoUrl}
                                    onChange={url => setTournForm({ ...tournForm, logoUrl: url })}
                                    shape="square"
                                    placeholder="🏆"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Descripción</label>
                                <textarea
                                    value={tournForm.description}
                                    onChange={e => setTournForm({ ...tournForm, description: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition h-24 resize-none"
                                    placeholder="Información relevante sobre el torneo, reglas especiales, premios, etc."
                                />
                            </div>

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Actualizando...' : 'Guardar Cambios'}
                            </button>

                            {/* Zona de peligro */}
                            <div className="mt-6 pt-4 border-t border-red-500/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 mb-2">Zona de peligro</p>
                                <button
                                    type="button"
                                    onClick={() => editingTourn && handleDeleteTournament(editingTourn)}
                                    className="w-full py-2.5 font-bold rounded-xl border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/15 transition text-sm cursor-pointer active:scale-95"
                                >
                                    Eliminar Torneo
                                </button>
                                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                    Elimina el torneo y todos sus equipos, juegos y estadísticas de forma permanente.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO JUEGO */}
            {showGameModal && (
                <CreateGameWizard
                    context={(userRole === 'scorekeeper' || userRole === 'presi') ? 'scorekeeper' : 'admin'}
                    leagueId={userRole === 'scorekeeper' ? (currentUser?.scorekeeperLeagueId ?? undefined) : undefined}
                    initialTournaments={userRole === 'presi' ? ((currentUser as any)?.assignedTournaments ?? undefined) : undefined}
                    onClose={() => setShowGameModal(false)}
                />
            )}

            {/* CONFIGURAR LINEUP DE JUEGO PROGRAMADO */}
            {lineupGameId && (
                <CreateGameWizard
                    context={userRole === 'scorekeeper' ? 'scorekeeper' : 'admin'}
                    existingGameId={lineupGameId}
                    onClose={() => setLineupGameId(null)}
                />
            )}

            {/* MODAL NUEVO EQUIPO */}
            {showTeamModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => { setShowTeamModal(false); setEditingTeam(null); setTeamForm({ name: '', manager: '', logoUrl: '', tournament_id: '' }); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            {editingTeam ? 'Editar Equipo' : 'Alta de Equipo'}
                        </h2>
                        <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-4">
                            {!editingTeam && (
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Torneo Destino</label>
                                    <select
                                        required
                                        value={teamForm.tournament_id}
                                        onChange={e => setTeamForm({ ...teamForm, tournament_id: e.target.value })}
                                        className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                    >
                                        <option value="">-- Seleccionar Torneo --</option>
                                        {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name} ({t.season})</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Equipo</label>
                                <input required type="text" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Diablos Rojos" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Manager (Opcional)</label>
                                <input type="text" value={teamForm.manager} onChange={e => setTeamForm({ ...teamForm, manager: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Juan Pérez" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo</label>
                                <ImageUploader
                                    value={teamForm.logoUrl}
                                    onChange={url => setTeamForm({ ...teamForm, logoUrl: url })}
                                    shape="square"
                                    placeholder="🛡️"
                                />
                            </div>

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Guardando...' : editingTeam ? 'Guardar Cambios' : 'Crear Equipo'}
                            </button>

                            {/* Zona de peligro — solo al editar */}
                            {editingTeam && (
                                <div className="mt-6 pt-4 border-t border-red-500/20">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 mb-2">Zona de peligro</p>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTeam(editingTeam)}
                                        className="w-full py-2.5 font-bold rounded-xl border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/15 transition text-sm cursor-pointer active:scale-95"
                                    >
                                        Eliminar Equipo
                                    </button>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                        Elimina el equipo y todos sus jugadores, juegos y estadísticas de forma permanente.
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVO JUGADOR */}
            {showPlayerModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-foreground">Agregar Jugadores</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Uno por uno o importa el roster completo desde un archivo</p>
                            </div>
                            <button onClick={() => { setShowPlayerModal(false); resetCsvState(); }} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <form onSubmit={(e) => handleCreatePlayer(e)} className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Equipo Destino</label>
                                    <select
                                        required
                                        value={playerForm.team_id}
                                        onChange={e => setPlayerForm({ ...playerForm, team_id: e.target.value })}
                                        className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                    >
                                        <option value="">-- Seleccionar Equipo --</option>
                                        {(activeTab === 'jugadores' ? dirTeams : teams).map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                        <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Roberto" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Paterno</label>
                                        <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Gómez" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Materno <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                    <input type="text" value={playerForm.secondLastName} onChange={e => setPlayerForm({ ...playerForm, secondLastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Silva" />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">CURP <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                        <input type="text" value={playerForm.curp} onChange={e => setPlayerForm({ ...playerForm, curp: e.target.value.toUpperCase() })} maxLength={18} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="AAAA000000AAAAAA00" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">FECHA DE NAC. <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                        <input type="date" value={playerForm.birthDate} onChange={e => setPlayerForm({ ...playerForm, birthDate: e.target.value })} max={new Date().toISOString().split('T')[0]} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition [color-scheme:dark]" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Lugar de Nacimiento <span className="normal-case font-normal">(opcional)</span></label>
                                    <input type="text" maxLength={100} value={playerForm.birthPlace} onChange={e => setPlayerForm({ ...playerForm, birthPlace: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej: Hermosillo, Sonora" />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Número (Jersey)</label>
                                        <input required type="text" value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value.replace(/[^0-9]/g, '') })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 24" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición</label>
                                        <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                            <option value="P">Pitcher (P)</option>
                                            <option value="C">Catcher (C)</option>
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
                                
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Batea</label>
                                        <select value={playerForm.bats} onChange={e => setPlayerForm({ ...playerForm, bats: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary transition font-medium">
                                            <option value="R">Derecho</option>
                                            <option value="L">Zurdo</option>
                                            <option value="S">Ambidiestro</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tira</label>
                                        <select value={playerForm.throws} onChange={e => setPlayerForm({ ...playerForm, throws: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary transition font-medium">
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

                                <button 
                                    type="submit" 
                                    disabled={saving || checkingLive || (liveValidation?.level === 'team') || (liveValidation?.level === 'tournament')} 
                                    className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${(saving || checkingLive || liveValidation?.level === 'team' || liveValidation?.level === 'tournament') ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Jugador'}
                                </button>
                            </form>

                            {/* Verification Column */}
                            <div className="w-full lg:w-[320px] shrink-0 bg-muted/5 flex flex-col p-6 rounded-xl border border-muted/20">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                                    Verificación
                                </h3>
                                
                                {checkingLive ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                        <span className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-3"></span>
                                        <p className="text-xs font-bold">Analizando perfil...</p>
                                    </div>
                                ) : !liveValidation ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center text-muted-foreground/40 space-y-3 pb-8">
                                        <Search className="w-8 h-8" />
                                        <p className="text-xs font-medium px-4">Ingresa el nombre, apellido y selecciona destino para verificar la identidad del jugador.</p>
                                    </div>
                                ) : liveValidation.level === 'none' ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <h4 className="text-sm font-black text-emerald-500 mb-1">Perfil Único</h4>
                                        <p className="text-xs text-emerald-500/80 font-medium leading-relaxed">
                                            No hay coincidencias en la base de datos. Se creará un registro nuevo al guardar.
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
                                                    setSaving(true);
                                                    try {
                                                        const team = teams.find(t => t.id === playerForm.team_id);
                                                        if (!team?.tournament?.id) return;
                                                        await api.post('/roster', {
                                                            playerId: liveValidation.existing.id,
                                                            teamId: playerForm.team_id,
                                                            tournamentId: team.tournament.id,
                                                        });
                                                        setShowPlayerModal(false);
                                                        await refreshPlayersViews(playerForm.team_id, team.tournament.id);
                                                    } catch (err: any) {
                                                        alert(err?.response?.data?.message || 'Error al vincular jugador');
                                                    } finally { setSaving(false); }
                                                }}
                                                disabled={saving}
                                                className="w-full py-2 bg-amber-500 text-amber-950 text-[11px] font-black rounded-lg hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                                            >
                                                Sí, es él (Añadir al roster)
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    await handleCreatePlayer({ preventDefault: () => {} } as any, true);
                                                }}
                                                disabled={saving}
                                                className="w-full py-2 border border-amber-500/30 text-amber-500/80 text-[11px] font-bold rounded-lg hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-50"
                                            >
                                                No, crear variante nueva
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
                        </div>
                        )} {/* end Tab: Manual */}

                        {/* Tab: CSV */}
                        {addPlayerTab === 'csv' && (
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Selector de equipo */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Equipo Destino</label>
                                    <select
                                        value={csvTeamId || playerForm.team_id}
                                        onChange={e => setCsvTeamId(e.target.value)}
                                        className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                    >
                                        <option value="">-- Seleccionar Equipo --</option>
                                        {teams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                {/* Descargar plantilla */}
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

                                {/* Paso 1: Subir archivo */}
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

                                {/* Paso 2: Preview con colores */}
                                {importStep === 'preview' && importPreview && (
                                    <>
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
                                                                            <span className="text-amber-400 font-bold">En: {r.existing?.team?.name}</span>
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
            {/* MODAL EDITAR JUGADOR */}
            {showEditPlayerModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowEditPlayerModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Editar Jugador
                        </h2>
                        <form onSubmit={handleUpdatePlayer} className="space-y-4">

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                    <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Roberto" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Paterno</label>
                                    <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Gómez" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Materno <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                <input type="text" value={playerForm.secondLastName} onChange={e => setPlayerForm({ ...playerForm, secondLastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Silva" />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">CURP <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                    <input type="text" value={playerForm.curp} onChange={e => setPlayerForm({ ...playerForm, curp: e.target.value.toUpperCase() })} maxLength={18} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="AAAA000000AAAAAA00" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">FECHA DE NAC. <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                    <input type="date" value={playerForm.birthDate} onChange={e => setPlayerForm({ ...playerForm, birthDate: e.target.value })} max={new Date().toISOString().split('T')[0]} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition [color-scheme:dark]" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Lugar de Nacimiento <span className="text-muted-foreground/50 lowercase font-normal">(opcional)</span></label>
                                <input type="text" maxLength={100} value={playerForm.birthPlace} onChange={e => setPlayerForm({ ...playerForm, birthPlace: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej: Hermosillo, Sonora" />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Número (Jersey)</label>
                                    <input type="text" value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value.replace(/[^0-9]/g, '') })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 24" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición</label>
                                    <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="P">Pitcher (P)</option>
                                        <option value="C">Catcher (C)</option>
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
                            
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Batea</label>
                                    <select value={playerForm.bats} onChange={e => setPlayerForm({ ...playerForm, bats: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary transition font-medium">
                                        <option value="R">Derecho</option>
                                        <option value="L">Zurdo</option>
                                        <option value="S">Ambidiestro</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tira</label>
                                    <select value={playerForm.throws} onChange={e => setPlayerForm({ ...playerForm, throws: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary transition font-medium">
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

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Guardando...' : 'Actualizar Jugador'}
                            </button>

                            {/* Zona de peligro */}
                            {(userRole === 'admin' || userRole === 'organizer' || userRole === 'presi') && (
                                <div className="mt-6 pt-4 border-t border-red-500/20">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 mb-2">Zona de peligro</p>
                                    <button
                                        type="button"
                                        onClick={handleDeleteGlobalPlayer}
                                        className="w-full py-2.5 font-bold rounded-xl border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/15 transition text-sm cursor-pointer active:scale-95"
                                    >
                                        Eliminar Jugador Definitivamente
                                    </button>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight">
                                        Solo puedes borrarlo si el jugador no aparece en múltiples equipos o en ligas externas a ti.
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVA CUENTA */}
            {showUserModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight pb-4 border-b border-muted/20">
                            {userRole === 'organizer' ? 'Nuevo Personal' : 'Alta de Credencial'}
                        </h2>
                        {userRole === 'organizer' && (
                            <p className="text-xs text-muted-foreground mb-4">
                                Un Scorekeeper podrá llevar marcadores de juegos, mientras que un Presidente de Liga administra torneos específicos.
                            </p>
                        )}
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre Completo</label>
                                    <input required type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Juan Pérez" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Correo / Email</label>
                                    <input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="scorekeeper@correo.com" />
                                </div>
                            </div>
                            <div className={`flex gap-4 ${userRole === 'organizer' ? '' : ''}`}>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Contraseña Provisoria</label>
                                    <input required type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="••••••••" />
                                </div>
                                {userRole === 'admin' && (
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Rol de Sistema</label>
                                        <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                            <option value="general">Público / General</option>
                                            <option value="scorekeeper">Scorekeeper Móvil</option>
                                            <option value="streamer">Streamer</option>
                                            <option value="admin">Administrador Total</option>
                                        </select>
                                    </div>
                                )}
                                {userRole === 'organizer' && (
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tipo de Personal</label>
                                        <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                            <option value="scorekeeper">ScoreKeeper (Anotador)</option>
                                            <option value="presi">Presidente (Administrador)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {(userRole === 'admin' && userForm.role === 'scorekeeper') && (
                                <div className="animate-fade-in-up mt-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <label className="block text-[10px] font-black text-primary mb-2 uppercase text-center w-full">ASIGNAR A TORNEO ESPECÍFICO</label>
                                    <select
                                        required={userForm.role === 'scorekeeper'}
                                        value={userForm.tournament_id}
                                        onChange={e => setUserForm({ ...userForm, tournament_id: e.target.value })}
                                        className="w-full bg-background border border-primary/40 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm font-bold shadow-inner"
                                    >
                                        <option value="">-- Seleccionar Torneo Vinculante --</option>
                                        {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name} ({t.season})</option>)}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground mt-2 text-center">Un scorekeeper solo tendrá permisos de crear juegos dentro del torneo asignado.</p>
                                </div>
                            )}

                            {userForm.role === 'presi' && (
                                <div className="animate-fade-in-up mt-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <label className="block text-[10px] font-black text-primary mb-2 uppercase text-center w-full">VINCULAR A TORNEOS (PRESIDENTE)</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {tournaments.map((t: TournamentData) => (
                                            <label key={t.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={userForm.tournament_ids.includes(t.id)}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked 
                                                            ? [...userForm.tournament_ids, t.id]
                                                            : userForm.tournament_ids.filter(id => id !== t.id);
                                                        setUserForm({...userForm, tournament_ids: newVal});
                                                    }}
                                                    className="rounded border-muted/40 text-primary focus:ring-primary bg-background/50 outline-none"
                                                />
                                                {t.name} ({t.season})
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-3 text-center">Selecciona los torneos que este Presidente podrá administrar.</p>
                                </div>
                            )}

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Cargando...' : userRole === 'organizer' ? 'Agregar Personal' : 'Generar Credencial'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL EDITAR ACCESO */}
            {showAccessModal && editingUser && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => { setShowAccessModal(false); setEditingUser(null); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-xl font-black text-foreground mb-1 uppercase tracking-tight">Editar Acceso</h2>
                        <p className="text-xs text-muted-foreground mb-6">{editingUser.firstName} {editingUser.lastName} · {editingUser.email}</p>
                        <form onSubmit={handleUpdateAccess} className="space-y-5">
                            {/* Rol */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Rol del sistema</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['general', 'organizer', 'presi', 'scorekeeper', 'streamer', 'admin'] as const).map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setAccessForm(prev => ({ ...prev, role: r }))}
                                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${accessForm.role === r ? 'border-primary bg-primary/10 text-foreground' : 'border-muted/30 bg-background text-muted-foreground hover:border-muted/60'}`}
                                        >
                                            {r === 'general' ? 'Público' : r === 'organizer' ? 'Organizador' : r === 'presi' ? 'Presidente' : r === 'scorekeeper' ? 'ScoreKeeper' : r === 'streamer' ? 'Streamer' : 'Admin'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plan */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Plan</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['public', 'demo', 'standard', 'pro', 'admin', 'custom'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => p !== 'custom' && handlePlanChange(p)}
                                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${accessForm.planLabel === p ? 'border-primary bg-primary/10 text-foreground' : 'border-muted/30 bg-background text-muted-foreground hover:border-muted/60'} ${p === 'custom' ? 'opacity-50 cursor-default' : ''}`}
                                        >
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cuotas */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Cuotas</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { key: 'maxLeagues', label: 'Máx. Ligas' },
                                        { key: 'maxTournamentsPerLeague', label: 'Torneos/Liga' },
                                        { key: 'maxTeamsPerTournament', label: 'Equipos/Torn.' },
                                        { key: 'maxPlayersPerTeam', label: 'Jugadores/Eq.' },
                                    ] as const).map(({ key, label }) => (
                                        <div key={key}>
                                            <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={accessForm[key]}
                                                onChange={e => setAccessForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0, planLabel: 'custom' }))}
                                                className="w-full bg-background border border-muted/30 text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2">Editar cuotas manualmente cambia el plan a &quot;Custom&quot;.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowAccessModal(false); setEditingUser(null); }}
                                    className="flex-1 py-3 bg-muted/10 hover:bg-muted/20 text-foreground font-bold rounded-xl transition border border-muted/30 text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving}
                                    className={`flex-1 py-3 font-bold rounded-xl transition shadow-lg text-sm ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVA LIGA */}
            {showLeagueModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => { setShowLeagueModal(false); setEditingLeague(null); setLeagueForm({ name: '', shortName: '', city: '', state: '', sport: 'softball', description: '', logoUrl: '', isPrivate: false }); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-xl font-black text-foreground mb-1 uppercase tracking-tight">{editingLeague ? 'Editar Liga' : 'Registrar Liga'}</h2>
                        <p className="text-xs text-muted-foreground mb-6">La liga será visible en el directorio público de TourneyTru.</p>
                        <form onSubmit={editingLeague ? handleUpdateLeague : handleCreateLeague} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre completo *</label>
                                    <input required type="text" value={leagueForm.name} onChange={e => setLeagueForm({...leagueForm, name: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm" placeholder="Liga Municipal de Softbol de Ahome" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Siglas</label>
                                    <input type="text" maxLength={20} value={leagueForm.shortName} onChange={e => setLeagueForm({...leagueForm, shortName: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm" placeholder="LMSA" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Ciudad</label>
                                    <input type="text" value={leagueForm.city} onChange={e => setLeagueForm({...leagueForm, city: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm" placeholder="Los Mochis" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Estado</label>
                                    <input type="text" value={leagueForm.state} onChange={e => setLeagueForm({...leagueForm, state: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm" placeholder="Sinaloa" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Deporte</label>
                                <select value={leagueForm.sport} onChange={e => setLeagueForm({...leagueForm, sport: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm">
                                    <option value="softball">Sóftbol</option>
                                    <option value="baseball">Béisbol</option>
                                    <option value="both">Béisbol &amp; Sóftbol</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Descripción</label>
                                <textarea rows={3} value={leagueForm.description} onChange={e => setLeagueForm({...leagueForm, description: e.target.value})} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm resize-none" placeholder="Describe brevemente la liga..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo de la Liga</label>
                                <ImageUploader
                                    value={leagueForm.logoUrl}
                                    onChange={url => setLeagueForm({ ...leagueForm, logoUrl: url })}
                                    shape="square"
                                    placeholder="🏟️"
                                />
                            </div>
                            {/* Toggle privacidad */}
                            <div className="flex items-center justify-between p-3 bg-muted/5 border border-muted/20 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-foreground">Liga Privada</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Solo el administrador podrá verla</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLeagueForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${leagueForm.isPrivate ? 'bg-amber-500' : 'bg-muted/30'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${leagueForm.isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <button type="submit" disabled={saving} className="w-full py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all">
                                {saving ? (editingLeague ? 'Guardando...' : 'Creando...') : (editingLeague ? 'Guardar Cambios' : 'Crear Liga')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVO DELEGADO */}
            {showDelegateModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowDelegateModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-1 uppercase tracking-tight pb-4 border-b border-muted/20">Nuevo Delegado</h2>
                        <p className="text-xs text-muted-foreground mb-4">El delegado podrá armar el roster del equipo asignado mientras el torneo esté en estado <span className="text-amber-400 font-bold">Próximo</span>.</p>
                        <form onSubmit={handleCreateDelegate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-background border border-muted/20">
                                <button
                                    type="button"
                                    onClick={() => setDelegateForm({
                                        ...delegateForm,
                                        linkExistingAccount: false,
                                        firstName: '',
                                        lastName: '',
                                        password: '',
                                        phone: '',
                                    })}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition ${!delegateForm.linkExistingAccount ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Crear cuenta nueva
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDelegateForm({
                                        ...delegateForm,
                                        linkExistingAccount: true,
                                        firstName: '',
                                        lastName: '',
                                        password: '',
                                        phone: '',
                                    })}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition ${delegateForm.linkExistingAccount ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Vincular cuenta
                                </button>
                            </div>
                            {delegateForm.linkExistingAccount ? (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Correo de la cuenta existente</label>
                                        <input
                                            required
                                            type="email"
                                            value={delegateForm.email}
                                            onChange={e => setDelegateForm({ ...delegateForm, email: e.target.value })}
                                            className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                            placeholder="persona@correo.com"
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Puedes vincular una cuenta pública ya verificada o una cuenta que ya sea delegado en otra liga.
                                        La misma persona no podrá quedar ligada a dos equipos distintos dentro del mismo torneo.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                            <input required type="text" value={delegateForm.firstName} onChange={e => setDelegateForm({ ...delegateForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Carlos" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido</label>
                                            <input required type="text" value={delegateForm.lastName} onChange={e => setDelegateForm({ ...delegateForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Ramírez" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Correo</label>
                                            <input required type="email" value={delegateForm.email} onChange={e => setDelegateForm({ ...delegateForm, email: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="delegado@correo.com" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Teléfono (opcional)</label>
                                            <input type="tel" value={delegateForm.phone} onChange={e => setDelegateForm({ ...delegateForm, phone: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="6681234567" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Contraseña Provisoria</label>
                                        <input required type="password" value={delegateForm.password} onChange={e => setDelegateForm({ ...delegateForm, password: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="••••••••" />
                                    </div>
                                </>
                            )}
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <label className="block text-[10px] font-black text-primary mb-2 uppercase text-center">ASIGNAR A EQUIPO</label>
                                <select
                                    required
                                    value={delegateForm.teamId}
                                    onChange={e => setDelegateForm({ ...delegateForm, teamId: e.target.value, tournamentId: delegateTournamentId })}
                                    className="w-full bg-background border border-primary/40 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm font-bold"
                                >
                                    <option value="">— Seleccionar equipo —</option>
                                    {delegateTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                {delegateTeams.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground mt-2 text-center">No hay equipos en este torneo todavía.</p>
                                )}
                            </div>
                            <button type="submit" disabled={saving || delegateTeams.length === 0} className={`w-full py-3 mt-2 font-bold rounded-xl transition shadow-lg ${saving || delegateTeams.length === 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? (delegateForm.linkExistingAccount ? 'Vinculando...' : 'Creando...') : (delegateForm.linkExistingAccount ? 'Vincular Cuenta' : 'Crear Delegado')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
