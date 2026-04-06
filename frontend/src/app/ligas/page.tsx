"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { MapPin, Trophy, ChevronRight, Search } from "lucide-react";

interface LeagueItem {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    description?: string;
    city?: string;
    state?: string;
    sport?: string;
    foundedYear?: number;
    isVerified: boolean;
    _count: { tournaments: number; umpires: number };
    admin: { firstName: string; lastName: string };
}

const SPORT_LABEL: Record<string, string> = {
    baseball: "Béisbol",
    softball: "Sóftbol",
    both: "Béisbol & Sóftbol",
};

const getSportIcon = (sport?: string) => (sport || '').includes('softball') ? '🥎' : '⚾';

export default function LigasPage() {
    const [leagues, setLeagues] = useState<LeagueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        api.get("/leagues")
            .then(({ data }) => setLeagues(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = leagues.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.city?.toLowerCase().includes(search.toLowerCase()) ||
        l.state?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="animate-fade-in-up">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl sm:text-4xl font-black mb-2">Ligas</h1>
                        <p className="text-muted-foreground">
                            Organizaciones deportivas registradas en TourneyTru
                        </p>
                    </div>

                    {/* Búsqueda */}
                    <div className="mb-8 relative max-w-md group text-white">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar liga por nombre o ciudad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-surface text-foreground placeholder-muted-foreground border border-muted/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
                        />
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 font-medium">
                        Mostrando {filtered.length} liga{filtered.length !== 1 ? 's' : ''}
                    </p>

                    {/* Grid de ligas */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-80 bg-surface border border-muted/30 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center bg-surface border border-muted/30 rounded-2xl">
                            <p className="text-4xl mb-4">🏟️</p>
                            <p className="text-muted-foreground font-medium">
                                {search ? "No se encontraron ligas con ese nombre." : "No hay ligas registradas aún."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map((league) => (
                                <Link key={league.id} href={`/ligas/${league.id}`} className="block group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl animate-fade-in-up">
                                    <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">

                                        {/* Banner / Cover */}
                                        <div className="relative h-40 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>

                                            {/* Sport Badge Overlay */}
                                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white rounded-full text-[11px] font-bold border border-white/10 flex items-center gap-1.5 shadow-sm z-20">
                                                <span>{getSportIcon(league.sport)}</span> {SPORT_LABEL[league.sport || ''] || league.sport || 'Deporte'}
                                            </div>

                                            {/* Verification Badge */}
                                            {league.isVerified && (
                                                <div className="absolute top-4 left-4 bg-primary px-2.5 py-1 rounded-full text-[10px] font-black text-white uppercase shadow-sm z-20">
                                                    Verificada
                                                </div>
                                            )}

                                            {/* Logo Overlay */}
                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                {league.logoUrl ? (
                                                    <img
                                                        src={league.logoUrl}
                                                        alt={league.name}
                                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="opacity-20 group-hover:scale-125 transition-transform duration-700">
                                                        <Trophy className="w-20 h-20 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-2 flex flex-col flex-1">
                                            <h3 className="font-black text-xl text-foreground text-center mb-4 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {league.name !== league.shortName ? league.name : "Liga Oficial"}
                                            </h3>

                                            <div className="space-y-3 mb-6 flex-1 ">
                                                {/* Lugar */}
                                                {(league.city || league.state) && (
                                                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground font-medium">
                                                        <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                                        <span className="truncate">
                                                            {[league.city, league.state].filter(Boolean).join(", ")}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Sport (additional info or label) */}
                                                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground font-medium">
                                                    <Trophy className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                                    <span>{league._count.tournaments} torneo{league._count.tournaments !== 1 ? "s" : ""}</span>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="border-t border-muted/20 pt-4 mt-auto flex items-center justify-between">

                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
