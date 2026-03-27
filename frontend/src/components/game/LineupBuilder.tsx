'use client';

/**
 * LineupBuilder
 * Construcción paso a paso del lineup de un equipo.
 * El usuario agrega jugadores uno por uno seleccionando jugador y posición.
 */

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Save, UserPlus, X, Edit2, Wand2, Users } from 'lucide-react';
import PositionSelectorMini, { Position } from './PositionSelectorMini';
import AILineupScanner from './AILineupScanner';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number | null;
  position?: string | null;
}

export interface LineupEntry {
  playerId: string;
  playerName: string;
  position: Position;
  dhForPosition?: string | null;
  battingOrder: number;
}

interface LineupBuilderProps {
  teamName: string;
  players: Player[];
  /** Lineup ya guardado (para edición). Si se pasa, empieza poblado. */
  initialLineup?: LineupEntry[];
  onComplete: (lineup: LineupEntry[]) => void;
  onBack?: () => void;
}

const POSITION_LABELS: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', '1B': '1ra Base', '2B': '2da Base',
  '3B': '3ra Base', SS: 'SS', LF: 'LF', CF: 'CF', RF: 'RF',
  SF: 'ShortFielder', DH: 'DH', BE: 'Bat. Extra',
};

export default function LineupBuilder({
  teamName,
  players,
  initialLineup,
  onComplete,
  onBack,
}: LineupBuilderProps) {
  const [lineup, setLineup] = useState<LineupEntry[]>(initialLineup ?? []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'ai'>('manual');

  // Form del slot actual
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [dhForPosition, setDhForPosition] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Jugadores ya en lineup (para excluirlos del dropdown)
  const usedPlayerIds = useMemo(
    () => lineup.map((e) => e.playerId).filter((_, i) => i !== editingIndex),
    [lineup, editingIndex]
  );

  // Posiciones defensivas ocupadas (excluyendo el slot que se edita)
  const occupiedPositions = useMemo<Position[]>(
    () =>
      lineup
        .filter((_, i) => i !== editingIndex)
        .map((e) => e.position)
        .filter((p): p is Position => !!p && p !== 'BE'),
    [lineup, editingIndex]
  );

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return players
      .filter((p) => !usedPlayerIds.includes(p.id))
      .filter(
        (p) =>
          !q ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          String(p.number).includes(q)
      );
  }, [players, usedPlayerIds, searchQuery]);

  // Defensores actuales (para anclar DH)
  const currentDefenders = useMemo<Position[]>(
    () =>
      lineup
        .filter((_, i) => i !== editingIndex)
        .map((e) => e.position)
        .filter((p): p is Position => ['P','C','1B','2B','3B','SS','LF','CF','RF','SF'].includes(p ?? '')),
    [lineup, editingIndex]
  );

  const openNewSlot = () => {
    setEditingIndex(null);
    setSelectedPlayerId('');
    setSelectedPosition(null);
    setDhForPosition('');
    setSearchQuery('');
    setShowPositionPicker(false);
  };

  const openEditSlot = (index: number) => {
    const entry = lineup[index];
    setEditingIndex(index);
    setSelectedPlayerId(entry.playerId);
    setSelectedPosition(entry.position);
    setDhForPosition(entry.dhForPosition ?? '');
    setSearchQuery('');
    setShowPositionPicker(false);
  };

  const handleSelectPosition = (pos: Position) => {
    setSelectedPosition(pos);
    if (pos !== 'DH') setDhForPosition('');
    setShowPositionPicker(false);
  };

  const canSaveSlot =
    selectedPlayerId &&
    selectedPosition &&
    (selectedPosition !== 'DH' || !!dhForPosition);

  const handleSaveSlot = () => {
    if (!canSaveSlot) return;
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return;

    const entry: LineupEntry = {
      playerId: selectedPlayerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: selectedPosition!,
      dhForPosition: selectedPosition === 'DH' ? dhForPosition : null,
      battingOrder: editingIndex !== null ? lineup[editingIndex].battingOrder : lineup.length + 1,
    };

    if (editingIndex !== null) {
      const updated = [...lineup];
      updated[editingIndex] = entry;
      setLineup(updated);
    } else {
      setLineup((prev) => [...prev, entry]);
    }

    // Reset form
    setEditingIndex(null);
    setSelectedPlayerId('');
    setSelectedPosition(null);
    setDhForPosition('');
    setSearchQuery('');
  };

  const handleRemoveSlot = (index: number) => {
    const updated = lineup
      .filter((_, i) => i !== index)
      .map((e, i) => ({ ...e, battingOrder: i + 1 }));
    setLineup(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setSelectedPlayerId('');
      setSelectedPosition(null);
    }
  };

  const canFinish = lineup.length >= 9;

  const handleFinish = () => {
    if (!canFinish) return;
    onComplete(lineup);
  };

  const isAddingNew = editingIndex === null;
  const formActive = isAddingNew ? true : editingIndex !== null;

  // Callback cuando la IA confirma su lineup
  const handleAIResult = (entries: LineupEntry[]) => {
    setLineup(entries);
    setActiveMode('manual');
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h3 className="font-bold text-white text-base">{teamName}</h3>
          <p className="text-xs text-zinc-400">{lineup.length} bateador(es) en lineup</p>
        </div>
      </div>

      {/* Tabs: Manual / IA */}
      <div className="flex bg-zinc-800/50 p-1 rounded-xl w-fit border border-zinc-700">
        <button
          onClick={() => setActiveMode('manual')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeMode === 'manual'
              ? 'bg-zinc-700 text-white shadow'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <Users size={13} />
          Manual
        </button>
        <button
          onClick={() => setActiveMode('ai')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeMode === 'ai'
              ? 'bg-blue-600 text-white shadow'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <Wand2 size={13} />
          Escaneo IA
        </button>
      </div>

      {activeMode === 'ai' ? (
        <AILineupScanner
          roster={players}
          onLineupReady={handleAIResult}
          onCancel={() => setActiveMode('manual')}
        />
      ) : (
      <>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Panel izquierdo: Lista del lineup */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Lineup
            </div>
            <div className="divide-y divide-zinc-800">
              {lineup.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    editingIndex === i
                      ? 'bg-blue-900/40 border-l-2 border-blue-500'
                      : 'hover:bg-zinc-800'
                  }`}
                  onClick={() => openEditSlot(i)}
                >
                  <span className="text-zinc-500 text-xs w-4 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{entry.playerName}</p>
                    <p className="text-[10px] text-zinc-400">
                      {entry.position}
                      {entry.dhForPosition ? ` (DH→${entry.dhForPosition})` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveSlot(i); }}
                    className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Agregar nuevo */}
              {!showPositionPicker && (
                <button
                  onClick={openNewSlot}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                >
                  <UserPlus size={12} />
                  Agregar bateador
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho: Formulario del slot */}
        <div className="flex-1">
          {showPositionPicker ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Seleccionar posición</p>
                <button
                  onClick={() => setShowPositionPicker(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <PositionSelectorMini
                selected={selectedPosition}
                occupiedPositions={occupiedPositions}
                dhEnabled={true}
                onSelect={handleSelectPosition}
              />
            </div>
          ) : formActive ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-4">
              <p className="text-sm font-semibold text-white">
                {editingIndex !== null ? `Editar bateador #${editingIndex + 1}` : `Bateador #${lineup.length + 1}`}
              </p>

              {/* Búsqueda de jugador */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Jugador</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o número..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedPlayerId(''); }}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full"
                />
                {searchQuery && !selectedPlayerId && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {filteredPlayers.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-3 py-2">Sin resultados</p>
                    ) : (
                      filteredPlayers.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPlayerId(p.id);
                            setSearchQuery(`${p.firstName} ${p.lastName}${p.number != null ? ` #${p.number}` : ''}`);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors"
                        >
                          {p.number != null && (
                            <span className="text-xs text-zinc-400 w-6 flex-shrink-0">#{p.number}</span>
                          )}
                          <span>{p.firstName} {p.lastName}</span>
                          {p.position && (
                            <span className="text-xs text-zinc-500 ml-auto">{p.position}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Posición */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Posición</label>
                <button
                  onClick={() => setShowPositionPicker(true)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedPosition
                      ? 'border-blue-500 bg-blue-900/30 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span>
                    {selectedPosition
                      ? `${selectedPosition} — ${POSITION_LABELS[selectedPosition] ?? selectedPosition}`
                      : 'Toca para seleccionar posición'}
                  </span>
                  <Edit2 size={14} className="flex-shrink-0" />
                </button>
              </div>

              {/* Ancla DH */}
              {selectedPosition === 'DH' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-medium">
                    El DH batea por... <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={dhForPosition}
                    onChange={(e) => setDhForPosition(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Selecciona el defensor —</option>
                    {currentDefenders.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} — {POSITION_LABELS[pos] ?? pos}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botón guardar slot */}
              <button
                onClick={handleSaveSlot}
                disabled={!canSaveSlot}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  canSaveSlot
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <ChevronRight size={16} />
                {editingIndex !== null ? 'Actualizar' : 'Siguiente bateador'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Botón finalizar lineup */}
      <button
        onClick={handleFinish}
        disabled={!canFinish}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
          canFinish
            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Save size={16} />
        Guardar Lineup {teamName} ({lineup.length} jugadores)
        {!canFinish && <span className="text-zinc-500 font-normal text-xs ml-1">— mínimo 9</span>}
      </button>
      </>
      )}
    </div>
  );
}
