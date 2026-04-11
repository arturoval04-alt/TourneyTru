'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';

interface Props { isOpen: boolean; onClose: () => void; }

const DEST_OPTIONS = [
    { value: 'out',  label: '🚫 Out' },
    { value: '1B',   label: '1ra Base' },
    { value: '2B',   label: '2da Base' },
    { value: '3B',   label: '3ra Base' },
    { value: 'home', label: '🏠 Anota' },
];

export default function FieldersChoiceModal({ isOpen, onClose }: Props) {
    const bases         = useGameStore(s => s.bases);
    const baseIds       = useGameStore(s => s.baseIds);
    const currentBatter = useGameStore(s => s.currentBatter);
    const currentBatterId = useGameStore(s => s.currentBatterId);
    const executeAdvancedPlay = useGameStore(s => s.executeAdvancedPlay);

    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState('');

    const players = useMemo(() => [
        { key: 'batter', name: currentBatter, id: currentBatterId, baseLabel: 'Al bate', locked: true },
        ...(bases.first  ? [{ key: 'first',  name: bases.first,  id: baseIds.first,  baseLabel: '1ra Base', locked: false }] : []),
        ...(bases.second ? [{ key: 'second', name: bases.second, id: baseIds.second, baseLabel: '2da Base', locked: false }] : []),
        ...(bases.third  ? [{ key: 'third',  name: bases.third,  id: baseIds.third,  baseLabel: '3ra Base', locked: false }] : []),
    ], [bases, baseIds, currentBatter, currentBatterId]);

    const buildDefaults = useCallback(() => {
        const d: Record<string, string> = { batter: '1B' };
        if (bases.first)  d.first  = 'out';
        if (bases.second) d.second = bases.first ? '3B' : 'out';
        if (bases.third)  d.third  = 'home';
        return d;
    }, [bases.first, bases.second, bases.third]);

    const [dests, setDests] = useState<Record<string, string>>(buildDefaults);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setDests(buildDefaults());
            setError('');
        }
    }, [isOpen, buildDefaults]);

    if (!isOpen || !mounted) return null;

    const nonBatterOuts = players.filter(p => p.key !== 'batter' && dests[p.key] === 'out').length;
    const getConflictError = () => {
        const occupiedDestinations = new Map<string, string>([['1B', 'bateador']]);

        for (const p of players) {
            if (p.key === 'batter') continue;
            const dest = dests[p.key] ?? 'out';
            if (dest === 'home' || dest === 'out') continue;

            if (occupiedDestinations.has(dest)) {
                return 'Dos jugadores no pueden terminar en la misma base.';
            }

            occupiedDestinations.set(dest, p.name);
        }

        return '';
    };
    const conflictError = getConflictError();

    const handleConfirm = () => {
        if (players.length <= 1) {
            setError('Para una bola ocupada debe existir al menos un corredor en base.');
            return;
        }

        if (conflictError) {
            setError(conflictError);
            return;
        }

        if (nonBatterOuts < 1) {
            setError('Una bola ocupada debe retirar por lo menos a un corredor distinto del bateador.');
            return;
        }

        const newBases   = { first: null as string | null, second: null as string | null, third: null as string | null };
        const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };
        let runs = 0;
        let outs = 0;

        for (const p of players) {
            const dest = dests[p.key] ?? 'out';
            if      (dest === 'out')  outs++;
            else if (dest === 'home') runs++;
            else if (dest === '1B')   { newBases.first  = p.name; newBaseIds.first  = p.id; }
            else if (dest === '2B')   { newBases.second = p.name; newBaseIds.second = p.id; }
            else if (dest === '3B')   { newBases.third  = p.name; newBaseIds.third  = p.id; }
        }

        const outsList: string[] = [];
        const runnerOutIds: string[] = [];
        for (const p of players) {
            if (dests[p.key] === 'out') {
                outsList.push(p.name);
                if (p.key !== 'batter' && p.id) runnerOutIds.push(p.id);
            }
        }

        let desc = 'BO|Bola Ocupada';
        if (outsList.length > 0) {
            desc += `: Out ${outsList.join(' y ')}`;
        } else {
            desc += `: Bateador llega a base por jugada de selección`;
        }

        executeAdvancedPlay(newBases, newBaseIds, runs, outs, desc, runnerOutIds);
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
                <h2 className="text-xl font-black text-amber-500 mb-1 uppercase tracking-wide">
                    Bola Ocupada <span className="text-sm font-bold text-slate-400 normal-case">(Fielder&apos;s Choice)</span>
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                    Indica el destino de cada corredor. El bateador queda en 1ra y debe salir al menos un corredor.
                </p>

                <div className="space-y-2 mb-5">
                    {players.map(p => (
                        <div key={p.key} className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5 border border-slate-700">
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{p.baseLabel}</p>
                                <p className="text-sm font-bold text-white truncate">{p.name}</p>
                            </div>
                            {p.key === 'batter' ? (
                                <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg text-sm text-amber-200 px-3 py-1.5 font-bold shrink-0">
                                    1ra Base
                                </div>
                            ) : (
                                <select
                                    value={dests[p.key] ?? 'out'}
                                    onChange={e => {
                                        setDests(prev => ({ ...prev, [p.key]: e.target.value }));
                                        setError('');
                                    }}
                                    className="bg-slate-700 border border-slate-600 rounded-lg text-sm text-white px-2 py-1.5 focus:outline-none focus:border-amber-500 shrink-0"
                                >
                                    {DEST_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    ))}
                </div>

                {(error || conflictError) && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error || conflictError}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 text-sm transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={Boolean(conflictError)}
                        className="flex-[2] py-2.5 rounded-lg font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 text-sm transition"
                    >
                        Registrar Bola Ocupada
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
