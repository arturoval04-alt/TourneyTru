import React from 'react';
import { PlayCell } from '../types/boxscore';

interface ScorebookCellProps {
    plays: PlayCell[];
    currentBase?: number | null; // 1-4: base actual del corredor en tiempo real (override)
}

// ──────────────────────────────────────────────────────────────────────────────
// WBSC play parser
// Returns structured info used to draw the SVG diamond cell.
// ──────────────────────────────────────────────────────────────────────────────
interface ParsedPlay {
    label: string;        // Abbreviated label shown on cell (e.g. "6-3", "F7", "K", "1B")
    labelColor: string;   // Tailwind text color class
    basesReached: number; // 0 = out at plate / strikeout, 1 = first, 2 = second, 3 = third, 4 = scored
    isOut: boolean;
    isStrikeoutSwinging: boolean; // KS
    isStrikeoutLooking: boolean;  // K (backwards K)
}

function parsePlay(result: string): ParsedPlay {
    const parts = result.split('|');
    let totalBases = 0;
    let label = '';
    let labelColor = 'text-gray-800';
    let isOut = false;
    let isKS = false;
    let isKL = false;

    parts.forEach((part, index) => {
        const r = part.trim().toUpperCase();
        if (!r) return;

        // Base hits
        if (r === 'HR') { totalBases = Math.max(totalBases, 4); if (index === 0) { label = 'HR'; labelColor = 'text-indigo-600'; } }
        else if (r === 'H3' || r === '3B') { totalBases = Math.max(totalBases, 3); if (index === 0) { label = 'H3'; labelColor = 'text-sky-600'; } }
        else if (r === 'H2' || r === '2B') { totalBases = Math.max(totalBases, 2); if (index === 0) { label = 'H2'; labelColor = 'text-sky-600'; } }
        else if (r === 'H1' || r === '1B') { totalBases = Math.max(totalBases, 1); if (index === 0) { label = 'H1'; labelColor = 'text-sky-600'; } }
        
        // BB / HBP
        else if (r === 'BB' || r === 'HBP' || r === 'HP') { 
            totalBases = Math.max(totalBases, 1); 
            if (index === 0) { label = r === 'BB' ? 'BB' : 'HBP'; labelColor = 'text-emerald-600'; } 
        }

        // Advancements (SB, WP, ADV)
        else if (r.startsWith('SB')) totalBases += 1;
        else if (r.startsWith('ADV')) totalBases += 1;
        else if (r.startsWith('WP_RUN')) totalBases = 4;

        // Outs
        else if (r === 'KS' || r === 'K' || r === 'KL' || r.includes('(K)') || r.includes('(ꓘ)')) { 
            isOut = true; 
            isKS = r === 'KS';
            isKL = r === 'K' || r === 'KL' || r.includes('(ꓘ)');
            if (index === 0 || !label) { 
                label = r === 'KS' ? 'KS' : (r === 'KL' || r === 'K' || r.includes('(ꓘ)') ? 'K' : r); 
                labelColor = 'text-red-700'; 
            } 
        }
        else if (r === 'FC') { totalBases = Math.max(totalBases, 1); if (index === 0 || !label) { label = 'FC'; labelColor = 'text-amber-600'; } }
        else if (r.startsWith('E')) { totalBases = Math.max(totalBases, 1); if (index === 0 || !label) { label = r.split(' ')[0]; labelColor = 'text-amber-500'; } }
        
        // Advancements: Set label if nothing else set
        else if (r.startsWith('SB') || r.startsWith('ADV') || r.startsWith('WP_RUN')) {
            const advLabel = r.startsWith('SB') ? 'SB' : (r.startsWith('ADV') ? 'ADV' : 'WP');
            if (index === 0 || !label) {
                label = advLabel;
                labelColor = r.startsWith('SB') ? 'text-emerald-600' : 'text-sky-600';
            }
            if (r.startsWith('SB') || r.startsWith('ADV')) totalBases += 1;
            else if (r.startsWith('WP_RUN')) totalBases = 4;
        }

        else if (r.includes('SAC') || r.includes('SF') || r.includes('SH') || r.includes('TS')) {
            isOut = true;
            if (index === 0 || !label) {
                label = r.includes('FLY') || r === 'SF' ? 'SF' : 'TS';
                labelColor = 'text-purple-600';
            }
        }
        else if (index === 0 || !label) {
            // Generic out/label
            label = r.length > 5 ? r.substring(0, 5) : r;
            if (r.match(/^[1-9- ]+$/) || r.startsWith('F') || r.startsWith('L') || r.startsWith('P') || r.startsWith('K')) {
                labelColor = 'text-red-600';
                isOut = true;
            }
        }
    });

    return {
        label: label || '?',
        labelColor,
        basesReached: totalBases,
        isOut,
        isStrikeoutSwinging: isKS,
        isStrikeoutLooking: isKL
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Diamond SVG geometry
// The diamond uses a 100×100 viewBox.
//   Home plate  = bottom  (50, 92)
//   First base  = right   (92, 50)
//   Second base = top     (50, 8)
//   Third base  = left    (8, 50)
// ──────────────────────────────────────────────────────────────────────────────
const HOME = { x: 50, y: 92 };
const FIRST = { x: 92, y: 50 };
const SEC = { x: 50, y: 8 };
const THIRD = { x: 8, y: 50 };

// Diamond outline points (background guide)
const DIAMOND_POINTS = `${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SEC.x},${SEC.y} ${THIRD.x},${THIRD.y}`;

interface BasePathProps {
    from: { x: number; y: number };
    to: { x: number; y: number };
    color: string;
}
const BasePath: React.FC<BasePathProps> = ({ from, to, color }) => (
    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="5" strokeLinecap="round" />
);

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export const ScorebookCell: React.FC<ScorebookCellProps> = ({ plays, currentBase }) => {
    if (!plays || plays.length === 0) {
        return (
            <div className="w-16 h-16 border border-gray-300 relative bg-white" />
        );
    }

    return (
        <div className="w-full min-w-[4rem] h-16 border border-gray-300 bg-white flex flex-row items-stretch overflow-x-auto custom-scrollbar">
            {plays.map((play, index) => {
                const parsed = parsePlay(play.result || '');

                // currentBase override: si el corredor está actualmente en una base mayor
                // que la registrada (por WP, SB, etc.), usar currentBase para las rayitas.
                // Solo aplica en el último play del listado (el más reciente de este inning).
                const isLastPlay = index === plays.length - 1;
                const liveBase = isLastPlay && currentBase != null ? currentBase : null;
                const basesReached = Math.max(parsed.basesReached, liveBase || 0);

                const reachedFirst = basesReached >= 1;
                const reachedSecond = basesReached >= 2;
                const reachedThird = basesReached >= 3;
                
                // CRITICAL: Only fill the diamond to home if explicit "scored" flag exists 
                // or if it was a home run.
                const scored = play.scored === true || basesReached >= 4;

                // Path line color — blue for safe, red for out path
                const pathColor = scored ? '#2563eb' : '#1e293b';

                // Out number from outsBeforePlay (1-indexed)
                const outNumber = parsed.isOut
                    ? (play.outsBeforePlay !== undefined && play.outsBeforePlay !== null
                        ? play.outsBeforePlay + 1
                        : play.outsRecorded)
                    : null;

                const validOutNumber = outNumber !== null && outNumber >= 1 && outNumber <= 3;

                return (
                    <div
                        key={index}
                        className="w-16 shrink-0 h-full relative flex items-center justify-center p-0.5 border-r last:border-r-0 border-gray-100"
                    >
                        {/* ─── Diamond SVG ─── */}
                        <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 z-0" overflow="visible">

                            {/* Guide diamond (light gray outline) */}
                            <polygon
                                points={DIAMOND_POINTS}
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="1.5"
                            />

                            {/* Filled diamond when run scored */}
                            {scored && (
                                <polygon
                                    points={`${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SEC.x},${SEC.y} ${THIRD.x},${THIRD.y}`}
                                    fill="#bfdbfe"
                                    opacity="0.85"
                                />
                            )}

                            {/* Base path lines for bases reached */}
                            {reachedFirst && <BasePath from={HOME} to={FIRST} color={pathColor} />}
                            {reachedSecond && <BasePath from={FIRST} to={SEC} color={pathColor} />}
                            {reachedThird && <BasePath from={SEC} to={THIRD} color={pathColor} />}
                            {scored && <BasePath from={THIRD} to={HOME} color="#2563eb" />}

                            {/* Out number circle — bottom-left corner of the diamond */}
                            {validOutNumber && (
                                <>
                                    <circle cx="16" cy="84" r="9" fill="white" stroke="#1e293b" strokeWidth="1.5" />
                                    <text
                                        x="16" y="88"
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="bold"
                                        fill="#1e293b"
                                        fontFamily="monospace"
                                    >
                                        {outNumber}
                                    </text>
                                </>
                            )}
                        </svg>

                        {/* ─── Play label overlay ─── */}
                        <div className={`z-10 pointer-events-none flex flex-col items-center justify-center leading-none gap-0.5`}>
                            {/* Strikeout: render K or reversed-K */}
                            {parsed.isStrikeoutSwinging && (
                                <span className="text-[11px] font-black text-red-700 drop-shadow-sm">K</span>
                            )}
                            {parsed.isStrikeoutLooking && (
                                /* Backwards K using unicode mirror / rotation trick */
                                <span
                                    className="text-[11px] font-black text-red-700 drop-shadow-sm"
                                    style={{ display: 'inline-block', transform: 'scaleX(-1)' }}
                                >
                                    K
                                </span>
                            )}
                            {!parsed.isStrikeoutSwinging && !parsed.isStrikeoutLooking && (
                                <span
                                    className={`text-[9px] font-black ${parsed.labelColor} drop-shadow-sm bg-white/60 px-0.5 rounded`}
                                    style={{ maxWidth: '3rem', textAlign: 'center', lineHeight: '1.1' }}
                                >
                                    {parsed.label}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
