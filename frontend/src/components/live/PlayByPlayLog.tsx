import { GameState, useGameStore, PlayLog } from '@/store/gameStore';

interface PlayByPlayProps {
    forceStoreData?: Partial<GameState>;
}

export default function PlayByPlayLog({ forceStoreData }: PlayByPlayProps) {
    const storeData = useGameStore();
    const playLogs = forceStoreData?.playLogs || storeData.playLogs || [];

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl flex flex-col overflow-hidden h-full shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50 shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs">
                    Play by Play Log
                </h3>
            </div>

            {/* Log entries */}
            <ul className="overflow-y-auto flex-1 p-2 sm:p-3 space-y-1.5 custom-scrollbar">
                {playLogs.map((log: PlayLog, i: number) => {
                    // Render de divisor de Inning
                    if (log.inningString) {
                        return (
                            <li key={i} className="flex items-center gap-2 my-2">
                                <div className="flex-1 h-px bg-slate-700/80"></div>
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{log.inningString}</span>
                                <div className="flex-1 h-px bg-slate-700/80"></div>
                            </li>
                        );
                    }

                    // Render de jugada
                    return (
                        <li key={i} className="text-[11px] font-mono text-slate-300 bg-slate-800/40 hover:bg-slate-800/60 p-2 sm:p-2.5 rounded-lg border border-slate-700/30 shadow-sm leading-tight transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <span className="flex-1">{log.text}</span>

                                {/* Puntos rojos de Outs — solo si esta jugada registró outs */}
                                {((log.totalOuts ?? log.outs) !== undefined && (log.totalOuts ?? log.outs ?? 0) > 0) ? (
                                    <div className="flex gap-0.5 ml-2 mt-0.5 shrink-0">
                                        {Array.from({ length: 3 }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full border border-red-500 transition-all ${
                                                    idx < (log.totalOuts ?? log.outs ?? 0) ? 'bg-red-500' : 'bg-transparent'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    );
                })}

                {playLogs.length === 0 && (
                    <p className="text-center text-slate-500 text-xs mt-8 italic">Inicia el juego para ver las jugadas</p>
                )}
            </ul>
        </div>
    );
}
