import { useGameStore } from '@/store/gameStore';
import { cn } from '../live/Field';

// Define the props interface for the ScoreCard component
interface ScoreCardProps {
    forceStoreData?: {
        inning: number | string;
        half: 'top' | 'bottom';
        outs: number;
        balls: number;
        strikes: number;
        homeScore: number;
        awayScore: number;
    };
}

export default function ScoreCard({ forceStoreData }: ScoreCardProps) {
    const defaultStore = useGameStore();
    const storeData = forceStoreData || defaultStore;

    const { inning, half, outs, balls, strikes, homeScore, awayScore, homeTeamName, awayTeamName } = storeData as any;
    console.log("[ScoreCard] Rendering with:", { homeTeamName, awayTeamName, homeScore, awayScore });

    return (
        <div className="bg-[#0b1320] border-b border-slate-800 p-2 text-white flex justify-center shadow-lg font-sans h-16 w-full">
            <div className="flex items-center gap-4 pl-4 w-full max-w-[1400px] mx-auto h-full">

                {/* Equipos y Cuentas */}
                <div className="flex flex-col justify-center gap-1 w-28">
                    <div className="flex justify-between items-center font-bold text-xs">
                        <span className="text-slate-300 tracking-wider truncate max-w-[80px]">{awayTeamName}</span>
                        <span className="text-base font-mono text-white leading-none">{awayScore}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-xs">
                        <span className="text-white tracking-wider truncate max-w-[80px]">{homeTeamName}</span>
                        <span className="text-base font-mono text-amber-400 leading-none">{homeScore}</span>
                    </div>
                </div>

                {/* Separador vertical */}
                <div className="w-[1px] h-8 bg-slate-700/50"></div>

                {/* Inning y Outs Central */}
                <div className="flex flex-col items-center justify-center min-w-[60px]">
                    <div className="flex items-center gap-2 text-base font-black mb-1 leading-none">
                        <span className={cn("text-[10px]", half === 'top' ? 'text-amber-400' : 'text-slate-700')}>▲</span>
                        <span className="text-white">{inning}</span>
                        <span className={cn("text-[10px]", half === 'bottom' ? 'text-amber-400' : 'text-slate-700')}>▼</span>
                    </div>

                    <div className="flex gap-1 mt-0.5">
                        <div className={cn("w-2.5 h-2.5 rounded-full border border-red-500", outs >= 1 ? "bg-red-500" : "bg-transparent")} />
                        <div className={cn("w-2.5 h-2.5 rounded-full border border-red-500", outs >= 2 ? "bg-red-500" : "bg-transparent")} />
                    </div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1 tracking-widest leading-none">OUTS</span>
                </div>

                {/* Separador vertical tenue */}
                <div className="w-[1px] h-8 bg-slate-700/50"></div>

                {/* Count (B-S) Derecha - Pega al Inning */}
                <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center">
                        <span className="text-emerald-400 font-mono text-lg font-bold leading-none">{balls}</span>
                        <span className="text-[8px] text-slate-400 font-bold mt-1 tracking-widest leading-none">BALLS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-rose-500 font-mono text-lg font-bold leading-none">{strikes}</span>
                        <span className="text-[8px] text-slate-400 font-bold mt-1 tracking-widest leading-none">STRIKES</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
