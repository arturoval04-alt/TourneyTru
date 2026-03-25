"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Search, Filter, MapPin, Calendar, Users, Trophy, ChevronRight } from "lucide-react";

interface TournamentItem {
    id: string;
    name: string;
    season: string;
    category?: string;
    logoUrl?: string;
    rulesType: string;
    league?: { name: string };
    _count?: { teams: number; games: number };
    games?: { status: string }[];
    createdAt: string;
}

export default function TorneosPage() {
    const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const { data } = await api.get('/torneos');
                setTournaments(data || []);
                setLoading(false);
            } catch (err: any) {
                console.error("Error fetching tournaments:", err);
                setLoading(false);
            }
        };
        fetchTournaments();
    }, []);

    const filtered = tournaments.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.league?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatus = (t: TournamentItem) => {
        const liveCount = t.games?.filter(g => g.status === 'in_progress').length || 0;
        const finishedCount = t.games?.filter(g => g.status === 'finished').length || 0;
        const totalGames = t._count?.games || 0;
        if (liveCount > 0) return 'Activo';
        if (totalGames > 0 && finishedCount === totalGames) return 'Completado';
        return 'Próximo';
    };

    const getSportIcon = (rulesType?: string) => (rulesType || '').includes('softball') ? '🥎' : '⚾';
    const getSportName = (rulesType?: string) => (rulesType || '').includes('softball') ? 'Softbol' : 'Béisbol';

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="animate-fade-in-up">
                    <h1 className="text-3xl sm:text-4xl font-black mb-2 text-foreground">Torneos</h1>
                    <p className="text-muted-foreground mb-8">Explora y sigue los torneos de béisbol y softbol</p>

                    {/* Barra de Búsqueda y Filtros */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar torneos por nombre o liga..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-muted/30 rounded-xl py-3 pl-12 pr-4 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium shadow-sm"
                            />
                        </div>
                        <button className="flex items-center justify-center sm:justify-start gap-2 border border-muted/30 px-6 py-3 rounded-xl text-sm font-bold bg-surface hover:bg-muted/10 hover:border-muted/50 transition-all shadow-sm shrink-0 w-full sm:w-auto">
                            <Filter className="w-4 h-4" /> Filtros
                        </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 font-medium">
                        Mostrando {filtered.length} torneo{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Grid de Torneos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm" />
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                            <p className="text-muted-foreground font-medium">No se encontraron torneos.</p>
                        </div>
                    ) : filtered.map((t) => {
                        const status = getStatus(t);
                        return (
                            <Link href={`/torneos/${t.id}`} key={t.id} className="block group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl animate-fade-in-up">
                                <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">

                                    {/* Image / Cover Half */}
                                    <div className="relative h-48 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>

                                        {/* Status Badge */}
                                        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm z-20
                                        ${status === 'Activo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                status === 'Próximo' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                    'bg-muted/40 text-muted-foreground border-muted/30'}`}
                                        >
                                            {status}
                                        </div>

                                        {/* Sport Badge */}
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[11px] font-bold border border-white/10 flex items-center gap-1.5 shadow-sm z-20">
                                            <span>{getSportIcon(t.rulesType)}</span> {getSportName(t.rulesType)}
                                        </div>

                                        {/* Tournament Logo Overlay */}
                                        {t.logoUrl ? (
                                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                                                <Trophy className="w-20 h-20 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Half */}
                                    <div className="p-6 flex flex-col flex-1items-center  ">
                                        <h3 className="font-black text-xl text-foreground mb-4 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                            {t.name}
                                        </h3>

                                        <div className="space-y-2.5 mb-6 flex-1">
                                            {t.league?.name && (
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                                    <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                                    <span className="truncate">{t.league.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                                <Calendar className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                                <span>{t.season}</span>
                                            </div>
                                            <div className="flex items-center gap-4 sm:gap-5 flex-wrap text-sm text-muted-foreground font-medium pt-1">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground/70" />
                                                    <span>{t._count?.teams || 0} equipos</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-4 h-4 text-muted-foreground/70" />
                                                    <span>{t._count?.games || 0} juegos</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-muted/20 pt-4 mt-auto flex items-center justify-between">
                                            <div className="text-xs text-muted-foreground font-medium">
                                                {t.category || 'General'}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
