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
    const r = result.trim().toUpperCase();

    // ── Hits (H1/H2/H3/HR — notación WBSC del usuario) ──────────────────────
    if (r === 'HR') return { label: 'HR', labelColor: 'text-indigo-600', basesReached: 4, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    if (r === 'H3' || r === '3B') return { label: 'H3', labelColor: 'text-sky-600', basesReached: 3, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    if (r === 'H2' || r === '2B') return { label: 'H2', labelColor: 'text-sky-600', basesReached: 2, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    if (r === 'H1' || r === '1B') return { label: 'H1', labelColor: 'text-sky-600', basesReached: 1, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Base on balls / HBP ───────────────────────────────────────────────────
    if (r === 'BB') return { label: 'BB', labelColor: 'text-emerald-600', basesReached: 1, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    if (r === 'HBP' || r === 'HP') return { label: 'HBP', labelColor: 'text-emerald-600', basesReached: 1, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Strikeouts ────────────────────────────────────────────────────────────
    if (r === 'KS' || r.includes('(K)')) return { label: 'KS', labelColor: 'text-red-700', basesReached: 0, isOut: true, isStrikeoutSwinging: true, isStrikeoutLooking: false };
    if (r === 'K' || r.includes('(ꓘ)')) return { label: 'K', labelColor: 'text-red-700', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: true };

    // ── Fielder's choice ──────────────────────────────────────────────────────
    if (r.includes("FIELDER") || r === 'FC') return { label: 'FC', labelColor: 'text-amber-600', basesReached: 1, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Errors (E1–E9) ────────────────────────────────────────────────────────
    const errorMatch = r.match(/\bE(\d)\b/);
    if (errorMatch || r.includes('ERROR')) {
        const pos = errorMatch ? errorMatch[1] : '?';
        return { label: `E${pos}`, labelColor: 'text-amber-500', basesReached: 1, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    // ── Sacrifice fly ─────────────────────────────────────────────────────────
    if (r.includes('SAC') || r.includes('SACRIFICIO') || r.includes('SACRIFICE')) {
        const label = r.includes('FLY') || r.includes('VUELO') ? 'SF' : 'SH';
        return { label, labelColor: 'text-purple-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    // ── Fly ball: F7, F8, F9 etc. ─────────────────────────────────────────────
    const flyMatch = r.match(/^F(\d)$/);
    if (flyMatch) return { label: `F${flyMatch[1]}`, labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Line drive: L4, L7, etc. ──────────────────────────────────────────────
    const lineMatch = r.match(/^L(\d)$/);
    if (lineMatch) return { label: `L${lineMatch[1]}`, labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Pop up: P2, P3, etc. ─────────────────────────────────────────────────
    const popMatch = r.match(/^P(\d)$/);
    if (popMatch) return { label: `P${popMatch[1]}`, labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Groundout sequence: 6-3, 5-4-3, 1-3, etc. ────────────────────────────
    const groundMatch = r.match(/^(\d[-\d]+)$/);
    if (groundMatch) return { label: groundMatch[1], labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    // ── Flyout notation found within longer text ──────────────────────────────
    const posInText = r.match(/\b([1-9])\b/);

    if (r.includes('ELEV') || r.includes('FLY')) {
        const pos = posInText ? posInText[1] : '';
        return { label: pos ? `F${pos}` : 'FO', labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    if (r.includes('ROLA') || r.includes('GROUND')) {
        const seqMatch = result.match(/(\d[-\d]+)/);
        if (seqMatch) return { label: seqMatch[1], labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
        const pos = posInText ? posInText[1] : '';
        return { label: pos ? `${pos}-3` : 'GO', labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    if (r.includes('LÍNEA') || r.includes('LINEA') || r.includes('LINE')) {
        const pos = posInText ? posInText[1] : '';
        return { label: pos ? `L${pos}` : 'LD', labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    if (r.includes('DOBLE PLAY') || r.includes('DOUBLE PLAY') || r.includes('DP')) {
        const seqMatch = result.match(/(\d[-\d]+)/);
        return { label: seqMatch ? `DP ${seqMatch[1]}` : 'DP', labelColor: 'text-orange-500', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };
    }

    if (r === 'OUT') return { label: 'OUT', labelColor: 'text-red-600', basesReached: 0, isOut: true, isStrikeoutSwinging: false, isStrikeoutLooking: false };

    const shortened = result.slice(0, 6);
    return { label: shortened, labelColor: 'text-gray-500', basesReached: 0, isOut: false, isStrikeoutSwinging: false, isStrikeoutLooking: false };
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

                // If run scored this at-bat, treat as reaching home
                const rawBasesReached = play.runsScored > 0 && !parsed.isOut
                    ? Math.max(parsed.basesReached, 4)
                    : parsed.basesReached;
                // Override con la base actual del corredor si viene del store en tiempo real
                const effectiveBasesReached = liveBase != null ? Math.max(rawBasesReached, liveBase) : rawBasesReached;

                const reachedFirst = effectiveBasesReached >= 1;
                const reachedSecond = effectiveBasesReached >= 2;
                const reachedThird = effectiveBasesReached >= 3;
                const scored = effectiveBasesReached >= 4;

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
