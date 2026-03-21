'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';

interface Player {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    number: number;
}

interface Team {
    id: string;
    name: string;
    players: Player[];
}

interface Game {
    id: string;
    homeTeam: Team;
    awayTeam: Team;
    home_team_id: string;
    away_team_id: string;
}

export default function RosterSetupPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);

    const [homeLineup, setHomeLineup] = useState<{ playerId: string, position: string, battingOrder: number, dhForPosition?: string }[]>([]);
    const [awayLineup, setAwayLineup] = useState<{ playerId: string, position: string, battingOrder: number, dhForPosition?: string }[]>([]);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const { data } = await api.get(`/games/${gameId}`);
                if (data) {
                    setGame(data as any);

                    // Inicializar lineups si ya existen (backend returns camelCase)
                    const homeLp = data.lineups?.filter((l: any) => l.teamId === data.homeTeamId).map((l: any) => ({
                        playerId: l.playerId,
                        position: l.position,
                        battingOrder: l.battingOrder,
                        dhForPosition: l.dhForPosition || ''
                    })) || [];
                    const awayLp = data.lineups?.filter((l: any) => l.teamId === data.awayTeamId).map((l: any) => ({
                        playerId: l.playerId,
                        position: l.position,
                        battingOrder: l.battingOrder,
                        dhForPosition: l.dhForPosition || ''
                    })) || [];

                    setHomeLineup(homeLp);
                    setAwayLineup(awayLp);
                }
            } catch (err) {
                console.error('Error fetching game data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchGame();
        }
    }, [gameId]);

    const defensivePositions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    const normalizePosition = (pos: string) => {
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

    const handleSaveLineup = async (teamId: string, lineupList: LineupStateItem[]) => {
        try {
            // Filtrar los que no tienen jugador asignado
            const validLineups = lineupList.filter(l => l.playerId.trim() !== '');
            
            // Validate all players have a position
            const missingPosition = validLineups.find(l => !l.position);
            if (missingPosition) {
                alert(`El jugador en el turno #${missingPosition.battingOrder} no tiene una posición asignada.`);
                return;
            }

            // Validate duplicate defensive positions
            const selectedPositions = validLineups.map(l => normalizePosition(l.position)).filter(Boolean);
            for (let pos of defensivePositions) {
                const count = selectedPositions.filter(p => p === pos).length;
                if (count > 1) {
                    alert(`Error: La posición ${pos} fue asignada a múltiples jugadores en el mismo lineup. Las posiciones defensivas deben ser únicas.`);
                    return;
                }
            }

            // Validate DH rules
            const dhEntries = validLineups.filter(l => normalizePosition(l.position) === 'DH');
            if (dhEntries.length > 1) {
                alert('Solo se permite un DH estándar por equipo.');
                return;
            }
            if (dhEntries.length === 1) {
                const dh = dhEntries[0];
                const anchor = normalizePosition(dh.dhForPosition || '');
                if (!defensivePositions.includes(anchor)) {
                    alert('Si se usa DH, debe anclarse a una posición defensiva válida.');
                    return;
                }
                if (!selectedPositions.includes(anchor)) {
                    alert(`El DH debe anclarse a una posición defensiva presente en el lineup (${anchor}).`);
                    return;
                }
            }

            const dataToSubmit = validLineups.map(l => ({
                battingOrder: l.battingOrder,
                position: l.position || 'DH',
                dhForPosition: normalizePosition(l.position) === 'DH' ? (l.dhForPosition || null) : null,
                isStarter: true,
                playerId: l.playerId,
            }));

            // Usar el endpoint del backend para guardar el lineup
            await api.post(`/games/${gameId}/team/${teamId}/lineup`, { lineups: dataToSubmit });
            alert('Lineup guardado con éxito');
        } catch (err) {
            console.error(err);
            alert('Error al guardar Lineup');
        }
    };    

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando Roster...</div>;
    if (!game) return <div className="p-8 text-center text-red-400">Juego no encontrado</div>;

    // Helper interno para renderizar columna
    interface LineupStateItem {
        playerId: string;
        position: string;
        battingOrder: number;
        dhForPosition?: string;
    }

    const TeamLineupBuilder = ({
        team,
        lineupState,
        setLineupState
    }: {
        team: Team,
        lineupState: LineupStateItem[],
        setLineupState: React.Dispatch<React.SetStateAction<LineupStateItem[]>>
    }) => {

        const handlePlayerSelect = (playerId: string, order: number) => {
            const newLp = [...lineupState];
            const existingIdx = newLp.findIndex(l => l.battingOrder === order);
            if (existingIdx >= 0) {
                newLp[existingIdx].playerId = playerId;
            } else {
                newLp.push({ playerId, battingOrder: order, position: '', dhForPosition: '' });
            }
            setLineupState(newLp);
        };

        const handlePositionSelect = (position: string, order: number) => {
            const newLp = [...lineupState];
            const existingIdx = newLp.findIndex(l => l.battingOrder === order);
            const isDh = normalizePosition(position) === 'DH';
            if (existingIdx >= 0) {
                newLp[existingIdx].position = position;
                if (!isDh) newLp[existingIdx].dhForPosition = '';
            } else {
                newLp.push({ playerId: '', battingOrder: order, position, dhForPosition: '' });
            }
            setLineupState(newLp);
        };

        const handleDhAnchorSelect = (anchor: string, order: number) => {
            const newLp = [...lineupState];
            const existingIdx = newLp.findIndex(l => l.battingOrder === order);
            if (existingIdx >= 0) {
                newLp[existingIdx].dhForPosition = anchor;
            } else {
                newLp.push({ playerId: '', battingOrder: order, position: 'DH', dhForPosition: anchor });
            }
            setLineupState(newLp);
        };

        const positions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "EH", "SF"];
        
        // Obtener qué posiciones ya están ocupadas en el grid (para poner en disabled las opciones, excepto roles numéricos altos como DH)
        const getOccupiedPositions = () => {
             const defensive = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
             return lineupState.map(l => l.position).filter(p => p && defensive.includes(p));
        };
        const occupiedPositions = getOccupiedPositions();

        return (
            <div className="bg-surface border border-muted/30 p-4 sm:p-6 rounded-2xl shadow-sm hover:border-primary/50 transition-colors">
                <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                    <span className="w-2 h-4 bg-primary rounded-full"></span>
                    Lineup: {team.name}
                </h2>
                <div className="space-y-3">
                    {/* Expandido a 11 slots */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((order) => {
                        const currentLp = lineupState.find((l: LineupStateItem) => l.battingOrder === order);
                        return (
                            <div key={order} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-muted/5 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-muted/10 sm:border-transparent mb-2 sm:mb-0">
                                <span className="font-black text-primary sm:text-foreground w-full sm:w-6 text-xs sm:text-sm text-left sm:text-center border-b sm:border-0 border-muted/20 pb-1 sm:pb-0">Turno {order}</span>

                                {/* Player Dropdown */}
                                <select
                                    className="flex-1 w-full bg-background text-foreground text-sm p-3 rounded-xl border border-muted/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                                    value={currentLp?.playerId || ""}
                                    onChange={(e) => handlePlayerSelect(e.target.value, order)}
                                >
                                    <option value="">Vacío</option>
                                    {team.players?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            #{p.number} - {p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}
                                        </option>
                                    ))}
                                </select>

                                {/* Position Dropdown */}
                                <select
                                    className="w-full sm:w-28 bg-background text-foreground text-sm font-bold p-3 rounded-xl border border-muted/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm shrink-0"
                                    value={currentLp?.position || ""}
                                    onChange={(e) => handlePositionSelect(e.target.value, order)}
                                    disabled={!currentLp?.playerId}
                                >
                                    <option value="">POS</option>
                                    {positions.map(pos => {
                                        // Disable defensive position if it's already assigned to someone else
                                        const isDefensive = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].includes(pos);
                                        const isOccupiedByOther = isDefensive && occupiedPositions.includes(pos) && currentLp?.position !== pos;
                                        return (
                                            <option key={pos} value={pos} disabled={isOccupiedByOther}>
                                                {pos} {isOccupiedByOther ? '(En uso)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>

                                {normalizePosition(currentLp?.position || '') === 'DH' && (
                                    <select
                                        className="w-full sm:w-28 bg-background text-foreground text-xs font-bold p-3 rounded-xl border border-muted/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm shrink-0"
                                        value={currentLp?.dhForPosition || ""}
                                        onChange={(e) => handleDhAnchorSelect(e.target.value, order)}
                                        disabled={!currentLp?.playerId}
                                    >
                                        <option value="">DH por...</option>
                                        {defensivePositions.map(pos => (
                                            <option key={pos} value={pos}>
                                                {pos}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )
                    })}
                </div>
                <button
                    onClick={() => handleSaveLineup(team.id, lineupState)}
                    className="mt-8 w-full py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-primary/40 active:scale-[0.98]"
                >
                    Guardar Lineup {team.name}
                </button>
            </div>
        )
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Header matching mockup */}
                <div className="bg-[#1e293b]/40 border border-[#334155] rounded-2xl p-6 mb-12 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/50">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-[#94a3b8] font-medium leading-relaxed">
                        La estructura del juego ha sido creada. Ahora puedes definir el lineup titular tentativo para cada equipo o brincar directamente al panel de administración del juego.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
                    <TeamLineupBuilder team={game.awayTeam} lineupState={awayLineup} setLineupState={setAwayLineup} />
                    <TeamLineupBuilder team={game.homeTeam} lineupState={homeLineup} setLineupState={setHomeLineup} />
                </div>

                {/* Footer Buttons Matching Mockup */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-6 pt-6 border-t border-muted/20">
                    <button onClick={() => router.push(`/torneos`)} className="text-foreground font-bold hover:text-muted-foreground transition-colors px-6 py-3 cursor-pointer">
                        Cancelar
                    </button>
                    <button onClick={() => router.push(`/gamecast/${gameId}`)} className="w-full sm:w-auto px-8 py-3 bg-[#059669] hover:bg-[#047857] shadow-lg shadow-[#059669]/20 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Confirmar e Ir al Marcador
                    </button>
                </div>
            </div>
        </div>
    );
}
