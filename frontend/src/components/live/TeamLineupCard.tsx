'use client';

import { Users } from 'lucide-react';
import type { LineupItem } from '@/store/gameStore';
import LineupChangesPanel from '@/components/live/LineupChangesPanel';

interface TeamLineupCardProps {
    label: string;
    teamName?: string | null;
    lineup: LineupItem[];
    plays: any[];
    formatPosition: (item: LineupItem, lineup: LineupItem[]) => string;
}

export default function TeamLineupCard({
    label,
    teamName,
    lineup,
    plays,
    formatPosition,
}: TeamLineupCardProps) {
    return (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-black text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> {label}
            </h3>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700/40 text-slate-500">
                        <th className="py-2 text-left font-bold w-10">#</th>
                        <th className="py-2 text-left font-bold">Jugador</th>
                        <th className="py-2 text-center font-bold w-16">Pos</th>
                    </tr>
                </thead>
                <tbody>
                    {lineup.map((item) => (
                        <tr key={item.playerId} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 text-slate-500 font-bold">{item.battingOrder}</td>
                            <td className="py-2.5 text-white font-semibold">
                                {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Desconocido'}
                            </td>
                            <td className="py-2.5 text-center">
                                <span className="bg-sky-500/10 text-sky-400 font-black text-xs px-2 py-1 rounded">
                                    {formatPosition(item, lineup)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <LineupChangesPanel
                teamAliases={[teamName || '', label]}
                plays={plays}
            />
        </div>
    );
}
