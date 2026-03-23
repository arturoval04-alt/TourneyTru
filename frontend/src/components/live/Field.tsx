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

// Mapa de posiciones defensivas a coordenadas del campo (SVG viewBox 0-400 x 0-440)
const POSITION_MAP: Record<string, { pos: string; svgX: number; svgY: number }> = {
    '1': { pos: 'P', svgX: 200, svgY: 275 },
    'P': { pos: 'P', svgX: 200, svgY: 275 },
    '2': { pos: 'C', svgX: 200, svgY: 400 },
    'C': { pos: 'C', svgX: 200, svgY: 400 },
    '3': { pos: '1B', svgX: 340, svgY: 265 },
    '1B': { pos: '1B', svgX: 340, svgY: 265 },
    '4': { pos: '2B', svgX: 275, svgY: 190 },
    '2B': { pos: '2B', svgX: 275, svgY: 190 },
    '5': { pos: '3B', svgX: 60, svgY: 265 },
    '3B': { pos: '3B', svgX: 60, svgY: 265 },
    '6': { pos: 'SS', svgX: 125, svgY: 190 },
    'SS': { pos: 'SS', svgX: 125, svgY: 190 },
    '7': { pos: 'LF', svgX: 55, svgY: 100 },
    'LF': { pos: 'LF', svgX: 55, svgY: 100 },
    '8': { pos: 'CF', svgX: 200, svgY: 50 },
    'CF': { pos: 'CF', svgX: 200, svgY: 50 },
    '9': { pos: 'RF', svgX: 345, svgY: 100 },
    'RF': { pos: 'RF', svgX: 345, svgY: 100 },
};

// Base SVG positions (matching the diamond)
const BASE_SVG = {
    first: { x: 290, y: 290 },
    second: { x: 200, y: 200 },
    third: { x: 110, y: 290 },
    home: { x: 200, y: 380 },
};

export default function Field({ forceStoreData, readOnly = false }: { forceStoreData?: FieldStoreData; readOnly?: boolean }) {
    const defaultStore = useGameStore();
    const storeData = forceStoreData || defaultStore;
    const { bases } = storeData;
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, base: 'first' | 'second' | 'third', name: string }>({
        isOpen: false, base: 'first', name: ''
    });

    const openAction = (base: 'first' | 'second' | 'third', name: string) => {
        setActionModal({ isOpen: true, base, name });
    }

    // Lineup defensiva dinámica
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
            return { pos: mapped.pos, name, svgX: mapped.svgX, svgY: mapped.svgY };
        })
        .filter(Boolean) as { pos: string; name: string; svgX: number; svgY: number }[];

    return (
        <div className="field-container relative" style={{ background: 'linear-gradient(135deg, #1a3528 0%, #0d1f16 100%)', borderRadius: '16px', overflow: 'hidden', aspectRatio: '400/440' }}>

            {/* ═══ SVG FIELD BACKGROUND ═══ */}
            <svg viewBox="0 0 400 440" className="w-full h-full absolute inset-0">
                {/* Outfield grass */}
                <path
                    d="M 200 420 L 0 150 Q 200 -50 400 150 Z"
                    fill="#2d5a3d"
                />

                {/* Infield dirt diamond */}
                <path
                    d="M 200 380 L 110 290 L 200 200 L 290 290 Z"
                    fill="#c4a44a"
                />

                {/* Pitcher's mound */}
                <circle cx="200" cy="280" r="22" fill="#c4a44a" />
                <circle cx="200" cy="280" r="8" fill="#ffffff" opacity="0.4" />

                {/* Base paths */}
                <line x1="200" y1="380" x2="290" y2="290" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
                <line x1="290" y1="290" x2="200" y2="200" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
                <line x1="200" y1="200" x2="110" y2="290" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
                <line x1="110" y1="290" x2="200" y2="380" stroke="#ffffff" strokeWidth="2" opacity="0.7" />

                {/* Foul lines */}
                <line x1="200" y1="380" x2="0" y2="150" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
                <line x1="200" y1="380" x2="400" y2="150" stroke="#ffffff" strokeWidth="2" opacity="0.5" />

                {/* Home plate */}
                <polygon
                    points="200,388 188,378 188,368 212,368 212,378"
                    fill="#ffffff"
                />

                {/* First base diamond */}
                <rect
                    x={BASE_SVG.first.x - 12}
                    y={BASE_SVG.first.y - 12}
                    width="20"
                    height="20"
                    className={bases.first ? 'fill-blue-500' : 'fill-white'}
                    style={{
                        stroke: '#1E293B',
                        strokeWidth: 2,
                        filter: bases.first ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
                    }}
                    transform={`rotate(45 ${BASE_SVG.first.x} ${BASE_SVG.first.y})`}
                />

                {/* Second base diamond */}
                <rect
                    x={BASE_SVG.second.x - 12}
                    y={BASE_SVG.second.y - 12}
                    width="20"
                    height="20"
                    className={bases.second ? 'fill-blue-500' : 'fill-white'}
                    style={{
                        stroke: '#1E293B',
                        strokeWidth: 2,
                        filter: bases.second ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
                    }}
                    transform={`rotate(45 ${BASE_SVG.second.x} ${BASE_SVG.second.y})`}
                />

                {/* Third base diamond */}
                <rect
                    x={BASE_SVG.third.x - 12}
                    y={BASE_SVG.third.y - 12}
                    width="20"
                    height="20"
                    className={bases.third ? 'fill-blue-500' : 'fill-white'}
                    style={{
                        stroke: '#1E293B',
                        strokeWidth: 2,
                        filter: bases.third ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
                    }}
                    transform={`rotate(45 ${BASE_SVG.third.x} ${BASE_SVG.third.y})`}
                />
            </svg>

            {/* ═══ FIELDER LABELS (HTML overlay, positioned by %) ═══ */}
            {defense.map((player, index) => (
                <div
                    key={`${player.pos}-${index}`}
                    className="absolute text-center z-10 pointer-events-none"
                    style={{
                        left: `${(player.svgX / 400) * 100}%`,
                        top: `${(player.svgY / 440) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="bg-slate-900/95 border border-slate-600 px-2 py-1 rounded text-[12px] font-medium text-slate-100 whitespace-nowrap shadow-lg backdrop-blur-sm">
                        <span className="text-cyan-400 font-bold mr-1">{player.pos}</span>
                        <span className="text-slate-300">{player.name}</span>
                    </div>
                </div>
            ))}

            {/* ═══ RUNNER LABELS + ACTION BUTTONS (HTML overlay) ═══ */}

            {/* 1st Base Runner */}
            {bases.first && (
                <div className="absolute z-30 flex flex-col items-center" style={{ left: `${(BASE_SVG.first.x / 400) * 100}%`, top: `${((BASE_SVG.first.y + 10) / 440) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className="text-[10px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.first}</div>
                    {!readOnly && !forceStoreData && (
                        <button onClick={() => openAction('first', bases.first!)} className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-3 py-1 rounded mt-1 uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">AVANZA</button>
                    )}
                </div>
            )}

            {/* 2nd Base Runner */}
            {bases.second && (
                <div className="absolute z-20 flex flex-col items-center" style={{ left: `${(BASE_SVG.second.x / 400) * 100}%`, top: `${((BASE_SVG.second.y + 10) / 440) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className="text-[8px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.second}</div>
                    {!readOnly && !forceStoreData && (
                        <button onClick={() => openAction('second', bases.second!)} className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-3 py-1 rounded mt-1 uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">AVANZA</button>
                    )}
                </div>
            )}

            {/* 3rd Base Runner */}
            {bases.third && (
                <div className="absolute z-20 flex flex-col items-center" style={{ left: `${(BASE_SVG.third.x / 400) * 100}%`, top: `${((BASE_SVG.third.y + 10) / 440) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className="text-[8px] uppercase font-black tracking-wide text-amber-300 bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded shadow whitespace-nowrap">{bases.third}</div>
                    {!readOnly && !forceStoreData && (
                        <button onClick={() => openAction('third', bases.third!)} className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-3 py-1 rounded mt-1 uppercase font-bold shadow-lg cursor-pointer active:scale-90 transition-all z-30 pointer-events-auto">AVANZA</button>
                    )}
                </div>
            )}

            <BaseActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                baseOrigin={actionModal.base}
                runnerName={actionModal.name}
            />
        </div>
    );
}
