import { GameState, useGameStore, PlayLog } from '@/store/gameStore';

interface PlayByPlayProps {
    forceStoreData?: Partial<GameState>;
}

export default function PlayByPlayLog({ forceStoreData }: PlayByPlayProps) {
    const storeData = useGameStore();
    const playLogs = forceStoreData?.playLogs || storeData.playLogs || [];

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col flex-1 overflow-hidden min-h-[100px]">
            <h3 className="text-white font-bold p-2 bg-slate-800 border-b border-slate-700 uppercase tracking-widest text-[10px] shrink-0">
                Play by Play Log
            </h3>
            <ul className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
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
                        <li key={i} className="flex flex-col gap-1 text-[11px] font-mono text-slate-300 bg-slate-800/40 p-2 rounded border border-slate-700/50 shadow-sm leading-tight">
                            <div className="flex items-start justify-between">
                                <span className="flex-1">{log.text}</span>

                                {/* Puntos rojos de Outs */}
                                {log.outs && log.outs > 0 ? (
                                    <div className="flex gap-0.5 ml-2 mt-0.5 shrink-0">
                                        {Array.from({ length: 3 }).map((_, idx) => (
                                            <div key={idx} className={`w-2 h-2 rounded-full border border-red-500 ${idx < log.outs! ? 'bg-red-500' : 'bg-transparent'}`} />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    );
                })}

                {playLogs.length === 0 && (
                    <p className="text-center text-slate-500 text-[10px] mt-2">Inicia el juego para ver las jugadas</p>
                )}
            </ul>
        </div>
    );
}
