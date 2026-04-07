import Image from "next/image";

export default function PlayerInfo({
    type,
    name,
    stats,
    todayStats,
    photoUrl,
    overlay = false,
}: {
    type: 'Batting' | 'Pitching';
    name: string;
    stats: string;
    todayStats?: string;
    photoUrl?: string;
    overlay?: boolean;
}) {
    const isBatting = type === 'Batting';
    const avatarSeed = name.replace(/\s+/g, '').toLowerCase() || 'default';
    const finalAvatarUrl = photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`;

    const statItems = stats.split('|').map(s => s.trim());

    // ── Overlay mode: compact horizontal strip for OBS ──────────────────
    if (overlay) {
        return (
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 w-full overflow-hidden">
                <div className={`h-1 w-full ${isBatting ? 'bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600' : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600'}`} />
                <div className="p-3 flex gap-3 items-center">
                    <div className={`w-12 h-12 rounded-full border-2 p-0.5 flex items-center justify-center flex-shrink-0 ${isBatting ? 'border-sky-500/50 bg-sky-950/40' : 'border-emerald-500/50 bg-emerald-950/40'}`}>
                        <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden relative border border-slate-700 flex items-center justify-center">
                            <Image src={finalAvatarUrl} alt={name} width={256} height={256} className="object-cover relative z-10 w-full h-full" unoptimized />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded ${isBatting ? 'text-sky-400 bg-sky-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                {isBatting ? 'AB' : 'P'}
                            </span>
                            <h4 className="font-black text-white truncate text-lg">{name}</h4>
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {statItems.map((item, i) => (
                                <span key={i} className="text-slate-400 font-mono text-xs whitespace-nowrap">{item}</span>
                            ))}
                        </div>
                        {isBatting && todayStats && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider mr-1.5">HOY:</span>
                                <span className="text-slate-300 font-mono text-xs">{todayStats}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Default mode: vertical card for game/gamecast page ──────────────
    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg w-full overflow-hidden">
            <div className={`h-1 w-full ${isBatting ? 'bg-gradient-to-r from-sky-500 to-sky-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`} />

            <div className="p-2 sm:p-4 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className={`w-16 h-16 sm:w-45 sm:h-45 rounded-full border-5 p-0.5 flex items-center justify-center mb-3 ${isBatting ? 'border-sky-500/60 bg-sky-950/30' : 'border-emerald-500/60 bg-emerald-950/30'}`}>
                    <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden relative border border-slate-700 flex items-center justify-center">
                        <Image src={finalAvatarUrl} alt={name} width={256} height={256} className="object-cover relative z-10" unoptimized />
                    </div>
                </div>

                {/* Type label + Name */}
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isBatting ? 'text-sky-400' : 'text-emerald-400'}`}>
                    {type}: <span className="font-heading text-white font-extrabold text-base sm:text-lg normal-case">{name}</span>
                </h4>

                {/* Stats row */}
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                    {statItems.map((item, i) => (
                        <span key={i} className="stat-value text-slate-400 text-xs whitespace-nowrap">{item}</span>
                    ))}
                </div>

                {/* Today's performance (Batting only) */}
                {isBatting && (todayStats || stats !== 'Sin datos aún') && (
                    <div className="mt-3 pt-2 border-t border-slate-800/60 w-full">
                        <span className="stat-label text-[10px]">HOY: </span>
                        <span className="stat-value text-xs text-slate-300">{todayStats ?? stats}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
