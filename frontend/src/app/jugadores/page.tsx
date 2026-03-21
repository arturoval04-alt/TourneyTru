"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";

import api from "@/lib/api";

interface TournamentListItem {
    id: string;
    name: string;
    season: string;
    _count?: { teams: number; games: number };
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

interface TeamItem {
    id: string;
    name: string;
    players: PlayerItem[];
}

export default function JugadoresPage() {
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<TournamentListItem | null>(null);
    const [players, setPlayers] = useState<PlayerItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"roster" | "stats">("roster");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null);
    const [loadingT, setLoadingT] = useState(true);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const { data } = await api.get('/tournaments');
                setTournaments(data || []);
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
        setActiveTab("roster");
        setLoadingPlayers(true);

        try {
            const { data } = await api.get('/teams', {
                params: { tournamentId: t.id, includePlayers: true }
            });

            const allPlayers: PlayerItem[] = [];
            for (const team of (data || []) as any[]) {
                for (const p of team.players || []) {
                    allPlayers.push({
                        ...p,
                        team: { id: team.id, name: team.name }
                    });
                }
            }
            setPlayers(allPlayers);
            setLoadingPlayers(false);
        } catch (err) {
            console.error(err);
            setLoadingPlayers(false);
        }
    };

    const handleBack = () => {
        setSelectedTournament(null);
        setPlayers([]);
        setSelectedPlayer(null);
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
                        <h1 className="text-3xl sm:text-4xl font-black mb-4">Directorio de Jugadores</h1>
                        <p className="text-muted-foreground mb-8">Selecciona un torneo para explorar el talento y estadísticas.</p>

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
                                            <p className="text-sm text-muted-foreground">{t.season} • {t._count?.teams || 0} Equipos</p>
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
                            className="flex items-center gap-2 text-primary hover:text-primary-light font-medium mb-6 transition-colors cursor-pointer group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Volver a torneos
                        </button>

                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl ring-2 ring-primary/20">
                                    ⚾
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black">{selectedTournament.name}</h1>
                                    <p className="text-sm sm:text-base text-muted-foreground">{players.length} Jugadores en {new Set(players.map(p => p.team?.id)).size} Equipos</p>
                                </div>
                            </div>

                            {/* Animated Tabs */}
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

                        {/* Tab Contents */}
                        {loadingPlayers ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-48 bg-surface border border-muted/30 rounded-xl animate-pulse shadow-sm" />
                                ))}
                            </div>
                        ) : activeTab === 'roster' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 animate-fade-in-up">
                                {players.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                                        <p className="text-muted-foreground">No hay jugadores registrados.</p>
                                    </div>
                                ) : players.map((p) => (
                                    <div key={p.id} onClick={() => setSelectedPlayer(p)} className="bg-surface border border-muted/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col items-center p-4 sm:p-6 hover:-translate-y-1">
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
                                            {players.map((p, index) => (
                                                <tr key={p.id} className="hover:bg-muted/5 transition-colors group cursor-pointer" onClick={() => setSelectedPlayer(p)}>
                                                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                        <span className="text-muted-foreground text-sm font-mono w-4">{index + 1}.</span>
                                                        <div className="w-8 h-8 rounded-full bg-muted/10 overflow-hidden">
                                                            {p.photoUrl ? (
                                                                <img src={p.photoUrl} alt="Player" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`} alt="Player" width={32} height={32} />
                                                            )}
                                                        </div>
                                                        <span className="group-hover:text-primary transition-colors">{p.firstName} {p.lastName}</span>
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

                        {/* Player Preview Modal Overlay */}
                        {selectedPlayer !== null && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in-up">
                                <div className="bg-surface border border-muted/30 rounded-[2rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
                                    <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 flex items-center justify-center bg-muted/10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors z-10 cursor-pointer">
                                        ✕
                                    </button>
                                    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start text-center md:text-left mb-8 relative z-10 pt-4">
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted/10 overflow-hidden border-4 border-surface shadow-xl ring-2 ring-primary/30 shrink-0">
                                            {selectedPlayer.photoUrl ? (
                                                <img src={selectedPlayer.photoUrl} alt="Player" className="w-full h-full object-cover" />
                                            ) : (
                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPlayer.firstName}${selectedPlayer.lastName}`} alt="Player" width={128} height={128} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 mt-2 md:mt-0">
                                            <div className="text-[10px] sm:text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2 sm:mb-3">
                                                {selectedPlayer.position || 'INF'}
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1 leading-none tracking-tight break-words">{selectedPlayer.firstName} {selectedPlayer.lastName}</h2>
                                            <p className="text-sm sm:text-base text-muted-foreground font-medium mb-6">{selectedPlayer.team?.name || 'Sin equipo'}</p>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Número</p>
                                                    <p className="font-bold text-foreground text-sm">#{selectedPlayer.number || '-'}</p>
                                                </div>
                                                <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Batea</p>
                                                    <p className="font-bold text-foreground text-sm">{selectedPlayer.bats === 'L' ? 'Zurdo' : selectedPlayer.bats === 'S' ? 'Ambos' : 'Derecho'}</p>
                                                </div>
                                                <div className="bg-background/50 border border-muted/20 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Tira</p>
                                                    <p className="font-bold text-foreground text-sm">{selectedPlayer.throws === 'L' ? 'Zurdo' : 'Derecho'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
