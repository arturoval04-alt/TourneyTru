"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/api";
import { Search, MapPin, ChevronLeft, ChevronRight, Hash, Layers } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface LeagueItem { id: string; name: string; }
interface TournamentItem { id: string; name: string; leagueId: string; }
interface TeamItem { id: string; name: string; tournament: { id: string }; }

interface PlayerDirectoryItem {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    photoUrl: string | null;
    birthPlace: string | null;
    position: string | null;
    bats: string;
    throws: string;
    isVerified: boolean;
    _count: { rosterEntries: number };
    rosterEntries: {
        number: number | null;
        team: {
            id: string;
            name: string;
            shortName: string | null;
            tournament: { id: string; name: string; season: string };
        };
    }[];
}

interface DirectoryMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/* ─── Hook de Utilities ──────────────────────────────────────────────────────── */

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

/* ─── Page Component ─────────────────────────────────────────────────────────── */

export default function JugadoresDirectoryPage() {
    // Top-level dropdown data
    const [leagues, setLeagues] = useState<LeagueItem[]>([]);
    const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
    const [teams, setTeams] = useState<TeamItem[]>([]);

    // Active filters
    const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");

    // Search and Pagination
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [page, setPage] = useState(1);

    // Data state
    const [players, setPlayers] = useState<PlayerDirectoryItem[]>([]);
    const [meta, setMeta] = useState<DirectoryMeta>({ total: 0, page: 1, limit: 24, totalPages: 1 });
    const [loading, setLoading] = useState(true);

    /* ─── Load dropdown data ─── */
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [leaguesRes, torneosRes, equiposRes] = await Promise.all([
                    api.get('/leagues'),
                    api.get('/torneos'),
                    api.get('/teams')
                ]);
                setLeagues(leaguesRes.data || []);
                setTournaments(torneosRes.data || []);
                setTeams(equiposRes.data || []);
            } catch (e) { console.error("Error loading dictionary data", e); }
        };
        loadMetadata();
    }, []);

    /* ─── Fetch Directory Data ─── */
    useEffect(() => {
        const fetchDirectory = async () => {
            setLoading(true);
            try {
                const params: any = { page, limit: 24 };
                if (debouncedSearch.length >= 2) params.q = debouncedSearch;
                if (selectedTeamId) params.teamId = selectedTeamId;
                else if (selectedTournamentId) params.tournamentId = selectedTournamentId;
                else if (selectedLeagueId) params.leagueId = selectedLeagueId;

                const { data } = await api.get('/players/directory', { params });
                setPlayers(data.data || []);
                setMeta(data.meta || { total: 0, page: 1, limit: 24, totalPages: 1 });
            } catch (error) {
                console.error("Error fetching player directory:", error);
                setPlayers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDirectory();
    }, [page, debouncedSearch, selectedLeagueId, selectedTournamentId, selectedTeamId]);

    /* ─── Cascading filter resets ─── */
    const handleLeagueChange = (id: string) => {
        setSelectedLeagueId(id);
        setSelectedTournamentId("");
        setSelectedTeamId("");
        setPage(1);
    };

    const handleTournamentChange = (id: string) => {
        setSelectedTournamentId(id);
        setSelectedTeamId("");
        setPage(1);
    };

    const handleTeamChange = (id: string) => {
        setSelectedTeamId(id);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 flex flex-col">
            <Navbar />

            <div className="relative border-b border-muted/20 bg-surface shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <div className="mb-8">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
                            Directorio Mundial de Jugadores
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
                            Explora y encuentra talento registrado en nuestra plataforma. Utiliza los filtros para navegar por ligas o realiza una búsqueda específica.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative md:col-span-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Búsqueda rápida</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-muted/30 text-foreground rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm text-sm"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Liga</label>
                            <select
                                className="w-full py-2.5 px-4 bg-background border border-muted/30 text-foreground rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm text-sm appearance-none"
                                value={selectedLeagueId}
                                onChange={(e) => handleLeagueChange(e.target.value)}
                            >
                                <option value="">Todas las ligas</option>
                                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Torneo</label>
                            <select
                                disabled={!selectedLeagueId}
                                className="w-full py-2.5 px-4 bg-background border border-muted/30 text-foreground rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm text-sm appearance-none disabled:opacity-50 disabled:bg-muted/10"
                                value={selectedTournamentId}
                                onChange={(e) => handleTournamentChange(e.target.value)}
                            >
                                <option value="">Todos los torneos</option>
                                {tournaments.filter(t => t.leagueId === selectedLeagueId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Equipo</label>
                            <select
                                disabled={!selectedTournamentId}
                                className="w-full py-2.5 px-4 bg-background border border-muted/30 text-foreground rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm text-sm appearance-none disabled:opacity-50 disabled:bg-muted/10"
                                value={selectedTeamId}
                                onChange={(e) => handleTeamChange(e.target.value)}
                            >
                                <option value="">Todos los equipos</option>
                                {teams.filter(t => t.tournament?.id === selectedTournamentId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                {/* ── Resultados y paginación top ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Mostrando <span className="text-foreground font-bold">{players.length}</span> de <span className="text-foreground font-bold">{meta.total}</span> jugadores encontrados.
                    </p>
                    
                    {meta.totalPages > 1 && (
                        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-muted/20 shadow-sm">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted/10 hover:text-foreground transition"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold px-3">Pág {page} de {meta.totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                disabled={page === meta.totalPages}
                                className="p-1.5 rounded text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted/10 hover:text-foreground transition"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Grid ── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-32 bg-surface/80 border border-muted/20 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : players.length === 0 ? (
                    <div className="bg-surface border border-muted/20 rounded-3xl py-24 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 bg-muted/10 flex items-center justify-center rounded-2xl mb-4 text-muted-foreground">
                            <Search size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Sin resultados</h3>
                        <p className="text-muted-foreground max-w-md text-sm">No pudimos encontrar ningún jugador que coincida con tus criterios de búsqueda. Intenta limpiando los filtros o escribiendo de otra manera.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {players.map((p) => {
                            const mainRoster = p.rosterEntries?.[0]; // Ultimo equipo (por joinedAt desc)
                            const teamName = mainRoster?.team?.name || 'Agente Libre';
                            const tourneyName = mainRoster?.team?.tournament?.name || '';
                            
                            return (
                                <Link href={`/jugadores/${p.id}`} key={p.id}>
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex items-start gap-4 h-full cursor-pointer group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none" />
                                        
                                        <div className="w-14 h-14 bg-muted/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-colors shrink-0">
                                            {p.photoUrl ? (
                                                <img src={p.photoUrl} alt={`${p.firstName} ${p.lastName}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Avatar" width={64} height={64} className="opacity-80 drop-shadow-sm" />
                                            )}
                                        </div>
                                        
                                        <div className="min-w-0 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-foreground truncate text-sm sm:text-base leading-tight group-hover:text-primary transition-colors">
                                                    {p.firstName} {p.lastName} {p.secondLastName || ''}
                                                </h3>
                                                {p.isVerified && (
                                                    <span className="text-blue-500 shrink-0" title="Perfil Verificado">
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10.9 16.5L6.5 12.1l1.4-1.4 3 3 7.2-7.2 1.4 1.4-8.6 8.6z"/></svg>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-2 truncate">
                                                <Layers size={12} className="shrink-0" />
                                                <span className="truncate">{teamName}</span>
                                            </div>

                                            <div className="mt-auto flex flex-wrap gap-1.5">
                                                {p.position && (
                                                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-black uppercase tracking-tighter shrink-0 border border-primary/20">
                                                        {p.position}
                                                    </span>
                                                )}
                                                {p._count?.rosterEntries > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-muted/20 text-muted-foreground rounded text-[10px] font-bold shrink-0 border border-muted/30">
                                                        {p._count.rosterEntries} Torneo{p._count.rosterEntries !== 1 && 's'}
                                                    </span>
                                                )}
                                                {p.birthPlace && (
                                                    <span className="px-1.5 py-0.5 bg-muted/10 text-foreground/80 rounded text-[10px] font-medium shrink-0 border border-muted/20 flex items-center gap-0.5 truncate max-w-[80px]" title={p.birthPlace}>
                                                        <MapPin size={10} className="shrink-0 text-muted-foreground" />
                                                        <span className="truncate">{p.birthPlace}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
                
                {/* ── Bottom Paginator (if many elements) ── */}
                {!loading && players.length > 0 && meta.totalPages > 1 && (
                    <div className="flex justify-center mt-12 mb-8">
                        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-muted/20 shadow-sm">
                            <button
                                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-lg text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted/10 hover:text-foreground font-medium text-sm transition"
                            >
                                Anterior
                            </button>
                            
                            <div className="px-4 text-sm font-bold opacity-80">
                                Página {page} de {meta.totalPages}
                            </div>
                            
                            <button
                                onClick={() => { setPage(p => Math.min(meta.totalPages, p + 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                                disabled={page === meta.totalPages}
                                className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light font-medium text-sm transition shadow-sm"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
