'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { isLoggedIn, getUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { ChevronLeft, ChevronRight, Save, Trophy, ClipboardList, UserPlus, X, Search } from 'lucide-react';

// ── Valid result codes ──
const VALID_CODES = [
    'H1','1B','H2','2B','H3','3B','HR','H4',
    'K','KS','KL','BB','IBB','HBP','SF','SH','FC','DP',
    'E1','E2','E3','E4','E5','E6','E7','E8','E9',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9',
    'L1','L2','L3','L4','L5','L6','L7','L8','L9',
];

const GROUND_OUT_RE = /^\d(-\d)+$/;
const isValidCode = (c: string) => {
    const u = c.toUpperCase().trim();
    return VALID_CODES.includes(u) || GROUND_OUT_RE.test(u) || /^\d+U$/.test(u);
};

const HIT_CODES = ['H1','1B','H2','2B','H3','3B','HR','H4'];
const NON_AB = ['BB','IBB','HBP','SF','SH','E1','E2','E3','E4','E5','E6','E7','E8','E9'];
const SO_CODES = ['K','KS','KL'];

const isHit = (c: string) => HIT_CODES.includes(c.toUpperCase());
const isNonAB = (c: string) => NON_AB.includes(c.toUpperCase()) || /^E\d$/.test(c.toUpperCase());
const isSO = (c: string) => SO_CODES.includes(c.toUpperCase());
const isBB = (c: string) => ['BB','IBB'].includes(c.toUpperCase());

interface Player { id: string; firstName: string; lastName: string; number?: number | null; position?: string | null; }
interface Team { id: string; name: string; players: Player[]; }
interface GameData { id: string; homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string; tournamentId: string; scheduledDate: string; status: string; maxInnings: number; lineups: any[]; }

interface BatterRow { playerId: string; playerName: string; position: string; results: string[]; runs: number; rbi: number; }
interface PitcherRow { playerId: string; playerName: string; ipWhole: number; ipThirds: number; hits: number; runs: number; earnedRuns: number; bb: number; so: number; }

const MAX_PA = 7;
const POSITIONS = ['P','C','1B','2B','3B','SS','LF','CF','RF','DH','EH'];

// ── Searchable Player Input ──
function PlayerSearchInput({ players, value, onChange, usedIds, placeholder }: { players: Player[]; value: string; onChange: (id: string) => void; usedIds: string[]; placeholder?: string }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = players.find(p => p.id === value);

    useEffect(() => {
        if (selected) setQuery(`#${selected.number || '00'} ${selected.firstName} ${selected.lastName}`);
        else setQuery('');
    }, [value, selected]);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return players
            .filter(p => !usedIds.includes(p.id) || p.id === value)
            .filter(p => !q || `#${p.number} ${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
    }, [players, usedIds, value, query]);

    return (
        <div ref={ref} className="relative flex-1">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    placeholder={placeholder || 'Buscar jugador...'}
                    value={query}
                    onFocus={() => { setOpen(true); if (value) { setQuery(''); onChange(''); } }}
                    onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onChange(''); }}
                />
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-slate-500 px-3 py-2">Sin resultados</p>
                    ) : filtered.slice(0, 10).map(p => (
                        <button key={p.id} type="button" onClick={() => { onChange(p.id); setQuery(`#${p.number || '00'} ${p.firstName} ${p.lastName}`); setOpen(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${p.id === value ? 'bg-sky-900/40 text-sky-300' : 'text-white'}`}>
                            {p.number != null && <span className="text-xs text-slate-400 w-7 flex-shrink-0">#{p.number}</span>}
                            <span className="truncate">{p.firstName} {p.lastName}</span>
                            {p.position && <span className="text-[10px] text-slate-500 ml-auto">{p.position}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ManualStatsPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [authorized, setAuthorized] = useState(false);
    const [step, setStep] = useState(1); // 1=lineup, 2=batting, 3=pitching+finalize
    const [game, setGame] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Lineup state
    const [homeLineup, setHomeLineup] = useState<{playerId:string;position:string;battingOrder:number;dhForPosition?:string}[]>([]);
    const [awayLineup, setAwayLineup] = useState<{playerId:string;position:string;battingOrder:number;dhForPosition?:string}[]>([]);

    // Batting state
    const [homeBatters, setHomeBatters] = useState<BatterRow[]>([]);
    const [awayBatters, setAwayBatters] = useState<BatterRow[]>([]);

    // Pitching state
    const [homePitchers, setHomePitchers] = useState<PitcherRow[]>([]);
    const [awayPitchers, setAwayPitchers] = useState<PitcherRow[]>([]);

    // Finalization
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [winningPitcherId, setWinningPitcherId] = useState('');
    const [losingPitcherId, setLosingPitcherId] = useState('');
    const [savePitcherId, setSavePitcherId] = useState('');
    const [mvp1Id, setMvp1Id] = useState('');
    const [mvp2Id, setMvp2Id] = useState('');
    const [totalInnings, setTotalInnings] = useState(7);

    // Game picker state (for /manual-stats/new)
    const [availableGames, setAvailableGames] = useState<any[]>([]);
    const [isNewMode] = useState(gameId === 'new');

    // Auth guard
    useEffect(() => {
        if (!isLoggedIn()) { router.replace('/login'); return; }
        const u = getUser();
        if (!u || !['admin','organizer','presi','scorekeeper'].includes(u.role)) { router.replace('/'); return; }
        setAuthorized(true);
    }, [router]);

    // Fetch game data or available games
    useEffect(() => {
        if (!authorized) return;
        if (isNewMode) {
            // Fetch all scheduled games for game selection
            (async () => {
                try {
                    const { data } = await api.get('/games?status=scheduled');
                    setAvailableGames(data || []);
                } catch { setError('No se pudieron cargar los juegos.'); }
                finally { setLoading(false); }
            })();
        } else {
            (async () => {
                try {
                    const { data } = await api.get(`/games/${gameId}`);
                    setGame(data);
                    setTotalInnings(data.maxInnings || 7);
                    const hLp = (data.lineups || []).filter((l:any) => l.teamId === data.homeTeamId).map((l:any) => ({ playerId: l.playerId, position: l.position, battingOrder: l.battingOrder, dhForPosition: l.dhForPosition || '' }));
                    const aLp = (data.lineups || []).filter((l:any) => l.teamId === data.awayTeamId).map((l:any) => ({ playerId: l.playerId, position: l.position, battingOrder: l.battingOrder, dhForPosition: l.dhForPosition || '' }));
                    if (hLp.length > 0) setHomeLineup(hLp);
                    if (aLp.length > 0) setAwayLineup(aLp);
                } catch { setError('No se pudo cargar el juego.'); }
                finally { setLoading(false); }
            })();
        }
    }, [gameId, authorized, isNewMode]);

    // Build batter rows from lineups when advancing to step 2
    const buildBatterRows = useCallback((lineup: typeof homeLineup, team: Team): BatterRow[] => {
        return lineup.filter(l => l.playerId).sort((a,b) => a.battingOrder - b.battingOrder).map(l => {
            const p = team.players.find(p => p.id === l.playerId);
            return { playerId: l.playerId, playerName: p ? `${p.firstName} ${p.lastName}` : 'Desconocido', position: l.position, results: [], runs: 0, rbi: 0 };
        });
    }, []);

    const buildPitcherRows = useCallback((lineup: typeof homeLineup, team: Team): PitcherRow[] => {
        const pitcher = lineup.find(l => ['P','1'].includes(l.position));
        if (!pitcher) return [];
        const p = team.players.find(pl => pl.id === pitcher.playerId);
        return [{ playerId: pitcher.playerId, playerName: p ? `${p.firstName} ${p.lastName}` : 'Pitcher', ipWhole: 0, ipThirds: 0, hits: 0, runs: 0, earnedRuns: 0, bb: 0, so: 0 }];
    }, []);

    const handleAdvanceToStep2 = async () => {
        if (!game) return;
        // Save lineups to backend first
        const saveLineup = async (teamId: string, lp: typeof homeLineup) => {
            const valid = lp.filter(l => l.playerId.trim() !== '');
            await api.post(`/games/${gameId}/team/${teamId}/lineup`, {
                lineups: valid.map(l => ({ battingOrder: l.battingOrder, position: l.position || 'DH', dhForPosition: l.position === 'DH' ? (l.dhForPosition || null) : null, isStarter: true, playerId: l.playerId }))
            });
        };
        try {
            if (homeLineup.length > 0) await saveLineup(game.homeTeamId, homeLineup);
            if (awayLineup.length > 0) await saveLineup(game.awayTeamId, awayLineup);
            setAwayBatters(buildBatterRows(awayLineup, game.awayTeam));
            setHomeBatters(buildBatterRows(homeLineup, game.homeTeam));
            setAwayPitchers(buildPitcherRows(awayLineup, game.awayTeam));
            setHomePitchers(buildPitcherRows(homeLineup, game.homeTeam));
            setStep(2);
        } catch (e: any) { alert(e?.response?.data?.message || 'Error al guardar lineups'); }
    };

    // Auto-calculate stats
    const calcStats = (results: string[]) => {
        const valid = results.filter(r => r.trim());
        const ab = valid.filter(r => !isNonAB(r)).length;
        const h = valid.filter(r => isHit(r)).length;
        const bb = valid.filter(r => isBB(r)).length;
        const so = valid.filter(r => isSO(r)).length;
        return { ab, h, bb, so, pa: valid.length };
    };

    const handleSubmit = async () => {
        if (!game || submitting) return;
        setSubmitting(true);
        try {
            const runsByInning: any[] = [];
            for (let i = 1; i <= totalInnings; i++) {
                runsByInning.push({ inning: i, half: 'top', runs: 0 });
                runsByInning.push({ inning: i, half: 'bottom', runs: 0 });
            }

            await api.post(`/games/${gameId}/manual-stats`, {
                homeScore, awayScore,
                awayBatters: awayBatters.map(b => ({ playerId: b.playerId, results: b.results.filter(r => r.trim()), runs: b.runs, rbi: b.rbi })),
                homeBatters: homeBatters.map(b => ({ playerId: b.playerId, results: b.results.filter(r => r.trim()), runs: b.runs, rbi: b.rbi })),
                awayPitchers: awayPitchers.map(p => ({ playerId: p.playerId, ipOuts: p.ipWhole * 3 + p.ipThirds, hits: p.hits, runs: p.runs, earnedRuns: p.earnedRuns, bb: p.bb, so: p.so })),
                homePitchers: homePitchers.map(p => ({ playerId: p.playerId, ipOuts: p.ipWhole * 3 + p.ipThirds, hits: p.hits, runs: p.runs, earnedRuns: p.earnedRuns, bb: p.bb, so: p.so })),
                runsByInning,
                winningPitcherId: winningPitcherId || undefined,
                losingPitcherId: losingPitcherId || undefined,
                savePitcherId: savePitcherId || undefined,
                mvpBatter1Id: mvp1Id || undefined,
                mvpBatter2Id: mvp2Id || undefined,
            });
            alert('✅ Estadísticas manuales registradas exitosamente.');
            router.push(`/gamefinalizado/${gameId}`);
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al guardar estadísticas.');
        } finally { setSubmitting(false); }
    };

    if (!authorized || loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Navbar /><p className="text-muted-foreground animate-pulse font-bold">Cargando...</p></div>;

    // Game picker for /manual-stats/new
    if (isNewMode) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
                    <div className="max-w-3xl mx-auto px-4 py-8">
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"><ChevronLeft className="w-5 h-5" /></button>
                            <div><h1 className="text-2xl font-black flex items-center gap-2"><ClipboardList className="w-6 h-6 text-sky-400" /> Seleccionar Juego</h1><p className="text-sm text-slate-400">Elige un juego agendado para añadir estadísticas manuales</p></div>
                        </div>
                        {availableGames.length === 0 ? (
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-8 text-center"><p className="text-slate-400 font-bold">No hay juegos agendados disponibles.</p></div>
                        ) : (
                            <div className="space-y-3">{availableGames.map((g: any) => (
                                <button key={g.id} onClick={() => router.push(`/manual-stats/${g.id}`)} className="w-full bg-slate-900/60 border border-slate-700/40 hover:border-sky-500/50 rounded-2xl p-4 text-left transition-all hover:bg-slate-800/60 group">
                                    <div className="flex items-center justify-between">
                                        <div><p className="font-black text-white group-hover:text-sky-400 transition">{g.awayTeam?.name || 'Visitante'} vs {g.homeTeam?.name || 'Local'}</p><p className="text-xs text-slate-400 mt-1">{g.scheduledDate ? new Date(g.scheduledDate).toLocaleDateString('es-PR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Sin fecha'} {g.tournament?.name ? `• ${g.tournament.name}` : ''}</p></div>
                                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 transition" />
                                    </div>
                                </button>
                            ))}</div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    if (error || !game) return <div className="min-h-screen bg-background flex items-center justify-center"><Navbar /><p className="text-red-500 font-bold">{error || 'Juego no encontrado'}</p></div>;

    const allPitchers = [...awayPitchers, ...homePitchers];
    const allBatters = [...awayBatters, ...homeBatters];

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"><ChevronLeft className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-2xl font-black flex items-center gap-2"><ClipboardList className="w-6 h-6 text-sky-400" /> Estadísticas Manuales</h1>
                            <p className="text-sm text-slate-400">{game.awayTeam.name} vs {game.homeTeam.name}</p>
                        </div>
                    </div>

                    {/* Steps indicator */}
                    <div className="flex items-center gap-2 mb-8">
                        {[{n:1,l:'Lineups'},{n:2,l:'Bateo'},{n:3,l:'Pitcheo & Final'}].map(s => (
                            <div key={s.n} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${step === s.n ? 'bg-sky-600 text-white shadow-lg' : step > s.n ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'}`}>
                                <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-xs font-black">{step > s.n ? '✓' : s.n}</span>
                                <span className="hidden sm:inline">{s.l}</span>
                            </div>
                        ))}
                    </div>

                    {/* STEP 1: LINEUPS */}
                    {step === 1 && (
                        <div className="animate-fade-in-up">
                            <div className="grid lg:grid-cols-2 gap-6 mb-8">
                                {[{label:'Visitante', team:game.awayTeam, lineup:awayLineup, setLineup:setAwayLineup, teamId:game.awayTeamId},
                                  {label:'Local', team:game.homeTeam, lineup:homeLineup, setLineup:setHomeLineup, teamId:game.homeTeamId}].map(({label, team, lineup, setLineup}) => (
                                    <div key={label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                                        <h3 className="text-lg font-black text-sky-400 uppercase tracking-wider mb-4">{label}: {team.name}</h3>
                                        <div className="space-y-2">
                                            {[1,2,3,4,5,6,7,8,9,10,11].map(order => {
                                                const entry = lineup.find(l => l.battingOrder === order);
                                                const usedIds = lineup.filter(l => l.battingOrder !== order && l.playerId).map(l => l.playerId);
                                                return (
                                                    <div key={order} className="flex items-center gap-2">
                                                        <span className="w-6 text-xs text-slate-500 font-bold text-center">{order}</span>
                                                        <PlayerSearchInput
                                                            players={team.players}
                                                            value={entry?.playerId || ''}
                                                            usedIds={usedIds}
                                                            onChange={id => {
                                                                const newLp = [...lineup];
                                                                const idx = newLp.findIndex(l => l.battingOrder === order);
                                                                if (idx >= 0) newLp[idx].playerId = id;
                                                                else newLp.push({playerId: id, position: '', battingOrder: order});
                                                                setLineup(newLp);
                                                            }}
                                                        />
                                                        <select className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white font-bold focus:border-sky-500 outline-none" value={entry?.position || ''} onChange={e => {
                                                            const newLp = [...lineup];
                                                            const idx = newLp.findIndex(l => l.battingOrder === order);
                                                            if (idx >= 0) newLp[idx].position = e.target.value;
                                                            else newLp.push({playerId: '', position: e.target.value, battingOrder: order});
                                                            setLineup(newLp);
                                                        }}>
                                                            <option value="">POS</option>
                                                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAdvanceToStep2} disabled={homeLineup.filter(l=>l.playerId).length < 9 || awayLineup.filter(l=>l.playerId).length < 9} className="w-full py-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg">
                                Continuar al Bateo <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: BATTING */}
                    {step === 2 && (
                        <div className="animate-fade-in-up">
                            {[{label:'Visitante', team:game.awayTeam, batters:awayBatters, setBatters:setAwayBatters},
                              {label:'Local', team:game.homeTeam, batters:homeBatters, setBatters:setHomeBatters}].map(({label, team, batters, setBatters}) => (
                                <div key={label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 mb-6 overflow-x-auto">
                                    <h3 className="text-lg font-black text-sky-400 uppercase tracking-wider mb-3">{label}: {team.name}</h3>
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase">
                                            <th className="py-2 text-left w-8">#</th>
                                            <th className="py-2 text-left">Jugador</th>
                                            <th className="py-2 text-center w-10">Pos</th>
                                            {Array.from({length:MAX_PA},(_,i)=>(<th key={i} className="py-2 text-center w-16">{i+1}°</th>))}
                                            <th className="py-2 text-center w-10 text-amber-400">AB</th>
                                            <th className="py-2 text-center w-10 text-emerald-400">H</th>
                                            <th className="py-2 text-center w-10 text-sky-400">R</th>
                                            <th className="py-2 text-center w-10 text-orange-400">RBI</th>
                                            <th className="py-2 text-center w-10">BB</th>
                                            <th className="py-2 text-center w-10">SO</th>
                                        </tr></thead>
                                        <tbody>{batters.map((b,bi) => {
                                            const stats = calcStats(b.results);
                                            return (
                                                <tr key={b.playerId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                    <td className="py-1.5 text-slate-500 font-bold">{bi+1}</td>
                                                    <td className="py-1.5">
                                                        {b.playerId ? (
                                                            <span className="text-white font-semibold text-xs whitespace-nowrap">{b.playerName}</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <PlayerSearchInput
                                                                    players={team.players}
                                                                    value={b.playerId}
                                                                    usedIds={batters.filter((_,i) => i !== bi && _.playerId).map(x => x.playerId)}
                                                                    placeholder="Buscar sustituto..."
                                                                    onChange={id => {
                                                                        const p = team.players.find(x => x.id === id);
                                                                        const nb = [...batters];
                                                                        nb[bi] = { ...b, playerId: id, playerName: p ? `${p.firstName} ${p.lastName}` : '' };
                                                                        setBatters(nb);
                                                                    }}
                                                                />
                                                                <button onClick={() => setBatters(batters.filter((_,i) => i !== bi))} className="text-red-500/50 hover:text-red-500 flex-shrink-0 p-1"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-1.5 text-center">
                                                        {b.playerId && !b.position ? (
                                                            <select className="bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-sky-400 px-1 py-0.5 focus:outline-none w-12" value={b.position} onChange={e => { const nb=[...batters]; nb[bi]={...b,position:e.target.value}; setBatters(nb); }}>
                                                                <option value="">—</option>
                                                                <option value="PH">PH</option>
                                                                <option value="PR">PR</option>
                                                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${b.position === 'PH' || b.position === 'PR' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>{b.position}</span>
                                                        )}
                                                    </td>
                                                    {Array.from({length:MAX_PA},(_,pi) => (
                                                        <td key={pi} className="py-1.5 text-center px-0.5">
                                                            <input type="text" maxLength={5} className={`w-14 text-center bg-slate-800 border rounded-lg px-1 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 transition-all uppercase ${b.results[pi] && !isValidCode(b.results[pi]) ? 'border-red-500 text-red-400 focus:ring-red-500' : b.results[pi] && isHit(b.results[pi]) ? 'border-emerald-500/50 text-emerald-400 focus:ring-emerald-500' : 'border-slate-700 text-white focus:ring-sky-500'}`}
                                                                value={b.results[pi] || ''}
                                                                onChange={e => {
                                                                    const newBatters = [...batters];
                                                                    const newResults = [...b.results];
                                                                    while (newResults.length <= pi) newResults.push('');
                                                                    newResults[pi] = e.target.value.toUpperCase();
                                                                    newBatters[bi] = {...b, results: newResults};
                                                                    setBatters(newBatters);
                                                                }}
                                                                placeholder="—"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="py-1.5 text-center font-bold text-amber-400">{stats.ab}</td>
                                                    <td className="py-1.5 text-center font-bold text-emerald-400">{stats.h}</td>
                                                    <td className="py-1.5 text-center px-0.5"><input type="number" min={0} className="w-10 text-center bg-slate-800 border border-slate-700 rounded-lg px-1 py-1 text-xs font-bold text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500" value={b.runs} onChange={e => { const nb=[...batters]; nb[bi]={...b,runs:+e.target.value||0}; setBatters(nb); }} /></td>
                                                    <td className="py-1.5 text-center px-0.5"><input type="number" min={0} className="w-10 text-center bg-slate-800 border border-slate-700 rounded-lg px-1 py-1 text-xs font-bold text-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" value={b.rbi} onChange={e => { const nb=[...batters]; nb[bi]={...b,rbi:+e.target.value||0}; setBatters(nb); }} /></td>
                                                    <td className="py-1.5 text-center font-bold text-slate-400">{stats.bb}</td>
                                                    <td className="py-1.5 text-center font-bold text-slate-400">{stats.so}</td>
                                                </tr>
                                            );
                                        })}</tbody>
                                    </table>
                                    {/* Add substitute batter */}
                                    <div className="mt-3 border-t border-slate-700/30 pt-3">
                                        <button onClick={() => {
                                            setBatters([...batters, { playerId: '', playerName: '', position: 'PH', results: [], runs: 0, rbi: 0 }]);
                                        }} className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-bold transition">
                                            <UserPlus className="w-3.5 h-3.5" /> Agregar Sustituto / Cambio
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {/* Legend */}
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 mb-6">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Leyenda de Códigos</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1 text-[10px]">
                                    {[['H1/1B','Sencillo'],['H2/2B','Doble'],['H3/3B','Triple'],['HR','Jonrón'],['K','Ponche'],['KL','Ponche viendo'],['BB','Base x bolas'],['IBB','BB intencional'],['HBP','Golpeado'],['SF','Sacrifice fly'],['SH','Sacrifice bunt'],['FC','Fielder choice'],['DP','Doble play'],['E1-E9','Error (pos)'],['F1-F9','Fly out'],['L1-L9','Línea out'],['6-3','Rola out','']].map(([code,desc]) => (
                                        <div key={code} className="flex gap-1 items-center"><span className="font-bold text-sky-400">{code}</span><span className="text-slate-500">{desc}</span></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</button>
                                <button onClick={() => setStep(3)} className="flex-[2] py-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg">Pitcheo & Finalización <ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PITCHING + FINALIZATION */}
                    {step === 3 && (
                        <div className="animate-fade-in-up">
                            {/* Score */}
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 mb-6">
                                <h3 className="text-lg font-black text-white mb-4">Marcador Final</h3>
                                <div className="flex items-center justify-center gap-6">
                                    <div className="text-center"><p className="text-xs text-slate-400 font-bold mb-1">{game.awayTeam.name}</p><input type="number" min={0} className="w-20 text-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-500" value={awayScore} onChange={e => setAwayScore(+e.target.value||0)} /></div>
                                    <span className="text-2xl font-black text-slate-600">—</span>
                                    <div className="text-center"><p className="text-xs text-slate-400 font-bold mb-1">{game.homeTeam.name}</p><input type="number" min={0} className="w-20 text-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-500" value={homeScore} onChange={e => setHomeScore(+e.target.value||0)} /></div>
                                </div>
                                <div className="flex items-center justify-center gap-3 mt-4">
                                    <label className="text-xs text-slate-400 font-bold">Entradas jugadas:</label>
                                    <input type="number" min={1} max={20} className="w-16 text-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-sky-500" value={totalInnings} onChange={e => setTotalInnings(+e.target.value||7)} />
                                </div>
                            </div>

                            {/* Pitching tables */}
                            {[{label:'Pitcheo Visitante', pitchers:awayPitchers, setPitchers:setAwayPitchers, team:game.awayTeam},
                              {label:'Pitcheo Local', pitchers:homePitchers, setPitchers:setHomePitchers, team:game.homeTeam}].map(({label, pitchers, setPitchers, team}) => (
                                <div key={label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 mb-6 overflow-x-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-black text-sky-400 uppercase tracking-wider">{label}</h3>
                                        <button onClick={() => { const p = team.players[0]; if(!p)return; setPitchers([...pitchers,{playerId:p.id,playerName:`${p.firstName} ${p.lastName}`,ipWhole:0,ipThirds:0,hits:0,runs:0,earnedRuns:0,bb:0,so:0}]); }} className="text-xs text-sky-400 hover:text-sky-300 font-bold">+ Agregar pitcher</button>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-slate-700/50 text-slate-400 text-[10px] uppercase">
                                            <th className="py-2 text-left">Pitcher</th><th className="py-2 text-center w-20">IP</th><th className="py-2 text-center w-12">H</th><th className="py-2 text-center w-12">R</th><th className="py-2 text-center w-12">ER</th><th className="py-2 text-center w-12">BB</th><th className="py-2 text-center w-12">K</th><th className="w-8"></th>
                                        </tr></thead>
                                        <tbody>{pitchers.map((p,pi) => (
                                            <tr key={pi} className="border-b border-slate-800/50">
                                                <td className="py-1.5"><select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-full" value={p.playerId} onChange={e => { const np=[...pitchers]; const pl=team.players.find(x=>x.id===e.target.value); np[pi]={...p,playerId:e.target.value,playerName:pl?`${pl.firstName} ${pl.lastName}`:''}; setPitchers(np); }}>
                                                    {team.players.map(pl => <option key={pl.id} value={pl.id}>{pl.firstName} {pl.lastName}</option>)}
                                                </select></td>
                                                <td className="py-1.5 text-center"><div className="flex items-center justify-center gap-0.5"><input type="number" min={0} className="w-8 text-center bg-slate-800 border border-slate-700 rounded-l-lg px-1 py-1.5 text-xs font-bold text-white focus:outline-none" value={p.ipWhole} onChange={e=>{const np=[...pitchers];np[pi]={...p,ipWhole:+e.target.value||0};setPitchers(np);}}/><span className="text-slate-500 text-xs">.</span><select className="w-10 text-center bg-slate-800 border border-slate-700 rounded-r-lg px-0 py-1.5 text-xs font-bold text-white focus:outline-none" value={p.ipThirds} onChange={e=>{const np=[...pitchers];np[pi]={...p,ipThirds:+e.target.value};setPitchers(np);}}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></div></td>
                                                {(['hits','runs','earnedRuns','bb','so'] as const).map(f => (
                                                    <td key={f} className="py-1.5 text-center"><input type="number" min={0} className="w-10 text-center bg-slate-800 border border-slate-700 rounded-lg px-1 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-sky-500" value={p[f]} onChange={e=>{const np=[...pitchers];np[pi]={...p,[f]:+e.target.value||0};setPitchers(np);}}/></td>
                                                ))}
                                                <td><button onClick={()=>setPitchers(pitchers.filter((_,i)=>i!==pi))} className="text-red-500/50 hover:text-red-500 text-xs">✕</button></td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            ))}

                            {/* Pitcher decisions + MVPs */}
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 mb-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Decisiones & MVP</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                    {[{l:'Pitcher Ganador (W)',v:winningPitcherId,s:setWinningPitcherId,c:'text-amber-400'},
                                      {l:'Pitcher Perdedor (L)',v:losingPitcherId,s:setLosingPitcherId,c:'text-red-400'},
                                      {l:'Salvado (SV)',v:savePitcherId,s:setSavePitcherId,c:'text-emerald-400'}].map(({l,v,s,c}) => (
                                        <div key={l}><label className={`block text-xs font-black uppercase tracking-widest mb-1 ${c}`}>{l}</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-sky-500/50 outline-none" value={v} onChange={e => s(e.target.value)}>
                                            <option value="">-- No asignado --</option>
                                            {allPitchers.map(p => <option key={p.playerId} value={p.playerId}>{p.playerName}</option>)}
                                        </select></div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[{l:'MVP Bateador #1',v:mvp1Id,s:setMvp1Id},{l:'MVP Bateador #2',v:mvp2Id,s:setMvp2Id}].map(({l,v,s}) => (
                                        <div key={l}><label className="block text-xs font-black text-sky-400 uppercase tracking-widest mb-1">{l}</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-sky-500/50 outline-none" value={v} onChange={e => s(e.target.value)}>
                                            <option value="">-- No asignado --</option>
                                            {allBatters.map(b => <option key={b.playerId} value={b.playerId}>{b.playerName}</option>)}
                                        </select></div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</button>
                                <button onClick={handleSubmit} disabled={submitting} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-lg">
                                    {submitting ? 'Guardando...' : <><Trophy className="w-5 h-5" /> Guardar & Finalizar</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
