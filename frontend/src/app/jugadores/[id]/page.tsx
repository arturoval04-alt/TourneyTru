"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import PlayerAvatar from "@/components/PlayerAvatar";
import api from "@/lib/api";
import { ArrowLeft, Trophy, Users, Calendar, Clock, ChevronRight, Settings, X, CheckCircle } from "lucide-react";
import ImageUploader from "@/components/ui/ImageUploader";
import { getUser } from "@/lib/auth";

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
    gamesStarted?: number; gamesStartedP?: number;
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

interface RosterHistoryEntry {
    id: string;
    teamId: string;
    tournamentId: string;
    number?: number | null;
    position?: string | null;
    isActive: boolean;
    joinedAt: string;
    leftAt?: string | null;
    team: { id: string; name: string; shortName?: string; logoUrl?: string };
    tournament: { id: string; name: string; season: string; logoUrl?: string };
}

interface PlayerData {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName?: string | null;
    curp?: string | null;
    birthDate?: string | null;
    number: number | null;
    position: string | null;
    bats: string | null;
    throws: string | null;
    photoUrl: string | null;
    birthPlace?: string | null;
    isVerified: boolean;
    playerStats: PlayerStat[];
    lineupEntries: GameEntry[];
    rosterEntries: RosterHistoryEntry[];
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
function k9(so: number, ipOuts: number) {
    if (!ipOuts) return "0.00";
    return ((so * 27) / ipOuts).toFixed(2);
}
function bb9(bb: number, ipOuts: number) {
    if (!ipOuts) return "0.00";
    return ((bb * 27) / ipOuts).toFixed(2);
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
        gamesStarted: acc.gamesStarted + (s.gamesStarted || 0),
        gamesStartedP: acc.gamesStartedP + (s.gamesStartedP || 0),
    }), {
        atBats: 0, runs: 0, hits: 0, h2: 0, h3: 0, hr: 0, rbi: 0,
        bb: 0, so: 0, hbp: 0, sac: 0,
        wins: 0, losses: 0, ipOuts: 0, hAllowed: 0, erAllowed: 0, bbAllowed: 0, soPitching: 0, gamesStarted: 0, gamesStartedP: 0,
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

type Tab = "estadisticas" | "juegos" | "equipos" | "torneos" | "informacion";

interface ComputedStats {
    playerId: string; gp: number; ab: number; h: number;
    doubles: number; triples: number; hr: number; r: number;
    rbi: number; bb: number; so: number; avg: string;
    // pitching (may not exist)
    w?: number; l?: number; ipOuts?: number; hAllowed?: number;
    erAllowed?: number; bbAllowed?: number; soPitching?: number;
    gs?: number; gsPitching?: number;
}

export default function PlayerProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [computedStats, setComputedStats] = useState<ComputedStats | null>(null);
    const [gameBoxscores, setGameBoxscores] = useState<Record<string, { ab: number; h: number; rbi: number; results: string[] }>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("estadisticas");
    const [canEdit, setCanEdit] = useState(false);
    const [isEditingPlayer, setIsEditingPlayer] = useState(false);
    const [playerForm, setPlayerForm] = useState({ firstName: '', lastName: '', secondLastName: '', number: '', position: '', bats: 'R', throws: 'R', photoUrl: '', curp: '', birthDate: '', birthPlace: '' });
    const [statsTournamentFilter, setStatsTournamentFilter] = useState<string | null>(null);
    const [gamesTournamentFilter, setGamesTournamentFilter] = useState<string | null>(null);
    const [statsType, setStatsType] = useState<'bateo' | 'pitcheo'>('bateo');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [playerRes, statsRes] = await Promise.all([
                    api.get(`/players/${id}`),
                    api.get(`/players/${id}/stats`).catch(() => ({ data: null })),
                ]);
                const p = playerRes.data;
                setPlayer(p);
                setComputedStats(statsRes.data);
                const activeEntry = p.rosterEntries?.find((e: any) => e.isActive) ?? p.rosterEntries?.[0];
                setPlayerForm({ firstName: p.firstName, lastName: p.lastName, secondLastName: p.secondLastName || '', number: activeEntry?.number?.toString() || p.number?.toString() || '', position: p.position || '', bats: p.bats || 'R', throws: p.throws || 'R', photoUrl: p.photoUrl || '', curp: p.curp || '', birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '', birthPlace: p.birthPlace || '' });

                // Check edit permissions
                const user = getUser();
                if (!user) return;
                if (user.role === 'admin') { setCanEdit(true); return; }
                const activeRoster = p.rosterEntries?.find((e: any) => e.isActive) ?? p.rosterEntries?.[0];
                const tournamentId = activeRoster?.tournament?.id;
                if (tournamentId) {
                    const { data: t } = await api.get(`/torneos/${tournamentId}`).catch(() => ({ data: null }));
                    if (t?.organizers?.some((o: any) => o.user?.id === user.id || o.userId === user.id)) {
                        if (user.role === 'organizer' || user.role === 'presi') {
                            setCanEdit(true);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);


    const handleUpdatePlayer = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        try {
            const activeEntry = player?.rosterEntries?.find((e: any) => e.isActive) ?? player?.rosterEntries?.[0];
            await api.patch(`/players/${id}`, {
                firstName: playerForm.firstName,
                lastName: playerForm.lastName,
                secondLastName: playerForm.secondLastName || null,
                number: playerForm.number ? parseInt(playerForm.number) : null,
                position: playerForm.position,
                bats: playerForm.bats,
                throws: playerForm.throws,
                photoUrl: playerForm.photoUrl,
                curp: playerForm.curp || null,
                birthDate: playerForm.birthDate || null,
                birthPlace: playerForm.birthPlace || null,
                teamId: activeEntry?.team?.id || activeEntry?.teamId,
                tournamentId: activeEntry?.tournament?.id || activeEntry?.tournamentId,
            });
            setIsEditingPlayer(false);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error al actualizar jugador');
        }
    };

    // Fetch per-game boxscores once we have the player
    useEffect(() => {
        if (!player) return;
        const gameIds = player.lineupEntries
            .filter((e, i, arr) => arr.findIndex(x => x.game.id === e.game.id) === i)
            .map(e => e.game.id);
        if (!gameIds.length) return;

        const fetchBoxscores = async () => {
            const results: Record<string, { ab: number; h: number; rbi: number; results: string[] }> = {};
            await Promise.all(gameIds.map(async (gid) => {
                try {
                    const { data: box } = await api.get(`/games/${gid}/boxscore`);
                    const allPlayers = [...(box.homeTeam?.lineup || []), ...(box.awayTeam?.lineup || [])];
                    const me = allPlayers.find((p: any) => p.playerId === id);
                    if (me) {
                        // Extract at-bat results in inning order
                        const plays = me.plays || {};
                        const sortedInnings = Object.keys(plays).map(Number).sort((a, b) => a - b);
                        const atBatResults: string[] = [];
                        for (const inn of sortedInnings) {
                            for (const play of plays[inn]) {
                                // Simplify result: take the primary result before any | pipe
                                const raw = play.result as string;
                                const primary = raw.split('|')[0];
                                atBatResults.push(primary);
                            }
                        }
                        results[gid] = {
                            ab: me.atBats ?? 0,
                            h: me.hits ?? 0,
                            rbi: me.rbi ?? 0,
                            results: atBatResults,
                        };
                    }
                } catch { /* skip */ }
            }));
            setGameBoxscores(results);
        };
        fetchBoxscores();
    }, [player, id]);

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

    // Derive current team from rosterEntries (active first, then most recent)
    const currentEntry = player.rosterEntries?.find(e => e.isActive) ?? player.rosterEntries?.[0];
    const currentTeam = currentEntry ? { id: currentEntry.team.id, name: currentEntry.team.name, shortName: currentEntry.team.shortName, logoUrl: currentEntry.team.logoUrl, tournament: currentEntry.tournament } : null;

    // Active entries = all teams where player is currently registered
    const activeEntries = player.rosterEntries?.filter(e => e.isActive) ?? [];
    // Inactive entries = teams where player was given "baja" or tournament finished
    const inactiveEntries = player.rosterEntries?.filter(e => !e.isActive) ?? [];

    const totals = aggregateStats(player.playerStats);
    // Use computed stats from the plays table when available (they override the empty playerStats)
    const cs = computedStats;
    const displayAB = cs?.ab ?? totals.atBats;
    const displayH = cs?.h ?? totals.hits;
    const displayHR = cs?.hr ?? totals.hr;
    const displayRBI = cs?.rbi ?? totals.rbi;
    const displaySO = cs?.so ?? totals.so;
    const displayBB = cs?.bb ?? totals.bb;
    const displayR = cs?.r ?? totals.runs;
    const display2B = cs?.doubles ?? totals.h2;
    const display3B = cs?.triples ?? totals.h3;
    const displayAvg = cs?.avg ?? avg(totals.hits, totals.atBats);

    const hasPitching = (cs?.ipOuts ?? totals.ipOuts) > 0 || (cs?.w ?? totals.wins) > 0 || (cs?.l ?? totals.losses) > 0;
    const displayWins = cs?.w ?? totals.wins;
    const displayLosses = cs?.l ?? totals.losses;
    const displayIPOuts = cs?.ipOuts ?? totals.ipOuts;
    const displayERAllowed = cs?.erAllowed ?? totals.erAllowed;
    const displayHAllowed = cs?.hAllowed ?? totals.hAllowed;
    const displayBBAllowed = cs?.bbAllowed ?? totals.bbAllowed;
    const displaySOPitching = cs?.soPitching ?? totals.soPitching;
    const playerERA = era(displayERAllowed, displayIPOuts);

    // Unique games, sorted by date desc
    const games = player.lineupEntries
        .filter((e, i, arr) => arr.findIndex(x => x.game.id === e.game.id) === i)
        .sort((a, b) => new Date(b.game.scheduledDate).getTime() - new Date(a.game.scheduledDate).getTime());

    // Unique tournaments for filters
    const gameTournaments = Array.from(
        new Map(player.lineupEntries.filter(e => e.game.tournament).map(e => [e.game.tournament!.id, e.game.tournament!])).values()
    );
    const statTournaments = Array.from(
        new Map(player.playerStats.filter(s => s.tournament).map(s => [s.tournament!.id, s.tournament!])).values()
    );

    // Stats when a specific tournament is selected — use playerStats (not computedStats)
    const filteredStatsTotals = statsTournamentFilter
        ? aggregateStats(player.playerStats.filter(s => s.tournamentId === statsTournamentFilter))
        : null;

    const fAB = filteredStatsTotals?.atBats ?? displayAB;
    const fH = filteredStatsTotals?.hits ?? displayH;
    const fHR = filteredStatsTotals?.hr ?? displayHR;
    const fRBI = filteredStatsTotals?.rbi ?? displayRBI;
    const fSO = filteredStatsTotals?.so ?? displaySO;
    const fBB = filteredStatsTotals?.bb ?? displayBB;
    const fR = filteredStatsTotals?.runs ?? displayR;
    const f2B = filteredStatsTotals?.h2 ?? display2B;
    const f3B = filteredStatsTotals?.h3 ?? display3B;
    const fAvg = filteredStatsTotals ? avg(filteredStatsTotals.hits, filteredStatsTotals.atBats) : displayAvg;
    const fHBP = filteredStatsTotals?.hbp ?? totals.hbp;
    const fSAC = filteredStatsTotals?.sac ?? totals.sac;
    const fGS = cs?.gs ?? (filteredStatsTotals?.gamesStarted ?? totals.gamesStarted);
    const fGSPitching = cs?.gsPitching ?? (filteredStatsTotals?.gamesStartedP ?? totals.gamesStartedP);

    const fWins = filteredStatsTotals?.wins ?? displayWins;
    const fLosses = filteredStatsTotals?.losses ?? displayLosses;
    const fIPOuts = filteredStatsTotals?.ipOuts ?? displayIPOuts;
    const fERAllowed = filteredStatsTotals?.erAllowed ?? displayERAllowed;
    const fHAllowed = filteredStatsTotals?.hAllowed ?? displayHAllowed;
    const fBBAllowed = filteredStatsTotals?.bbAllowed ?? displayBBAllowed;
    const fSOPitching = filteredStatsTotals?.soPitching ?? displaySOPitching;
    const fHasPitching = fIPOuts > 0 || fWins > 0 || fLosses > 0;
    const fERA = era(fERAllowed, fIPOuts);

    // Filtered games
    const filteredGames = gamesTournamentFilter
        ? games.filter(e => e.game.tournament?.id === gamesTournamentFilter)
        : games;

    const tabs: { id: Tab; label: string }[] = [
        { id: "estadisticas", label: "Estadísticas" },
        { id: "juegos", label: "Juegos Jugados" },
        { id: "equipos", label: "Equipos" },
        { id: "torneos", label: "Torneos" },
    ];
    if (canEdit) {
        tabs.push({ id: "informacion", label: "Información" });
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans pb-24">
            <Navbar />

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div className="bg-[#1a2d42] relative overflow-hidden">
                {/* Back + Edit */}
                <div className="max-w-4xl mx-auto px-4 pt-6 flex justify-between items-center">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            {!player.isVerified && (
                                <button
                                    onClick={async () => {
                                        if (!window.confirm(`¿Verificar a ${player.firstName} ${player.lastName}?\n\nEl jugador verificado podrá participar en otros torneos y tendrá una insignia en su perfil.`)) return;
                                        try {
                                            await api.patch(`/players/${player.id}`, { isVerified: true });
                                            window.location.reload();
                                        } catch { alert('Error al verificar jugador'); }
                                    }}
                                    className="flex items-center gap-1.5 text-emerald-400 hover:text-white transition-colors text-sm font-medium bg-emerald-500/10 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg border border-emerald-500/30"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Verificar
                                </button>
                            )}
                            <button
                                onClick={() => setIsEditingPlayer(true)}
                                className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/10"
                            >
                                <Settings className="w-4 h-4" />
                                Editar
                            </button>
                        </div>
                    )}
                </div>

                <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end">
                    {/* Photo */}
                    <PlayerAvatar
                        photoUrl={player.photoUrl}
                        firstName={player.firstName}
                        size="xl"
                    />

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">

                        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none mb-2 flex items-center gap-3 flex-wrap">
                            {player.firstName} {player.lastName} {player.secondLastName && player.secondLastName}
                            {player.isVerified && (
                                <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full normal-case tracking-normal">
                                    <CheckCircle className="w-4 h-4" />
                                    Verificado
                                </span>
                            )}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-white/60 text-sm font-medium mb-5">
                            <div className="flex items-center gap-1.5 transition-colors">
                                <Trophy className="w-3.5 h-3.5 text-white/40" />
                                {(() => {
                                    const numEquipos = player.rosterEntries?.length || 0;
                                    const numTorneos = new Set(player.rosterEntries?.map((e: any) => e.tournament?.id || e.team?.tournament?.id).filter(Boolean)).size || 0;
                                    return `Participante en ${numEquipos} equipo${numEquipos !== 1 ? 's' : ''} y ${numTorneos} torneo${numTorneos !== 1 ? 's' : ''}`;
                                })()}
                            </div>
                        </div>

                        {/* Primary stats bar */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <StatBox label="AVG" value={displayAvg} accent />
                            <StatBox label="HR" value={displayHR} />
                            <StatBox label="RBI" value={displayRBI} />
                            <StatBox label="K" value={displaySO} />
                            {hasPitching && <StatBox label="ERA" value={playerERA} accent />}
                            {hasPitching && <StatBox label="W-L" value={`${displayWins}-${displayLosses}`} />}
                        </div>
                    </div>
                </div>

                {/* Side info strip */}
                <div className="bg-[#162237] border-t border-white/5 py-2">
                    <div className="max-w-4xl mx-auto px-4 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
                        <span>Batea: <span className="text-white/70">{player.bats === 'L' ? 'Zurdo' : player.bats === 'S' ? 'Ambos' : 'Derecho'}</span></span>
                        <span>Tira: <span className="text-white/70">{player.throws === 'L' ? 'Zurdo' : 'Derecho'}</span></span>
                        <span>Juegos: <span className="text-white/70">{cs?.gp ?? games.length}</span></span>
                        <span>Torneos: <span className="text-white/70">{player.playerStats.length || (currentTeam?.tournament ? 1 : 0)}</span></span>
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
                            className={`px-5 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === t.id
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

                {/* ESTADÍSTICAS (Batting + Pitching con filtro por torneo) */}
                {activeTab === "estadisticas" && (
                    <div className="space-y-5 animate-fade-in-up">
                        {/* Selector Bateo/Pitcheo */}
                        <div className="flex gap-2 p-1 bg-surface border border-muted/30 rounded-xl w-fit mx-auto shadow-sm">
                            <button
                                onClick={() => setStatsType('bateo')}
                                className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${statsType === 'bateo' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                BATEO
                            </button>
                            <button
                                onClick={() => setStatsType('pitcheo')}
                                className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${statsType === 'pitcheo' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                PITCHEO
                            </button>
                        </div>

                        {/* Filtro torneo */}
                        {statTournaments.length > 1 && (
                            <div className="flex flex-wrap gap-2 justify-center pb-2">
                                <button
                                    onClick={() => setStatsTournamentFilter(null)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${!statsTournamentFilter ? 'bg-primary text-white border-primary' : 'border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                                >
                                    Total
                                </button>
                                {statTournaments.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setStatsTournamentFilter(t.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${statsTournamentFilter === t.id ? 'bg-primary text-white border-primary' : 'border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Batting card */}
                        {statsType === 'bateo' && (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-6 shadow-sm animate-fade-in-up">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                    {[
                                        { label: "AVG", value: fAvg, color: "text-primary" },
                                        { label: "OBP", value: obp(fH, fBB, fHBP, fAB), color: "text-primary" },
                                        { label: "SLG", value: slg(fH, f2B, f3B, fHR, fAB), color: "text-primary" },
                                        { label: "OPS", value: opsCalc(fH, f2B, f3B, fHR, fBB, fHBP, fAB), color: "text-primary" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-background rounded-xl p-4 text-center border border-muted/10">
                                            <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <StatRow label="Juegos Iniciados (GS)" value={fGS} />
                                    <StatRow label="Apariciones al Plato (PA)" value={fAB + fBB + fHBP + fSAC} highlight="text-primary" />
                                    <StatRow label="Turnos al Bate (AB)" value={fAB} />
                                    <StatRow label="Hits (H)" value={fH} />
                                    <StatRow label="Dobles (2B)" value={f2B} />
                                    <StatRow label="Triples (3B)" value={f3B} />
                                    <StatRow label="Jonrones (HR)" value={fHR} highlight="text-primary" />
                                    <StatRow label="Carreras Impulsadas (RBI)" value={fRBI} />
                                    <StatRow label="Carreras Anotadas (R)" value={fR} />
                                    <StatRow label="Bases por Bolas (BB)" value={fBB} />
                                    <StatRow label="Ponches (K)" value={fSO} />
                                    <StatRow label="Golpeado por Lanzador (HBP)" value={fHBP} />
                                    <StatRow label="Sacrificio (SAC)" value={fSAC} />
                                </div>
                            </div>
                        )}

                        {/* Pitching card */}
                        {statsType === 'pitcheo' && (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-6 shadow-sm animate-fade-in-up">
                                {!fHasPitching && (
                                    <p className="text-xs text-muted-foreground mb-4">Sin registros de pitcheo{statsTournamentFilter ? ' en este torneo' : ''}.</p>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                    {[
                                        { label: "ERA", value: fERA, color: "text-primary" },
                                        { label: "WHIP", value: whip(fBBAllowed, fHAllowed, fIPOuts), color: "text-primary" },
                                        { label: "W-L", value: `${fWins}-${fLosses}`, color: "text-foreground" },
                                        { label: "IP", value: ipDisplay(fIPOuts), color: "text-foreground" },
                                        { label: "K/9", value: k9(fSOPitching, fIPOuts), color: "text-foreground" },
                                        { label: "BB/9", value: bb9(fBBAllowed, fIPOuts), color: "text-foreground" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-background rounded-xl p-4 text-center border border-muted/10">
                                            <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <StatRow label="Juegos Iniciados (GS)" value={fGSPitching} />
                                <StatRow label="Victorias (W)" value={fWins} highlight="text-emerald-500" />
                                <StatRow label="Derrotas (L)" value={fLosses} />
                                <StatRow label="Entradas Lanzadas (IP)" value={ipDisplay(fIPOuts)} />
                                <StatRow label="Hits Permitidos (H)" value={fHAllowed} />
                                <StatRow label="Carreras Limpias (ER)" value={fERAllowed} />
                                <StatRow label="Bases por Bolas Dadas (BB)" value={fBBAllowed} />
                                <StatRow label="Ponches (K)" value={fSOPitching} highlight="text-primary" />
                            </div>
                        )}
                    </div>
                )}

                {/* JUEGOS JUGADOS con filtro por torneo */}
                {activeTab === "juegos" && (
                    <div className="animate-fade-in-up space-y-4">
                        {/* Filtro torneo */}
                        {gameTournaments.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setGamesTournamentFilter(null)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${!gamesTournamentFilter ? 'bg-primary text-white border-primary' : 'border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                                >
                                    Total ({games.length})
                                </button>
                                {gameTournaments.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setGamesTournamentFilter(t.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${gamesTournamentFilter === t.id ? 'bg-primary text-white border-primary' : 'border-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                                    >
                                        {t.name} ({games.filter(e => e.game.tournament?.id === t.id).length})
                                    </button>
                                ))}
                            </div>
                        )}

                        <SectionTitle>Historial de Juegos ({filteredGames.length})</SectionTitle>
                        {filteredGames.length === 0 ? (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-10 text-center">
                                <p className="text-muted-foreground">No hay juegos registrados{gamesTournamentFilter ? ' en este torneo' : ''}.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredGames.map(entry => {
                                    const g = entry.game;
                                    const isHome = currentTeam ? g.homeTeamId === currentTeam.id : false;
                                    const myScore = isHome ? g.homeScore : g.awayScore;
                                    const oppScore = isHome ? g.awayScore : g.homeScore;
                                    const finished = g.status === "finished";
                                    let winStatus: 'win' | 'loss' | 'tie' | 'live' = 'live';
                                    if (finished) {
                                        if (myScore > oppScore) winStatus = 'win';
                                        else if (myScore < oppScore) winStatus = 'loss';
                                        else winStatus = 'tie';
                                    }

                                    let bgGradient = 'bg-surface';
                                    let borderClass = 'border-muted/30';
                                    if (winStatus === 'win') { bgGradient = 'bg-gradient-to-br from-emerald-500/20 to-surface'; borderClass = 'border-emerald-500/30'; }
                                    else if (winStatus === 'loss') { bgGradient = 'bg-gradient-to-br from-red-500/20 to-surface'; borderClass = 'border-red-500/30'; }
                                    else if (winStatus === 'tie') { bgGradient = 'bg-gradient-to-br from-amber-500/20 to-surface'; borderClass = 'border-amber-500/30'; }
                                    else if (winStatus === 'live') { bgGradient = 'bg-gradient-to-br from-blue-500/20 to-surface'; borderClass = 'border-blue-500/30'; }

                                    return (
                                        <Link key={g.id} href={g.status === 'in_progress' ? `/gamecast/${g.id}` : g.status === 'finished' ? `/gamefinalizado/${g.id}` : `/gamescheduled/${g.id}`} className={`${bgGradient} border ${borderClass} rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md hover:-translate-y-1 transition-all`}>
                                            {/* Game Header */}
                                            <div className="px-4 py-1.5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                                                <div className="text-xs font-bold opacity-70 flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(g.scheduledDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} &bull; {new Date(g.scheduledDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {g.tournament && (
                                                    <div className="text-[10px] font-bold opacity-60 truncate max-w-[120px]">
                                                        {g.tournament.name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Score & Teams */}
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="flex flex-col items-center gap-1.5 flex-1 w-20">
                                                    <div className="w-12 h-12 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-lg shrink-0">
                                                        {g.awayTeam.shortName || g.awayTeam.name?.substring(0, 2)}
                                                    </div>
                                                    <span className="text-[10px] font-black text-center leading-tight line-clamp-2">{g.awayTeam.name}</span>
                                                </div>

                                                <div className="flex flex-col items-center justify-center px-3">
                                                    {g.status === 'in_progress' && (
                                                        <span className="text-[10px] font-black tracking-widest uppercase text-red-500 animate-pulse mb-1 flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> EN VIVO
                                                        </span>
                                                    )}
                                                    <div className="bg-surface/60 backdrop-blur-md border border-muted/20 px-3 py-1.5 rounded-xl">
                                                        <div className="text-2xl font-black tabular-nums tracking-tighter text-foreground text-center flex items-center gap-2">
                                                            <span className={!isHome && winStatus === 'win' ? 'text-emerald-500' : ''}>{g.awayScore ?? '-'}</span>
                                                            <span className="text-muted-foreground/30 font-light text-xl">-</span>
                                                            <span className={isHome && winStatus === 'win' ? 'text-emerald-500' : ''}>{g.homeScore ?? '-'}</span>
                                                        </div>
                                                    </div>
                                                    {finished && (
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Finalizado</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-center gap-1.5 flex-1 w-20">
                                                    <div className="w-12 h-12 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-lg shrink-0">
                                                        {g.homeTeam.shortName || g.homeTeam.name?.substring(0, 2)}
                                                    </div>
                                                    <span className="text-[10px] font-black text-center leading-tight line-clamp-2">{g.homeTeam.name}</span>
                                                </div>
                                            </div>

                                            {/* Bottom Stats Bar */}
                                            <div className="flex border-t border-black/10 dark:border-white/10">
                                                <div className="flex-1 p-3 flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">POS</span>
                                                    <span className="text-xs font-black bg-primary/20 text-primary px-2 py-0.5 rounded">{entry.position}</span>
                                                    {gameBoxscores[g.id] && (
                                                        <>
                                                            <div className="w-px h-4 bg-muted/20" />
                                                            <span className="text-xs font-black font-mono text-foreground">
                                                                {gameBoxscores[g.id].ab}-{gameBoxscores[g.id].h}
                                                            </span>
                                                            {gameBoxscores[g.id].results.length > 0 && (
                                                                <>
                                                                    <span className="text-muted-foreground/40">—</span>
                                                                    {gameBoxscores[g.id].results.map((r, i) => (
                                                                        <span key={i} className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${r.startsWith('HR') ? 'bg-primary/20 text-primary' :
                                                                            r.startsWith('H') ? 'bg-emerald-500/15 text-emerald-400' :
                                                                                r === 'BB' || r === 'HBP' ? 'bg-blue-500/15 text-blue-400' :
                                                                                    r.startsWith('K') ? 'bg-red-500/15 text-red-400' :
                                                                                        'bg-muted/10 text-muted-foreground'
                                                                            }`}>
                                                                            {r}
                                                                        </span>
                                                                    ))}
                                                                </>
                                                            )}
                                                            {gameBoxscores[g.id].rbi > 0 && (
                                                                <>
                                                                    <div className="w-px h-4 bg-muted/20" />
                                                                    <span className="text-[11px] font-black font-mono text-amber-400">{gameBoxscores[g.id].rbi} RBI</span>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* EQUIPOS */}
                {activeTab === "equipos" && (
                    <div className="animate-fade-in-up space-y-6">
                        {/* Active teams */}
                        {activeEntries.length > 0 && (
                            <div>
                                <SectionTitle>Equipos Activos ({activeEntries.length})</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {activeEntries.map(entry => (
                                        <Link key={entry.id} href={`/equipos/${entry.teamId}`} className="bg-surface border border-emerald-500/30 rounded-2xl p-5 shadow-sm hover:border-emerald-400/50 hover:-translate-y-1 transition-all group relative overflow-hidden">
                                            <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">Activo</span>
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-14 h-14 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-lg shrink-0 group-hover:border-emerald-400/50 transition-colors">
                                                    {entry.team.logoUrl ? (
                                                        <img src={entry.team.logoUrl} alt={entry.team.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        entry.team.shortName || entry.team.name?.substring(0, 2)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-base text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                                                        {entry.team.name}
                                                    </h4>
                                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                                                        <Trophy className="w-3 h-3" /> {entry.tournament.name} · {entry.tournament.season}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">{entry.position || player.position || 'UTIL'}</span>
                                                {entry.number != null && <span>#{entry.number}</span>}
                                                <span className="ml-auto text-muted-foreground/60">Desde {new Date(entry.joinedAt).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeEntries.length === 0 && (
                            <div className="bg-surface border border-muted/20 rounded-2xl p-10 text-center">
                                <p className="text-muted-foreground">Este jugador no tiene equipos activos actualmente.</p>
                            </div>
                        )}

                        {/* Roster history (inactive only) */}
                        {inactiveEntries.length > 0 && (
                            <div>
                                <SectionTitle>Historial de Equipos ({inactiveEntries.length})</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {inactiveEntries.map(entry => (
                                        <Link key={entry.id} href={`/equipos/${entry.teamId}`} className="bg-surface border border-muted/20 rounded-2xl p-5 shadow-sm hover:border-primary/40 hover:-translate-y-1 transition-all group relative overflow-hidden opacity-80 hover:opacity-100">
                                            <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-muted/20 text-muted-foreground border border-muted/30 rounded-full">
                                                Baja
                                            </span>
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-14 h-14 bg-surface rounded-full shadow-md flex items-center justify-center border-2 border-muted/20 overflow-hidden font-black text-lg shrink-0 group-hover:border-primary/50 transition-colors grayscale group-hover:grayscale-0">
                                                    {entry.team.logoUrl ? (
                                                        <img src={entry.team.logoUrl} alt={entry.team.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        entry.team.shortName || entry.team.name?.substring(0, 2)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-base text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                                                        {entry.team.name}
                                                    </h4>
                                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                                                        <Trophy className="w-3 h-3" /> {entry.tournament.name} · {entry.tournament.season}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                            <div className="text-[10px] font-bold text-muted-foreground">
                                                Desde {new Date(entry.joinedAt).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                                                {entry.leftAt && ` · Hasta ${new Date(entry.leftAt).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TORNEOS — Card style like tournament search page */}
                {activeTab === "torneos" && (() => {
                    // Collect all unique tournaments from roster entries
                    const allTournaments: Array<{ id: string; name: string; season: string; teamName: string; teamId: string; isPrimary: boolean }> = [];
                    player.rosterEntries?.forEach((entry, idx) => {
                        if (!allTournaments.find(t => t.id === entry.tournament.id)) {
                            allTournaments.push({ ...entry.tournament, teamName: entry.team.name, teamId: entry.teamId, isPrimary: idx === 0 });
                        }
                    });

                    return (
                        <div className="animate-fade-in-up">
                            <SectionTitle>Torneos ({allTournaments.length})</SectionTitle>
                            {allTournaments.length === 0 ? (
                                <div className="bg-surface border border-muted/20 rounded-2xl p-10 text-center">
                                    <p className="text-muted-foreground">No hay torneos registrados.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allTournaments.map(t => (
                                        <Link key={t.id} href={`/torneos/${t.id}`} className="block group">
                                            <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
                                                <div className="relative h-40 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm z-20 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                        Activo
                                                    </div>
                                                    {!t.isPrimary && (
                                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md z-20 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                                            Invitado
                                                        </div>
                                                    )}
                                                    <div className="w-full h-full flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                                                        <Trophy className="w-16 h-16 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-5 flex flex-col flex-1">
                                                    <h3 className="font-black text-lg text-foreground mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                        {t.name}
                                                    </h3>
                                                    <div className="space-y-2 mb-4 flex-1">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                            <span>{t.season}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                                            <Users className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                            <span>{t.teamName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-muted/20 pt-3 mt-auto flex items-center justify-between">
                                                        <div className="text-xs text-muted-foreground font-medium">
                                                            {t.isPrimary ? `${cs?.gp ?? games.length} juegos` : 'Invitado'}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* INFORMACIÓN (Solo admins/organizadores de la liga/torneo) */}
                {activeTab === "informacion" && canEdit && (
                    <div className="animate-fade-in-up bg-surface border border-muted/30 rounded-2xl p-6 md:p-8 shadow-sm">
                        <SectionTitle>Datos del Jugador</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6 mt-6">
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Nombre Completo</h4>
                                <p className="text-foreground font-bold text-base">{player.firstName} {player.lastName} {player.secondLastName || ''}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">CURP</h4>
                                <p className="text-foreground font-bold text-base font-mono tracking-wider">{player.curp || 'No registrada'}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Fecha de Nacimiento</h4>
                                <p className="text-foreground font-bold text-base">
                                    {player.birthDate ? new Date(player.birthDate).toLocaleDateString('es-MX', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }) : 'No registrada'}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Dorsal / Posición</h4>
                                <p className="text-foreground font-bold text-base">#{player.number || 'N/A'} — {player.position || 'N/A'}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Lugar de Nacimiento</h4>
                                <p className="text-foreground font-bold text-base">{player.birthPlace || 'No registrado'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Modal Editar Jugador ──────────────────────────────────────── */}
            {isEditingPlayer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-muted/30 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-muted/20 flex justify-between items-center bg-muted/5">
                            <h2 className="text-xl font-black text-foreground">Editar Jugador</h2>
                            <button onClick={() => setIsEditingPlayer(false)} className="w-10 h-10 rounded-full bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdatePlayer} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nombre</label>
                                    <input required type="text" value={playerForm.firstName} onChange={e => setPlayerForm(f => ({ ...f, firstName: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Paterno</label>
                                    <input required type="text" value={playerForm.lastName} onChange={e => setPlayerForm(f => ({ ...f, lastName: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Apellido Materno <span className="normal-case font-normal">(opcional)</span></label>
                                <input type="text" value={playerForm.secondLastName} onChange={e => setPlayerForm(f => ({ ...f, secondLastName: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">CURP <span className="normal-case font-normal">(opcional)</span></label>
                                    <input type="text" maxLength={18} value={playerForm.curp} onChange={e => setPlayerForm(f => ({ ...f, curp: e.target.value.toUpperCase() }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors font-mono tracking-wide" placeholder="AAAA000000AAAAAA00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fecha de Nac. <span className="normal-case font-normal">(opcional)</span></label>
                                    <input type="date" value={playerForm.birthDate} onChange={e => setPlayerForm(f => ({ ...f, birthDate: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Lugar de Nacimiento <span className="normal-case font-normal">(opcional)</span></label>
                                <input type="text" maxLength={100} value={playerForm.birthPlace} onChange={e => setPlayerForm(f => ({ ...f, birthPlace: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors" placeholder="Ej: Hermosillo, Sonora" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Posición Principal</label>
                                <select value={playerForm.position} onChange={e => setPlayerForm(f => ({ ...f, position: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors">
                                    {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'INF', 'OF'].map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Batea</label>
                                    <select value={playerForm.bats} onChange={e => setPlayerForm(f => ({ ...f, bats: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors">
                                        <option value="R">Derecho</option>
                                        <option value="L">Zurdo</option>
                                        <option value="S">Ambidiestro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Tira</label>
                                    <select value={playerForm.throws} onChange={e => setPlayerForm(f => ({ ...f, throws: e.target.value }))} className="w-full bg-background border border-muted/30 text-foreground text-sm rounded-lg p-3 outline-none focus:border-primary transition-colors">
                                        <option value="R">Derecho</option>
                                        <option value="L">Zurdo</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Foto del Jugador</label>
                                <ImageUploader
                                    value={playerForm.photoUrl}
                                    onChange={url => setPlayerForm(f => ({ ...f, photoUrl: url }))}
                                    shape="circle"
                                    placeholder="⚾"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-muted/10">
                                <button type="button" onClick={() => setIsEditingPlayer(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted/10 transition-colors text-sm">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-black bg-primary text-white hover:opacity-90 transition-colors shadow-lg text-sm">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
