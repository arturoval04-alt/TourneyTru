"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Trophy, Users, Globe, Facebook, Lock } from "lucide-react";
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

                {/* Header card */}
                <div className="bg-surface border border-muted/30 rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {/* Logo */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-muted/10 border border-muted/20 flex items-center justify-center">
                            {league.logoUrl ? (
                                <Image
                                    src={league.logoUrl}
                                    alt={league.name}
                                    width={96}
                                    height={96}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <span className="text-4xl">🏆</span>
                            )}
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-2xl sm:text-3xl font-black">{league.name}</h1>
                                {league.isVerified && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full" title="Liga verificada por TourneyTru">
                                        ✓ Verificada
                                    </span>
                                )}
                                {league.isPrivate && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">
                                        <Lock size={10} /> Privada
                                    </span>
                                )}
                                {canEdit && (
                                    <button
                                        onClick={handleTogglePrivacy}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-colors cursor-pointer ${league.isPrivate ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 'bg-muted/10 text-muted-foreground border-muted/30 hover:bg-muted/20'}`}
                                        title={league.isPrivate ? 'Hacer pública esta liga' : 'Hacer privada esta liga'}
                                    >
                                        <Lock size={10} />
                                        {league.isPrivate ? 'Hacer pública' : 'Hacer privada'}
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                                {league.sport && (
                                    <span className="flex items-center gap-1">
                                        <Trophy size={14} />
                                        {SPORT_LABEL[league.sport] ?? league.sport}
                                    </span>
                                )}
                                {(league.city || league.state) && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        {[league.city, league.state].filter(Boolean).join(", ")}
                                    </span>
                                )}
                                {league.foundedYear && (
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        Fundada {league.foundedYear}
                                    </span>
                                )}
                            </div>

                            {/* Links externos */}
                            <div className="flex gap-3 mt-4">
                                {league.websiteUrl && (
                                    <a
                                        href={league.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                        aria-label="Sitio web de la liga"
                                    >
                                        <Globe size={14} />
                                        Sitio web
                                    </a>
                                )}
                                {league.facebookUrl && (
                                    <a
                                        href={league.facebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                        aria-label="Facebook de la liga"
                                    >
                                        <Facebook size={14} />
                                        Facebook
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Stats rápidas */}
                        <div className="flex sm:flex-col gap-4 sm:gap-2 shrink-0">
                            <div className="text-center">
                                <p className="text-2xl font-black text-primary">{league._count.tournaments}</p>
                                <p className="text-xs text-muted-foreground">Torneos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-primary">{activeTournaments.length}</p>
                                <p className="text-xs text-muted-foreground">Activos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-primary">{league._count.umpires}</p>
                                <p className="text-xs text-muted-foreground">Árbitros</p>
                            </div>
                        </div>
                    </div>

                    {/* Juegos en vivo */}
                    {activeTournaments.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-muted/20">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <p className="text-sm font-bold text-red-400">Torneos en curso</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {activeTournaments.map((t) => (
                                    <Link key={t.id} href={`/torneos/${t.id}`}>
                                        <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold rounded-full hover:bg-red-500/20 transition-colors">
                                            {t.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-surface border border-muted/30 rounded-xl p-1 w-full sm:w-fit">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                tab === t.key
                                    ? "bg-primary text-white shadow-md"
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
                            <div className="py-16 text-center bg-surface border border-muted/30 rounded-2xl">
                                <p className="text-4xl mb-3">🏆</p>
                                <p className="text-muted-foreground">Esta liga no tiene torneos registrados aún.</p>
                            </div>
                        ) : (
                            league.tournaments.map((t) => {
                                const st = STATUS_LABEL[t.status] ?? { label: t.status, color: "text-muted-foreground bg-muted/10" };
                                return (
                                    <Link key={t.id} href={`/torneos/${t.id}`}>
                                        <div className="bg-surface border border-muted/30 rounded-2xl p-5 hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200 group flex items-center gap-4 cursor-pointer">
                                            {/* Logo del torneo */}
                                            <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-muted/10 border border-muted/20 flex items-center justify-center">
                                                {t.logoUrl ? (
                                                    <Image src={t.logoUrl} alt={t.name} width={48} height={48} className="object-cover w-full h-full" />
                                                ) : (
                                                    <span className="text-xl">⚾</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-bold group-hover:text-primary transition-colors truncate">{t.name}</h3>
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${st.color}`}>{st.label}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {t.season} ·{" "}
                                                    <span className="inline-flex items-center gap-1">
                                                        <Users size={12} />
                                                        {t._count.teams} equipos
                                                    </span>
                                                </p>
                                            </div>

                                            <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Tab: Árbitros */}
                {tab === "arbitros" && (
                    <div className="animate-fade-in-up">
                        {league.umpires.length === 0 ? (
                            <div className="py-16 text-center bg-surface border border-muted/30 rounded-2xl">
                                <p className="text-4xl mb-3">👨‍⚖️</p>
                                <p className="text-muted-foreground">No hay árbitros registrados en esta liga.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {league.umpires.map((u) => (
                                    <div key={u.id} className="bg-surface border border-muted/30 rounded-xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-muted-foreground">Árbitro</p>
                                        </div>
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
