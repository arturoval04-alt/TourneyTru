'use client';

/**
 * AILineupScanner
 * Escanea una foto de lineup con IA (Gemini Vision via backend proxy),
 * cruza los resultados contra el roster del equipo, y devuelve LineupEntry[].
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud, Wand2, Users, Plus, Trash2,
  CheckCircle2, AlertCircle, Loader2, Check, Save,
} from 'lucide-react';
import api from '@/lib/api';
import type { Player, LineupEntry } from './LineupBuilder';
import type { Position } from './PositionSelectorMini';

// ── Posiciones válidas ─────────────────────────────────────────────────────────

const POSITIONS: Position[] = [
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF', 'DH', 'BE',
];

// Posiciones defensivas (1-10) — estas NO se pueden repetir
const DEFENSIVE_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF'];

// Label con número para mostrar en el select
const POSITION_LABELS: Record<string, string> = {
  P: '1 — P', C: '2 — C', '1B': '3 — 1B', '2B': '4 — 2B',
  '3B': '5 — 3B', SS: '6 — SS', LF: '7 — LF', CF: '8 — CF',
  RF: '9 — RF', SF: '10 — SF', DH: 'DH', BE: 'BE',
};

// Mapeo de aliases de la IA (ej: "JD" → "DH")
const POSITION_ALIASES: Record<string, Position> = {
  JD: 'DH', DP: 'DH', FLEX: 'SF',
};

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface AILineupRow {
  id: number;
  rosterId: string;       // playerId del roster
  extractedName: string;  // Lo que la IA leyó
  position: Position;
  isMatched: boolean;
}

interface AILineupScannerProps {
  roster: Player[];
  onLineupReady: (entries: LineupEntry[]) => void;
  onCancel: () => void;
}

// ── Fuzzy match ────────────────────────────────────────────────────────────────

function matchPlayerToRoster(
  extractedText: string,
  roster: Player[],
): Player | null {
  if (!extractedText) return null;

  const cleanText = extractedText.toUpperCase().replace(/[^\w\s]/g, '');
  const words = cleanText.split(' ').filter((w) => w.length > 2);

  let bestMatch: Player | null = null;
  let highestScore = 0;

  for (const player of roster) {
    let score = 0;
    const fullName = `${player.firstName} ${player.lastName}`.toUpperCase();

    for (const word of words) {
      if (fullName.includes(word)) score++;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = player;
    }
  }

  return highestScore > 0 ? bestMatch : null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AILineupScanner({
  roster,
  onLineupReady,
  onCancel,
}: AILineupScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [lineup, setLineup] = useState<AILineupRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Subir imagen ─────────────────────────────────────────────────────────────

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Full = reader.result as string;
      setImagePreview(base64Full);

      const mimeType = base64Full.split(';')[0].split(':')[1];
      const base64Data = base64Full.split(',')[1];

      setImageBase64(base64Data);
      setImageMimeType(mimeType);

      setScanComplete(false);
      setLineup([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // ── Procesar con IA (backend proxy) ──────────────────────────────────────────

  const processImage = async () => {
    if (!imageBase64 || !imageMimeType) return;

    setIsScanning(true);
    setError(null);

    try {
      const { data } = await api.post('/vision/lineup', {
        imageBase64,
        mimeType: imageMimeType,
      });

      const results: { name: string; position: string }[] = data;

      const formattedLineup: AILineupRow[] = results.map((player, index) => {
        const rosterMatch = matchPlayerToRoster(player.name, roster);
        let rawPos = player.position?.toUpperCase() ?? 'P';
        // Resolver aliases (JD → DH, etc.)
        const resolved = POSITION_ALIASES[rawPos] ?? rawPos;
        const pos = (POSITIONS.includes(resolved as Position) ? resolved : 'P') as Position;

        return {
          id: Date.now() + index,
          rosterId: rosterMatch?.id ?? '',
          extractedName: player.name || 'Texto ilegible',
          position: pos,
          isMatched: !!rosterMatch,
        };
      });
      setLineup(formattedLineup);
      setScanComplete(true);
    } catch (err: any) {
      console.error('Error al procesar imagen:', err);
      setError(
        err?.response?.data?.message ??
        'Hubo un error al analizar la imagen. Intenta de nuevo o ingresa los datos manualmente.',
      );
    } finally {
      setIsScanning(false);
    }
  };


  // ── Edición manual de los resultados ─────────────────────────────────────────

  const updateRow = (index: number, field: keyof AILineupRow, value: string) => {
    setLineup((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === 'rosterId') updated[index].isMatched = false;
      return updated;
    });
  };

  const addManualRow = () => {
    setLineup((prev) => [
      ...prev,
      { id: Date.now(), rosterId: '', extractedName: '', position: 'P' as Position, isMatched: false },
    ]);
  };

  const removeRow = (index: number) => {
    setLineup((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Confirmar lineup ─────────────────────────────────────────────────────────

  const allAssigned = lineup.length > 0 && lineup.every((r) => r.rosterId);

  const [duplicateWarning, setDuplicateWarning] = useState<string[] | null>(null);

  // Detectar posiciones defensivas duplicadas
  const getDuplicatePositions = (): string[] => {
    const counts: Record<string, number> = {};
    lineup.forEach((row) => {
      if (DEFENSIVE_POSITIONS.includes(row.position)) {
        counts[row.position] = (counts[row.position] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([pos, count]) => `${POSITION_LABELS[pos]} (${count}x)`);
  };

  const handleConfirm = () => {
    if (!allAssigned) return;

    // Checar duplicados antes de confirmar
    const dupes = getDuplicatePositions();
    if (dupes.length > 0 && !duplicateWarning) {
      setDuplicateWarning(dupes);
      return; // Mostrar warning, no confirmar aún
    }

    setDuplicateWarning(null);
    const entries: LineupEntry[] = lineup.map((row, i) => {
      const player = roster.find((p) => p.id === row.rosterId);
      return {
        playerId: row.rosterId,
        playerName: player ? `${player.firstName} ${player.lastName}` : '',
        position: row.position,
        battingOrder: i + 1,
        dhForPosition: null,
      };
    });

    onLineupReady(entries);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Panel de subida de imagen ── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Wand2 size={14} className="text-blue-400" />
          Escanear Lineup con IA
        </h4>

        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
          >
            <div className="bg-zinc-800 p-3 rounded-full mb-3 group-hover:bg-blue-600 transition-colors">
              <UploadCloud size={24} className="text-zinc-400 group-hover:text-white" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Sube una foto del lineup</p>
            <p className="text-xs text-zinc-500 mt-1">Hoja de lineup escrita a mano o captura de pantalla</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 h-48 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-blue-400 text-sm font-medium animate-pulse">
                    Analizando nombres y posiciones...
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-xs disabled:opacity-50"
              >
                Cambiar foto
              </button>
              <button
                onClick={processImage}
                disabled={isScanning || scanComplete}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors text-xs flex justify-center items-center gap-1.5"
              >
                {scanComplete ? (
                  <><CheckCircle2 size={14} /> Analizado</>
                ) : (
                  <><Wand2 size={14} /> Procesar con IA</>
                )}
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </div>
        )}

        {error && (
          <div className="text-red-400 text-xs mt-3 flex items-center gap-2 bg-red-900/20 p-2.5 rounded-lg border border-red-900/50">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 bg-blue-900/20 text-blue-300 p-2.5 rounded-lg border border-blue-900/50">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p className="text-[11px]">
            La IA extraerá nombres y posiciones de la foto. Luego podrás revisar y ajustar antes de confirmar.
          </p>
        </div>
      </div>

      {/* ── Tabla de resultados ── */}
      {lineup.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-white">Jugadores Detectados</h4>
            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {lineup.length} jugadores
            </span>
          </div>

          {/* Encabezados */}
          <div className="flex gap-2 px-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            <div className="w-6 text-center">#</div>
            <div className="flex-1">Jugador (Roster)</div>
            <div className="w-20">Pos</div>
            <div className="w-8" />
          </div>

          {/* Filas */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {lineup.map((row, index) => (
              <div
                key={row.id}
                className={`flex gap-2 items-start p-2 rounded-lg border transition-colors ${
                  row.isMatched
                    ? 'border-emerald-900/50 bg-emerald-900/10'
                    : row.rosterId
                    ? 'border-zinc-700/50'
                    : 'border-amber-500/40 bg-amber-900/5'
                }`}
              >
                <div className="w-6 text-center font-bold text-zinc-500 text-xs mt-2">
                  {index + 1}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="relative">
                    <select
                      value={row.rosterId}
                      onChange={(e) => updateRow(index, 'rosterId', e.target.value)}
                      className={`w-full bg-zinc-800 border text-xs rounded-md px-2.5 py-2 appearance-none focus:outline-none focus:border-blue-500 ${
                        row.isMatched
                          ? 'border-emerald-500 text-emerald-100'
                          : row.rosterId
                          ? 'border-zinc-600 text-white'
                          : 'border-amber-500/80 text-amber-100'
                      }`}
                    >
                      <option value="">-- Seleccionar jugador --</option>
                      {roster.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.number ?? '?'} - {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                    {row.isMatched && (
                      <Check size={12} className="absolute right-7 top-2.5 text-emerald-500" />
                    )}
                  </div>
                  {row.extractedName && (
                    <span className="text-[9px] text-zinc-500 mt-0.5 ml-1">
                      IA detectó: <span className="text-zinc-400">&quot;{row.extractedName}&quot;</span>
                    </span>
                  )}
                </div>

                <select
                  value={row.position}
                  onChange={(e) => { updateRow(index, 'position', e.target.value); setDuplicateWarning(null); }}
                  className="w-28 bg-zinc-800 border border-zinc-600 text-white text-xs rounded-md px-1.5 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {POSITION_LABELS[pos]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeRow(index)}
                  className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <button
              onClick={addManualRow}
              className="w-full mt-2 py-2 border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-medium text-xs"
            >
              <Plus size={14} />
              Agregar jugador
            </button>
          </div>
        </div>
      )}

      {/* ── Botones de acción ── */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
        >
          Volver al modo manual
        </button>
        {lineup.length > 0 && (
          <div className="flex flex-col gap-2 flex-1">
            {duplicateWarning && (
              <div className="flex items-start gap-2 bg-amber-900/20 text-amber-300 p-2.5 rounded-lg border border-amber-700/50 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Posiciones repetidas: {duplicateWarning.join(', ')}</p>
                  <p className="text-amber-400/80 mt-0.5">Corrige arriba o presiona de nuevo para confirmar de todos modos.</p>
                </div>
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={!allAssigned}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                allAssigned
                  ? duplicateWarning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
              title={!allAssigned ? 'Asigna un jugador del roster a todos los campos' : ''}
            >
              <Save size={14} />
              {duplicateWarning ? 'Confirmar de todos modos' : `Confirmar Alineación (${lineup.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
