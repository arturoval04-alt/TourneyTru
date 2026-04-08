"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import api from "@/lib/api";
import { Search, Filter, Users, Trophy, MapPin, ChevronRight, Activity } from "lucide-react";

interface TeamItem {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    managerName?: string;
    _count?: { rosterEntries: number };
    tournament?: { id: string; name: string; category?: string; rulesType?: string };
}

interface TournamentListItem {
    id: string;
    name: string;
}

export default function EquiposPage() {
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTournament, setSelectedTournament] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all teams
                const teamsRes = await api.get('/teams');
                setTeams(teamsRes.data || []);

                // Fetch tournaments for the filter dropdown
                const tournsRes = await api.get('/torneos');
                setTournaments(tournsRes.data || []);

                setLoading(false);
            } catch (err) {
                console.error("Error fetching teams data:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredTeams = teams.filter(team => {
        const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.shortName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTournament = selectedTournament === "all" || team.tournament?.id === selectedTournament;
        return matchesSearch && matchesTournament;
    });

    const getSportIcon = (rulesType?: string) => (rulesType || '').includes('softball') ? '🥎' : '⚾';
    const getSportName = (rulesType?: string) => (rulesType || '').includes('softball') ? 'Softbol' : 'Béisbol';

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="animate-fade-in-up">
                    <h1 className="text-3xl sm:text-4xl font-black mb-2 text-foreground">Directorio de Equipos</h1>
                    <p className="text-muted-foreground mb-8">Explora, busca y encuentra a todos los equipos de la liga</p>

                    {/* Barra de Búsqueda y Filtros */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
                            <div className="relative flex-1 group w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar equipos por nombre..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-surface border border-muted/30 rounded-xl py-3 pl-12 pr-4 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center sm:justify-start gap-2 border px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 w-full sm:w-auto
                                    ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'border-muted/30 bg-surface hover:bg-muted/10 hover:border-muted/50 text-foreground'}`}
                            >
                                <Filter className="w-4 h-4" /> Filtros
                            </button>
                        </div>
                    </div>

                    {/* Fila Extensible de Filtros */}
                    {showFilters && (
                        <div className="mb-6 p-4 sm:p-5 bg-surface border border-muted/20 rounded-xl shadow-inner animate-fade-in-up flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="w-full sm:w-72">
                                <label className="block text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">Filtrar por Torneo</label>
                                <select
                                    className="w-full bg-background border border-muted/30 rounded-lg py-2.5 px-3 text-sm font-medium outline-none focus:border-primary transition-colors cursor-pointer"
                                    value={selectedTournament}
                                    onChange={(e) => setSelectedTournament(e.target.value)}
                                >
                                    <option value="all">Todos los Torneos</option>
                                    {tournaments.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            {(selectedTournament !== 'all' || searchQuery !== '') && (
                                <button
                                    onClick={() => { setSelectedTournament('all'); setSearchQuery(''); }}
                                    className="mt-4 sm:mt-6 text-sm font-bold text-red-500 hover:text-red-400 transition-colors"
                                >
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-4 font-medium px-1">
                        Mostrando {filteredTeams.length} equipo{filteredTeams.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Grid de Equipos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm" />
                        ))
                    ) : filteredTeams.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-surface border border-muted/30 rounded-2xl">
                            <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">No se encontraron equipos</h3>
                            <p className="text-muted-foreground font-medium">Intenta ajustar tu búsqueda o limpiar los filtros.</p>
                        </div>
                    ) : filteredTeams.map((team) => {
                        const sportType = getSportName(team.tournament?.rulesType);
                        return (
                            <Link href={`/equipos/${team.id}`} key={team.id} className="block group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl animate-fade-in-up">
                                <div className="bg-surface border border-muted/20 rounded-2xl gap-1 overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 h-full flex flex-col relative">


                                    {/* Cover Half / Dark Header */}
                                    <div className="relative h-36 w-full bg-gradient-to-br from-slate-800 to-slate-900 mb-3 overflow-hidden flex items-center justify-center">
                                        <div className="absolute inset-010 bg-black/10 group-hover:bg-black/0 transition-colors"></div>

                                        {/* Sport Badge */}
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[11px] font-bold border border-white/10 flex items-center gap-1.5 shadow-sm z-20">
                                            <span>{getSportIcon(team.tournament?.rulesType)}</span> {getSportName(team.tournament?.rulesType)}
                                        </div>

                                        {/* Logo / Image Cover or Fallback Text */}
                                        {team.logoUrl ? (
                                            <div className="absolute inset-0 z-10 bg-white/5">
                                                <Image src={team.logoUrl} alt={team.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized />
                                            </div>
                                        ) : (
                                            <div className="z-10 group-hover:scale-110 transition-transform duration-500">
                                                <span className="text-secondary opacity-60 font-black text-6xl tracking-tighter drop-shadow-md">
                                                    {team.shortName || team.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Half */}
                                    <div className="p- flex flex-col flex-1 relative z-20 gap-1 items-center">
                                        <h3 className="font-black text-xl text-foreground mb-1 leading-tight group-hover:text-primary transition-colors truncate">
                                            {team.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground font-medium mb-5 truncate">
                                            {team.managerName ? `Dirigido por ${team.managerName}` : 'Manager no asignado'}
                                        </p>
                                        <div className="space-y-3 mb-6 flex-1 ">
                                            <div className="flex items-start gap-3 text-sm text-muted-foreground font-medium group/line">
                                                <Trophy className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5 group-hover/line:text-amber-500 transition-colors" />
                                                <span className="leading-snug">
                                                    Participante en <span className="font-bold text-foreground">1 torneo</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium group/line">
                                                <Users className="w-4 h-4 text-muted-foreground/70 shrink-0 group-hover/line:text-blue-500 transition-colors" />
                                                <span><span className="font-bold text-foreground text-base leading-none">{team._count?.rosterEntries || 0}</span> jugadores registrados</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-muted/20 pt-2 mt-auto flex items-center justify-between mb-3">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate max-w-[80%]">
                                                {team.tournament?.name || 'Torneo Independiente'}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

