'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Calendar, Clock, MapPin, ChevronLeft, BarChart3, TrendingUp, Navigation, Swords } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAvg(val: string | number): string {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(n)) return '.000';
    return n.toFixed(3).replace('0.', '.');
}

function calcTeamBatting(batting: any[], teamId: string) {
    const rows = batting.filter((p: any) => p.teamId === teamId);
    const h    = rows.reduce((s: number, p: any) => s + (p.h  || 0), 0);
    const ab   = rows.reduce((s: number, p: any) => s + (p.ab  || 0), 0);
    const bb   = rows.reduce((s: number, p: any) => s + (p.bb  || 0), 0);
    const hbp  = rows.reduce((s: number, p: any) => s + (p.hbp || 0), 0);
    const sf   = rows.reduce((s: number, p: any) => s + (p.sf  || 0), 0);
    const tb   = rows.reduce((s: number, p: any) => s + (p.tb  || 0), 0);
    const hr   = rows.reduce((s: number, p: any) => s + (p.hr  || 0), 0);

    const avg = ab > 0 ? (h / ab) : 0;
    const obpDen = ab + bb + hbp + sf;
    const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0;
    const slg = ab > 0 ? tb / ab : 0;
    const ops = obp + slg;

    return { h, ab, bb, hr, avg, obp, slg, ops };
}

function calcTeamPitching(pitching: any[], teamId: string) {
    const rows = pitching.filter((p: any) => p.teamId === teamId);
    const outs = rows.reduce((s: number, p: any) => s + (p.outs || 0), 0);
    const er   = rows.reduce((s: number, p: any) => s + (p.er  || 0), 0);
    const k    = rows.reduce((s: number, p: any) => s + (p.so  || 0), 0);
    const bb   = rows.reduce((s: number, p: any) => s + (p.bb  || 0), 0);
    const ph   = rows.reduce((s: number, p: any) => s + (p.h   || 0), 0);

    const ip = outs / 3;
    const era  = ip > 0 ? (er / ip) * 9 : 0;
    const whip = ip > 0 ? (bb + ph) / ip : 0;

    return { k, bb, ph, era, whip, ip };
}

// ─── StatRow: left value · label · right value ────────────────────────────────

function StatRow({
    leftVal, label, rightVal,
    leftColor = 'text-white', rightColor = 'text-white',
    small = false,
}: {
    leftVal: string; label: string; rightVal: string;
    leftColor?: string; rightColor?: string; small?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
                <div className={`font-black font-mono ${small ? 'text-xl' : 'text-3xl'} ${leftColor}`}>{leftVal}</div>
            </div>
            <div className="flex-shrink-0 text-center px-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-800 px-3 py-1 rounded-full whitespace-nowrap">
                    {label}
                </span>
            </div>
            <div className="flex-1 text-center">
                <div className={`font-black font-mono ${small ? 'text-xl' : 'text-3xl'} ${rightColor}`}>{rightVal}</div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GameScheduled() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [game, setGame]           = useState<any>(null);
    const [tournament, setTournament] = useState<any>(null);
    const [batting, setBatting]     = useState<any[]>([]);
    const [pitching, setPitching]   = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        if (!gameId) return;
        api.get(`/games/${gameId}`).then(async (res) => {
            const gameData = res.data;
            setGame(gameData);

            if (gameData?.tournament?.id) {
                const torId = gameData.tournament.id;
                try {
                    const [torRes, batRes, pitRes] = await Promise.all([
                        api.get(`/torneos/${torId}`),
                        api.get(`/torneos/${torId}/stats/batting`),
                        api.get(`/torneos/${torId}/stats/pitching`),
                    ]);
                    setTournament(torRes.data);
                    setBatting(batRes.data?.rows || []);
                    setPitching(pitRes.data?.rows || []);
                } catch (e) {
                    console.error('Error loading tournament stats', e);
                }
            }
            setLoading(false);
        }).catch((e) => {
            console.error(e);
            setLoading(false);
        });
    }, [gameId]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <div className="animate-pulse text-slate-400">Cargando previo del juego…</div>
        </div>
    );
    if (!game) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            Juego no encontrado
        </div>
    );

    const gameDate = new Date(game.scheduledDate);

    // Field
    const fieldObj  = tournament?.fields?.find((f: any) => f.id === game.field);
    const fieldName = fieldObj?.name || game.field || 'Sede Local';
    const mapUrl    = fieldObj?.mapsUrl || fieldObj?.location || null;
    const isLink    = mapUrl && mapUrl.startsWith('http');

    // Team stats
    const awayBat = calcTeamBatting(batting, game.awayTeam.id);
    const homeBat = calcTeamBatting(batting, game.homeTeam.id);
    const awayPit = calcTeamPitching(pitching, game.awayTeam.id);
    const homePit = calcTeamPitching(pitching, game.homeTeam.id);

    // Game count per team (finished games in tournament)
    const finishedGames: any[] = tournament?.games?.filter((g: any) => g.status === 'finished') ?? [];
    const awayGames = finishedGames.filter((g: any) => g.homeTeamId === game.awayTeam.id || g.awayTeamId === game.awayTeam.id).length;
    const homeGames = finishedGames.filter((g: any) => g.homeTeamId === game.homeTeam.id || g.awayTeamId === game.homeTeam.id).length;
    const contextGames = Math.max(awayGames, homeGames);

    // Head-to-head
    const h2h = finishedGames.filter((g: any) =>
        (g.homeTeamId === game.homeTeam.id && g.awayTeamId === game.awayTeam.id) ||
        (g.homeTeamId === game.awayTeam.id && g.awayTeamId === game.homeTeam.id)
    );
    let awayWins = 0, homeWins = 0;
    for (const g of h2h) {
        if (g.homeScore > g.awayScore) {
            if (g.homeTeamId === game.homeTeam.id) homeWins++; else awayWins++;
        } else if (g.awayScore > g.homeScore) {
            if (g.awayTeamId === game.homeTeam.id) homeWins++; else awayWins++;
        }
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center pb-20">

                {/* ═══ BACK BUTTON ═══ */}
                <div className="w-full max-w-[1000px] mt-4 px-4">
                    <button
                        onClick={() => router.back()}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors mb-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> Volver
                    </button>
                </div>

                {/* ═══ MATCHUP HEADER ═══ */}
                <div className="w-full max-w-[1000px] px-2 md:px-4 py-2 mt-2">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-blue-900/10 pointer-events-none" />

                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
                            {/* Away */}
                            <div className="flex flex-col items-center flex-1 w-full relative z-10">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-800 border-4 border-slate-700 p-2 shadow-xl mb-4 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                    {game.awayTeam?.logoUrl
                                        ? <img src={game.awayTeam.logoUrl} alt="Visitante" className="w-full h-full object-contain rounded-full" />
                                        : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-600">V</div>}
                                </div>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Visitante</span>
                                <h2 className="text-2xl md:text-3xl font-black text-white text-center tracking-tight">{game.awayTeam.name}</h2>
                            </div>

                            {/* Versus / DateTime */}
                            <div className="flex flex-col items-center shrink-0 w-full md:w-auto z-10">
                                <span className="text-xl md:text-2xl font-black text-slate-600 mb-4 tracking-widest italic">VS</span>

                                <div className="flex flex-col items-center bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 shadow-inner w-full md:w-auto">
                                    <div className="flex items-center gap-2 text-sky-400 font-bold tracking-wide mb-2 text-sm md:text-base">
                                        <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                                        {gameDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-black text-xl md:text-3xl tracking-tight">
                                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                                        {gameDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div
                                        className="mt-4 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest text-center max-w-[220px] truncate"
                                        title={tournament?.name}
                                    >
                                        {tournament?.name}
                                    </div>
                                </div>
                            </div>

                            {/* Home */}
                            <div className="flex flex-col items-center flex-1 w-full relative z-10">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-800 border-4 border-slate-700 p-2 shadow-xl mb-4 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                    {game.homeTeam?.logoUrl
                                        ? <img src={game.homeTeam.logoUrl} alt="Local" className="w-full h-full object-contain rounded-full" />
                                        : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-600">L</div>}
                                </div>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Local</span>
                                <h2 className="text-2xl md:text-3xl font-black text-white text-center tracking-tight">{game.homeTeam.name}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ STATS CONTEXT LABEL ═══ */}
                {contextGames > 0 && (
                    <div className="w-full max-w-[1000px] px-2 md:px-4 mt-3 mb-1 flex justify-center">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Estadísticas del torneo · {contextGames} {contextGames === 1 ? 'juego jugado' : 'juegos jugados'}
                        </span>
                    </div>
                )}

                {/* ═══ STATS COMPARISON ═══ */}
                <div className="w-full max-w-[1000px] px-2 md:px-4 py-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                    {/* BATTING */}
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                        <div className="flex justify-center items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-sky-400" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Bateo Colectivo</h3>
                        </div>

                        <StatRow
                            leftVal={fmtAvg(awayBat.avg)}
                            label="AVG"
                            rightVal={fmtAvg(homeBat.avg)}
                        />
                        <StatRow
                            leftVal={fmtAvg(awayBat.obp)}
                            label="OBP"
                            rightVal={fmtAvg(homeBat.obp)}
                            small
                        />
                        <StatRow
                            leftVal={fmtAvg(awayBat.slg)}
                            label="SLG"
                            rightVal={fmtAvg(homeBat.slg)}
                            small
                        />
                        <div className="border-t border-slate-800 pt-3 flex flex-col gap-3">
                            <StatRow leftVal={String(awayBat.h)}  label="H"  rightVal={String(homeBat.h)}  small />
                            <StatRow leftVal={String(awayBat.bb)} label="BB" rightVal={String(homeBat.bb)} small />
                            <StatRow leftVal={String(awayBat.hr)} label="HR" rightVal={String(homeBat.hr)} small />
                        </div>
                    </div>

                    {/* PITCHING */}
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                        <div className="flex justify-center items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Pitcheo Colectivo</h3>
                        </div>

                        <StatRow
                            leftVal={awayPit.era.toFixed(2)}
                            label="ERA"
                            rightVal={homePit.era.toFixed(2)}
                        />
                        <StatRow
                            leftVal={awayPit.whip.toFixed(2)}
                            label="WHIP"
                            rightVal={homePit.whip.toFixed(2)}
                            small
                        />
                        <div className="border-t border-slate-800 pt-3 flex flex-col gap-3">
                            <StatRow leftVal={String(awayPit.k)}  label="K"   rightVal={String(homePit.k)}  small />
                            <StatRow leftVal={String(awayPit.bb)} label="BB"  rightVal={String(homePit.bb)} small />
                            <StatRow leftVal={String(awayPit.ph)} label="H"   rightVal={String(homePit.ph)} small />
                        </div>
                    </div>
                </div>

                {/* ═══ HEAD-TO-HEAD ═══ */}
                {h2h.length > 0 && (
                    <div className="w-full max-w-[1000px] px-2 md:px-4 mt-2">
                        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                            <div className="flex justify-center items-center gap-2 mb-5">
                                <Swords className="w-5 h-5 text-violet-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Cara a Cara · Esta Temporada</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 text-center">
                                    <div className="text-4xl font-black text-white font-mono">{awayWins}</div>
                                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-1 truncate max-w-[120px] mx-auto">{game.awayTeam.name}</div>
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-center gap-1 px-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{h2h.length} {h2h.length === 1 ? 'juego' : 'juegos'}</span>
                                    <div className="flex gap-2 mt-1">
                                        {h2h.slice(-5).map((g: any, i: number) => {
                                            const awayIsAway = g.awayTeamId === game.awayTeam.id;
                                            const awayScore = awayIsAway ? g.awayScore : g.homeScore;
                                            const homeScore = awayIsAway ? g.homeScore : g.awayScore;
                                            const awayWon = awayScore > homeScore;
                                            return (
                                                <span key={i} className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${awayWon ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                    {awayWon ? 'V' : 'L'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="text-4xl font-black text-white font-mono">{homeWins}</div>
                                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-1 truncate max-w-[120px] mx-auto">{game.homeTeam.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ SEDE INFO ═══ */}
                <div className="w-full max-w-[1000px] px-2 md:px-4 mt-4">
                    <div className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                            <MapPin className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Sede Oficial del Encuentro</span>
                        <h4 className="text-xl md:text-2xl font-black text-white mb-6 uppercase tracking-wider">{fieldName}</h4>

                        {isLink ? (
                            <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold tracking-wide uppercase text-xs px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 border border-slate-600"
                            >
                                <Navigation className="w-4 h-4 text-emerald-400" /> Abrir en Google Maps
                            </a>
                        ) : mapUrl ? (
                            <p className="text-sm font-bold text-slate-400 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700">{mapUrl}</p>
                        ) : (
                            <p className="text-sm font-bold text-slate-500 italic bg-slate-800/30 px-6 py-3 rounded-xl border border-slate-800">Dirección específica de sede no disponible</p>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
