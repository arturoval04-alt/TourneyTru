"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { ArrowLeft, Trophy, Users, Calendar, Star } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tournament { id: string; name: string; season: string }

interface PlayerStat {
    id: string;
    tournamentId: string | null;
    tournament: Tournament | null;
    atBats: number; runs: number; hits: number;
    h2: number; h3: number; hr: number; rbi: number;
    bb: number; so: number; hbp: number; sac: number;
    wins: number; losses: number; ipOuts: number;
    hAllowed: number; erAllowed: number; bbAllowed: number; soPitching: number;
}

interface GameEntry {
    game: {
        id: string;
        scheduledDate: string;
        status: string;
        homeScore: number;
        awayScore: number;
        homeTeamId: string;
        awayTeamId: string;
        homeTeam: { id: string; name: string; shortName?: string };
        awayTeam: { id: string; name: string; shortName?: string };
        tournament: { id: string; name: string } | null;
    };
    position: string;
    isStarter: boolean;
}

interface PlayerData {
    id: string;
    firstName: string;
    lastName: string;
    number: number | null;
    position: string | null;
    bats: string | null;
    throws: string | null;
    photoUrl: string | null;
    team: {
        id: string; name: string; shortName?: string; logoUrl?: string;
        tournament: Tournament | null;
    };
    playerStats: PlayerStat[];
    lineupEntries: GameEntry[];
}

// ─── Stat helpers ──────────────────────────────────────────────────────────────

function avg(hits: number, ab: number) {
    if (!ab) return ".000";
    return ("." + Math.round((hits / ab) * 1000).toString().padStart(3, "0")).replace(/\.\d{4,}/, m => m.slice(0, 4));
}
function obp(hits: number, bb: number, hbp: number, ab: number) {
    const pa = ab + bb + hbp;
    if (!pa) return ".000";
    return avg(hits + bb + hbp, pa);
}
function slg(hits: number, h2: number, h3: number, hr: number, ab: number) {
    if (!ab) return ".000";
    const tb = (hits - h2 - h3 - hr) + h2 * 2 + h3 * 3 + hr * 4;
    return avg(tb, ab);
}
function opsCalc(h: number, h2: number, h3: number, hr: number, bb: number, hbp: number, ab: number) {
    const o = parseFloat(obp(h, bb, hbp, ab));
    const s = parseFloat(slg(h, h2, h3, hr, ab));
    return (o + s).toFixed(3).replace(/^0/, "");
}
function era(erAllowed: number, ipOuts: number) {
    if (!ipOuts) return "-.--";
    return ((erAllowed * 27) / ipOuts).toFixed(2);
}
function whip(bbAllowed: number, hAllowed: number, ipOuts: number) {
    if (!ipOuts) return "-.--";
    return (((bbAllowed + hAllowed) * 3) / ipOuts).toFixed(2);
}
function ipDisplay(ipOuts: number) {
    return `${Math.floor(ipOuts / 3)}.${ipOuts % 3}`;
}

function aggregateStats(stats: PlayerStat[]) {
    return stats.reduce((acc, s) => ({
        atBats: acc.atBats + s.atBats,
        runs: acc.runs + s.runs,
        hits: acc.hits + s.hits,
        h2: acc.h2 + s.h2,
        h3: acc.h3 + s.h3,
        hr: acc.hr + s.hr,
        rbi: acc.rbi + s.rbi,
        bb: acc.bb + s.bb,
        so: acc.so + s.so,
        hbp: acc.hbp + s.hbp,
        sac: acc.sac + s.sac,
        wins: acc.wins + s.wins,
        losses: acc.losses + s.losses,
        ipOuts: acc.ipOuts + s.ipOuts,
        hAllowed: acc.hAllowed + s.hAllowed,
        erAllowed: acc.erAllowed + s.erAllowed,
        bbAllowed: acc.bbAllowed + s.bbAllowed,
        soPitching: acc.soPitching + s.soPitching,
    }), {
        atBats: 0, runs: 0, hits: 0, h2: 0, h3: 0, hr: 0, rbi: 0,
        bb: 0, so: 0, hbp: 0, sac: 0,
        wins: 0, losses: 0, ipOuts: 0, hAllowed: 0, erAllowed: 0, bbAllowed: 0, soPitching: 0,
    });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center bg-white/10 rounded-xl px-4 py-3 min-w-[72px]">
            <span className={`text-2xl font-black font-mono leading-none ${accent ? "text-primary" : "text-white"}`}>
                {value}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-1">{label}</span>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            {children}
        </h3>
    );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: string }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-muted/10 last:border-0">
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
            <span className={`font-mono font-bold text-sm ${highlight || "text-foreground"}`}>{value}</span>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "bateo" | "pitcheo" | "juegos" | "torneos";

export default function PlayerProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("bateo");

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get(`/players/${id}`);
                setPlayer(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-10">
                    <div className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse mb-6" />
                    <div className="h-40 bg-surface border border-muted/30 rounded-2xl animate-pulse" />
                </main>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <p className="text-muted-foreground text-lg font-medium">Jugador no encontrado.</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-primary hover:underline font-bold text-sm"
                    >
                        ← Volver
                    </button>
                </main>
            </div>
        );
    }

    const totals = aggregateStats(player.playerStats);
    const hasPitching = totals.ipOuts > 0 || totals.wins > 0 || totals.losses > 0;
    const playerAvg = avg(totals.hits, totals.atBats);
    const playerERA = era(totals.erAllowed, totals.ipOuts);

    // Unique games, sorted by date desc
    const games = player.lineupEntries
        .filter((e, i, arr) => arr.findIndex(x => x.game.id === e.game.id) === i)
        .sort((a, b) => new Date(b.game.scheduledDate).getTime() - new Date(a.game.scheduledDate).getTime());

    const tabs: { id: Tab; label: string }[] = [
        { id: "bateo", label: "Bateo" },
        ...(hasPitching ? [{ id: "pitcheo" as Tab, label: "Pitcheo" }] : []),
        { id: "juegos", label: "Por Juego" },
        { id: "torneos", label: "Torneos" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans pb-24">
            <Navbar />

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div className="bg-[#1a2d42] relative overflow-hidden">
                {/* Back */}
                <div className="max-w-4xl mx-auto px-4 pt-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                </div>

                <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end">
                    {/* Photo */}
                    <div className="relative shrink-0">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-[#212833] border-2 border-white/10 shadow-2xl">
                            {player.photoUrl ? (
                                <img
                                    src={player.photoUrl}
                                    alt={`${player.firstName} ${player.lastName}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Image
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.firstName}${player.lastName}`}
                                    alt={`${player.firstName} ${player.lastName}`}
                                    width={160}
                                    height={160}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        {player.number != null && (
                            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-primary flex items-center justify-center font-black text-white text-sm shadow-lg border-2 border-[#1a2d42]">
                                {player.number}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">
                        {player.position && (
                            <span className="inline-block px-2.5 py-0.5 bg-primary/30 text-primary text-[10px] font-black uppercase tracking-widest rounded mb-2">
                                {player.position}
                            </span>
                        )}
                        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none mb-2">
                            {player.firstName} {player.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-white/60 text-sm font-medium mb-5">
                            <Link
                                href={`/equipos/${player.team.id}`}
                                className="flex items-center gap-1.5 hover:text-white transition-colors"
                            >
                                <Users className="w-3.5 h-3.5" />
                                {player.team.name}
                            </Link>
                            {player.team.tournament && (
                                <Link
                                    href={`/torneos/${player.team.tournament.id}`}
                                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                                >
                                    <Trophy className="w-3.5 h-3.5" />
                                    {player.team.tournament.name}
                                </Link>
                            )}
                        </div>

                        {/* Primary stats bar */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <StatBox label="AVG" value={playerAvg} accent />
                            <StatBox label="HR" value={totals.hr} />
                            <StatBox label="RBI" value={totals.rbi} />
                            <StatBox label="K" value={totals.so} />
                            {hasPitching && <StatBox label="ERA" value={playerERA} accent />}
                            {hasPitching && <StatBox label="W-L" value={`${totals.wins}-${totals.losses}`} />}
                        </div>
                    </div>
                </div>

                {/* Side info strip */}
                <div className="bg-[#162237] border-t border-white/5 py-2">
                    <div className="max-w-4xl mx-auto px-4 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
                        <span>Batea: <span className="text-white/70">{player.bats === 'L' ? 'Zurdo' : player.bats === 'S' ? 'Ambos' : 'Derecho'}</span></span>
                        <span>Tira: <span className="text-white/70">{player.throws === 'L' ? 'Zurdo' : 'Derecho'}</span></span>
                        <span>Juegos: <span className="text-white/70">{games.length}</span></span>
                        <span>Torneos: <span className="text-white/70">{player.playerStats.length}</span></span>
                    </div>
                </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────────── */}
            <div className="bg-surface border-b border-muted/20 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 flex gap-0 overflow-x-auto no-scrollbar">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-5 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                                activeTab === t.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab Content ───────────────────────────────────────────────── */}
            <main className="max-w-4xl mx-auto px-4 py-8">

                {/* BATEO */}
                {activeTab === "bateo" && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Totals card */}
                        <div className="bg-surface border border-muted/20 rounded-2xl p-6 shadow-sm">
                            <SectionTitle>Estadísticas Totales de Bateo</SectionTitle>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: "AVG", value: avg(totals.hits, totals.atBats), color: "text-primary" },
                                    { label: "OBP", value: obp(totals.hits, totals.bb, totals.hbp, totals.atBats), color: "text-primary" },
                                    { label: "SLG", value: slg(totals.hits, totals.h2, totals.h3, totals.hr, totals.atBats), color: "text-primary" },
                                    { label: "OPS", value: opsCalc(totals.hits, totals.h2, totals.h3, totals.hr, totals.bb, totals.hbp, totals.atBats), color: "text-primary" },
                                ].map(s => (
                                    <div key={s.label} className="bg-background rounded-xl p-4 text-center border border-muted/10">
                                        <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <StatRow label="Turnos al Bate (AB)" value={totals.atBats} />
                                <StatRow label="Hits (H)" value={totals.hits} />
                                <StatRow label="Dobles (2B)" value={totals.h2} />
                                <StatRow label="Triples (3B)" value={totals.h3} />
                                <StatRow label="Jonrones (HR)" value={totals.hr} highlight="text-primary" />
                                <StatRow label="Carreras Impulsadas (RBI)" value={totals.rbi} />
                                <StatRow label="Carreras Anotadas (R)" value={totals.runs} />
                                <StatRow label="Bases por Bolas (BB)" value={totals.bb} />
                                <StatRow label="Ponches (K)" value={totals.so} />
                                <StatRow label="Golpeado por Lanzador (HBP)" value={totals.hbp} />
                                <StatRow label="Sacrificio (SAC)" value={totals.sac} />
                            </div>
                        </div>
                    </div>
                )}

                {/* PITCHEO */}
                {activeTab === "pitcheo" && hasPitching && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-surface border border-muted/20 rounded-2xl p-6 shadow-sm">
                            <SectionTitle>Estadísticas Totales de Pitcheo</SectionTitle>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: "ERA", value: era(totals.erAllowed, totals.ipOuts), color: "text-primary" },
                                    { label: "WHIP", value: whip(totals.bbAllowed, totals.hAllowed, totals.ipOuts), color: "text-primary" },
                                    { label: "W-L", value: `${totals.wins}-${totals.losses}`, color: "text-foreground" },
                                    { label: "IP", value: ipDisplay(totals.ipOuts), color: "text-foreground" },
                                ].map(s => (
                                    <div key={s.label} className="bg-background rounded-xl p-4 text-center border border-muted/10">
                                        <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <StatRow label="Victorias (W)" value={totals.wins} highlight="text-emerald-500" />
                            <StatRow label="Derrotas (L)" value={totals.losses} />
                            <StatRow label="Entradas Lanzadas (IP)" value={ipDisplay(totals.ipOuts)} />
                            <StatRow label="Hits Permitidos (H)" value={totals.hAllowed} />
                            <StatRow label="Carreras Limpias (ER)" value={totals.erAllowed} />
                            <StatRow label="Bases por Bolas Dadas (BB)" value={totals.bbAllowed} />
                            <StatRow label="Ponches (K)" value={totals.soPitching} highlight="text-primary" />
                        </div>
                    </div>
                )}

                {/* POR JUEGO */}
                {activeTab === "juegos" && (
                    <div className="animate-fade-in-up">
                        <SectionTitle>Historial de Juegos ({games.length})</SectionTitle>
                        {games.length === 0 ? (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-10 text-center">
                                <p className="text-muted-foreground">No hay juegos registrados.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {games.map(entry => {
                                    const g = entry.game;
                                    const isHome = g.homeTeamId === player.team.id;
                                    const opponent = isHome ? g.awayTeam : g.homeTeam;
                                    const myScore = isHome ? g.homeScore : g.awayScore;
                                    const oppScore = isHome ? g.awayScore : g.homeScore;
                                    const won = myScore > oppScore;
                                    const finished = g.status === "finished";
                                    const date = new Date(g.scheduledDate).toLocaleDateString("es-MX", {
                                        day: "2-digit", month: "short", year: "numeric"
                                    });

                                    return (
                                        <Link
                                            key={g.id}
                                            href={`/gamecast/${g.id}`}
                                            className="flex items-center gap-4 bg-surface border border-muted/20 rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                        >
                                            {/* Result dot */}
                                            <div className={`w-1.5 h-8 rounded-full shrink-0 ${!finished ? "bg-yellow-500" : won ? "bg-emerald-500" : "bg-red-400"}`} />

                                            {/* Date + Tournament */}
                                            <div className="w-24 shrink-0">
                                                <p className="text-xs font-bold text-foreground">{date}</p>
                                                {g.tournament && (
                                                    <p className="text-[10px] text-muted-foreground truncate">{g.tournament.name}</p>
                                                )}
                                            </div>

                                            {/* Matchup */}
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <span className="text-xs text-muted-foreground font-bold uppercase shrink-0">
                                                    {isHome ? "vs" : "@"}
                                                </span>
                                                <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                                                    {opponent.shortName || opponent.name}
                                                </span>
                                            </div>

                                            {/* Score */}
                                            {finished ? (
                                                <div className="text-right shrink-0">
                                                    <p className={`font-black font-mono text-base ${won ? "text-emerald-500" : "text-red-400"}`}>
                                                        {won ? "G" : "P"} {myScore}-{oppScore}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider shrink-0">
                                                    {g.status === "live" ? "En Vivo" : "Prog."}
                                                </span>
                                            )}

                                            {/* Position */}
                                            <span className="text-[10px] bg-muted/10 text-muted-foreground px-2 py-1 rounded font-bold shrink-0">
                                                {entry.position}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TORNEOS */}
                {activeTab === "torneos" && (
                    <div className="animate-fade-in-up space-y-4">
                        <SectionTitle>Estadísticas por Torneo</SectionTitle>
                        {player.playerStats.length === 0 ? (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-10 text-center">
                                <p className="text-muted-foreground">Sin estadísticas registradas.</p>
                            </div>
                        ) : (
                            player.playerStats.map(s => {
                                const a = avg(s.hits, s.atBats);
                                const hasPitch = s.ipOuts > 0 || s.wins > 0;
                                return (
                                    <div key={s.id} className="bg-surface border border-muted/20 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-4">
                                            <div>
                                                <h4 className="font-black text-base text-foreground leading-tight">
                                                    {s.tournament?.name || "Sin torneo"}
                                                </h4>
                                                {s.tournament?.season && (
                                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                                        {s.tournament.season}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-xl font-black font-mono text-primary">{a}</span>
                                        </div>

                                        {/* Batting quick row */}
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-[11px]">
                                            {[
                                                { l: "AB", v: s.atBats },
                                                { l: "H", v: s.hits },
                                                { l: "HR", v: s.hr },
                                                { l: "RBI", v: s.rbi },
                                                { l: "BB", v: s.bb },
                                                { l: "K", v: s.so },
                                                { l: "2B", v: s.h2 },
                                                { l: "3B", v: s.h3 },
                                            ].map(({ l, v }) => (
                                                <div key={l} className="bg-background rounded-lg py-2">
                                                    <p className="font-black font-mono text-sm text-foreground">{v}</p>
                                                    <p className="text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{l}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {hasPitch && (
                                            <div className="mt-3 pt-3 border-t border-muted/10">
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-2">Pitcheo</p>
                                                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                                                    {[
                                                        { l: "W-L", v: `${s.wins}-${s.losses}` },
                                                        { l: "IP", v: ipDisplay(s.ipOuts) },
                                                        { l: "ERA", v: era(s.erAllowed, s.ipOuts) },
                                                        { l: "K", v: s.soPitching },
                                                    ].map(({ l, v }) => (
                                                        <div key={l} className="bg-background rounded-lg py-2">
                                                            <p className="font-black font-mono text-sm text-primary">{v}</p>
                                                            <p className="text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{l}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
