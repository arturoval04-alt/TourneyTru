import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import BaseActionModal from '../controls/BaseActionModal';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface LineupItemField {
    playerId: string;
    position: string;
    player?: { firstName: string; lastName: string };
}

interface FieldStoreData {
    bases: {
        first: string | null;
        second: string | null;
        third: string | null;
    };
    half?: 'top' | 'bottom';
    homeLineup?: LineupItemField[];
    awayLineup?: LineupItemField[];
}

// Mapa de posiciones defensivas a coordenadas del campo
const POSITION_MAP: Record<string, { pos: string; top: string; left: string }> = {
    '1': { pos: 'P', top: '62%', left: '50%' },
    'P': { pos: 'P', top: '62%', left: '50%' },
    '2': { pos: 'C', top: '92%', left: '50%' },
    'C': { pos: 'C', top: '92%', left: '50%' },
    '3': { pos: '1B', top: '56%', left: '83%' },
    '1B': { pos: '1B', top: '56%', left: '83%' },
    '4': { pos: '2B', top: '42%', left: '68%' },
    '2B': { pos: '2B', top: '42%', left: '68%' },
    '5': { pos: '3B', top: '56%', left: '17%' },
    '3B': { pos: '3B', top: '56%', left: '17%' },
    '6': { pos: 'SS', top: '42%', left: '32%' },
    'SS': { pos: 'SS', top: '42%', left: '32%' },
    '7': { pos: 'LF', top: '25%', left: '18%' },
    'LF': { pos: 'LF', top: '25%', left: '18%' },
    '8': { pos: 'CF', top: '10%', left: '50%' },
    'CF': { pos: 'CF', top: '10%', left: '50%' },
    '9': { pos: 'RF', top: '25%', left: '82%' },
    'RF': { pos: 'RF', top: '25%', left: '82%' },
};

export default function Field({ forceStoreData }: { forceStoreData?: FieldStoreData }) {
    const defaultStore = useGameStore();
    const storeData = forceStoreData || defaultStore;
    const { bases } = storeData;
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, base: 'first' | 'second' | 'third', name: string }>({
        isOpen: false, base: 'first', name: ''
    });

    const openAction = (base: 'first' | 'second' | 'third', name: string) => {
        setActionModal({ isOpen: true, base, name });
    }

    // Lineup defensiva dinámica — el equipo a la defensiva depende del half
    const half = storeData.half ?? defaultStore.half;
    const defensiveLineup = half === 'top'
        ? (storeData.homeLineup ?? defaultStore.homeLineup)
        : (storeData.awayLineup ?? defaultStore.awayLineup);

    const defense = defensiveLineup
        .map((item: LineupItemField) => {
            const mapped = POSITION_MAP[item.position];
            if (!mapped) return null;
            const name = item.player
                ? `${item.player.firstName.charAt(0)}. ${item.player.lastName}`
                : '?';
            return { pos: mapped.pos, name, top: mapped.top, left: mapped.left };
        })
        .filter(Boolean) as { pos: string; name: string; top: string; left: string }[];

    return (
        <div className="relative h-full max-h-[500px] aspect-square max-w-full mx-auto bg-[#1b7c53] rounded-[50%_50%_15px_15px] border border-slate-700 shadow-2xl overflow-hidden font-sans">

            {/* INFIELD DIRT (Diseño absoluto sin contenedor padre rotado) */}
            <div className="absolute top-[54%] left-[50%] w-[42%] h-[42%] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#1b7c53]/30 shadow-inner bg-[url('https://www.transparenttextures.com/patterns/sandbag.png')] bg-[#a54c1e]/90 rounded-[3%]" />
            <div className="absolute top-[54%] left-[50%] w-[30%] h-[30%] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#1b7c53] bg-[#1b7c53] rounded-[3%]" />

            {/* Círculo de Lanzamiento y Home */}
            <div className="absolute top-[82%] left-[50%] w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[url('https://www.transparenttextures.com/patterns/sandbag.png')] bg-[#a54c1e]/90 shadow-inner" />
            <div className="absolute top-[56%] left-[50%] w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1b7c53]/30 bg-[#a54c1e]" />
            <div className="absolute top-[56%] left-[50%] w-6 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-slate-100 rounded-sm shadow-sm opacity-80" />

            {/* Defense Rendering Layer */}
            {defense.map((player, index) => (
                <div key={`${player.pos}-${index}`} className="absolute flex flex-col items-center z-10 pointer-events-none" style={{ top: player.top, left: player.left, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-black text-slate-800 mb-0 shadow-lg opacity-90">
                        {player.pos}
                    </div>
                    <span className="text-[10px] font-bold text-slate-100 shadow-black drop-shadow-md whitespace-nowrap mt-1 tracking-wide">{player.name}</span>
                </div>
            ))}

            {/* BASES LAYER (Posiciones calculadas y relativas directas al padre, no a dirt) */}

            {/* 1st Base */}
            <div className="absolute top-[54%] left-[76%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className={cn("w-8 h-8 rotate-45 border-2 transition-all", bases.first ? "bg-amber-400 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.9)]" : "bg-slate-100/90 border-slate-300")} />
                {bases.first && (
                    <div className="absolute top-10 flex flex-col items-center gap-1 w-32">
                        <div className="text-[11px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.first}</div>
                        {!forceStoreData && (
                            <button onClick={() => openAction('first', bases.first!)} className="bg-sky-600 hover:bg-sky-500 text-white text-[9px] px-3 py-1 rounded-full uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">Avance/Robo ►</button>
                        )}
                    </div>
                )}
            </div>

            {/* 2nd Base */}
            <div className="absolute top-[28%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className={cn("w-8 h-8 rotate-45 border-2 transition-all", bases.second ? "bg-amber-400 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.9)]" : "bg-slate-100/90 border-slate-300")} />
                {bases.second && (
                    <div className="absolute top-10 flex flex-col items-center gap-1 w-32">
                        <div className="text-[11px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.second}</div>
                        {!forceStoreData && (
                            <button onClick={() => openAction('second', bases.second!)} className="bg-sky-600 hover:bg-sky-500 text-white text-[9px] px-3 py-1 rounded-full uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">Avance/Robo ►</button>
                        )}
                    </div>
                )}
            </div>

            {/* 3rd Base */}
            <div className="absolute top-[54%] left-[24%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className={cn("w-8 h-8 rotate-45 border-2 transition-all", bases.third ? "bg-amber-400 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.9)]" : "bg-slate-100/90 border-slate-300")} />
                {bases.third && (
                    <div className="absolute top-10 flex flex-col items-center gap-1 w-32">
                        <div className="text-[11px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.third}</div>
                        {!forceStoreData && (
                            <button onClick={() => openAction('third', bases.third!)} className="bg-sky-600 hover:bg-sky-500 text-white text-[9px] px-3 py-1 rounded-full uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">Anota/Robo ►</button>
                        )}
                    </div>
                )}
            </div>

            {/* Home Plate */}
            <div className="absolute top-[82%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                {/* SVG Home Plate Shape pointing DOWN instead of UP */}
                <div className="w-9 h-9 bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-xs text-slate-800"
                    style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                >
                    <span className="-mt-2 text-[10px]">H</span>
                </div>
            </div>

            <BaseActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                baseOrigin={actionModal.base}
                runnerName={actionModal.name}
            />
        </div>
    );
}
