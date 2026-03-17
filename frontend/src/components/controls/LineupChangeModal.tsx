import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/auth';
import { LineupItem, useGameStore } from '@/store/gameStore';

interface LineupChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TeamPlayer {
    id: string;
    firstName: string;
    lastName: string;
    number?: number;
}

const DEFENSIVE_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

const normalizePosition = (pos?: string | null) => {
    const raw = (pos || '').trim().toUpperCase();
    const map: Record<string, string> = {
        '1': 'P', 'P': 'P',
        '2': 'C', 'C': 'C',
        '3': '1B', '1B': '1B',
        '4': '2B', '2B': '2B',
        '5': '3B', '3B': '3B',
        '6': 'SS', 'SS': 'SS',
        '7': 'LF', 'LF': 'LF',
        '8': 'CF', 'CF': 'CF',
        '9': 'RF', 'RF': 'RF',
        'BD': 'DH', 'DH': 'DH',
    };
    return map[raw] || raw;
};

export default function LineupChangeModal({ isOpen, onClose }: LineupChangeModalProps) {
    const {
        gameId,
        homeTeamId,
        awayTeamId,
        homeLineup,
        awayLineup,
        fetchGameConfig,
        connectSocket,
    } = useGameStore();

    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [battingOrder, setBattingOrder] = useState(1);
    const [playerInId, setPlayerInId] = useState('');
    const [position, setPosition] = useState('');
    const [dhForPosition, setDhForPosition] = useState('');
    const [rosters, setRosters] = useState<Record<string, TeamPlayer[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lineup = useMemo(() => {
        if (selectedTeamId === homeTeamId) return homeLineup;
        if (selectedTeamId === awayTeamId) return awayLineup;
        return [];
    }, [selectedTeamId, homeTeamId, awayTeamId, homeLineup, awayLineup]);

    const assignedDefensivePositions = useMemo(() => {
        const assigned = new Set<string>();
        lineup.forEach((item: LineupItem) => {
            const normalized = normalizePosition(item.position);
            if (DEFENSIVE_POSITIONS.includes(normalized)) assigned.add(normalized);
        });
        return assigned;
    }, [lineup]);

    const currentSlot = useMemo(() => {
        return lineup.find((l) => l.battingOrder === battingOrder) || lineup[0];
    }, [lineup, battingOrder]);

    useEffect(() => {
        if (!isOpen) return;
        if (!selectedTeamId) {
            const nextTeam = homeTeamId || awayTeamId || '';
            setSelectedTeamId(nextTeam);
        }
    }, [isOpen, selectedTeamId, homeTeamId, awayTeamId]);

    useEffect(() => {
        if (!isOpen) return;
        if (!selectedTeamId) return;
        const slot = lineup.find((l) => l.battingOrder === battingOrder) || lineup[0];
        if (!slot) return;
        setBattingOrder(slot.battingOrder);
        setPosition(slot.position || '');
        setDhForPosition(slot.dhForPosition || '');
        setPlayerInId(slot.playerId || '');
    }, [isOpen, selectedTeamId, battingOrder, lineup]);

    useEffect(() => {
        if (!isOpen) return;
        const loadRoster = async (teamId: string | null) => {
            if (!teamId || rosters[teamId]) return;
            try {
                const res = await apiFetch(`/teams/${teamId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRosters((prev) => ({ ...prev, [teamId]: data.players || [] }));
                }
            } catch {
                setRosters((prev) => ({ ...prev, [teamId]: [] }));
            }
        };
        loadRoster(homeTeamId);
        loadRoster(awayTeamId);
    }, [isOpen, homeTeamId, awayTeamId, rosters]);

    if (!isOpen) return null;

    const availablePlayers = rosters[selectedTeamId] || [];
    const isDh = normalizePosition(position) === 'DH';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!gameId) {
            setError('No hay juego activo.');
            return;
        }
        if (!selectedTeamId) {
            setError('Selecciona un equipo.');
            return;
        }
        if (!playerInId) {
            setError('Selecciona el jugador que entrara.');
            return;
        }
        if (!position) {
            setError('Selecciona la posicion.');
            return;
        }
        if (isDh && !dhForPosition) {
            setError('El DH requiere anclarse a una posicion defensiva.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch(`/games/${gameId}/lineup-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId: selectedTeamId,
                    battingOrder,
                    playerInId,
                    playerOutId: currentSlot?.playerId || undefined,
                    position,
                    dhForPosition: isDh ? dhForPosition : undefined,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                setError(text || 'No se pudo actualizar el lineup.');
                return;
            }

            await fetchGameConfig();
            connectSocket();
            onClose();
        } catch (err) {
            console.error(err);
            setError('No se pudo actualizar el lineup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl">
                <h2 className="text-xl font-black text-emerald-300 mb-4 border-b border-slate-700 pb-2 uppercase tracking-wide">
                    Cambio de Lineup
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedTeamId(awayTeamId || '')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold border ${selectedTeamId === awayTeamId ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-slate-800 text-slate-200 border-slate-600'}`}
                        >
                            Visitante
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTeamId(homeTeamId || '')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold border ${selectedTeamId === homeTeamId ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-slate-800 text-slate-200 border-slate-600'}`}
                        >
                            Local
                        </button>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg space-y-3 border border-slate-700">
                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-bold uppercase w-24">Turno</label>
                            <select
                                className="flex-1 bg-slate-700 text-white rounded p-2 text-sm"
                                value={battingOrder}
                                onChange={(e) => setBattingOrder(Number(e.target.value))}
                            >
                                {lineup.length === 0 && <option value={1}>Sin lineup</option>}
                                {lineup.map((item) => (
                                    <option key={item.battingOrder} value={item.battingOrder}>
                                        #{item.battingOrder} {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Jugador'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-bold uppercase w-24">Jugador</label>
                            <select
                                className="flex-1 bg-slate-700 text-white rounded p-2 text-sm"
                                value={playerInId}
                                onChange={(e) => setPlayerInId(e.target.value)}
                            >
                                <option value="">Selecciona jugador</option>
                                {availablePlayers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.number ? `#${p.number} - ` : ''}{p.firstName} {p.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-bold uppercase w-24">Posicion</label>
                            <select
                                className="flex-1 bg-slate-700 text-white rounded p-2 text-sm"
                                value={position}
                                onChange={(e) => {
                                    const nextPos = e.target.value;
                                    setPosition(nextPos);
                                    if (normalizePosition(nextPos) !== 'DH') setDhForPosition('');
                                }}
                            >
                                <option value="">POS</option>
                                {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EH'].map((pos) => (
                                    <option key={pos} value={pos}>
                                        {pos}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isDh && (
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-400 font-bold uppercase w-24">DH por</label>
                                <select
                                    className="flex-1 bg-slate-700 text-white rounded p-2 text-sm"
                                    value={dhForPosition}
                                    onChange={(e) => setDhForPosition(e.target.value)}
                                >
                                    <option value="">Selecciona ancla</option>
                                    {DEFENSIVE_POSITIONS.map((pos) => (
                                        <option key={pos} value={pos} disabled={!assignedDefensivePositions.has(pos)}>
                                            {pos}{!assignedDefensivePositions.has(pos) ? ' (sin asignar)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {currentSlot && (
                            <div className="text-xs text-slate-400 pt-1">
                                Actual: #{currentSlot.battingOrder} {currentSlot.player ? `${currentSlot.player.firstName} ${currentSlot.player.lastName}` : 'Sin jugador'} ({currentSlot.position})
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-rose-300 text-xs font-bold bg-rose-500/10 border border-rose-500/30 rounded p-2">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition disabled:opacity-60">
                            {loading ? 'Guardando...' : 'Guardar cambio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
