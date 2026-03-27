"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";

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
                    <div className="mb-8">
                        <input
                            type="text"
                            placeholder="Buscar liga por nombre o ciudad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full max-w-md px-4 py-2 bg-surface text-foreground placeholder-muted-foreground border border-muted/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                        />
                    </div>

                    {/* Grid de ligas */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-40 bg-surface border border-muted/30 rounded-2xl animate-pulse" />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((league) => (
                                <Link key={league.id} href={`/ligas/${league.id}`}>
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-2 hover:border-primary/50 cursor-pointer transition-all duration-300 group h-full flex flex-col">
                                        {/* Logo + nombre */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-muted/10 border border-muted/20 flex items-center justify-center">
                                                {league.logoUrl ? (
                                                    <Image
                                                        src={league.logoUrl}
                                                        alt={league.name}
                                                        width={56}
                                                        height={56}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    <span className="text-2xl">🏆</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-lg group-hover:text-primary transition-colors leading-tight truncate">
                                                        {league.shortName || league.name}
                                                    </h3>
                                                    {league.isVerified && (
                                                        <span
                                                            title="Liga verificada"
                                                            className="text-primary shrink-0"
                                                            aria-label="Liga verificada"
                                                        >
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                                {league.shortName && (
                                                    <p className="text-xs text-muted-foreground truncate">{league.name}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {league.sport && (
                                                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                                    {SPORT_LABEL[league.sport] ?? league.sport}
                                                </span>
                                            )}
                                            {(league.city || league.state) && (
                                                <span className="px-2.5 py-1 bg-muted/10 text-muted-foreground text-xs rounded-full">
                                                    📍 {[league.city, league.state].filter(Boolean).join(", ")}
                                                </span>
                                            )}
                                            <span className="px-2.5 py-1 bg-muted/10 text-muted-foreground text-xs rounded-full">
                                                {league._count.tournaments} torneo{league._count.tournaments !== 1 ? "s" : ""}
                                            </span>
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
