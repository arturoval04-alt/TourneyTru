import React from 'react';
import { PlayCell } from '../types/boxscore';

interface ScorebookCellProps {
    plays: PlayCell[];
    currentBase?: number | null;
}

type SegmentId = 1 | 2 | 3 | 4;

interface SegmentOverlay {
    segment: SegmentId;
    text: string;
    tone: 'emerald' | 'sky' | 'orange' | 'violet' | 'red';
}

interface ParsedPlayVisual {
    label: string;
    labelColor: string;
    safeSegments: SegmentId[];
    liveSegments: SegmentId[];
    overlays: SegmentOverlay[];
    isOut: boolean;
    isStrikeoutSwinging: boolean;
    isStrikeoutLooking: boolean;
    scored: boolean;
    unearned: boolean;
    outSegment: SegmentId | null;
}

const CELL_WIDTH_CLASS = 'w-[4.4rem]';
const CELL_MIN_WIDTH_CLASS = 'min-w-[4.4rem]';
const CELL_HEIGHT_CLASS = 'h-16';

const HOME = { x: 50, y: 92 };
const FIRST = { x: 92, y: 50 };
const SECOND = { x: 50, y: 8 };
const THIRD = { x: 8, y: 50 };

const SEGMENT_POINTS: Record<SegmentId, { from: { x: number; y: number }; to: { x: number; y: number } }> = {
    1: { from: HOME, to: FIRST },
    2: { from: FIRST, to: SECOND },
    3: { from: SECOND, to: THIRD },
    4: { from: THIRD, to: HOME },
};

const SEGMENT_MIDPOINTS: Record<SegmentId, { x: number; y: number }> = {
    1: { x: 73, y: 72 },
    2: { x: 73, y: 28 },
    3: { x: 27, y: 28 },
    4: { x: 27, y: 72 },
};

const DIAMOND_POINTS = `${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SECOND.x},${SECOND.y} ${THIRD.x},${THIRD.y}`;

const OVERLAY_STYLE: Record<SegmentOverlay['tone'], { fill: string; text: string; stroke: string }> = {
    emerald: { fill: '#dcfce7', text: '#166534', stroke: '#86efac' },
    sky: { fill: '#e0f2fe', text: '#0c4a6e', stroke: '#7dd3fc' },
    orange: { fill: '#ffedd5', text: '#9a3412', stroke: '#fdba74' },
    violet: { fill: '#ede9fe', text: '#5b21b6', stroke: '#c4b5fd' },
    red: { fill: '#fee2e2', text: '#991b1b', stroke: '#fca5a5' },
};

function normalizeCode(part: string) {
    return part.trim().toUpperCase();
}

function getPrimaryLabel(code: string) {
    if (code === 'HR' || code === 'H4') return { label: 'HR', labelColor: 'text-indigo-600' };
    if (code === 'H3' || code === '3B') return { label: 'H3', labelColor: 'text-sky-600' };
    if (code === 'H2' || code === '2B') return { label: 'H2', labelColor: 'text-sky-600' };
    if (code === 'H1' || code === '1B') return { label: 'H1', labelColor: 'text-sky-600' };
    if (code === 'BB') return { label: 'BB', labelColor: 'text-emerald-600' };
    if (code === 'IBB') return { label: 'IBB', labelColor: 'text-emerald-600' };
    if (code === 'HBP' || code === 'HP') return { label: 'HBP', labelColor: 'text-emerald-600' };
    if (code === 'KWP') return { label: 'KWP', labelColor: 'text-violet-600' };
    if (code === 'FC' || code === 'BO') return { label: 'BO', labelColor: 'text-amber-600' };
    if (code === 'PR') return { label: 'PR', labelColor: 'text-violet-600' };
    if (/^E\d+$/.test(code)) return { label: code, labelColor: 'text-amber-500' };
    if (code === 'SF' || code.includes('SAC') || code.includes('FLY')) return { label: 'SF', labelColor: 'text-purple-600' };
    if (code === 'SH' || code === 'TS') return { label: 'TS', labelColor: 'text-purple-600' };
    if (code === 'KS') return { label: 'KS', labelColor: 'text-red-700' };
    if (code === 'K' || code === 'KL') return { label: 'K', labelColor: 'text-red-700' };
    if (code === 'WP_RUN') return { label: 'WP', labelColor: 'text-sky-600' };
    if (code === 'PB_RUN') return { label: 'PB', labelColor: 'text-orange-500' };
    if (code === 'BK_RUN') return { label: 'BK', labelColor: 'text-violet-600' };
    if (code === 'SB') return { label: 'SB', labelColor: 'text-emerald-600' };
    if (code === 'ADV') return { label: 'ADV', labelColor: 'text-sky-600' };
    if (code === 'CS' || code === 'RUNNER_OUT') return { label: 'OUT', labelColor: 'text-red-700' };
    if (/^[1-9-]+$/.test(code) || code.startsWith('F') || code.startsWith('L') || code.startsWith('P')) {
        return { label: code, labelColor: 'text-red-600' };
    }

    return { label: code.length > 5 ? code.slice(0, 5) : code || '?', labelColor: 'text-gray-800' };
}

function getInitialBaseFromCode(code: string): number {
    if (code === 'HR' || code === 'H4' || code === 'WP_RUN' || code === 'PB_RUN' || code === 'BK_RUN') return 4;
    if (code === 'H3' || code === '3B') return 3;
    if (code === 'H2' || code === '2B') return 2;
    if (
        code === 'H1' ||
        code === '1B' ||
        code === 'BB' ||
        code === 'IBB' ||
        code === 'HBP' ||
        code === 'HP' ||
        code === 'KWP' ||
        code === 'FC' ||
        code === 'BO' ||
        code === 'PR' ||
        /^E\d+$/.test(code)
    ) {
        return 1;
    }

    return 0;
}

function moveRunner(
    fromBase: number,
    toBase: number,
    safeSegments: SegmentId[],
    overlays: SegmentOverlay[],
    overlay?: Omit<SegmentOverlay, 'segment'>,
) {
    if (toBase <= fromBase) return;

    for (let nextBase = fromBase + 1; nextBase <= toBase; nextBase += 1) {
        safeSegments.push(nextBase as SegmentId);
    }

    if (overlay) {
        overlays.push({ ...overlay, segment: Math.min(4, toBase) as SegmentId });
    }
}

function parsePlayVisual(result: string, currentBase?: number | null): ParsedPlayVisual {
    const codes = result.split('|').map(normalizeCode).filter(Boolean);
    const primaryCode = codes[0] ?? '';
    const { label, labelColor } = getPrimaryLabel(primaryCode);

    const safeSegments: SegmentId[] = [];
    const overlays: SegmentOverlay[] = [];
    let isOut = false;
    const isStrikeoutSwinging = primaryCode === 'KS' || primaryCode === 'KWP';
    const isStrikeoutLooking = primaryCode === 'K' || primaryCode === 'KL';
    let scored = false;
    let unearned = false;
    let outSegment: SegmentId | null = null;
    let current = getInitialBaseFromCode(primaryCode);

    moveRunner(0, current, safeSegments, overlays);
    if (current >= 4) scored = true;

    if (
        primaryCode === 'KS' ||
        primaryCode === 'K' ||
        primaryCode === 'KL' ||
        primaryCode === 'SF' ||
        primaryCode === 'SH' ||
        primaryCode === 'TS' ||
        /^[1-9-]+$/.test(primaryCode) ||
        primaryCode.startsWith('F') ||
        primaryCode.startsWith('L') ||
        primaryCode.startsWith('P')
    ) {
        isOut = true;
    }

    codes.slice(1).forEach((code) => {
        if (code === 'UNEARNED') {
            unearned = true;
            return;
        }

        if (code === 'SB') {
            const target = Math.min(4, current + 1);
            moveRunner(current, target, safeSegments, overlays, { text: 'SB', tone: 'emerald' });
            current = target;
            if (current === 4) scored = true;
            return;
        }

        if (code === 'ADV') {
            const target = Math.min(4, current + 1);
            moveRunner(current, target, safeSegments, overlays, { text: 'ADV', tone: 'sky' });
            current = target;
            if (current === 4) scored = true;
            return;
        }

        if (code === 'WP_RUN') {
            moveRunner(current, 4, safeSegments, overlays, { text: 'WP', tone: 'sky' });
            current = 4;
            scored = true;
            return;
        }

        if (code === 'PB_RUN') {
            moveRunner(current, 4, safeSegments, overlays, { text: 'PB', tone: 'orange' });
            current = 4;
            scored = true;
            return;
        }

        if (code === 'BK_RUN') {
            moveRunner(current, 4, safeSegments, overlays, { text: 'BK', tone: 'violet' });
            current = 4;
            scored = true;
            return;
        }

        if (code === 'RUN_SCORED') {
            moveRunner(current, 4, safeSegments, overlays, { text: 'R', tone: 'sky' });
            current = 4;
            scored = true;
            return;
        }

        if (code === 'CS') {
            isOut = true;
            outSegment = (Math.min(4, Math.max(1, current + 1)) as SegmentId);
            overlays.push({ segment: outSegment, text: 'CS', tone: 'red' });
            return;
        }

        if (code === 'RUNNER_OUT') {
            isOut = true;
            outSegment = (Math.min(4, Math.max(1, current + 1)) as SegmentId);
            overlays.push({ segment: outSegment, text: 'OUT', tone: 'red' });
        }
    });

    const finalBase = scored ? 4 : current;
    const liveSegments: SegmentId[] = [];
    if (!isOut && !scored && currentBase != null && currentBase > finalBase) {
        for (let nextBase = finalBase + 1; nextBase <= currentBase; nextBase += 1) {
            liveSegments.push(nextBase as SegmentId);
        }
    }

    return {
        label: label || '?',
        labelColor,
        safeSegments,
        liveSegments,
        overlays,
        isOut,
        isStrikeoutSwinging,
        isStrikeoutLooking,
        scored,
        unearned,
        outSegment,
    };
}

function BasePath({
    segment,
    color,
    dashed = false,
    width = 6,
}: {
    segment: SegmentId;
    color: string;
    dashed?: boolean;
    width?: number;
}) {
    const points = SEGMENT_POINTS[segment];
    return (
        <line
            x1={points.from.x}
            y1={points.from.y}
            x2={points.to.x}
            y2={points.to.y}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeDasharray={dashed ? '8 5' : undefined}
        />
    );
}

function SegmentBadge({ overlay }: { overlay: SegmentOverlay }) {
    const midpoint = SEGMENT_MIDPOINTS[overlay.segment];
    const style = OVERLAY_STYLE[overlay.tone];
    const width = Math.max(27, overlay.text.length * 10.2 + 13.5);

    return (
        <g>
            <rect
                x={midpoint.x - width / 2}
                y={midpoint.y - 8.5}
                rx="6"
                ry="6"
                width={width}
                height="17"
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1"
            />
            <text
                x={midpoint.x}
                y={midpoint.y + 4.3}
                textAnchor="middle"
                fontSize="10.8"
                fontWeight="700"
                fill={style.text}
                fontFamily="monospace"
            >
                {overlay.text}
            </text>
        </g>
    );
}

function OutMarker({ segment }: { segment: SegmentId }) {
    const midpoint = SEGMENT_MIDPOINTS[segment];
    return (
        <g>
            <circle cx={midpoint.x} cy={midpoint.y} r="8" fill="white" stroke="#dc2626" strokeWidth="1.5" />
            <path d={`M ${midpoint.x - 4} ${midpoint.y - 4} L ${midpoint.x + 4} ${midpoint.y + 4}`} stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
            <path d={`M ${midpoint.x + 4} ${midpoint.y - 4} L ${midpoint.x - 4} ${midpoint.y + 4}`} stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
        </g>
    );
}

export const ScorebookCell: React.FC<ScorebookCellProps> = ({ plays, currentBase }) => {
    if (!plays || plays.length === 0) {
        if (currentBase != null && currentBase >= 1) {
            const liveSegments = Array.from({ length: currentBase }, (_, index) => (index + 1) as SegmentId);
            return (
                <div className={`${CELL_WIDTH_CLASS} ${CELL_HEIGHT_CLASS} border border-gray-300 relative bg-white`}>
                    <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 z-0" overflow="visible">
                        <polygon points={DIAMOND_POINTS} fill="none" stroke="#e5e7eb" strokeWidth="1.5" />
                        {liveSegments.map((segment) => (
                            <BasePath key={`live-${segment}`} segment={segment} color="#1e293b" />
                        ))}
                    </svg>
                    <div className="z-10 absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-black text-purple-600 bg-white/80 px-1.5 py-0.5 rounded">PR</span>
                    </div>
                </div>
            );
        }

        return <div className={`${CELL_WIDTH_CLASS} ${CELL_HEIGHT_CLASS} border border-gray-300 relative bg-white`} />;
    }

    return (
        <div className={`w-full ${CELL_MIN_WIDTH_CLASS} ${CELL_HEIGHT_CLASS} border border-gray-300 bg-white flex flex-row items-stretch overflow-x-auto custom-scrollbar`}>
            {plays.map((play, index) => {
                const isLastPlay = index === plays.length - 1;
                const visual = parsePlayVisual(play.result || '', isLastPlay ? currentBase : null);
                const outNumber = visual.isOut
                    ? (play.outsBeforePlay !== undefined && play.outsBeforePlay !== null
                        ? play.outsBeforePlay + 1
                        : play.outsRecorded)
                    : null;
                const validOutNumber = outNumber !== null && outNumber >= 1 && outNumber <= 3;
                const fillColor = visual.scored
                    ? (visual.unearned ? '#fde68a' : '#bfdbfe')
                    : undefined;

                return (
                    <div
                        key={`${play.result}-${index}`}
                        className={`${CELL_WIDTH_CLASS} shrink-0 h-full relative flex items-center justify-center p-1 border-r last:border-r-0 border-gray-100`}
                    >
                        <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 z-0" overflow="visible">
                            <polygon points={DIAMOND_POINTS} fill="none" stroke="#e5e7eb" strokeWidth="1.5" />

                            {fillColor && (
                                <polygon
                                    points={DIAMOND_POINTS}
                                    fill={fillColor}
                                    opacity="0.9"
                                />
                            )}

                            {visual.safeSegments.map((segment) => (
                                <BasePath
                                    key={`safe-${segment}`}
                                    segment={segment}
                                    color={visual.scored ? '#2563eb' : '#1e293b'}
                                />
                            ))}

                            {visual.liveSegments.map((segment) => (
                                <BasePath key={`live-${segment}`} segment={segment} color="#64748b" dashed width={4.5} />
                            ))}

                            {visual.outSegment && (
                                <BasePath segment={visual.outSegment} color="#dc2626" dashed width={4.5} />
                            )}

                            {visual.overlays.map((overlay, overlayIndex) => (
                                <SegmentBadge key={`${overlay.segment}-${overlay.text}-${overlayIndex}`} overlay={overlay} />
                            ))}

                            {visual.outSegment && <OutMarker segment={visual.outSegment} />}

                            {validOutNumber && (
                                <>
                                    <circle cx="16" cy="84" r="10.5" fill="white" stroke="#1e293b" strokeWidth="1.7" />
                                    <text
                                        x="16"
                                        y="88.5"
                                        textAnchor="middle"
                                        fontSize="10"
                                        fontWeight="bold"
                                        fill="#1e293b"
                                        fontFamily="monospace"
                                    >
                                        {outNumber}
                                    </text>
                                </>
                            )}
                        </svg>

                        <div className="z-10 pointer-events-none flex flex-col items-center justify-center leading-none gap-0.5">
                            {visual.isStrikeoutSwinging && (
                                <span className="text-[14px] font-black text-red-700 drop-shadow-sm">K</span>
                            )}
                            {visual.isStrikeoutLooking && (
                                <span
                                    className="text-[14px] font-black text-red-700 drop-shadow-sm"
                                    style={{ display: 'inline-block', transform: 'scaleX(-1)' }}
                                >
                                    K
                                </span>
                            )}
                            {!visual.isStrikeoutSwinging && !visual.isStrikeoutLooking && (
                                <span
                                    className={`text-[10.5px] font-black ${visual.labelColor} drop-shadow-sm bg-white/80 px-1.5 py-0.5 rounded`}
                                    style={{ maxWidth: '4.2rem', textAlign: 'center', lineHeight: '1.1' }}
                                >
                                    {visual.label}
                                </span>
                            )}
                            {visual.unearned && (
                                <span className="text-[8px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded">UR</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
