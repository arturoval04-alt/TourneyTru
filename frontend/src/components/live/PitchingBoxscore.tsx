'use client';

import { useMemo } from 'react';
import type { BoxscoreTeam, BoxscoreBatterProps } from '@/types/boxscore';

interface PitchingBoxscoreProps {
    teamBoxscore: BoxscoreTeam;
    livePitcherId?: string | null;
}

const formatIp = (outs: number = 0) => `${Math.floor(outs / 3)}.${outs % 3}`;

const buildRoleLabel = (pitcher: BoxscoreBatterProps) => {
    if (pitcher.isStarter) return 'Abridor';
    if (pitcher.entryInning) return `Entró ${pitcher.entryInning}`;
    return 'Relevo';
};

export default function PitchingBoxscore({ teamBoxscore, livePitcherId }: PitchingBoxscoreProps) {
    const pitchers = useMemo(() => {
        return teamBoxscore.lineup
            .filter((player) =>
                (player.pitchingIPOuts ?? 0) > 0 ||
                player.position === 'P' ||
                player.position === '1'
            )
            .sort((a, b) => {
                if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
                if ((a.entryInning ?? 99) !== (b.entryInning ?? 99)) return (a.entryInning ?? 99) - (b.entryInning ?? 99);
                return (b.pitchingIPOuts ?? 0) - (a.pitchingIPOuts ?? 0);
            });
    }, [teamBoxscore.lineup]);

    const totals = useMemo(() => {
        return pitchers.reduce(
            (acc, pitcher) => {
                acc.ipOuts += pitcher.pitchingIPOuts ?? 0;
                acc.hits += pitcher.pitchingHits ?? 0;
                acc.runs += pitcher.pitchingRuns ?? 0;
                acc.earnedRuns += pitcher.pitchingEarnedRuns ?? 0;
                acc.walks += pitcher.pitchingBB ?? 0;
                acc.strikeouts += pitcher.pitchingSO ?? 0;
                return acc;
            },
            { ipOuts: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0 }
        );
    }, [pitchers]);

    if (pitchers.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-700/30 bg-slate-950/40 px-5 py-5">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">Pitcheo</div>
                <p className="mt-2 text-sm italic text-slate-500">Aún no hay líneas de pitcheo registradas.</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-700/30 bg-slate-950/40 p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-700/30 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">Boxscore de Pitcheo</div>
                    <h4 className="mt-1 text-lg font-black uppercase tracking-wide text-white">{teamBoxscore.teamName}</h4>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    <span className="rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1">{pitchers.length} pitcher{pitchers.length === 1 ? '' : 's'}</span>
                    <span className="rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1">IP {formatIp(totals.ipOuts)}</span>
                    <span className="rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1">K {totals.strikeouts}</span>
                </div>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/40 text-slate-500">
                            <th className="px-2 py-2 text-left font-black uppercase tracking-wide">Rol</th>
                            <th className="px-2 py-2 text-left font-black uppercase tracking-wide">Pitcher</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">IP</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">H</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">R</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">ER</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">BB</th>
                            <th className="px-2 py-2 text-center font-black uppercase tracking-wide">K</th>
                            <th className="px-2 py-2 text-left font-black uppercase tracking-wide">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pitchers.map((pitcher) => {
                            const isLive = livePitcherId === pitcher.playerId;
                            return (
                                <tr key={pitcher.playerId} className={`border-b border-slate-800/50 ${isLive ? 'bg-violet-500/8' : 'hover:bg-slate-900/60'}`}>
                                    <td className="px-2 py-3">
                                        <span className="rounded-full border border-slate-700/60 bg-slate-900/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                                            {buildRoleLabel(pitcher)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="font-bold text-white">{pitcher.firstName} {pitcher.lastName}</div>
                                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                                            <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-slate-300">{pitcher.position}</span>
                                            {pitcher.isFlex ? (
                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">FLEX</span>
                                            ) : null}
                                            {isLive ? (
                                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">Activo</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-center font-black text-white">{formatIp(pitcher.pitchingIPOuts ?? 0)}</td>
                                    <td className="px-2 py-3 text-center font-bold text-slate-200">{pitcher.pitchingHits ?? 0}</td>
                                    <td className="px-2 py-3 text-center font-bold text-slate-200">{pitcher.pitchingRuns ?? 0}</td>
                                    <td className="px-2 py-3 text-center font-bold text-slate-200">{pitcher.pitchingEarnedRuns ?? 0}</td>
                                    <td className="px-2 py-3 text-center font-bold text-slate-200">{pitcher.pitchingBB ?? 0}</td>
                                    <td className="px-2 py-3 text-center font-bold text-slate-200">{pitcher.pitchingSO ?? 0}</td>
                                    <td className="px-2 py-3 text-sm text-slate-300">
                                        {isLive
                                            ? 'Lanzando en este momento'
                                            : pitcher.entryInning
                                                ? `Aparece desde la ${pitcher.entryInning}`
                                                : pitcher.isStarter
                                                    ? 'Inició el juego'
                                                    : 'Sin entrada de cambio registrada'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
