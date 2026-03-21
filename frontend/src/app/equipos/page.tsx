"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

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
    players?: PlayerItem[];
}

interface PlayerItem {
    id: string;
    firstName: string;
    lastName: string;
    number?: number;
    position?: string;
    bats?: string;
    throws?: string;
    photoUrl?: string;
    team?: { id: string; name: string };
}

export default function EquiposPage() {
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<TournamentListItem | null>(null);
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingT, setLoadingT] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const { data, error } = await supabase
                    .from('tournaments')
                    .select('*, teams(id), games(id)')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mapped = (data || []).map((t: any) => ({
                    ...t,
                    _count: {
                        teams: t.teams?.length || 0,
                        games: t.games?.length || 0
                    }
                }));

                setTournaments(mapped);
                setLoadingT(false);
            } catch (err) {
                console.error(err);
                setLoadingT(false);
            }
        };
        fetchTournaments();
    }, []);

    const handleSelectTournament = async (t: TournamentListItem) => {
        setSelectedTournament(t);
        setLoadingTeams(true);
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*, players(id)')
                .eq('tournament_id', t.id)
                .order('name', { ascending: true });

            if (error) throw error;

            const mapped = (data || []).map((team: any) => ({
                ...team,
                shortName: team.short_name,
                logoUrl: team.logo_url,
                managerName: team.manager_name,
                _count: { players: team.players?.length || 0 }
            }));

            setTeams(mapped);
            setLoadingTeams(false);
        } catch (err) {
            console.error(err);
            setLoadingTeams(false);
        }
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
                        <h1 className="text-3xl sm:text-4xl font-black mb-4">Directorio de Equipos</h1>
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

                        <div className="mb-10 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary font-black text-2xl border border-primary/20 shadow-inner">
                                ⚾
                            </div>
                            <div className="w-full overflow-hidden">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground mb-1 truncate">{selectedTournament.name}</h1>
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

                                        <div className="flex items-center gap-4 sm:gap-5 mb-8">
                                            {/* Team Avatar */}
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-[16px] sm:rounded-[20px] bg-primary flex items-center justify-center font-bold text-xl sm:text-2xl text-white shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                                                {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" /> : (team.shortName || team.name.substring(0, 2).toUpperCase())}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <h3 className="font-bold text-[1.1rem] leading-tight text-foreground group-hover:text-primary transition-colors tracking-tight truncate">
                                                    {team.name}
                                                </h3>
                                                <span className="text-sm text-muted-foreground mt-1 font-medium">{(team._count?.players ?? team.players?.length ?? 0)} jugadores</span>
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
