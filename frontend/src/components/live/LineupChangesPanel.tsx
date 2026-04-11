'use client';

import { useMemo } from 'react';

type PlayEvent = {
    id?: string;
    result?: string;
    description?: string | null;
    inning?: number;
    half?: string;
    timestamp?: string | Date;
    createdAt?: string | Date;
};

interface LineupChangesPanelProps {
    teamAliases: string[];
    plays: PlayEvent[];
}

const CHANGE_META: Record<string, { label: string; badgeClass: string }> = {
    SUB: {
        label: 'Sustitucion',
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
    POS: {
        label: 'Posicion',
        badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    },
    REENTRY: {
        label: 'Reingreso',
        badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    },
};

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

const formatHalfInning = (half?: string, inning?: number) => {
    if (!inning) return 'Sin inning';
    return `${half === 'bottom' ? '▼' : '▲'} ${inning}`;
};

const formatTimestamp = (value?: string | Date) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

export default function LineupChangesPanel({ teamAliases, plays }: LineupChangesPanelProps) {
    const changeEvents = useMemo(() => {
        const aliases = teamAliases
            .map(normalizeText)
            .filter(Boolean);

        return [...plays]
            .filter((play) => {
                const code = (play.result || '').split('|')[0].toUpperCase().trim();
                if (!['SUB', 'POS', 'REENTRY'].includes(code)) return false;
                if (!aliases.length) return true;
                const description = normalizeText(play.description);
                return aliases.some((alias) => description.includes(alias));
            })
            .sort((a, b) => {
                const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
                const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
                return bTime - aTime;
            });
    }, [plays, teamAliases]);

    return (
        <div className="mt-5 border-t border-slate-700/40 pt-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Movimientos</h4>
                    <p className="mt-1 text-xs text-slate-400">Sustituciones, reingresos y cambios defensivos.</p>
                </div>
                <div className="rounded-full border border-slate-700/60 bg-slate-800/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    {changeEvents.length}
                </div>
            </div>

            {changeEvents.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 px-4 py-5 text-center text-xs italic text-slate-500">
                    Sin movimientos registrados para esta alineacion.
                </div>
            ) : (
                <div className="mt-4 space-y-2.5">
                    {changeEvents.map((play, index) => {
                        const code = (play.result || '').split('|')[0].toUpperCase().trim();
                        const meta = CHANGE_META[code] || CHANGE_META.SUB;
                        const timestamp = formatTimestamp(play.timestamp || play.createdAt);
                        return (
                            <div
                                key={play.id || `${play.result}-${play.inning}-${index}`}
                                className="rounded-2xl border border-slate-700/40 bg-slate-950/50 px-3.5 py-3"
                            >
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                                    <span className={`rounded-full border px-2 py-1 ${meta.badgeClass}`}>{meta.label}</span>
                                    <span className="text-slate-500">{formatHalfInning(play.half, play.inning)}</span>
                                    {timestamp ? <span className="text-slate-500">{timestamp}</span> : null}
                                </div>
                                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">
                                    {play.description || 'Movimiento registrado'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
