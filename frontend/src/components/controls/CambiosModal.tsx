'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useGameStore } from '@/store/gameStore';
import { getUser } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangeType = 'SUSTITUCION' | 'POSICION' | 'REINGRESO';

interface EligiblePlayer {
    playerId: string;
    battingOrder?: number;
    position?: string;
    dhForPosition?: string | null;
    isStarter?: boolean;
    firstName: string;
    lastName: string;
    number?: number | null;
    lineupId?: string;
    sustitutoActual?: {
        lineupId: string;
        playerId: string;
        firstName: string;
        lastName: string;
        number?: number | null;
    } | null;
}

interface Elegibles {
    puedenSalir: EligiblePlayer[];
    puedenEntrar: EligiblePlayer[];
    puedenReingresar: EligiblePlayer[];
}

interface PositionSwap { fromPosition: string; toPosition: string; }

const DEFENSIVE_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF'];

const POS_NUM: Record<string, string> = {
    P: '1', C: '2', '1B': '3', '2B': '4', '3B': '5',
    SS: '6', LF: '7', CF: '8', RF: '9',
};

// Field grid layout: [position, col, row] (CSS grid 3×3 conceptual)
const FIELD_POSITIONS = [
    { pos: 'LF', label: 'LF', col: 1, row: 1 },
    { pos: 'CF', label: 'CF', col: 2, row: 1 },
    { pos: 'RF', label: 'RF', col: 3, row: 1 },
    { pos: '3B', label: '3B', col: 1, row: 2 },
    { pos: 'SS', label: 'SS', col: 2, row: 2 },
    { pos: '2B', label: '2B', col: 3, row: 2 },
    { pos: '1B', label: '1B', col: 4, row: 2 },
    { pos: 'P',  label: 'P',  col: 2, row: 3 },
    { pos: 'C',  label: 'C',  col: 2, row: 4 },
];

const playerName = (p: { firstName: string; lastName: string; number?: number | null }) =>
    `${p.number != null ? `#${p.number} ` : ''}${p.firstName} ${p.lastName}`;

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
    return (
        <div className="flex gap-1.5 items-center justify-center my-1">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`rounded-full transition-all ${i < current
                        ? 'w-2 h-2 bg-emerald-400'
                        : i === current
                            ? 'w-3 h-3 bg-emerald-400 ring-2 ring-emerald-400/40'
                            : 'w-2 h-2 bg-slate-600'
                        }`}
                />
            ))}
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void; }

export default function CambiosModal({ isOpen, onClose }: Props) {
    const { gameId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, fetchGameConfig, syncStateToBackend } = useGameStore();

    // wizard state
    const [step, setStep] = useState(0);   // 0=equipo, 1=tipo, 2=detalle, 3=review
    const [teamId, setTeamId] = useState<string>('');
    const [changeType, setChangeType] = useState<ChangeType | null>(null);

    // elegibles
    const [elegibles, setElegibles] = useState<Elegibles | null>(null);
    const [loadingElegibles, setLoadingElegibles] = useState(false);

    // sustitución
    const [subPlayerOutId, setSubPlayerOutId] = useState('');
    const [subPlayerInId, setSubPlayerInId] = useState('');
    const [subPosition, setSubPosition] = useState('');
    const [subDhFor, setSubDhFor] = useState('');

    // posición
    const [posSwaps, setPosSwaps] = useState<PositionSwap[]>([]);
    const [posSelecting, setPosSelecting] = useState<string | null>(null); // fromPos pendiente

    // reingreso
    const [reingresoPId, setReingresoPId] = useState('');

    // new player registration (streamer only)
    const isStreamer = getUser()?.role === 'streamer';
    const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
    const [newPlayerFirstName, setNewPlayerFirstName] = useState('');
    const [newPlayerLastName, setNewPlayerLastName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');
    const [savingNewPlayer, setSavingNewPlayer] = useState(false);

    // submit
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep(0); setTeamId(''); setChangeType(null);
            setElegibles(null); setError(null);
            setSubPlayerOutId(''); setSubPlayerInId(''); setSubPosition(''); setSubDhFor('');
            setPosSwaps([]); setPosSelecting(null); setReingresoPId('');
            setShowNewPlayerForm(false); setNewPlayerFirstName(''); setNewPlayerLastName(''); setNewPlayerNumber('');
        }
    }, [isOpen]);

    // load elegibles when team is selected and we pass step 0
    const loadElegibles = useCallback(async (tid: string) => {
        if (!gameId || !tid) return;
        setLoadingElegibles(true);
        try {
            const { data } = await api.get(`/games/${gameId}/cambios/elegibles/${tid}`);
            setElegibles(data);
        } catch {
            setElegibles({ puedenSalir: [], puedenEntrar: [], puedenReingresar: [] });
        } finally {
            setLoadingElegibles(false);
        }
    }, [gameId]);

    // ── Position swap helpers ─────────────────────────────────────────────────
    const currentPosLineup = elegibles?.puedenSalir ?? [];

    // Build a map of what position each player currently occupies (after applying posSwaps)
    const currentPosMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of currentPosLineup) {
            if (p.position && DEFENSIVE_POSITIONS.includes(p.position)) {
                map[p.position] = p.position;
            }
        }
        for (const sw of posSwaps) {
            map[sw.toPosition] = sw.toPosition;
            delete map[sw.fromPosition];
        }
        return map;
    }, [currentPosLineup, posSwaps]);

    // Get player at a position (considering swaps already applied)
    const playerAtPos = (pos: string): EligiblePlayer | undefined => {
        // apply swaps in order
        const swapped = new Map<string, string>(); // originalPos -> currentPos
        for (const p of currentPosLineup) {
            if (p.position) swapped.set(p.position, p.position);
        }
        for (const sw of posSwaps) {
            for (const [orig, cur] of swapped) {
                if (cur === sw.fromPosition) swapped.set(orig, sw.toPosition);
            }
        }
        for (const p of currentPosLineup) {
            if (p.position && swapped.get(p.position) === pos) return p;
        }
        return undefined;
    };

    const handlePosClick = (pos: string) => {
        if (!DEFENSIVE_POSITIONS.includes(pos)) return;
        const playerHere = playerAtPos(pos);
        if (!playerHere) return;

        if (!posSelecting) {
            // start: pick from
            setPosSelecting(pos);
        } else if (posSelecting === pos) {
            // deselect
            setPosSelecting(null);
        } else {
            // pick to: add swap
            setPosSwaps(prev => [...prev, { fromPosition: posSelecting, toPosition: pos }]);
            setPosSelecting(null);
        }
    };

    const removeLastSwap = () => {
        setPosSwaps(prev => prev.slice(0, -1));
        setPosSelecting(null);
    };

    // ── Review summary ────────────────────────────────────────────────────────
    const teamName = teamId === homeTeamId ? homeTeamName : awayTeamName;

    const reviewLines = useMemo(() => {
        if (changeType === 'SUSTITUCION') {
            const out = elegibles?.puedenSalir.find(p => p.playerId === subPlayerOutId);
            const inn = elegibles?.puedenEntrar.find(p => p.playerId === subPlayerInId);
            return [
                `Sale: ${out ? playerName(out) : '—'} (${out?.position ?? ''})`,
                `Entra: ${inn ? playerName(inn) : '—'} como ${subPosition}${subPosition === 'DH' && subDhFor ? ` por ${subDhFor}` : ''}`,
            ];
        }
        if (changeType === 'POSICION') {
            return posSwaps.map(sw => {
                const fromP = currentPosLineup.find(p => p.position === sw.fromPosition);
                const toP = currentPosLineup.find(p => p.position === sw.toPosition);
                return `${fromP ? `${fromP.lastName} (${sw.fromPosition})` : sw.fromPosition} → ${toP ? `${toP.lastName} (${sw.toPosition})` : sw.toPosition}`;
            });
        }
        if (changeType === 'REINGRESO') {
            const starter = elegibles?.puedenReingresar.find(p => p.playerId === reingresoPId);
            return [
                `Regresa: ${starter ? playerName(starter) : '—'} a orden #${starter?.battingOrder} (${starter?.position})`,
                `Sale: ${starter?.sustitutoActual ? playerName(starter.sustitutoActual) : '—'}`,
            ];
        }
        return [];
    }, [changeType, subPlayerOutId, subPlayerInId, subPosition, subDhFor, posSwaps, reingresoPId, elegibles, currentPosLineup]);

    // ── Validation ────────────────────────────────────────────────────────────
    const canProceedToReview = useMemo(() => {
        if (changeType === 'SUSTITUCION') return !!subPlayerOutId && !!subPlayerInId && !!subPosition && (subPosition !== 'DH' || !!subDhFor);
        if (changeType === 'POSICION') return posSwaps.length > 0;
        if (changeType === 'REINGRESO') return !!reingresoPId;
        return false;
    }, [changeType, subPlayerOutId, subPlayerInId, subPosition, subDhFor, posSwaps, reingresoPId]);

    // ── Register new player (streamer) ───────────────────────────────────────
    const handleSaveNewPlayer = async () => {
        if (!gameId || !teamId) return;
        const firstName = newPlayerFirstName.trim();
        const lastName = newPlayerLastName.trim();
        if (!firstName && !lastName) return;
        setSavingNewPlayer(true);
        setError(null);
        try {
            await api.post(`/streamer/games/${gameId}/team/${teamId}/players`, {
                firstName: firstName || '—',
                lastName: lastName || '—',
                number: newPlayerNumber ? parseInt(newPlayerNumber) : undefined,
            });
            // reload elegibles so the new player appears in puedenEntrar
            await loadElegibles(teamId);
            setShowNewPlayerForm(false);
            setNewPlayerFirstName(''); setNewPlayerLastName(''); setNewPlayerNumber('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error registrando el jugador.');
        } finally {
            setSavingNewPlayer(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!gameId) return;
        setError(null);
        setLoading(true);
        try {
            if (changeType === 'SUSTITUCION') {
                await api.post(`/games/${gameId}/cambios/sustitucion`, {
                    teamId,
                    playerOutId: subPlayerOutId,
                    playerInId: subPlayerInId,
                    position: subPosition,
                    dhForPosition: subPosition === 'DH' ? subDhFor : undefined,
                });

                // Si el jugador que sale estaba en base, actualizar el corredor al nuevo jugador
                const playerIn = elegibles?.puedenEntrar.find(p => p.playerId === subPlayerInId);
                if (playerIn) {
                    const { baseIds, bases } = useGameStore.getState();
                    const newBaseIds = { ...baseIds };
                    const newBases = { ...bases };
                    const inName = `${playerIn.firstName} ${playerIn.lastName}`;
                    if (newBaseIds.first === subPlayerOutId)  { newBaseIds.first  = subPlayerInId; newBases.first  = inName; }
                    if (newBaseIds.second === subPlayerOutId) { newBaseIds.second = subPlayerInId; newBases.second = inName; }
                    if (newBaseIds.third === subPlayerOutId)  { newBaseIds.third  = subPlayerInId; newBases.third  = inName; }
                    useGameStore.setState({ baseIds: newBaseIds, bases: newBases });
                }
            } else if (changeType === 'POSICION') {
                await api.post(`/games/${gameId}/cambios/posicion`, { teamId, swaps: posSwaps });
            } else if (changeType === 'REINGRESO') {
                await api.post(`/games/${gameId}/cambios/reingreso`, { teamId, starterPlayerId: reingresoPId });
            }
            await fetchGameConfig();
            syncStateToBackend();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error al guardar cambio.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    // ── Render steps ──────────────────────────────────────────────────────────
    const totalSteps = 4;

    const content = (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-700/60 shrink-0">
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button
                                onClick={() => { setStep(s => s - 1); setError(null); }}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <h2 className="text-base font-black text-emerald-300 uppercase tracking-wide">
                            {step === 0 && 'Cambios'}
                            {step === 1 && teamName}
                            {step === 2 && (changeType === 'SUSTITUCION' ? 'Sustitución' : changeType === 'POSICION' ? 'Cambio de Posición' : 'Reingreso')}
                            {step === 3 && 'Confirmar'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <StepDots total={totalSteps} current={step} />

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">

                    {/* ── STEP 0: equipo ── */}
                    {step === 0 && (
                        <div className="space-y-3 pt-2">
                            <p className="text-slate-400 text-sm text-center mb-4">¿A qué equipo le harás el cambio?</p>
                            {[
                                { id: awayTeamId, name: awayTeamName, label: 'Visitante' },
                                { id: homeTeamId, name: homeTeamName, label: 'Local' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTeamId(t.id ?? '');
                                        loadElegibles(t.id ?? '');
                                        setStep(1);
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500 active:scale-[0.98] transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="text-xs text-slate-400 font-bold uppercase">{t.label}</div>
                                        <div className="text-white font-bold text-base">{t.name}</div>
                                    </div>
                                    <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── STEP 1: tipo de cambio ── */}
                    {step === 1 && (
                        <div className="space-y-3 pt-2">
                            <p className="text-slate-400 text-sm text-center mb-4">¿Qué tipo de cambio?</p>
                            {[
                                {
                                    type: 'SUSTITUCION' as ChangeType,
                                    icon: '🔄',
                                    title: 'Sustitución',
                                    desc: 'Sale un jugador, entra uno del roster (bateo y fildeo)',
                                    disabled: (elegibles?.puedenSalir.length ?? 0) === 0,
                                },
                                {
                                    type: 'POSICION' as ChangeType,
                                    icon: '🛡️',
                                    title: 'Cambio de Posición',
                                    desc: 'Reorganización defensiva entre jugadores en juego',
                                    disabled: (elegibles?.puedenSalir.filter(p => p.position && DEFENSIVE_POSITIONS.includes(p.position)).length ?? 0) < 2,
                                },
                                {
                                    type: 'REINGRESO' as ChangeType,
                                    icon: '↩️',
                                    title: 'Reingreso',
                                    desc: (elegibles?.puedenReingresar.length ?? 0) === 0
                                        ? 'Requiere una sustitución previa (ningún titular ha salido aún)'
                                        : 'Un titular sustituido regresa al juego (WBSC: 1 vez)',
                                    disabled: (elegibles?.puedenReingresar.length ?? 0) === 0,
                                },
                            ].map(opt => (
                                <button
                                    key={opt.type}
                                    disabled={opt.disabled || loadingElegibles}
                                    onClick={() => {
                                        setChangeType(opt.type);
                                        setStep(2);
                                    }}
                                    className="w-full flex items-start gap-3 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed group text-left"
                                >
                                    <span className="text-2xl mt-0.5 shrink-0">{opt.icon}</span>
                                    <div className="flex-1">
                                        <div className="text-white font-bold text-sm">{opt.title}</div>
                                        <div className="text-slate-400 text-xs mt-0.5">{opt.desc}</div>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                            {loadingElegibles && (
                                <p className="text-center text-slate-500 text-xs py-2">Cargando roster...</p>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2A: Sustitución ── */}
                    {step === 2 && changeType === 'SUSTITUCION' && (
                        <div className="space-y-4 pt-1">
                            {/* Sale */}
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-1.5">Sale del juego</label>
                                <div className="space-y-1.5">
                                    {elegibles?.puedenSalir.map(p => (
                                        <button
                                            key={p.playerId}
                                            onClick={() => { setSubPlayerOutId(p.playerId); setSubPosition(p.position ?? ''); }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${subPlayerOutId === p.playerId
                                                ? 'bg-rose-500/20 border-rose-500 text-white'
                                                : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-400'}`}
                                        >
                                            <span className="text-sm font-medium">{playerName(p)}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${subPlayerOutId === p.playerId ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-700 text-slate-400'}`}>
                                                {p.position}{p.battingOrder ? ` · #${p.battingOrder}` : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Entra */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wide">Entra al juego</label>
                                    {isStreamer && !showNewPlayerForm && (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPlayerForm(true)}
                                            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <span>+</span> Registrar nuevo jugador
                                        </button>
                                    )}
                                </div>

                                {/* New player inline form (streamer only) */}
                                {isStreamer && showNewPlayerForm && (
                                    <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 mb-2 space-y-2">
                                        <p className="text-xs text-amber-400 font-bold">Nuevo jugador</p>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                                                placeholder="Nombre"
                                                value={newPlayerFirstName}
                                                onChange={e => setNewPlayerFirstName(e.target.value)}
                                            />
                                            <input
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                                                placeholder="Apellido"
                                                value={newPlayerLastName}
                                                onChange={e => setNewPlayerLastName(e.target.value)}
                                            />
                                            <input
                                                className="w-12 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="#"
                                                type="number"
                                                min={0}
                                                max={99}
                                                value={newPlayerNumber}
                                                onChange={e => setNewPlayerNumber(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSaveNewPlayer}
                                                disabled={savingNewPlayer || (!newPlayerFirstName.trim() && !newPlayerLastName.trim())}
                                                className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold text-xs transition-colors"
                                            >
                                                {savingNewPlayer ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowNewPlayerForm(false); setNewPlayerFirstName(''); setNewPlayerLastName(''); setNewPlayerNumber(''); }}
                                                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    {elegibles?.puedenEntrar.length === 0 && !showNewPlayerForm && (
                                        <p className="text-slate-500 text-xs text-center py-2">No hay jugadores disponibles en el roster.</p>
                                    )}
                                    {elegibles?.puedenEntrar.map(p => (
                                        <button
                                            key={p.playerId}
                                            onClick={() => setSubPlayerInId(p.playerId)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${subPlayerInId === p.playerId
                                                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                                                : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-400'}`}
                                        >
                                            <span className="text-sm font-medium">{playerName(p)}</span>
                                            {subPlayerInId === p.playerId && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Posición */}
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-1.5">Posición defensiva</label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {DEFENSIVE_POSITIONS.map(pos => (
                                        <button
                                            key={pos}
                                            onClick={() => { setSubPosition(pos); if (pos !== 'DH') setSubDhFor(''); }}
                                            className={`py-2.5 rounded-xl text-xs font-black border transition-all active:scale-[0.98] ${subPosition === pos
                                                ? 'bg-emerald-500 text-slate-900 border-emerald-400'
                                                : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400'}`}
                                        >
                                            {pos}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSubPosition('DH')}
                                        className={`py-2.5 rounded-xl text-xs font-black border transition-all active:scale-[0.98] ${subPosition === 'DH'
                                            ? 'bg-amber-500 text-slate-900 border-amber-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400'}`}
                                    >
                                        DH
                                    </button>
                                </div>
                            </div>

                            {/* DH anchor */}
                            {subPosition === 'DH' && (
                                <div>
                                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-1.5">DH batea por (posición defensiva)</label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {DEFENSIVE_POSITIONS.map(pos => {
                                            const occupied = elegibles?.puedenSalir.some(p => p.position === pos);
                                            return (
                                                <button
                                                    key={pos}
                                                    disabled={!occupied}
                                                    onClick={() => setSubDhFor(pos)}
                                                    className={`py-2.5 rounded-xl text-xs font-black border transition-all active:scale-[0.98] disabled:opacity-30 ${subDhFor === pos
                                                        ? 'bg-amber-500 text-slate-900 border-amber-400'
                                                        : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400'}`}
                                                >
                                                    {pos}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2B: Cambio de posición ── */}
                    {step === 2 && changeType === 'POSICION' && (
                        <div className="space-y-3 pt-1">
                            <p className="text-slate-400 text-xs text-center">
                                {posSelecting
                                    ? `Toca la posición destino para ${posSelecting}`
                                    : 'Toca una posición para moverla'}
                            </p>

                            {/* Mini field grid */}
                            <div className="grid gap-1.5 mx-auto max-w-xs" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, auto)' }}>
                                {FIELD_POSITIONS.map(fp => {
                                    const player = playerAtPos(fp.pos);
                                    const isSwapFrom = posSwaps.some(s => s.fromPosition === fp.pos);
                                    const isSwapTo = posSwaps.some(s => s.toPosition === fp.pos);
                                    const isSelecting = posSelecting === fp.pos;
                                    const isTarget = !!posSelecting && posSelecting !== fp.pos && !!player;

                                    return (
                                        <button
                                            key={fp.pos}
                                            onClick={() => handlePosClick(fp.pos)}
                                            style={{ gridColumn: fp.col, gridRow: fp.row }}
                                            className={`flex flex-col items-center justify-center rounded-xl p-1.5 border transition-all active:scale-95 min-h-[52px] ${
                                                isSelecting
                                                    ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/50'
                                                    : isSwapFrom
                                                        ? 'bg-amber-500/20 border-amber-400'
                                                        : isSwapTo
                                                            ? 'bg-sky-500/20 border-sky-400'
                                                            : isTarget
                                                                ? 'bg-slate-700 border-slate-400 hover:border-emerald-400 animate-pulse'
                                                                : 'bg-slate-800 border-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-slate-400">{POS_NUM[fp.pos]}</span>
                                            <span className="text-[10px] font-bold text-white">{fp.label}</span>
                                            <span className="text-[9px] text-slate-400 leading-tight text-center truncate w-full px-0.5">
                                                {player ? player.lastName : '—'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Swap chain */}
                            {posSwaps.length > 0 && (
                                <div className="bg-slate-800 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-400 font-bold uppercase">Cadena de cambios</span>
                                        <button onClick={removeLastSwap} className="text-xs text-rose-400 hover:text-rose-300 font-bold">Deshacer último</button>
                                    </div>
                                    {posSwaps.map((sw, i) => {
                                        const fromP = currentPosLineup.find(p => p.position === sw.fromPosition);
                                        const toP = currentPosLineup.find(p => p.position === sw.toPosition);
                                        return (
                                            <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                                                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                                                    {fromP ? fromP.lastName : sw.fromPosition}
                                                </span>
                                                <span className="text-slate-500">({sw.fromPosition})</span>
                                                <span className="text-emerald-400">→</span>
                                                <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-bold">
                                                    {sw.toPosition}
                                                </span>
                                                {toP && <span className="text-slate-500">({toP.lastName})</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2C: Reingreso ── */}
                    {step === 2 && changeType === 'REINGRESO' && (
                        <div className="space-y-3 pt-1">
                            <p className="text-slate-400 text-xs text-center mb-2">
                                Titulares que pueden reingresar. Solo pueden volver a su batting order original.
                            </p>
                            {elegibles?.puedenReingresar.map(p => (
                                <button
                                    key={p.playerId}
                                    onClick={() => setReingresoPId(p.playerId)}
                                    className={`w-full rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${reingresoPId === p.playerId
                                        ? 'bg-emerald-500/15 border-emerald-500'
                                        : 'bg-slate-800 border-slate-600 hover:border-slate-400'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">{playerName(p)}</span>
                                        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">#{p.battingOrder} · {p.position}</span>
                                    </div>
                                    {p.sustitutoActual && (
                                        <div className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                                            <span className="text-rose-400">Sale:</span>
                                            <span>{playerName(p.sustitutoActual)}</span>
                                        </div>
                                    )}
                                    <div className="mt-1 text-[10px] text-amber-400/70">↩ Reingreso único · WBSC</div>
                                </button>
                            ))}
                            {(elegibles?.puedenReingresar.length ?? 0) === 0 && (
                                <p className="text-slate-500 text-xs text-center py-4">No hay titulares disponibles para reingreso.</p>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Review ── */}
                    {step === 3 && (
                        <div className="space-y-4 pt-2">
                            <div className="bg-slate-800 rounded-xl p-4 space-y-2 border border-slate-700">
                                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700">
                                    <span className="font-bold uppercase">Equipo</span>
                                    <span className="text-white font-bold">{teamName}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700">
                                    <span className="font-bold uppercase">Tipo</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                                        changeType === 'SUSTITUCION' ? 'bg-emerald-500/20 text-emerald-300' :
                                        changeType === 'POSICION' ? 'bg-sky-500/20 text-sky-300' :
                                        'bg-amber-500/20 text-amber-300'
                                    }`}>
                                        {changeType === 'SUSTITUCION' ? 'Sustitución' : changeType === 'POSICION' ? 'Posición' : 'Reingreso'}
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    {reviewLines.map((line, i) => (
                                        <div key={i} className="text-sm text-slate-200 flex items-start gap-2">
                                            <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="text-rose-300 text-xs font-bold bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-black text-sm text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-emerald-900/30"
                            >
                                {loading ? 'Guardando...' : 'Confirmar Cambio'}
                            </button>
                        </div>
                    )}

                    {error && step !== 3 && (
                        <div className="mt-3 text-rose-300 text-xs font-bold bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer CTA — except review step (has its own button) */}
                {step === 2 && (
                    <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-700/60">
                        <button
                            onClick={() => setStep(3)}
                            disabled={!canProceedToReview}
                            className="w-full py-3 rounded-xl font-black text-sm text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-emerald-900/30"
                        >
                            Revisar cambio →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
