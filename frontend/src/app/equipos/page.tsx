"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface TournamentListItem {
    id: string;
    name: string;
    season: string;
    _count?: { teams: number; games: number };
}

interface TeamItem {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    managerName?: string;
    _count?: { players: number };
}

export default function EquiposPage() {
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<TournamentListItem | null>(null);
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingT, setLoadingT] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    useEffect(() => {
        fetch(`${apiUrl}/tournaments`)
            .then(res => res.json())
            .then((data: TournamentListItem[]) => {
                setTournaments(data);
                setLoadingT(false);
            })
            .catch(() => setLoadingT(false));
    }, [apiUrl]);

    const handleSelectTournament = (t: TournamentListItem) => {
        setSelectedTournament(t);
        setLoadingTeams(true);
        fetch(`${apiUrl}/tournaments/${t.id}/teams`)
            .then(res => res.json())
            .then((data: TeamItem[]) => {
                setTeams(data);
                setLoadingTeams(false);
            })
            .catch(() => setLoadingTeams(false));
    };

    const handleBack = () => {
        setSelectedTournament(null);
        setTeams([]);
    };

    const filteredTournaments = tournaments.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {!selectedTournament ? (
                    <div className="animate-fade-in-up">
                        <h1 className="text-4xl font-black mb-4">Directorio de Equipos</h1>
                        <p className="text-lg text-muted-foreground mb-8">
                            Elige un torneo para ver los equipos participantes.
                        </p>

                        <div className="mb-8">
                            <input
                                type="text"
                                placeholder="Buscar torneo por nombre..."
                                className="w-full max-w-md px-4 py-2 bg-surface text-foreground placeholder-muted-foreground border border-muted/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loadingT ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-28 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm" />
                                ))
                            ) : filteredTournaments.length === 0 ? (
                                <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                    <p className="text-muted-foreground font-medium">No se encontraron torneos.</p>
                                </div>
                            ) : filteredTournaments.map((t) => (
                                <div
                                    key={t.id}
                                    className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-2 hover:border-primary/50 cursor-pointer transition-all duration-300 group"
                                    onClick={() => handleSelectTournament(t)}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:bg-primary/20 transition-colors">
                                            ⚾
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{t.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {t.season} • {t._count?.teams || 0} Equipos
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-primary hover:text-primary-light font-medium mb-6 transition-colors cursor-pointer group bg-surface/50 border border-muted/20 px-4 py-2 rounded-xl w-fit"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Volver a torneos
                        </button>

                        <div className="mb-10 flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary font-black text-2xl border border-primary/20 shadow-inner">
                                ⚾
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-1">{selectedTournament.name}</h1>
                                <p className="text-muted-foreground font-medium">{selectedTournament.season}</p>
                            </div>
                        </div>

                        {/* Grid de Equipos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loadingTeams ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm" />
                                ))
                            ) : teams.length === 0 ? (
                                <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                    <p className="text-muted-foreground font-medium">No hay equipos registrados en este torneo.</p>
                                </div>
                            ) : teams.map((team) => (
                                <Link href={`/equipos/${team.id}`} key={team.id} className="block group focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl outline-none">
                                    <div className="bg-surface border border-muted/30 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-between cursor-pointer">

                                        <div className="flex items-center gap-5 mb-8">
                                            {/* Team Avatar */}
                                            <div className="w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center font-bold text-2xl text-white shadow-md group-hover:scale-105 transition-transform">
                                                {team.shortName || team.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[1.1rem] leading-tight text-foreground group-hover:text-primary transition-colors tracking-tight">
                                                    {team.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground mt-1 font-medium">{team._count?.players || 0} jugadores</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-muted/20 pt-4 flex items-center justify-between text-sm font-medium">
                                            <span className="text-muted-foreground">{team.managerName || 'Sin manager'}</span>
                                            <span></span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
