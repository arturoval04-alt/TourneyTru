'use client';

/**
 * PositionSelectorMini
 * Mini campo SVG para elegir la posición defensiva de un jugador en el lineup.
 * Posiciones 1-9 en ubicaciones reales, SF (pos 10) detrás de 2B,
 * DH y BE fuera del diamante.
 */

import React from 'react';

export type Position =
  | 'P' | 'C' | '1B' | '2B' | '3B' | 'SS'
  | 'LF' | 'CF' | 'RF' | 'SF' | 'DH' | 'BE';

interface PositionSelectorMiniProps {
  /** Posición actualmente seleccionada (para resaltarla) */
  selected?: Position | null;
  /** Posiciones ya ocupadas en el lineup actual (para deshabilitarlas) */
  occupiedPositions?: Position[];
  /** ¿Está el DH habilitado para este torneo/liga? */
  dhEnabled?: boolean;
  onSelect: (position: Position) => void;
}

// Coordenadas en el SVG (viewBox 0 0 280 300)
const FIELD_POSITIONS: { pos: Position; label: string; x: number; y: number; num: string }[] = [
  { pos: 'P',  label: 'P',  x: 140, y: 158, num: '1' },
  { pos: 'C',  label: 'C',  x: 140, y: 228, num: '2' },
  { pos: '1B', label: '1B', x: 210, y: 148, num: '3' },
  { pos: '2B', label: '2B', x: 170, y: 100, num: '4' },
  { pos: '3B', label: '3B', x:  70, y: 148, num: '5' },
  { pos: 'SS', label: 'SS', x: 110, y: 100, num: '6' },
  { pos: 'LF', label: 'LF', x:  45, y:  50, num: '7' },
  { pos: 'CF', label: 'CF', x: 140, y:  22, num: '8' },
  { pos: 'RF', label: 'RF', x: 235, y:  50, num: '9' },
  { pos: 'SF', label: 'SF', x: 140, y:  72, num: '10' },
];

export default function PositionSelectorMini({
  selected,
  occupiedPositions = [],
  dhEnabled = true,
  onSelect,
}: PositionSelectorMiniProps) {
  const isOccupied = (pos: Position) =>
    pos !== selected && occupiedPositions.includes(pos);

  const btnBase =
    'flex flex-col items-center justify-center rounded-lg border-2 font-bold text-xs transition-all select-none cursor-pointer';

  const posClass = (pos: Position) => {
    if (pos === selected)
      return `${btnBase} bg-blue-600 border-blue-400 text-white shadow-lg scale-105`;
    if (isOccupied(pos))
      return `${btnBase} bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-50`;
    return `${btnBase} bg-zinc-900 border-zinc-600 text-zinc-200 hover:bg-blue-900 hover:border-blue-500 active:scale-95`;
  };

  const handleClick = (pos: Position) => {
    if (!isOccupied(pos)) onSelect(pos);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-zinc-950 rounded-xl select-none">
      {/* Campo SVG */}
      <div className="relative w-full" style={{ maxWidth: 280 }}>
        <svg
          viewBox="0 0 280 260"
          className="w-full"
          style={{ display: 'block' }}
        >
          {/* Grass */}
          <ellipse cx="140" cy="200" rx="135" ry="90" fill="#1a3a1a" />
          {/* Infield dirt arc */}
          <path
            d="M 75 190 Q 140 80 205 190 Z"
            fill="#5a3a1a"
            opacity="0.5"
          />
          {/* Foul lines */}
          <line x1="140" y1="240" x2="10"  y2="10"  stroke="#c8a86b" strokeWidth="1.5" opacity="0.5" />
          <line x1="140" y1="240" x2="270" y2="10"  stroke="#c8a86b" strokeWidth="1.5" opacity="0.5" />
          {/* Diamond */}
          <polygon
            points="140,215 185,170 140,125 95,170"
            fill="#5a3a1a"
            stroke="#c8a86b"
            strokeWidth="1.5"
          />
          {/* Bases */}
          <rect x="136" y="211" width="8" height="8" fill="white" rx="1" />
          <rect x="181" y="166" width="8" height="8" fill="white" rx="1" transform="rotate(45 185 170)" />
          <rect x="136" y="121" width="8" height="8" fill="white" rx="1" />
          <rect x="91"  y="166" width="8" height="8" fill="white" rx="1" transform="rotate(45 95 170)" />
          {/* Pitcher mound */}
          <circle cx="140" cy="170" r="7" fill="#8a6a3a" stroke="#c8a86b" strokeWidth="1" />
        </svg>

        {/* Position buttons overlaid on SVG */}
        <div className="absolute inset-0">
          {FIELD_POSITIONS.map(({ pos, label, x, y, num }) => {
            // Convert SVG coords (viewBox 0 0 280 260) to percentage
            const left = `${(x / 280) * 100}%`;
            const top  = `${(y / 260) * 100}%`;
            return (
              <button
                key={pos}
                onClick={() => handleClick(pos)}
                disabled={isOccupied(pos)}
                title={`${label} (#${num})`}
                className={posClass(pos)}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  transform: 'translate(-50%, -50%)',
                  width: 36,
                  height: 36,
                  fontSize: 10,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                <span className="text-[9px] opacity-60">{num}</span>
                <span className="text-[11px] font-bold leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DH y BE fuera del campo */}
      <div className="flex gap-3 w-full justify-center">
        {dhEnabled && (
          <button
            onClick={() => handleClick('DH')}
            disabled={isOccupied('DH')}
            className={`${posClass('DH')} px-5 py-2 text-sm gap-0.5`}
            title="Designated Hitter — debe anclarse a un defensor"
          >
            <span className="text-[9px] opacity-60">DH</span>
            <span className="font-bold">DH</span>
          </button>
        )}
        <button
          onClick={() => handleClick('BE')}
          disabled={isOccupied('BE')}
          className={`${posClass('BE')} px-5 py-2 text-sm gap-0.5`}
          title="Bateador Extra — solo batea, sin posición defensiva"
        >
          <span className="text-[9px] opacity-60">BE</span>
          <span className="font-bold">BE</span>
        </button>
      </div>

      {/* Leyenda */}
      <p className="text-[10px] text-zinc-500 text-center">
        SF = ShortFielder (pos. 10) · BE = Bateador Extra
      </p>
    </div>
  );
}
