"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Trophy, Users, Globe, Facebook, Lock, ChevronRight, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";

interface Tournament {
    id: string;
    name: string;
    season: string;
    status: string;
    category?: string;
    rulesType: string;
    logoUrl?: string;
    startDate?: string;
    _count: { teams: number; games: number };
}

interface Umpire {
    id: string;
    firstName: string;
    lastName: string;
}

interface LeagueData {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    description?: string;
    city?: string;
    state?: string;
    country?: string;
    sport?: string;
    foundedYear?: number;
    websiteUrl?: string;
    facebookUrl?: string;
    isVerified: boolean;
    isPrivate: boolean;
    admin: { id: string; firstName: string; lastName: string; email: string };
    tournaments: Tournament[];
    umpires: Umpire[];
    _count: { tournaments: number; umpires: number };
}

type Tab = "torneos" | "arbitros" | "info";

const SPORT_LABEL: Record<string, string> = {
    baseball: "Béisbol",
    softball: "Sóftbol",
    both: "Béisbol & Sóftbol",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Próximo", color: "text-yellow-400 bg-yellow-400/10" },
    active: { label: "En curso", color: "text-green-400 bg-green-400/10" },
    finished: { label: "Finalizado", color: "text-muted-foreground bg-muted/10" },
};

export default function LeaguePage() {
    const { id } = useParams() as { id: string };
    const [league, setLeague] = useState<LeagueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("torneos");
    const [accessDenied, setAccessDenied] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    // Umpire management
    const [showAddUmpire, setShowAddUmpire] = useState(false);
    const [umpireFirstName, setUmpireFirstName] = useState('');
    const [umpireLastName, setUmpireLastName] = useState('');
    const [savingUmpire, setSavingUmpire] = useState(false);

    const handleAddUmpire = async () => {
        if (!umpireFirstName.trim() || !umpireLastName.trim()) return;
        setSavingUmpire(true);
        try {
            const { data } = await api.post('/umpires', {
                firstName: umpireFirstName.trim(),
                lastName: umpireLastName.trim(),
                leagueId: id,
            });
            setLeague((prev) => prev ? { ...prev, umpires: [...prev.umpires, data], _count: { ...prev._count, umpires: prev._count.umpires + 1 } } : prev);
            setUmpireFirstName('');
            setUmpireLastName('');
            setShowAddUmpire(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingUmpire(false);
        }
    };

    const handleDeleteUmpire = async (umpireId: string) => {
        try {
            await api.delete(`/umpires/${umpireId}`);
            setLeague((prev) => prev ? { ...prev, umpires: prev.umpires.filter((u) => u.id !== umpireId), _count: { ...prev._count, umpires: prev._count.umpires - 1 } } : prev);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        api.get(`/leagues/${id}`)
            .then(({ data }) => {
                setLeague(data);
                const user = getUser();
                if (user) {
                    if (user.role === 'admin' || user.id === data.admin?.id) setCanEdit(true);
                }
            })
            .catch((err: any) => {
                if (err?.response?.status === 403) setAccessDenied(true);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handleTogglePrivacy = async () => {
        if (!league) return;
        try {
            await api.patch(`/leagues/${id}`, { isPrivate: !league.isPrivate });
            setLeague({ ...league, isPrivate: !league.isPrivate });
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-10 w-32 bg-surface rounded-lg" />
                        <div className="h-48 bg-surface rounded-2xl" />
                        <div className="h-64 bg-surface rounded-2xl" />
                    </div>
                </main>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                        <Lock size={28} className="text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Liga Privada</h2>
                    <p className="text-muted-foreground text-sm mb-6">Esta liga es privada. Solo el administrador puede acceder.</p>
                    <Link href="/ligas" className="text-primary hover:underline text-sm font-bold">Volver a ligas</Link>
                </main>
            </div>
        );
    }

    if (!league) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <p className="text-4xl mb-4">🏟️</p>
                    <h2 className="text-2xl font-bold mb-2">Liga no encontrada</h2>
                    <Link href="/ligas" className="text-primary hover:underline">Volver a ligas</Link>
                </main>
            </div>
        );
    }

    const activeTournaments = league.tournaments.filter((t) => t.status === "active");
    const tabs: { key: Tab; label: string }[] = [
        { key: "torneos", label: `Torneos (${league._count.tournaments})` },
        { key: "arbitros", label: `Árbitros (${league._count.umpires})` },
        { key: "info", label: "Información" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
                {/* Back */}
                <Link
                    href="/ligas"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Volver a ligas
                </Link>

                {/* Hero Banner Card */}
                <div className="bg-surface border border-muted/30 rounded-3xl overflow-hidden shadow-sm">
                    <div className="flex flex-col md:flex-row font-sans">
                        {/* Image Area - Covers most of the grid as requested */}
                        <div className="relative h-64 md:h-96 md:flex-1 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden flex items-center justify-center p-1 border-b md:border-b-0 md:border-r border-muted/20">
                            {league.logoUrl ? (
                                <img
                                    src={league.logoUrl}
                                    alt={league.name}
                                    className="w-full h-full object-contain hover:scale-110 transition-transform duration-700 drop-shadow-2xl"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                    <Trophy className="w-32 h-32 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Stats Corridor (Right on MD, Bottom on Mobile) */}
                        <div className="p-6 md:p-10 md:w-56 shrink-0 flex flex-row md:flex-col justify-around md:justify-center items-center gap-6 md:gap-12 bg-muted/5">
                            <div className="text-center group">
                                <p className="text-3xl md:text-5xl font-black text-primary transition-transform group-hover:scale-110">{league._count.tournaments}</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-black mt-1">Torneos</p>
                            </div>
                            <div className="text-center group">
                                <p className="text-3xl md:text-5xl font-black text-primary transition-transform group-hover:scale-110">{league.tournaments.filter(t => t.status === 'finished' || t.status === 'completed').length}</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-black mt-1">Completados</p>
                            </div>
                            <div className="text-center group">
                                <p className="text-3xl md:text-5xl font-black text-primary transition-transform group-hover:scale-110">{league._count.umpires}</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-black mt-1">Árbitros</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Name & Identity Section - Now BELOW the banner */}
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none">{league.name}</h1>
                                {league.isVerified && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary text-white text-[10px] font-black uppercase rounded-full shadow-lg shadow-primary/20">
                                        ✓ Verificado
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm md:text-base text-muted-foreground font-medium">
                                {league.sport && (
                                    <span className="flex items-center gap-2">
                                        <Trophy size={18} className="text-primary/70" />
                                        {SPORT_LABEL[league.sport] ?? league.sport}
                                    </span>
                                )}
                                {(league.city || league.state) && (
                                    <span className="flex items-center gap-2">
                                        <MapPin size={18} className="text-primary/70" />
                                        {[league.city, league.state].filter(Boolean).join(", ")}
                                    </span>
                                )}
                                {league.isPrivate && (
                                    <span className="flex items-center gap-2 text-amber-500">
                                        <Lock size={16} />
                                        Privada
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons (Desktop aligned right) */}
                        <div className="flex flex-wrap gap-3">
                            {canEdit && (
                                <button
                                    onClick={handleTogglePrivacy}
                                    className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl border-2 transition-all active:scale-95 ${league.isPrivate ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'border-muted/30 bg-muted/10 text-muted-foreground hover:bg-muted/20'}`}
                                >
                                    <Lock size={16} />
                                    {league.isPrivate ? 'Hacer pública' : 'Hacer privada'}
                                </button>
                            )}

                            {/* Social Links */}
                            <div className="flex gap-2">
                                {league.websiteUrl && (
                                    <a href={league.websiteUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-surface border border-muted/30 rounded-xl hover:text-primary hover:border-primary/50 transition-all shadow-sm">
                                        <Globe size={20} />
                                    </a>
                                )}
                                {league.facebookUrl && (
                                    <a href={league.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-surface border border-muted/30 rounded-xl hover:text-primary hover:border-primary/50 transition-all shadow-sm">
                                        <Facebook size={20} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Juegos en vivo / Activos */}
                {league.tournaments.filter(t => t.status === 'active').length > 0 && (
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                            <p className="text-sm font-black uppercase tracking-wider text-red-500">Torneos en curso</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {league.tournaments.filter(t => t.status === 'active').map((t) => (
                                <Link key={t.id} href={`/torneos/${t.id}`}>
                                    <span className="px-4 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                        {t.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-surface border border-muted/30 rounded-2xl p-1.5 w-full sm:w-fit shadow-sm overflow-x-auto">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 sm:flex-none whitespace-nowrap px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${tab === t.key
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Torneos */}
                {tab === "torneos" && (
                    <div className="space-y-4 animate-fade-in-up">
                        {league.tournaments.length === 0 ? (
                            <div className="py-20 text-center bg-surface border border-muted/30 rounded-3xl">
                                <p className="text-5xl mb-4">🏆</p>
                                <p className="text-muted-foreground font-bold text-lg">Esta liga no tiene torneos registrados aún.</p>
                            </div>
                        ) : (
                            league.tournaments.map((t) => {
                                // Status Logic Fix: Date-aware status
                                const getStatus = (tourney: any) => {
                                    if (tourney.status === 'finished' || tourney.status === 'completed') return STATUS_LABEL.finished;
                                    const now = new Date();
                                    const start = tourney.startDate ? new Date(tourney.startDate) : null;
                                    if (tourney.status === 'active' || (start && start <= now)) return STATUS_LABEL.active;
                                    return STATUS_LABEL.upcoming;
                                };
                                const st = getStatus(t);
                                return (
                                    <Link key={t.id} href={`/torneos/${t.id}`} className="block group">
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl flex items-center gap-5 cursor-pointer">
                                            {/* Logo del torneo */}
                                            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl overflow-hidden bg-muted/10 border border-muted/20 flex items-center justify-center p-2">
                                                {t.logoUrl ? (
                                                    <img src={t.logoUrl} alt={t.name} className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <Trophy className="w-8 h-8 text-muted-foreground opacity-30" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                                    <h3 className="text-lg md:text-xl font-black group-hover:text-primary transition-colors truncate tracking-tight">{t.name}</h3>
                                                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${st.color}`}>{st.label}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                                    <span>{t.season}</span>
                                                    <span className="w-1 h-1 bg-muted rounded-full" />
                                                    <div className="flex items-center gap-1.5">
                                                        <Users size={14} className="text-primary/60" />
                                                        {t._count.teams} equipos
                                                    </div>
                                                </div>
                                            </div>

                                            <ChevronRight className="text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1 shrink-0" />
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Tab: Árbitros */}
                {tab === "arbitros" && (
                    <div className="animate-fade-in-up space-y-4">
                        {/* Header row with add button */}
                        {canEdit && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowAddUmpire(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    <Plus size={15} /> Agregar árbitro
                                </button>
                            </div>
                        )}

                        {/* Add umpire modal */}
                        {showAddUmpire && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddUmpire(false)} />
                                <div className="relative z-10 bg-surface border border-muted/30 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-base">Nuevo árbitro</h3>
                                        <button onClick={() => setShowAddUmpire(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Nombre"
                                            value={umpireFirstName}
                                            onChange={(e) => setUmpireFirstName(e.target.value)}
                                            className="w-full bg-background border border-muted/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Apellido"
                                            value={umpireLastName}
                                            onChange={(e) => setUmpireLastName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddUmpire(); }}
                                            className="w-full bg-background border border-muted/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                                        />
                                        <button
                                            onClick={handleAddUmpire}
                                            disabled={savingUmpire || !umpireFirstName.trim() || !umpireLastName.trim()}
                                            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            {savingUmpire ? 'Guardando…' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {league.umpires.length === 0 ? (
                            <div className="py-16 text-center bg-surface border border-muted/30 rounded-2xl">
                                <p className="text-4xl mb-3">👨‍⚖️</p>
                                <p className="text-muted-foreground">No hay árbitros registrados en esta liga.</p>
                                {canEdit && <p className="text-xs text-muted-foreground mt-1">Usa el botón de arriba para agregar.</p>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {league.umpires.map((u) => (
                                    <div key={u.id} className="bg-surface border border-muted/30 rounded-xl p-4 flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-muted-foreground">Árbitro</p>
                                        </div>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleDeleteUmpire(u.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Información */}
                {tab === "info" && (
                    <div className="animate-fade-in-up space-y-4">
                        {/* Descripción */}
                        {league.description && (
                            <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                                <h3 className="font-bold mb-3 text-muted-foreground text-xs uppercase tracking-wider">Descripción</h3>
                                <p className="text-foreground leading-relaxed">{league.description}</p>
                            </div>
                        )}

                        {/* Detalles */}
                        <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                            <h3 className="font-bold mb-4 text-muted-foreground text-xs uppercase tracking-wider">Detalles</h3>
                            <dl className="space-y-3">
                                {league.sport && (
                                    <div className="flex justify-between items-center py-2 border-b border-muted/10">
                                        <dt className="text-sm text-muted-foreground">Deporte</dt>
                                        <dd className="text-sm font-semibold">{SPORT_LABEL[league.sport] ?? league.sport}</dd>
                                    </div>
                                )}
                                {(league.city || league.state) && (
                                    <div className="flex justify-between items-center py-2 border-b border-muted/10">
                                        <dt className="text-sm text-muted-foreground">Ubicación</dt>
                                        <dd className="text-sm font-semibold">{[league.city, league.state, league.country].filter(Boolean).join(", ")}</dd>
                                    </div>
                                )}
                                {league.foundedYear && (
                                    <div className="flex justify-between items-center py-2 border-b border-muted/10">
                                        <dt className="text-sm text-muted-foreground">Año de fundación</dt>
                                        <dd className="text-sm font-semibold">{league.foundedYear}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 border-b border-muted/10">
                                    <dt className="text-sm text-muted-foreground">Administrador</dt>
                                    <dd className="text-sm font-semibold">{league.admin.firstName} {league.admin.lastName}</dd>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <dt className="text-sm text-muted-foreground">Estado</dt>
                                    <dd>
                                        {league.isVerified ? (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">Verificada</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-muted/10 text-muted-foreground text-xs rounded-full">Sin verificar</span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Links */}
                        {(league.websiteUrl || league.facebookUrl) && (
                            <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                                <h3 className="font-bold mb-4 text-muted-foreground text-xs uppercase tracking-wider">Enlaces</h3>
                                <div className="space-y-3">
                                    {league.websiteUrl && (
                                        <a
                                            href={league.websiteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-muted/5 rounded-xl hover:bg-muted/10 transition-colors group"
                                        >
                                            <Globe size={18} className="text-primary" />
                                            <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                                                {league.websiteUrl}
                                            </span>
                                        </a>
                                    )}
                                    {league.facebookUrl && (
                                        <a
                                            href={league.facebookUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-muted/5 rounded-xl hover:bg-muted/10 transition-colors group"
                                        >
                                            <Facebook size={18} className="text-primary" />
                                            <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                                                Facebook
                                            </span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
