import { useGameStore } from '@/store/gameStore';
import Image from 'next/image';

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

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

function TeamLogo({ url, short, size = 40 }: { url: string | null | undefined; short: string; size?: number }) {
    if (url) {
        return (
            <div className="rounded-full overflow-hidden border-2 border-slate-600 bg-slate-800 flex-shrink-0"
                style={{ width: size, height: size }}>
                <Image src={url} alt={short} width={size} height={size} className="object-cover w-full h-full" unoptimized />
            </div>
        );
    }
    return (
        <div className="rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 flex items-center justify-center flex-shrink-0 font-black text-white uppercase"
            style={{ width: size, height: size, fontSize: size * 0.28 }}>
            {short}
        </div>
    );
}

export default function ScoreCard({ forceStoreData }: ScoreCardProps) {
    const defaultStore = useGameStore();
    const storeData = forceStoreData || defaultStore;

    const { inning, half, outs, balls, strikes, homeScore, awayScore } = storeData as any;
    const { homeTeamName, awayTeamName, homeTeamLogoUrl, awayTeamLogoUrl, homeTeamShort, awayTeamShort } = defaultStore;

    return (
        <div className="w-full gap-1">
            <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-3">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">

                        {/* Teams & Score */}
                        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                            {/* Away Team */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <TeamLogo url={awayTeamLogoUrl} short={awayTeamShort || (awayTeamName || 'V').slice(0, 3)} size={40} />
                                <span className="text-lg sm:text-lg font-bold text-slate-300 truncate hidden sm:block">{awayTeamName || 'Visitante'}</span>
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                <span className="score-number text-2xl sm:text-4xl text-white tabular-nums">{awayScore}</span>
                                <span className="text-lg sm:text-2xl font-bold text-slate-500">-</span>
                                <span className="score-number text-2xl sm:text-4xl text-white tabular-nums">{homeScore}</span>
                            </div>

                            {/* Home Team */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
                                <span className="text-lg sm:text-lg font-bold text-white truncate hidden sm:block">{homeTeamName || 'Local'}</span>
                                <TeamLogo url={homeTeamLogoUrl} short={homeTeamShort || (homeTeamName || 'L').slice(0, 3)} size={40} />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-10 bg-slate-700/60" />

                        {/* Game State Indicators */}
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                            {/* Inning */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] sm:text-[10px] stat-label mb-0.5">Inning</span>
                                <div className="flex items-center gap-1">
                                    <span className={cn("text-[10px]", half === 'top' ? 'text-amber-400' : 'text-slate-700')}>▲</span>
                                    <span className="stat-value text-lg sm:text-xl">{inning}</span>
                                    <span className={cn("text-[10px]", half === 'bottom' ? 'text-amber-400' : 'text-slate-700')}>▼</span>
                                </div>
                            </div>

                            {/* Outs */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] sm:text-[10px] stat-label mb-1">Outs</span>
                                <div className="flex gap-1">
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-red-500 transition-all", outs >= 1 ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" : "bg-transparent")} />
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-red-500 transition-all", outs >= 2 ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" : "bg-transparent")} />
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-red-500 transition-all", outs >= 3 ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" : "bg-transparent")} />
                                </div>
                            </div>

                            {/* Balls */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] sm:text-[10px] stat-label mb-1">Balls</span>
                                <div className="flex gap-1">
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-emerald-500 transition-all", balls >= 1 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-transparent")} />
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-emerald-500 transition-all", balls >= 2 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-transparent")} />
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-emerald-500 transition-all", balls >= 3 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-transparent")} />
                                </div>
                            </div>

                            {/* Strikes */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] sm:text-[10px] stat-label mb-1">Strikes</span>
                                <div className="flex gap-1">
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-rose-500 transition-all", strikes >= 1 ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "bg-transparent")} />
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-rose-500 transition-all", strikes >= 2 ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "bg-transparent")} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
