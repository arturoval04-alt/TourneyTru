'use client';

/**
 * CreateGameWizard
 * Modal/sheet de creación de juego unificado para Admin (torneo), Admin (dashboard) y Scorekeeper.
 * 4 pasos: Configuración → Lineup Visitante → Lineup Local → Confirmar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Users, Calendar, MapPin, Shield } from 'lucide-react';
import api from '@/lib/api';
import LineupBuilder, { LineupEntry, Player } from './LineupBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WizardContext = 'torneo' | 'admin' | 'scorekeeper';

export interface CreateGameWizardProps {
  context: WizardContext;
  /** Pre-llenado en context='torneo' */
  tournamentId?: string;
  /** Pre-llenado en context='scorekeeper' (auto) */
  leagueId?: string;
  /** Si se pasa un gameId existente (scheduled), salta directo al lineup */
  existingGameId?: string;
  onClose: () => void;
  onGameCreated?: (gameId: string) => void;
}

interface League { id: string; name: string }
interface Tournament { id: string; name: string; rulesType: string }
interface Team { id: string; name: string; shortName?: string; logoUrl?: string }
interface Field { id: string; name: string; location?: string }
interface Umpire { id: string; firstName: string; lastName: string }

const STEP_LABELS = ['Juego', 'Lineup Visitante', 'Lineup Local', 'Confirmar'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maxInningsFromRules(rulesType: string): number {
  return rulesType?.includes('9') ? 9 : 7;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < current ? 'bg-blue-500 w-6' : i === current ? 'bg-blue-400 w-6' : 'bg-zinc-700 w-4'
            }`}
          />
        </React.Fragment>
      ))}
      <span className="text-xs text-zinc-500 ml-1">
        {STEP_LABELS[current]}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateGameWizard({
  context,
  tournamentId: propTournamentId,
  leagueId: propLeagueId,
  existingGameId,
  onClose,
  onGameCreated,
}: CreateGameWizardProps) {
  // Si viene un juego existente, empieza en paso 1 (lineup visitante)
  const initialStep = existingGameId ? 1 : 0;
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Selects para contexto admin/scorekeeper ────────────────────────────────
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(propLeagueId ?? '');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(propTournamentId ?? '');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // ── Datos del juego ────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<Team[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [umpires, setUmpires] = useState<Umpire[]>([]);

  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [selectedUmpires, setSelectedUmpires] = useState<
    { umpireId: string; role: 'plate' | 'base1' | 'base2' | 'base3'; name: string }[]
  >([]);
  const [umpireSearch, setUmpireSearch] = useState('');

  // ── Juego creado ──────────────────────────────────────────────────────────
  const [gameId, setGameId] = useState<string | null>(existingGameId ?? null);

  // ── Rosters ───────────────────────────────────────────────────────────────
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [awayLineup, setAwayLineup] = useState<LineupEntry[]>([]);
  const [homeLineup, setHomeLineup] = useState<LineupEntry[]>([]);

  // ── Carga inicial según contexto ──────────────────────────────────────────
  useEffect(() => {
    if (context === 'admin') {
      api.get('/leagues').then((r) => setLeagues(r.data)).catch(() => {});
    }
    if (context === 'scorekeeper' && propLeagueId) {
      loadTournaments(propLeagueId);
    }
    if (propTournamentId) {
      loadTournamentData(propTournamentId);
    }
  }, []);

  // Si viene juego existente, carga equipos del juego
  useEffect(() => {
    if (existingGameId) {
      api.get(`/games/${existingGameId}`).then((r) => {
        const g = r.data;
        setHomeTeamId(g.homeTeamId);
        setAwayTeamId(g.awayTeamId);
        loadRosters(g.homeTeamId, g.awayTeamId);
      }).catch(() => {});
    }
  }, [existingGameId]);

  const loadTournaments = useCallback(async (leagueId: string) => {
    try {
      const { data } = await api.get(`/leagues/${leagueId}/tournaments`);
      setTournaments(data);
    } catch {}
  }, []);

  const loadTournamentData = useCallback(async (tId: string) => {
    try {
      const { data } = await api.get(`/tournaments/${tId}`);
      setSelectedTournament(data);
      setTeams(data.teams ?? []);
      setFields(data.fields ?? []);
    } catch {}
  }, []);

  const loadUmpires = useCallback(async (leagueId: string) => {
    try {
      const { data } = await api.get(`/umpires?leagueId=${leagueId}`);
      setUmpires(data);
    } catch {}
  }, []);

  const loadRosters = useCallback(async (hId: string, aId: string) => {
    try {
      const [hRes, aRes] = await Promise.all([
        api.get(`/teams/${hId}`),
        api.get(`/teams/${aId}`),
      ]);
      setHomePlayers(hRes.data.players ?? []);
      setAwayPlayers(aRes.data.players ?? []);
    } catch {}
  }, []);

  // Cuando cambia la liga (admin)
  useEffect(() => {
    if (selectedLeagueId) {
      loadTournaments(selectedLeagueId);
      loadUmpires(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  // Cuando cambia el torneo
  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentData(selectedTournamentId);
      // Si ya tenemos el torneo pre-llenado y la liga viene del torneo, cargamos árbitros
      if (selectedTournament?.id === selectedTournamentId && propLeagueId) {
        loadUmpires(propLeagueId);
      }
    }
  }, [selectedTournamentId]);

  // Cuando cambia el torneo y ya hay datos, cargamos umpires de la liga del torneo
  useEffect(() => {
    if (selectedTournament) {
      const lId = (selectedTournament as any).leagueId ?? propLeagueId ?? selectedLeagueId;
      if (lId) loadUmpires(lId);
    }
  }, [selectedTournament]);

  // ── Step 0: Crear juego ───────────────────────────────────────────────────
  const handleCreateGame = async () => {
    if (!homeTeamId || !awayTeamId || !scheduledDate) {
      setError('Selecciona equipos y fecha del juego.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError('El equipo local y visitante no pueden ser el mismo.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const dateTime = scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : new Date(`${scheduledDate}T12:00:00`).toISOString();

      const tId = propTournamentId ?? selectedTournamentId;
      const maxInnings = maxInningsFromRules(selectedTournament?.rulesType ?? 'softball_7');

      const { data: newGame } = await api.post('/games', {
        tournamentId: tId,
        homeTeamId,
        awayTeamId,
        scheduledDate: dateTime,
        field: fieldId || null,
        maxInnings,
        status: 'scheduled',
      });

      // Asignar umpires
      for (const u of selectedUmpires) {
        await api.post(`/games/${newGame.id}/umpires`, {
          umpireId: u.umpireId,
          role: u.role,
        }).catch(() => {});
      }

      setGameId(newGame.id);
      await loadRosters(homeTeamId, awayTeamId);
      setStep(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al crear el juego.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Guardar lineup visitante ──────────────────────────────────────
  const handleAwayLineupComplete = async (entries: LineupEntry[]) => {
    if (!gameId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/games/${gameId}/team/${awayTeamId}/lineup`, {
        lineups: entries.map((e) => ({
          battingOrder: e.battingOrder,
          position: e.position,
          dhForPosition: e.dhForPosition ?? null,
          isStarter: true,
          playerId: e.playerId,
        })),
      });
      setAwayLineup(entries);
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar lineup visitante.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Guardar lineup local ──────────────────────────────────────────
  const handleHomeLineupComplete = async (entries: LineupEntry[]) => {
    if (!gameId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/games/${gameId}/team/${homeTeamId}/lineup`, {
        lineups: entries.map((e) => ({
          battingOrder: e.battingOrder,
          position: e.position,
          dhForPosition: e.dhForPosition ?? null,
          isStarter: true,
          playerId: e.playerId,
        })),
      });
      setHomeLineup(entries);
      setStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar lineup local.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: Ir al juego ───────────────────────────────────────────────────
  const handleGoToGame = () => {
    if (!gameId) return;
    onGameCreated?.(gameId);
    // Redireccionamos usando window.location para no depender de useRouter aquí
    window.location.href = `/game/${gameId}`;
  };

  const handleSaveAndExit = () => {
    onClose();
  };

  // ── Umpires helper ────────────────────────────────────────────────────────
  const UMPIRE_ROLES: { role: 'plate' | 'base1' | 'base2' | 'base3'; label: string }[] = [
    { role: 'plate', label: 'Plato' },
    { role: 'base1', label: '1ra Base' },
    { role: 'base2', label: '2da Base' },
    { role: 'base3', label: '3ra Base' },
  ];

  const addUmpire = (umpire: Umpire, role: 'plate' | 'base1' | 'base2' | 'base3') => {
    if (selectedUmpires.length >= 4) return;
    if (selectedUmpires.find((u) => u.umpireId === umpire.id)) return;
    if (selectedUmpires.find((u) => u.role === role)) {
      setSelectedUmpires((prev) => prev.map((u) =>
        u.role === role ? { umpireId: umpire.id, role, name: `${umpire.firstName} ${umpire.lastName}` } : u
      ));
    } else {
      setSelectedUmpires((prev) => [
        ...prev,
        { umpireId: umpire.id, role, name: `${umpire.firstName} ${umpire.lastName}` },
      ]);
    }
    setUmpireSearch('');
  };

  const removeUmpire = (umpireId: string) => {
    setSelectedUmpires((prev) => prev.filter((u) => u.umpireId !== umpireId));
  };

  const filteredUmpires = umpires.filter(
    (u) =>
      !selectedUmpires.find((s) => s.umpireId === u.id) &&
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(umpireSearch.toLowerCase())
  );

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-2xl bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-white text-base">
              {existingGameId ? 'Configurar Lineup' : 'Nuevo Juego'}
            </h2>
            <StepIndicator current={step} total={4} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── STEP 0: Configuración del juego ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">

              {/* Liga (solo admin sin torneo fijo) */}
              {context === 'admin' && !propTournamentId && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Liga</label>
                  <select
                    value={selectedLeagueId}
                    onChange={(e) => { setSelectedLeagueId(e.target.value); setSelectedTournamentId(''); setTeams([]); }}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Selecciona liga —</option>
                    {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}

              {/* Torneo (admin sin torneo fijo o scorekeeper) */}
              {(context === 'scorekeeper' || (context === 'admin' && !propTournamentId)) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Torneo</label>
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => { setSelectedTournamentId(e.target.value); setTeams([]); setFields([]); }}
                    disabled={context === 'admin' && !selectedLeagueId}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">— Selecciona torneo —</option>
                    {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {/* Equipos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Shield size={11} /> Equipo Visitante
                  </label>
                  <select
                    value={awayTeamId}
                    onChange={(e) => setAwayTeamId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Visitante —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Shield size={11} /> Equipo Local
                  </label>
                  <select
                    value={homeTeamId}
                    onChange={(e) => setHomeTeamId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Local —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar size={11} /> Fecha
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Hora</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Campo */}
              {fields.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <MapPin size={11} /> Campo
                  </label>
                  <select
                    value={fieldId}
                    onChange={(e) => setFieldId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Selecciona campo (opcional) —</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}{f.location ? ` · ${f.location}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Umpires */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Users size={11} /> Umpires (máx. 4)
                </label>

                {/* Chips de umpires seleccionados por rol */}
                <div className="flex flex-wrap gap-2">
                  {UMPIRE_ROLES.map(({ role, label }) => {
                    const assigned = selectedUmpires.find((u) => u.role === role);
                    return (
                      <div
                        key={role}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                          assigned
                            ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                        }`}
                      >
                        <span className="font-semibold">{label}:</span>
                        {assigned ? (
                          <>
                            <span>{assigned.name}</span>
                            <button
                              onClick={() => removeUmpire(assigned.umpireId)}
                              className="text-zinc-400 hover:text-red-400 ml-0.5"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Búsqueda de umpires */}
                {selectedUmpires.length < 4 && umpires.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar umpire..."
                      value={umpireSearch}
                      onChange={(e) => setUmpireSearch(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-full"
                    />
                    {umpireSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-10 shadow-xl max-h-40 overflow-y-auto">
                        {filteredUmpires.slice(0, 6).map((u) => (
                          <div key={u.id} className="px-3 py-2 hover:bg-zinc-800 transition-colors">
                            <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                            <div className="flex gap-1 mt-1">
                              {UMPIRE_ROLES.filter((r) => !selectedUmpires.find((s) => s.role === r.role)).map(({ role, label }) => (
                                <button
                                  key={role}
                                  onClick={() => addUmpire(u, role)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-200 hover:bg-blue-700 transition-colors"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tipo de juego (informativo) */}
              {selectedTournament && (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-400">
                  <span>Reglas:</span>
                  <span className="text-white font-semibold">
                    {selectedTournament.rulesType?.includes('9') ? 'Béisbol (9 entradas)' : 'Softbol (7 entradas)'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Lineup Visitante ── */}
          {step === 1 && (
            <LineupBuilder
              teamName={awayTeam?.name ?? 'Visitante'}
              players={awayPlayers}
              initialLineup={awayLineup}
              onComplete={handleAwayLineupComplete}
              onBack={existingGameId ? undefined : () => setStep(0)}
            />
          )}

          {/* ── STEP 2: Lineup Local ── */}
          {step === 2 && (
            <LineupBuilder
              teamName={homeTeam?.name ?? 'Local'}
              players={homePlayers}
              initialLineup={homeLineup}
              onComplete={handleHomeLineupComplete}
              onBack={() => setStep(1)}
            />
          )}

          {/* ── STEP 3: Confirmar ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 size={20} />
                <p className="font-semibold text-white">¡Lineups guardados!</p>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: awayTeam?.name ?? 'Visitante', lineup: awayLineup },
                  { label: homeTeam?.name ?? 'Local', lineup: homeLineup },
                ].map(({ label, lineup }) => (
                  <div key={label} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-300">{label}</div>
                    <div className="divide-y divide-zinc-800">
                      {lineup.map((e) => (
                        <div key={e.battingOrder} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="text-zinc-500 text-xs w-4">{e.battingOrder}.</span>
                          <span className="text-xs text-white flex-1 truncate">{e.playerName}</span>
                          <span className="text-xs text-zinc-400 font-mono">{e.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTournament && (
                <div className="px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                  <span>Duración:</span>
                  <span className="text-white font-semibold">
                    {selectedTournament.rulesType?.includes('9') ? '9 entradas (béisbol)' : '7 entradas (softbol)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 flex-shrink-0 flex flex-col gap-2">
          {step === 0 && (
            <button
              onClick={handleCreateGame}
              disabled={saving || !homeTeamId || !awayTeamId || !scheduledDate}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {saving ? 'Creando juego...' : (
                <>Crear juego y configurar lineups <ChevronRight size={16} /></>
              )}
            </button>
          )}

          {step === 3 && (
            <>
              <button
                onClick={handleGoToGame}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Confirmar e ir al Juego
              </button>
              <button
                onClick={handleSaveAndExit}
                className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                Guardar y salir (juego programado)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
