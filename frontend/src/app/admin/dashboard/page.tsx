'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, AuthUser } from '@/lib/auth';
import CreateGameWizard from '@/components/game/CreateGameWizard';
import api from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();

    // -- Types --
    type TabType = 'perfil' | 'torneos' | 'equipos' | 'jugadores' | 'juegos' | 'usuarios';

    interface GameData {
        id: string;
        status: string;
        awayTeam: { name: string };
        homeTeam: { name: string };
        awayScore: number;
        homeScore: number;
        currentInning: number;
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
        league?: { name: string; id: string };
    }

    interface LeagueData {
        id: string;
        name: string;
    }

    interface TeamData {
        id: string;
        name: string;
        logoUrl?: string;
    }

    interface PlayerData {
        id: string;
        firstName: string;
        lastName: string;
        number: string;
        position: string;
        photoUrl?: string;
    }

    interface UserData {
        id: string;
        name: string;
        email: string;
        role: string;
        tournament_id?: string;
    }

    // -- State: Navigation --
    const [activeTab, setActiveTab] = useState<TabType>('torneos');
    const [saving, setSaving] = useState(false);

    // -- State: Modals --
    const [showGameModal, setShowGameModal] = useState(false);
    const [lineupGameId, setLineupGameId] = useState<string | null>(null);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
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

    // -- Profile Editing State --
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [newPhone, setNewPhone] = useState('');

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) setCurrentUser(storedUser);
        if (typeof window !== 'undefined') {
            setUserTournamentId(localStorage.getItem('userTournamentId') || null);
        }
    }, []);

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

    // -- Data Stores --
    const [games, setGames] = useState<GameData[]>([]);
    const [tournaments, setTournaments] = useState<TournamentData[]>([]);
    const [leagues, setLeagues] = useState<LeagueData[]>([]);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);

    // -- Form: Create Game --
    const [selectedTournament, setSelectedTournament] = useState('');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');

    // -- Form: Jugadores --
    const [selectedTeam, setSelectedTeam] = useState('');

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
        leagueId: ''
    });

    // -- Form: Create Team --
    const [teamForm, setTeamForm] = useState({ name: '', manager: '', logoUrl: '', tournament_id: '' });

    // -- Form: Create Player --
    const [playerForm, setPlayerForm] = useState({ firstName: '', lastName: '', number: '', position: 'INF', photoUrl: '', team_id: '' });
    const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<any>(null);

    // -- Form: Create User --
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'general', tournament_id: '' });

    // -- Form: Create League --
    const [leagueName, setLeagueName] = useState('');
    const [showLeagueModal, setShowLeagueModal] = useState(false);

    // --- API Fetchers ---
    const fetchGames = async () => {
        try {
            const { data } = await api.get('/games');
            setGames(data || []);
        } catch (err) { console.error("Error fetching games:", err); }
    };

    const fetchTournaments = async () => {
        try {
            const { data } = await api.get('/torneos');
            setTournaments(data || []);
        } catch (err) { console.error("Error fetching tournaments:", err); }
    }

    const fetchLeagues = async () => {
        try {
            const { data } = await api.get('/leagues');
            setLeagues(data || []);
        } catch (err) { console.error("Error fetching leagues:", err); }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users');
            setUsers(data || []);
        } catch (err) { console.error("Error fetching users:", err); }
    };

    useEffect(() => {
        fetchGames();
        fetchTournaments();
        fetchLeagues();
    }, []);

    useEffect(() => {
        if (userRole === 'admin') {
            fetchUsers();
        }
    }, [userRole]);

    // Fetch Teams when Game Creation Tournament changes
    useEffect(() => {
        if (!selectedTournament) {
            setTeams([]);
            return;
        }
        api.get('/teams', { params: { tournamentId: selectedTournament } })
            .then(({ data }) => setTeams(data || []))
            .catch(err => console.error(err));
    }, [selectedTournament]);

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
            fetchGames();
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
                    leagueId: ''
                });
                fetchTournaments();
                router.push(`/torneos/${newTourn.id}`);
            }
        } catch (err) { 
            console.error(err);
            alert('Error al crear torneo');
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
                leagueId: ''
            });
            fetchTournaments();
        } catch (err) { 
            console.error(err);
            alert('Error al actualizar torneo');
        } finally { setSaving(false); }
    };

    const handleEditTourn = (tourn: TournamentData) => {
        setEditingTourn(tourn);
        setTournForm({
            name: tourn.name,
            season: tourn.season || '',
            location_city: tourn.locationCity || '',
            location_state: tourn.locationState || '',
            location_country: tourn.locationCountry || 'México',
            sport: tourn.sport || (tourn.branch === 'Softbol' ? 'Softbol' : 'Béisbol'),
            branch: tourn.branch || 'Varonil',
            category: tourn.category || 'Libre',
            description: tourn.description || '',
            logoUrl: tourn.logoUrl || '',
            leagueId: tourn.league?.id || ''
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
        } catch (err) { 
            console.error(err);
            alert('Error al crear equipo'); 
        } finally { setSaving(false); }
    };

    const handleCreatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/players', {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                number: playerForm.number ? parseInt(playerForm.number) : null,
                teamId: playerForm.team_id,
                position: playerForm.position,
            });
            alert('Jugador Registrado Satisfactoriamente');
            setShowPlayerModal(false);
            setPlayerForm({ firstName: '', lastName: '', number: '', position: 'INF', photoUrl: '', team_id: '' });
            if (selectedTeam === playerForm.team_id) {
                api.get('/players', { params: { teamId: selectedTeam } })
                    .then(({ data }) => setPlayers(data || []))
                    .catch(console.error);
            }
        } catch (err) { 
            console.error(err);
            alert('Error al crear jugador'); 
        } finally { setSaving(false); }
    };

    const handleEditPlayer = (player: any) => {
        setEditingPlayer(player);
        setPlayerForm({
            firstName: player.firstName || player.first_name,
            lastName: player.lastName || player.last_name,
            number: player.number?.toString() || '',
            position: player.position || 'INF',
            photoUrl: player.photoUrl || player.photo_url || '',
            team_id: player.team_id
        });
        setShowEditPlayerModal(true);
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer) return;
        setSaving(true);
        try {
            await api.patch(`/players/${editingPlayer.id}`, {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                number: playerForm.number ? parseInt(playerForm.number) : null,
                teamId: playerForm.team_id,
                position: playerForm.position,
                photoUrl: playerForm.photoUrl || null,
            });
            alert('Jugador Actualizado');
            setShowEditPlayerModal(false);
            setEditingPlayer(null);
            setPlayerForm({ firstName: '', lastName: '', number: '', position: 'INF', photoUrl: '', team_id: '' });
            if (selectedTeam) {
                api.get('/players', { params: { teamId: selectedTeam } })
                    .then(({ data }) => setPlayers(data || []))
                    .catch(console.error);
            }
        } catch (err) { 
            console.error(err);
            alert('Error al actualizar jugador'); 
        } finally { setSaving(false); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Lógica de división de nombres más robusta
        const nameParts = userForm.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || ' '; // Espacio si no hay apellido para evitar fallos de validación (aunque ahora relajamos a 1 char)

        try {
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
            setUserForm({ name: '', email: '', password: '', role: 'general', tournament_id: '' });
            fetchUsers();
        } catch (err: any) {
            console.error('[CreateUser Error]', err);
            const data = err.response?.data;
            let errorMsg = 'Error desconocido';

            if (data?.message) {
                if (Array.isArray(data.message)) {
                    // Si el backend devuelve ValidationError[] de class-validator
                    errorMsg = data.message.map((m: any) => 
                        typeof m === 'string' ? m : Object.values(m.constraints || {}).join(', ')
                    ).join('\n');
                } else if (typeof data.message === 'string') {
                    errorMsg = data.message;
                }
            }
            alert('Error al crear cuenta:\n' + errorMsg);
        } finally { setSaving(false); }
    };

    const handleCreateLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leagueName) return;
        setSaving(true);
        try {
            if (!currentUser || currentUser.role !== 'admin') {
                alert('Solo los administradores pueden crear ligas.');
                setSaving(false);
                return;
            }
            await api.post('/leagues', {
                name: leagueName,
                adminId: currentUser.id,
            });
            alert('Liga Creada');
            setLeagueName('');
            setShowLeagueModal(false);
            fetchLeagues();
        } catch (err) { 
            console.error(err);
            alert('Error al crear liga');
        } finally { setSaving(false); }
    };

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        form: any,
        setForm: (val: any) => void, 
        field: string
    ) => {
        if (e.target.type === 'file') {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setForm({ ...form, [field]: reader.result as string });
                };
                reader.readAsDataURL(file);
            }
        } else {
            setForm({ ...form, [field]: e.target.value });
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
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setSaving(true);
            try {
                await api.patch('/users/profile', { profilePicture: base64String });
                setUserProfilePicture(base64String);
                updateStoredUser({ profilePicture: base64String });
            } catch (error) {
                console.error(error);
                alert('Error al actualizar la foto de perfil');
            } finally {
                setSaving(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- Partials ---
    const SideMenu = () => {
        const menuItems = [
            { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
            { id: 'torneos', label: 'Torneos', icon: '🏆' },
            { id: 'equipos', label: 'Equipos', icon: '🛡️' },
            { id: 'jugadores', label: 'Jugadores', icon: '⚾' },
            { id: 'juegos', label: 'Juegos & Stats', icon: '📊' },
            { id: 'usuarios', label: 'Cuentas Admin', icon: '🔑' },
        ];
        return (
            <div className="w-full md:w-64 shrink-0 bg-surface border border-muted/30 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-hide">
                <div className="hidden md:block px-4 py-2 border-b border-muted/20 mb-2">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Dashboard</p>
                </div>
                {menuItems.filter(item => item.id !== 'usuarios' || userRole === 'admin').map(item => (
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

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-muted/20 gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">⚙️</div>
                            Panel de Control
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Gestión integral de torneos, equipos y configuración del sistema.</p>
                    </div>
                    <div>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2.5 bg-surface hover:bg-muted/10 text-foreground font-bold rounded-xl border border-muted/30 transition-all shadow-sm"
                        >
                            Ver Sitio Público
                        </button>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Navigation Sidebar */}
                    <SideMenu />

                    {/* Content Area */}
                    <main className="flex-1 w-full min-w-0">
                        {/* TAB: PERFIL */}
                        {activeTab === 'perfil' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Mi Perfil
                                    </h2>
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
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={saving} />
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

                        {/* TAB: TORNEOS */}
                        {activeTab === 'torneos' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Mis Torneos
                                    </h2>
                                    {userRole === 'admin' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowLeagueModal(true)}
                                                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg transition shadow-md hover:shadow-amber-500/40 text-sm flex items-center gap-2 shrink-0"
                                            >
                                                + Nueva Liga
                                            </button>
                                            <button
                                                onClick={() => setShowTournamentModal(true)}
                                                className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2 shrink-0"
                                            >
                                                + Registrar Torneo
                                            </button>
                                        </div>
                                    )}
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
                                                        {userRole === 'admin' && (
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
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Equipos Registrados
                                    </h2>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <select
                                            className="w-full sm:w-64 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                            value={selectedTournament}
                                            onChange={(e) => setSelectedTournament(e.target.value)}
                                        >
                                            <option value="">Filtrar por Torneo...</option>
                                            {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name} ({t.season})</option>)}
                                        </select>
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => setShowTeamModal(true)}
                                                className="px-5 py-2 whitespace-nowrap bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2"
                                            >
                                                + Añadir Equipo
                                            </button>
                                        )}
                                    </div>
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
                                            {!selectedTournament ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        Por favor, selecciona un torneo en el menú superior para ver sus equipos adscritos.
                                                    </td>
                                                </tr>
                                            ) : teams.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay equipos registrados en este torneo. Clic en &quot;Añadir Equipo&quot;.
                                                    </td>
                                                </tr>
                                            ) : teams.map((team: any) => (
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
                                                        <span className="text-primary">{(team as any)._count?.players || 0} Jugadores</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-primary hover:underline font-bold text-xs mr-4" onClick={() => router.push(`/equipos/${team.id}`)}>Ver Perfil</button>
                                                        {userRole === 'admin' && (
                                                            <button className="text-muted-foreground hover:text-foreground font-bold text-xs">Editar</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TAB: JUGADORES */}
                        {activeTab === 'jugadores' && (
                            <section className="animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Jugadores del Roster
                                    </h2>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <select
                                            className="w-full sm:w-48 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                            value={selectedTournament}
                                            onChange={(e) => setSelectedTournament(e.target.value)}
                                        >
                                            <option value="">1. Torneo...</option>
                                            {tournaments.map((t: TournamentData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select
                                            disabled={!selectedTournament}
                                            className="w-full sm:w-48 bg-surface border border-muted/30 text-foreground rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm disabled:opacity-50"
                                            value={selectedTeam}
                                            onChange={(e) => setSelectedTeam(e.target.value)}
                                        >
                                            <option value="">2. Equipo...</option>
                                            {teams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => setShowPlayerModal(true)}
                                                className="px-5 py-2 min-w-max bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2"
                                            >
                                                + Alta Jugador
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Jugador</th>
                                                <th className="px-6 py-4">Equipo actual</th>
                                                <th className="px-6 py-4">Posición</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {!selectedTeam ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        Por favor, selecciona un Torneo y después un Equipo en el menú superior para ver su Roster.
                                                    </td>
                                                </tr>
                                            ) : players.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay jugadores registrados en el roster de este equipo. Clic en &quot;+ Alta Jugador&quot;.
                                                    </td>
                                                </tr>
                                            ) : players.map((player: any) => (
                                                <tr key={player.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-foreground flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border border-muted/30">
                                                                {player.photoUrl ? (
                                                                    <img src={player.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.firstName}${player.lastName}`} alt="Avatar" className="w-full h-full opacity-60" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center bg-muted/20 rounded text-[10px] py-0.5">{player.number || '00'}</span>
                                                                {player.firstName} {player.lastName}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">
                                                        {player.team?.name || 'Agente Libre'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">{player.position || 'INF'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link href={`/torneos/${selectedTournament}/jugadores/${player.id}`} className="text-muted-foreground hover:text-foreground font-bold text-xs mr-4 transition-colors">
                                                            Ficha
                                                        </Link>
                                                        {userRole === 'admin' && (
                                                            <button
                                                                onClick={() => handleEditPlayer(player)}
                                                                className="text-blue-500/70 hover:text-blue-500 font-bold text-xs transition-colors"
                                                            >
                                                                Editar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                                        {userRole === 'admin' && (
                                            <button className="hidden sm:block px-4 py-2 bg-surface hover:bg-muted/10 border border-muted/30 text-foreground font-bold rounded-lg transition text-sm">
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
                                            {games.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay partidos programados. Clic en &quot;Crear Ticket de Juego&quot;.
                                                    </td>
                                                </tr>
                                            ) : games.map((game: GameData) => (
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
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        {game.status === 'finished' ? (
                                                            <button
                                                                onClick={() => router.push(`/gamecast/${game.id}`)}
                                                                className="px-4 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition text-xs font-black shadow-sm flex items-center gap-2"
                                                            >
                                                                Ver Boxscore
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => setLineupGameId(game.id)}
                                                                    className="px-3 py-1.5 bg-blue-900/40 border border-blue-700 text-blue-300 hover:bg-blue-800/60 transition text-xs font-bold rounded-lg"
                                                                >
                                                                    Configurar Lineups
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/game/${game.id}`)}
                                                                    className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition text-xs font-bold"
                                                                >
                                                                    Lanzar Scorekeeper
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TAB: USUARIOS */}
                        {activeTab === 'usuarios' && (
                            <section className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                                        <span className="w-2 h-4 bg-primary rounded-full"></span> Control de Accesos
                                    </h2>
                                    <button
                                        onClick={() => setShowUserModal(true)}
                                        className="px-5 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-lg transition shadow-md hover:shadow-primary/40 text-sm flex items-center gap-2"
                                    >
                                        + Generar Cuenta
                                    </button>
                                </div>
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-x-auto overflow-y-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-muted-foreground">
                                        <thead className="bg-muted/10 text-xs uppercase text-foreground font-black tracking-wider border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-4">Usuario</th>
                                                <th className="px-6 py-4">Rol / Nivel de Acceso</th>
                                                <th className="px-6 py-4">Asignación</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {users.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                        No hay cuentas registradas en el sistema. Clic en &quot;Generar Cuenta&quot;.
                                                    </td>
                                                </tr>
                                            ) : users.map((user: UserData) => (
                                                <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-foreground">{user.name}</div>
                                                        <div className="text-xs">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {user.role === 'admin' && <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded text-xs font-bold uppercase">Administrador</span>}
                                                        {user.role === 'scorekeeper' && <span className="bg-primary/10 text-primary px-2.5 py-1 rounded text-xs font-bold uppercase">ScoreKeeper</span>}
                                                        {user.role === 'general' && <span className="bg-muted/20 text-muted-foreground px-2.5 py-1 rounded text-xs font-bold uppercase">General Público</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold">
                                                        {user.role === 'scorekeeper' && user.tournament_id ? (
                                                            <span className="flex items-center gap-1 text-foreground"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Torneo ID: {user.tournament_id.slice(0, 4)}</span>
                                                        ) : <span className="text-muted-foreground/50">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {user.role !== 'admin' && <button className="text-red-500 hover:text-red-400 font-bold text-xs">Revocar</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
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
                                    <button type="button" onClick={() => setShowLeagueModal(true)} className="text-[10px] text-primary hover:underline font-bold uppercase">+ Nueva Liga</button>
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
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo (URL o Subir)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tournForm.logoUrl}
                                        onChange={e => setTournForm({ ...tournForm, logoUrl: e.target.value })}
                                        className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs"
                                        placeholder="URL de la imagen"
                                    />
                                    <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => handleImageChange(e, tournForm, setTournForm, 'logoUrl')}
                                        />
                                    </label>
                                </div>
                                {tournForm.logoUrl && (
                                    <div className="mt-2 flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                        <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                            <img src={tournForm.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                        </div>
                                        <button type="button" onClick={() => setTournForm({ ...tournForm, logoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Imagen</button>
                                    </div>
                                )}
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
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Torneo (URL o Subir)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tournForm.logoUrl}
                                        onChange={e => setTournForm({ ...tournForm, logoUrl: e.target.value })}
                                        className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs"
                                        placeholder="URL de la imagen"
                                    />
                                    <label className="shrink-0 bg-muted/20 hover:bg-muted/30 text-foreground px-4 py-3 rounded-lg cursor-pointer transition text-xs font-bold border border-muted/30">
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => handleImageChange(e, tournForm, setTournForm, 'logoUrl')}
                                        />
                                    </label>
                                </div>
                                {tournForm.logoUrl && (
                                    <div className="mt-2 flex items-center gap-2 border border-muted/20 p-2 rounded-lg bg-muted/5">
                                        <div className="w-12 h-12 rounded border border-muted/30 overflow-hidden bg-white flex items-center justify-center">
                                            <img src={tournForm.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                                        </div>
                                        <button type="button" onClick={() => setTournForm({ ...tournForm, logoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Imagen</button>
                                    </div>
                                )}
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
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO JUEGO */}
            {showGameModal && (
                <CreateGameWizard
                    context={userRole === 'scorekeeper' ? 'scorekeeper' : 'admin'}
                    tournamentId={userRole === 'scorekeeper' && userTournamentId ? userTournamentId : undefined}
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
                        <button onClick={() => setShowTeamModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Alta de Equipo
                        </h2>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
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
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre del Equipo</label>
                                <input required type="text" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Diablos Rojos" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Manager (Opcional)</label>
                                <input type="text" value={teamForm.manager} onChange={e => setTeamForm({ ...teamForm, manager: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Juan Pérez" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Logo del Equipo (URL o Subir)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={teamForm.logoUrl} 
                                        onChange={e => setTeamForm({ ...teamForm, logoUrl: e.target.value })} 
                                        className="flex-1 bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-xs" 
                                        placeholder="URL del escudo" 
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

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Verificando...' : 'Crear Equipo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVO JUGADOR */}
            {showPlayerModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowPlayerModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Alta de Jugador
                        </h2>
                        <form onSubmit={handleCreatePlayer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Equipo Destino</label>
                                <select
                                    required
                                    value={playerForm.team_id}
                                    onChange={e => setPlayerForm({ ...playerForm, team_id: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                >
                                    <option value="">-- Seleccionar Equipo --</option>
                                    {teams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                    <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Roberto" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido</label>
                                    <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Gómez" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Número (Jersey)</label>
                                    <input required type="text" value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 24" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición</label>
                                    <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="P">Pitcher (P)</option>
                                        <option value="C">Catcher (C)</option>
                                        <option value="INF">Infielder (INF)</option>
                                        <option value="OF">Outfielder (OF)</option>
                                        <option value="DH">Bateador Designado (DH)</option>
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
                                        placeholder="URL de la foto" 
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
                                        <button type="button" onClick={() => setPlayerForm({ ...playerForm, photoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Foto</button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Verificando...' : 'Guardar Jugador'}
                            </button>
                        </form>
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
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Equipo Destino</label>
                                <select
                                    required
                                    value={playerForm.team_id}
                                    onChange={e => setPlayerForm({ ...playerForm, team_id: e.target.value })}
                                    className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                >
                                    <option value="">-- Seleccionar Equipo --</option>
                                    {teams.map((t: TeamData) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                    <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm({ ...playerForm, firstName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Roberto" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido</label>
                                    <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm({ ...playerForm, lastName: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Gómez" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Número (Jersey)</label>
                                    <input required type="text" value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. 24" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición</label>
                                    <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="P">Pitcher (P)</option>
                                        <option value="C">Catcher (C)</option>
                                        <option value="INF">Infielder (INF)</option>
                                        <option value="OF">Outfielder (OF)</option>
                                        <option value="DH">Bateador Designado (DH)</option>
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
                                        placeholder="URL de la foto" 
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
                                        <button type="button" onClick={() => setPlayerForm({ ...playerForm, photoUrl: '' })} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar Foto</button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Guardando...' : 'Actualizar Jugador'}
                            </button>
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
                        <h2 className="text-2xl font-black text-foreground mb-6 uppercase tracking-tight pb-4 border-b border-muted/20">
                            Alta de Credencial
                        </h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre Completo</label>
                                    <input required type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Arturo Hdz" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Correo / Email</label>
                                    <input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="admin@tourneytru.com" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Contraseña Provisoria</label>
                                    <input required type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="••••••••" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Rol de Sistema</label>
                                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition">
                                        <option value="general">Público / General</option>
                                        <option value="scorekeeper">Scorekeeper Móvil</option>
                                        <option value="admin">Administrador Total</option>
                                    </select>
                                </div>
                            </div>

                            {userForm.role === 'scorekeeper' && (
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

                            <button type="submit" disabled={saving} className={`w-full py-3 mt-4 font-bold rounded-xl transition shadow-lg ${saving ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white shadow-primary/20 cursor-pointer active:scale-95'}`}>
                                {saving ? 'Aprovisionando...' : 'Generar Credencial'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL NUEVA LIGA */}
            {showLeagueModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
                    <div className="bg-surface border border-muted/30 p-5 sm:p-8 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowLeagueModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-xl font-black text-foreground mb-4 uppercase tracking-tight">Registro de Liga</h2>
                        <form onSubmit={handleCreateLeague} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre de la Liga</label>
                                <input required type="text" value={leagueName} onChange={e => setLeagueName(e.target.value)} className="w-full bg-background border border-muted/30 text-foreground rounded-lg p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition" placeholder="Ej. Liga Municipal de Béisbol" />
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all">
                                {saving ? 'Creando...' : 'Crear Liga'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
