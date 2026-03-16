import Image from "next/image";

export default function PlayerInfo({
    type,
    name,
    stats,
}: {
    type: 'Batting' | 'Pitching';
    name: string;
    stats: string;
}) {
    const isBatting = type === 'Batting';
    // Generar avatar usando una semilla basada en el nombre para consistencia visual
    const avatarSeed = name.replace(/\s+/g, '').toLowerCase() || 'default';
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`;

    return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-md w-full flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full border-2 p-1 flex items-center justify-center shrink-0 ${isBatting ? 'border-sky-500 bg-sky-950/30' : 'border-emerald-500 bg-emerald-950/30'
                }`}>
                <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden relative border border-slate-700 flex items-center justify-center">
                    <Image src={avatarUrl} alt={name} width={40} height={40} className="object-cover relative z-10" unoptimized />
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                <h4 className="text-amber-400 font-bold mb-0.5 text-sm">
                    {type}: <span className="text-white font-black">{name}</span>
                </h4>
                <p className="text-slate-300 text-xs font-mono">{stats}</p>
            </div>
        </div>
    );
}
