import React from 'react';
import { BoxscoreTeam } from '../types/boxscore';
import { ScorebookCell } from './ScorebookCell';

interface ScorebookTableProps {
    teamBoxscore: BoxscoreTeam;
    // IDs de jugadores en cada base actualmente (para live base path tracking)
    baseIds?: {
        first: string | null;
        second: string | null;
        third: string | null;
    } | null;
    currentInning?: number;
}

// Determina en qué base está un jugador actualmente (1, 2, 3) o null
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

export const ScorebookTable: React.FC<ScorebookTableProps> = ({ teamBoxscore, baseIds, currentInning }) => {
    // We render 9 innings by default, or more if the game went into extra innings.
    const maxInning = Math.max(9, ...Object.keys(teamBoxscore.runsByInning).map(Number));
    const inningsArray = Array.from({ length: maxInning }, (_, i) => i + 1);

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold p-3 bg-gray-50 border-b border-gray-200 text-gray-800 flex justify-between">
                <span>{teamBoxscore.teamName} - Boxscore</span>
                <span className="text-sm font-normal text-gray-600">R: {teamBoxscore.totalRuns} | H: {teamBoxscore.totalHits} | E: {teamBoxscore.totalErrors}</span>
            </h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 w-48">Jugador</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-8">Pos</th>
                        {/* Render Inning Headers */}
                        {inningsArray.map(inning => (
                            <th key={`th-inning-${inning}`} className="px-1 py-2 text-center font-semibold text-gray-600 w-16">
                                {inning}
                            </th>
                        ))}
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 border-l border-gray-300">AB</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">R</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">H</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">RBI</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">BB</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">SO</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {teamBoxscore.lineup.map((batter, index) => {
                        // Obtener la base actual de este corredor para el live tracking
                        const runnerCurrentBase = getCurrentBaseForPlayer(batter.playerId, baseIds);

                        return (
                            <tr key={batter.playerId} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800 border-r border-gray-100">
                                    {index + 1}. {batter.firstName} {batter.lastName}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-500 border-r border-gray-100 font-mono">
                                    {batter.position}
                                </td>

                                {/* Render Inning Cells using our SVG component */}
                                {inningsArray.map(inning => {
                                    const playsForInning = batter.plays[inning] || [];
                                    // Solo pasar currentBase en el inning activo para no alterar innings pasados
                                    const isCurrentInning = currentInning != null ? inning === currentInning : false;
                                    const cellCurrentBase = isCurrentInning ? runnerCurrentBase : null;
                                    return (
                                        <td key={`cell-${batter.playerId}-inn-${inning}`} className="p-0 border-r border-gray-100">
                                            <ScorebookCell plays={playsForInning} currentBase={cellCurrentBase} />
                                        </td>
                                    );
                                })}

                                {/* Totals */}
                                <td className="px-2 py-2 whitespace-nowrap text-center font-semibold border-l border-gray-300 bg-gray-50">{batter.atBats}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-700 bg-gray-50">{batter.runs}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-700 bg-gray-50">{batter.hits}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-700 bg-gray-50">{batter.rbi}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-500 bg-gray-50">{batter.bb}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center text-gray-500 bg-gray-50">{batter.so}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
