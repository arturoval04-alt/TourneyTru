import React from 'react';
import { BoxscoreBatterProps, BoxscoreTeam } from '../types/boxscore';
import { ScorebookCell } from './ScorebookCell';

interface ScorebookTableProps {
    teamBoxscore: BoxscoreTeam;
    baseIds?: {
        first: string | null;
        second: string | null;
        third: string | null;
    } | null;
    currentInning?: number;
    activeBatterId?: string | null;
    isBattingTeamLive?: boolean;
}

function getCurrentBaseForPlayer(
    playerId: string,
    baseIds?: { first: string | null; second: string | null; third: string | null } | null
): number | null {
    if (!baseIds) return null;
    if (baseIds.third === playerId) return 3;
    if (baseIds.second === playerId) return 2;
    if (baseIds.first === playerId) return 1;
    return null;
}

function getDisplayPosition(batter: BoxscoreBatterProps) {
    if (batter.isFlex) return `${batter.position} FLEX`;
    return batter.position;
}

function hasPinchRunnerEntry(batter: BoxscoreBatterProps) {
    return Object.values(batter.plays).some((inningPlays) =>
        inningPlays.some((play) => (play.result || '').toUpperCase().split('|').includes('PR'))
    );
}

function formatCompactPlayerName(firstName: string, lastName: string) {
    const firstParts = firstName.trim().split(/\s+/).filter(Boolean);
    const lastParts = lastName.trim().split(/\s+/).filter(Boolean);

    if (firstParts.length === 0) return lastName.trim();

    const primaryName = firstParts[0];
    const secondInitial = firstParts.length > 1 ? ` ${firstParts[1][0]}.` : '';
    const compactLastName = lastParts.join(' ');

    return `${primaryName}${secondInitial}${compactLastName ? ` ${compactLastName}` : ''}`;
}

function getLiveRunnerCount(baseIds?: { first: string | null; second: string | null; third: string | null } | null) {
    if (!baseIds) return 0;
    return [baseIds.first, baseIds.second, baseIds.third].filter(Boolean).length;
}

export const ScorebookTable: React.FC<ScorebookTableProps> = ({
    teamBoxscore,
    baseIds,
    currentInning,
    activeBatterId,
    isBattingTeamLive = false,
}) => {
    const maxInning = Math.max(9, ...Object.keys(teamBoxscore.runsByInning).map(Number));
    const inningsArray = Array.from({ length: maxInning }, (_, i) => i + 1);
    const liveRunnerCount = getLiveRunnerCount(baseIds);
    const showLiveSummary = currentInning != null || baseIds != null || isBattingTeamLive;

    const groupedLineup = Object.entries(
        teamBoxscore.lineup.reduce((acc, batter) => {
            if (!acc[batter.battingOrder]) acc[batter.battingOrder] = [];
            acc[batter.battingOrder].push(batter);
            return acc;
        }, {} as Record<number, typeof teamBoxscore.lineup>)
    );

    return (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span>{teamBoxscore.teamName}</span>
                        {isBattingTeamLive && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-700">
                                Al bate
                            </span>
                        )}
                    </h3>
                    <span className="text-sm font-semibold text-slate-600">
                        R: {teamBoxscore.totalRuns} | H: {teamBoxscore.totalHits} | E: {teamBoxscore.totalErrors}
                    </span>
                </div>

                {showLiveSummary ? (
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-white">
                            Inning activo: {currentInning ?? '-'}
                        </span>
                        <span className={`rounded-full px-3 py-1 ${isBattingTeamLive ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                            Turno actual: {isBattingTeamLive ? 'sí' : 'no'}
                        </span>
                        <span className={`rounded-full px-3 py-1 ${liveRunnerCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            Corredores vivos: {liveRunnerCount}
                        </span>
                    </div>
                ) : null}
            </div>

            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 min-w-[240px]">Jugador</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600 w-14">Pos</th>
                        {inningsArray.map((inning) => {
                            const isActiveInning = currentInning != null && inning === currentInning;
                            return (
                                <th
                                    key={`th-inning-${inning}`}
                                    className={`px-1 py-2 text-center font-semibold w-[4.4rem] min-w-[4.4rem] ${isActiveInning ? 'bg-sky-100 text-sky-700' : 'text-slate-600'}`}
                                >
                                    {inning}
                                </th>
                            );
                        })}
                        <th className="px-2 py-2 text-center font-semibold text-slate-600 border-l border-slate-300">AB</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600">R</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600">H</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600">RBI</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600">BB</th>
                        <th className="px-2 py-2 text-center font-semibold text-slate-600">SO</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                    {groupedLineup.map(([boString, group]) => {
                        const battingOrder = parseInt(boString, 10);
                        const isFlexGroup = group.every((p) => p.isFlex)
                            && group.every((p) => p.atBats === 0 && p.bb === 0 && p.runs === 0 && Object.keys(p.plays).length === 0);

                        if (isFlexGroup) return null;

                        return group
                            .slice()
                            .sort((a, b) => (b.isStarter ? 1 : 0) - (a.isStarter ? 1 : 0))
                            .map((batter, idx) => {
                                const runnerCurrentBase = getCurrentBaseForPlayer(batter.playerId, baseIds);
                                const isActiveBatter = activeBatterId != null && batter.playerId === activeBatterId;
                                const hasPr = hasPinchRunnerEntry(batter);
                                const compactName = formatCompactPlayerName(batter.firstName, batter.lastName);
                                const orderBadge = batter.isStarter ? `${battingOrder}. STARTER` : `↳ ENTRÓ ${batter.entryInning || '-'}`;

                                return (
                                    <tr
                                        key={`${batter.playerId}-${idx}`}
                                        className={`${isActiveBatter ? 'bg-sky-50/80' : 'hover:bg-slate-50'} transition-colors`}
                                    >
                                        <td className="px-3 py-2.5 border-r border-slate-100">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                                                        batter.isStarter ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {orderBadge}
                                                    </span>
                                                    <span className={`text-[13px] font-bold ${isActiveBatter ? 'text-sky-700' : 'text-slate-800'}`}>
                                                        {compactName}
                                                    </span>
                                                    {isActiveBatter && (
                                                        <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                                            bateando
                                                        </span>
                                                    )}
                                                    {runnerCurrentBase != null && (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                                                            en {runnerCurrentBase}B
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap pl-0">
                                                    {batter.isFlex && (
                                                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                                                            flex
                                                        </span>
                                                    )}
                                                    {hasPr && (
                                                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-purple-700">
                                                            pr
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-2 py-2 text-center border-r border-slate-100 font-mono">
                                            <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-black ${batter.isFlex ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                                                {getDisplayPosition(batter)}
                                            </span>
                                        </td>

                                        {inningsArray.map((inning) => {
                                            const playsForInning = batter.plays[inning] || [];
                                            const isCurrentInning = currentInning != null && inning === currentInning;
                                            const cellCurrentBase = isCurrentInning ? runnerCurrentBase : null;
                                            return (
                                                <td
                                                    key={`cell-${batter.playerId}-inn-${inning}`}
                                                    className={`p-0 border-r border-slate-100 ${isCurrentInning ? 'bg-sky-50/50' : ''}`}
                                                >
                                                    <ScorebookCell plays={playsForInning} currentBase={cellCurrentBase} />
                                                </td>
                                            );
                                        })}

                                        <td className="px-2 py-2 text-center font-semibold border-l border-slate-300 bg-slate-50">{batter.atBats}</td>
                                        <td className="px-2 py-2 text-center text-slate-700 bg-slate-50">{batter.runs}</td>
                                        <td className="px-2 py-2 text-center text-slate-700 bg-slate-50">{batter.hits}</td>
                                        <td className="px-2 py-2 text-center text-slate-700 bg-slate-50">{batter.rbi}</td>
                                        <td className="px-2 py-2 text-center text-slate-500 bg-slate-50">{batter.bb}</td>
                                        <td className="px-2 py-2 text-center text-slate-500 bg-slate-50">{batter.so}</td>
                                    </tr>
                                );
                            });
                    })}
                </tbody>
            </table>
        </div>
    );
};
