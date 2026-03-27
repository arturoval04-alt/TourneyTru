"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import PlayerHoverCard from "@/components/PlayerHoverCard";
import api from "@/lib/api";
import { Search, Users, Trophy, Shield, ChevronRight, X } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface LeagueItem { id: string; name: string; _count?: { tournaments: number } }

interface TournamentListItem {
    id: string; name: string; season: string; leagueId?: string;
    _count?: { teams: number; games: number };
}

interface PlayerItem {
    id: string; firstName: string; lastName: string;
    number?: number; position?: string; bats?: string; throws?: string;
    photoUrl?: string; team?: { id: string; name: string };
}

interface TeamItem { id: string; name: string; logoUrl?: string; players: PlayerItem[] }

type FilterMode = "liga" | "torneo" | "equipo";

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function JugadoresPage() {
    /* ── data pools ── */
    const [leagues, setLeagues] = useState<LeagueItem[]>([]);
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [players, setPlayers] = useState<PlayerItem[]>([]);

    /* ── selections ── */
    const [filterMode, setFilterMode] = useState<FilterMode>("liga");
    const [selectedLeague, setSelectedLeague] = useState<LeagueItem | null>(null);
    const [selectedTournament, setSelectedTournament] = useState<TournamentListItem | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(null);

    /* ── search ── */
    const [entitySearch, setEntitySearch] = useState("");
    const [playerSearch, setPlayerSearch] = useState("");

    /* ── ui ── */
    const [activeTab, setActiveTab] = useState<"roster" | "stats">("roster");
    const [loadingEntities, setLoadingEntities] = useState(true);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    /* ── Whether we're viewing a player list ── */
    const showingPlayers = players.length > 0 || loadingPlayers;

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* ── Fetch initial data ────────────────────────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════ */

    useEffect(() => {
        const load = async () => {
            setLoadingEntities(true);
            try {
                const [leaguesRes, tournamentsRes] = await Promise.all([
                    api.get('/leagues'),
                    api.get('/torneos'),
                ]);
                setLeagues(leaguesRes.data || []);
                setTournaments(tournamentsRes.data || []);
            } catch (e) { console.error(e); }
            setLoadingEntities(false);
        };
        load();
    }, []);

    /* ── Fetch teams when a tournament is selected (for "equipo" filter or drill-down) ── */
    const fetchTeamsForTournament = async (tId: string) => {
        try {
            const { data } = await api.get('/teams', { params: { tournamentId: tId, includePlayers: true } });
            setTeams(data || []);
            return data || [];
        } catch { setTeams([]); return []; }
    };

    /* ── Load players from a set of teams ── */
    const extractPlayers = (teamsData: any[]) => {
        const all: PlayerItem[] = [];
        for (const team of teamsData) {
            for (const p of team.players || []) {
                all.push({ ...p, team: { id: team.id, name: team.name } });
            }
        }
        return all;
    };

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* ── Handlers ──────────────────────────────────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════ */

    const handleSelectLeague = async (league: LeagueItem) => {
        setSelectedLeague(league);
        setSelectedTournament(null); setSelectedTeam(null);
        setEntitySearch(""); setPlayerSearch("");
        setLoadingPlayers(true);
        try {
            const leagueTournaments = tournaments.filter(t => t.leagueId === league.id);
            const allPlayers: PlayerItem[] = [];
            for (const t of leagueTournaments) {
                const tms = await fetchTeamsForTournament(t.id);
                allPlayers.push(...extractPlayers(tms));
            }
            setPlayers(allPlayers);
        } catch (e) { console.error(e); }
        setLoadingPlayers(false);
    };

    const handleSelectTournament = async (t: TournamentListItem) => {
        setSelectedTournament(t);
        setSelectedTeam(null);
        setEntitySearch(""); setPlayerSearch("");
        setActiveTab("roster");
        setLoadingPlayers(true);
        try {
            const tms = await fetchTeamsForTournament(t.id);
            setPlayers(extractPlayers(tms));
        } catch (e) { console.error(e); }
        setLoadingPlayers(false);
    };

    const handleSelectTeam = (team: TeamItem) => {
        setSelectedTeam(team);
        setEntitySearch(""); setPlayerSearch("");
        setActiveTab("roster");
        const teamPlayers: PlayerItem[] = (team.players || []).map(p => ({
            ...p, team: { id: team.id, name: team.name }
        }));
        setPlayers(teamPlayers);
    };

    const handleBack = () => {
        if (filterMode === "equipo" && selectedTeam) {
            setSelectedTeam(null);
            if (selectedTournament) {
                setPlayers(extractPlayers(teams));
            } else {
                setPlayers([]);
            }
            return;
        }
        setSelectedLeague(null); setSelectedTournament(null); setSelectedTeam(null);
        setPlayers([]); setTeams([]);
        setEntitySearch(""); setPlayerSearch("");
    };

    const changeFilterMode = (mode: FilterMode) => {
        setFilterMode(mode);
        setSelectedLeague(null); setSelectedTournament(null); setSelectedTeam(null);
        setPlayers([]); setTeams([]);
        setEntitySearch(""); setPlayerSearch("");
    };

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* ── Computed lists ────────────────────────────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════ */

    const filteredLeagues = useMemo(() =>
        leagues.filter(l => l.name.toLowerCase().includes(entitySearch.toLowerCase())),
        [leagues, entitySearch]
    );

    const filteredTournaments = useMemo(() => {
        let list = tournaments;
        if (filterMode === "liga" && selectedLeague) {
            list = list.filter(t => t.leagueId === selectedLeague.id);
        }
        return list.filter(t => t.name.toLowerCase().includes(entitySearch.toLowerCase()));
    }, [tournaments, entitySearch, filterMode, selectedLeague]);

    const filteredTeams = useMemo(() =>
        teams.filter(t => t.name.toLowerCase().includes(entitySearch.toLowerCase())),
        [teams, entitySearch]
    );

    const filteredPlayers = useMemo(() => {
        if (!playerSearch.trim()) return players;
        const q = playerSearch.toLowerCase();
        return players.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            p.team?.name?.toLowerCase().includes(q)
        );
    }, [players, playerSearch]);

    /* ── What label to show in the back button / header ── */
    const currentTitle = selectedTeam?.name
        ?? selectedTournament?.name
        ?? selectedLeague?.name
        ?? null;

    const playerCount = filteredPlayers.length;
    const teamCount = new Set(filteredPlayers.map(p => p.team?.id)).size;

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* ── Determine what entity selector to show ────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════ */

    const needsEntitySelector = () => {
        if (filterMode === "liga") {
            return !selectedLeague;
        }
        if (filterMode === "torneo") {
            return !selectedTournament;
        }
        if (filterMode === "equipo") {
            if (!selectedTournament) return true;   // pick tournament first
            if (!selectedTeam) return true;          // then pick team
            return false;
        }
        return false;
    };

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* ── Render ────────────────────────────────────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════ */

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* ── ENTITY SELECTOR (Liga / Torneo / Equipo) ──────────────── */}
                {/* ══════════════════════════════════════════════════════════════ */}

                {needsEntitySelector() ? (
                    <div className="animate-fade-in-up">
                        <h1 className="text-3xl sm:text-4xl font-black mb-2">Directorio de Jugadores</h1>
                        <p className="text-muted-foreground mb-6">Filtra por liga, torneo o equipo para explorar el talento.</p>

                        {/* ── Filter mode tabs ── */}
                        <div className="flex bg-surface rounded-xl p-1 border border-muted/30 shadow-sm mb-6 w-fit">
                            {([
                                { key: "liga", label: "Liga", icon: <Trophy size={14} /> },
                                { key: "torneo", label: "Torneo", icon: <Shield size={14} /> },
                                { key: "equipo", label: "Equipo", icon: <Users size={14} /> },
                            ] as { key: FilterMode; label: string; icon: React.ReactNode }[]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => changeFilterMode(tab.key)}
                                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${filterMode === tab.key
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                                        }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Search input ── */}
                        <div className="relative mb-6 max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={
                                    filterMode === "liga" ? "Buscar liga..."
                                        : filterMode === "equipo" && !selectedTournament ? "Buscar torneo..."
                                            : filterMode === "equipo" && selectedTournament ? "Buscar equipo..."
                                                : "Buscar torneo..."
                                }
                                className="w-full pl-10 pr-4 py-2.5 bg-surface text-foreground placeholder-muted-foreground border border-muted/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all text-sm"
                                value={entitySearch}
                                onChange={(e) => setEntitySearch(e.target.value)}
                            />
                        </div>

                        {/* ── Breadcrumb for equipo mode ── */}
                        {filterMode === "equipo" && selectedTournament && !selectedTeam && (
                            <button
                                onClick={() => { setSelectedTournament(null); setTeams([]); setEntitySearch(""); }}
                                className="flex items-center gap-2 text-primary hover:text-primary-light font-medium mb-4 transition-colors cursor-pointer group text-sm"
                            >
                                <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
                                Volver a torneos
                            </button>
                        )}

                        {/* ── Entity cards grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loadingEntities ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm" />
                                ))
                            ) : (
                                <>
                                    {/* ── LIGA mode: show leagues ── */}
                                    {filterMode === "liga" && filteredLeagues.map(league => (
                                        <div
                                            key={league.id}
                                            className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer transition-all duration-300 group"
                                            onClick={() => handleSelectLeague(league)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:bg-primary/20 transition-colors shrink-0">
                                                    <Trophy size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">{league.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{league._count?.tournaments || 0} Torneos</p>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* ── TORNEO mode: show tournaments ── */}
                                    {filterMode === "torneo" && filteredTournaments.map(t => (
                                        <div
                                            key={t.id}
                                            className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer transition-all duration-300 group"
                                            onClick={() => handleSelectTournament(t)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:bg-primary/20 transition-colors shrink-0">
                                                    ⚾
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{t.season} • {t._count?.teams || 0} Equipos</p>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* ── EQUIPO mode: first pick tournament, then team ── */}
                                    {filterMode === "equipo" && !selectedTournament && filteredTournaments.map(t => (
                                        <div
                                            key={t.id}
                                            className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer transition-all duration-300 group"
                                            onClick={async () => {
                                                setSelectedTournament(t);
                                                setEntitySearch("");
                                                await fetchTeamsForTournament(t.id);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:bg-primary/20 transition-colors shrink-0">
                                                    ⚾
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{t.season} • {t._count?.teams || 0} Equipos</p>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    ))}

                                    {filterMode === "equipo" && selectedTournament && !selectedTeam && filteredTeams.map(team => (
                                        <div
                                            key={team.id}
                                            className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer transition-all duration-300 group"
                                            onClick={() => handleSelectTeam(team)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-surface rounded-full flex items-center justify-center overflow-hidden border-2 border-muted/30 group-hover:border-primary/50 transition-colors shrink-0">
                                                    {team.logoUrl ? (
                                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={18} className="text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">{team.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{team.players?.length || 0} Jugadores</p>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* ── Empty state ── */}
                                    {((filterMode === "liga" && filteredLeagues.length === 0) ||
                                        (filterMode === "torneo" && filteredTournaments.length === 0) ||
                                        (filterMode === "equipo" && !selectedTournament && filteredTournaments.length === 0) ||
                                        (filterMode === "equipo" && selectedTournament && filteredTeams.length === 0)) && !loadingEntities && (
                                            <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                                <p className="text-muted-foreground font-medium">No se encontraron resultados.</p>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>
                    </div>

                ) : (

                    /* ══════════════════════════════════════════════════════════════ */
                    /* ── PLAYER LIST ────────────────────────────────────────────── */
                    /* ══════════════════════════════════════════════════════════════ */

                    <div className="animate-fade-in-up">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-primary hover:text-primary-light font-medium mb-6 transition-colors cursor-pointer group text-sm"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
                            {filterMode === "equipo" && selectedTeam ? `Volver a equipos` : `Volver`}
                        </button>

                        {/* ── Header ── */}
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl ring-2 ring-primary/20">
                                    {filterMode === "equipo" ? <Users size={24} /> : "⚾"}
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black">{currentTitle}</h1>
                                    <p className="text-sm sm:text-base text-muted-foreground">
                                        {playerCount} Jugadores {teamCount > 1 ? `en ${teamCount} Equipos` : ""}
                                    </p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex w-full sm:w-auto bg-surface rounded-xl p-1 border border-muted/30 shadow-sm self-start">
                                <button
                                    onClick={() => setActiveTab("roster")}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'roster' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                >
                                    Roster Completo
                                </button>
                                <button
                                    onClick={() => setActiveTab("stats")}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'stats' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                                >
                                    Jugadores
                                </button>
                            </div>
                        </div>

                        {/* ── Player search bar ── */}
                        <div className="relative mb-6 max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar jugador por nombre..."
                                className="w-full pl-10 pr-10 py-2.5 bg-surface text-foreground placeholder-muted-foreground border border-muted/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all text-sm"
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                            />
                            {playerSearch && (
                                <button onClick={() => setPlayerSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* ── Tab Contents ── */}
                        {loadingPlayers ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-48 bg-surface border border-muted/30 rounded-xl animate-pulse shadow-sm" />
                                ))}
                            </div>
                        ) : activeTab === 'roster' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 animate-fade-in-up">
                                {filteredPlayers.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                        <p className="text-muted-foreground">{playerSearch ? "No se encontraron jugadores." : "No hay jugadores registrados."}</p>
                                    </div>
                                ) : filteredPlayers.map((p) => (
                                    <PlayerHoverCard key={p.id} playerId={p.id} firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} position={p.position} number={p.number} teamName={p.team?.name}>
                                        <div className="bg-surface border border-muted/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group flex flex-col items-center p-4 sm:p-6 hover:-translate-y-1">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/10 rounded-full mb-3 sm:mb-4 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-colors shrink-0">
                                                {p.photoUrl ? (
                                                    <img src={p.photoUrl} alt="Player" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={80} height={80} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                            <h3 className="font-bold text-center group-hover:text-primary transition-colors text-sm sm:text-base leading-tight">{p.firstName} {p.lastName}</h3>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase mt-1 text-center leading-tight line-clamp-1 break-all sm:break-normal">{p.team?.name || 'Sin equipo'}</p>
                                            <div className="mt-3 sm:mt-4 flex gap-2">
                                                {p.number && <span className="text-[10px] sm:text-xs text-muted-foreground font-black">#{p.number}</span>}
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] sm:text-xs font-bold rounded-full">
                                                    {p.position || 'INF'}
                                                </span>
                                            </div>
                                        </div>
                                    </PlayerHoverCard>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead className="bg-muted/5 border-b border-muted/20">
                                            <tr>
                                                <th className="px-6 py-5 font-bold text-muted-foreground text-xs uppercase tracking-wider">Jugador</th>
                                                <th className="px-6 py-5 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">Equipo</th>
                                                <th className="px-6 py-5 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">POS</th>
                                                <th className="px-6 py-5 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">#</th>
                                                <th className="px-6 py-5 font-bold text-center text-muted-foreground text-xs uppercase tracking-wider">Bat/Tir</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/10">
                                            {filteredPlayers.map((p, index) => (
                                                <tr key={p.id} className="hover:bg-muted/5 transition-colors group">
                                                    <td className="px-6 py-4 font-medium">
                                                        <PlayerHoverCard playerId={p.id} firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} position={p.position} number={p.number} teamName={p.team?.name}>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-muted-foreground text-sm font-mono w-4">{index + 1}.</span>
                                                                <div className="w-8 h-8 rounded-full bg-muted/10 overflow-hidden">
                                                                    {p.photoUrl ? (
                                                                        <img src={p.photoUrl} alt="Player" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={32} height={32} />
                                                                    )}
                                                                </div>
                                                                <span className="group-hover:text-primary transition-colors cursor-pointer">{p.firstName} {p.lastName}</span>
                                                            </div>
                                                        </PlayerHoverCard>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-muted-foreground text-sm">{p.team?.name || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-muted-foreground">{p.position || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-muted-foreground">{p.number || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-muted-foreground">{p.bats || 'R'}/{p.throws || 'R'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
