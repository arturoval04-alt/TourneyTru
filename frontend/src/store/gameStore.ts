import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/live_games', {
    autoConnect: false,
});

export interface PlayLog {
    text: string;
    outs?: number;
    inningString?: string;
}

export interface Player {
    id: string;
    firstName: string;
    lastName: string;
}

export interface LineupItem {
    playerId: string;
    teamId: string;
    position: string;
    battingOrder: number;
    player?: Player;
}

// Tipos para el estado del juego
type BaseState = {
    inning: number;
    half: 'top' | 'bottom';
    outs: number;
    balls: number;
    strikes: number;
    homeScore: number;
    awayScore: number;
    bases: {
        first: string | null;
        second: string | null;
        third: string | null;
    };
    baseIds: {
        first: string | null;
        second: string | null;
        third: string | null;
    };
    currentBatter: string;
    currentBatterId: string | null;
    playLogs: PlayLog[];
    homeLineup: LineupItem[];
    awayLineup: LineupItem[];
    homeBatterIndex: number;
    awayBatterIndex: number;

};

export interface GameState extends BaseState {
    gameId: string | null;

    // Conexión
    setGameId: (id: string) => void;
    fetchGameConfig: () => Promise<void>;
    connectSocket: () => void;
    disconnectSocket: () => void;

    // Acciones (Play by play basics)
    addBall: () => void;
    addStrike: () => void;
    addFoul: () => void;
    addOut: (customLogText?: string, isGroundout?: boolean, emitPlay?: boolean) => void;
    registerHit: (basesAdvanced: number, customLogText?: string) => void;
    executeAdvancedPlay: (newBases: { first: string | null, second: string | null, third: string | null }, runsScored: number, outsRecorded: number, desc: string) => void;
    executeBaseAction: (origin: 'first' | 'second' | 'third', dest: 'second' | 'third' | 'home' | null, isOut: boolean, desc: string) => void;
    executeWildPitchOrPassedBall: (desc: string) => void;
    executeFieldersChoice: (outRunnerId: 'first' | 'second' | 'third') => void;
    executeSacrifice: (type: 'fly' | 'bunt') => void;
    registerCustomPlay: (description: string) => void;
    cycleBatter: () => void;
    nextHalfInning: () => void;
    resetCount: () => void;
    clearBases: () => void;
    playLogs: PlayLog[];
    addLog: (log: PlayLog) => void;

    // Time Travel (Undo)
    history: BaseState[];
    saveHistory: () => void;
    undo: () => void;
}

// Helper para enviar estado completo consolidado al backend
const emitPlayToBackend = (get: () => GameState, resultStr: string, runsScored: number = 0, outsOffensive: number = 0, currentBatterIdOverride: string | null = null, inningOverride: number | null = null, halfOverride: string | null = null, outsBeforeOverride: number | null = null) => {
    // Almacenar el batterId correcto antes de que ocurran los timeouts y cambios de turno
    const activeBatterId = currentBatterIdOverride || get().currentBatterId;

    // Obtener el ID del pitcher actual (el que está a la defensiva)
    const stateSnapshot = get();
    const defensiveLineup = stateSnapshot.half === 'top' ? stateSnapshot.homeLineup : stateSnapshot.awayLineup;
    // Buscamos al jugador que tiene position "1" (o "P") en el lineup actual
    const currentPitcher = defensiveLineup.find((item: LineupItem) => item.position === "1" || item.position === "P");
    const activePitcherId = currentPitcher ? currentPitcher.playerId : null;

    if (!socket.connected) {
        console.warn("Socket not connected, play won't be synced in real-time");
    }

    if (!stateSnapshot.gameId) {
        console.warn("No game ID active, play not emitting");
        return;
    }

    const payloadInning = inningOverride !== null ? inningOverride : stateSnapshot.inning;
    const payloadHalf = halfOverride !== null ? halfOverride : stateSnapshot.half;
    const payloadOutsBefore = outsBeforeOverride !== null ? outsBeforeOverride : Math.max(0, stateSnapshot.outs - outsOffensive);

    // Usamos setTimeout para permitir que las operaciones sincrónicas de zustand (como addLog)
    // terminen de inyectarse en el estado antes de empaquetar el fullState para los Gamecasts.
    setTimeout(() => {
        const state = get();
        if (!state.gameId) return;

        socket.emit('registerPlay', {
            gameId: state.gameId,
            playInfo: {
                inning: payloadInning,
                half: payloadHalf,
                outsBeforePlay: payloadOutsBefore,
                result: resultStr,
                outsRecorded: outsOffensive,
                runsScored: runsScored,
                batterId: activeBatterId, // Usa el preservado
                pitcherId: activePitcherId // Agregado para cumplir la DB
            },
            fullState: {
                inning: state.inning,
                half: state.half,
                outs: state.outs,
                balls: state.balls,
                strikes: state.strikes,
                homeScore: state.homeScore,
                awayScore: state.awayScore,
                bases: state.bases,
                currentBatter: state.currentBatter,
                currentBatterId: state.currentBatterId,
                playLogs: state.playLogs,
                homeLineup: state.homeLineup,
                awayLineup: state.awayLineup,
                currentPitcher: (() => {
                    const defLineup = state.half === 'top' ? state.homeLineup : state.awayLineup;
                    const p = defLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P');
                    return p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
                })(),
            }
        });
    }, 500);
};

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            inning: 1,
            half: 'top',
            outs: 0,
            balls: 0,
            strikes: 0,
            homeScore: 0,
            awayScore: 0,
            bases: {
                first: null,
                second: null,
                third: null,
            },
            baseIds: {
                first: null,
                second: null,
                third: null,
            },
            currentBatter: "Esperando Lineup",
            currentBatterId: null,
            gameId: null,
            playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
            homeLineup: [],
            awayLineup: [],
            homeBatterIndex: 0,
            awayBatterIndex: 0,
            history: [],

            setGameId: (id: string) => {
                // Si el ID es el mismo que el persistido, no limpiar (para soportar refresh de página F5)
                if (get().gameId === id) return;

                // Siempre resetear el estado completo al cargar un juego NUEVO o DIFERENTE.
                set({
                    gameId: id,
                    inning: 1,
                    half: 'top',
                    outs: 0,
                    balls: 0,
                    strikes: 0,
                    homeScore: 0,
                    awayScore: 0,
                    bases: { first: null, second: null, third: null },
                    baseIds: { first: null, second: null, third: null },
                    currentBatter: 'Cargando lineup...',
                    currentBatterId: null,
                    awayBatterIndex: 0,
                    homeBatterIndex: 0,
                    playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
                    history: [],
                });
            },

            saveHistory: () => {
                const state = get();
                const snapshot: BaseState = {
                    inning: state.inning,
                    half: state.half,
                    outs: state.outs,
                    balls: state.balls,
                    strikes: state.strikes,
                    homeScore: state.homeScore,
                    awayScore: state.awayScore,
                    bases: { ...state.bases },
                    baseIds: { ...state.baseIds },
                    currentBatter: state.currentBatter,
                    currentBatterId: state.currentBatterId,
                    playLogs: [...state.playLogs],
                    homeLineup: [...state.homeLineup],
                    awayLineup: [...state.awayLineup],
                    homeBatterIndex: state.homeBatterIndex,
                    awayBatterIndex: state.awayBatterIndex,
                };
                set((s) => ({ history: [...s.history.slice(-20), snapshot] })); // Mantener último 20 jugadas para no devorar RAM
            },

            undo: () => {
                const { history } = get();
                if (history.length === 0) return;
                const previousState = history[history.length - 1];
                const newHistory = history.slice(0, -1);

                set({ ...previousState, history: newHistory });

                // Emitir un evento genérico al servidor alertando que los datos se ajustaron
                emitPlayToBackend(get, "🔙 JUGADA CORREGIDA (Deshacer)", 0, 0, get().currentBatterId, get().inning, get().half);
            },

            addLog: (log: PlayLog) => set((state) => ({ playLogs: [log, ...state.playLogs] })),

            fetchGameConfig: async () => {
                const { gameId } = get();
                if (!gameId) return;
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                    const response = await fetch(`${apiUrl}/games/${gameId}`);
                    if (response.ok) {
                        const data = await response.json();

                        const homeLp = data.lineups?.filter((l: LineupItem) => l.teamId === data.homeTeam.id).sort((a: LineupItem, b: LineupItem) => a.battingOrder - b.battingOrder) || [];
                        const awayLp = data.lineups?.filter((l: LineupItem) => l.teamId === data.awayTeam.id).sort((a: LineupItem, b: LineupItem) => a.battingOrder - b.battingOrder) || [];

                        set({
                            homeLineup: homeLp,
                            awayLineup: awayLp,
                        });

                        // Fetch full game state from DB to restore after page refresh
                        const stateRes = await fetch(`${apiUrl}/games/${gameId}/state`);
                        if (stateRes.ok) {
                            const gs = await stateRes.json();

                            // Only restore if there are actual plays (game has started)
                            if (gs.playLogs && gs.playLogs.length > 0) {
                                set({
                                    inning: gs.inning || 1,
                                    half: gs.half || 'top',
                                    outs: gs.outs || 0,
                                    homeScore: gs.homeScore || 0,
                                    awayScore: gs.awayScore || 0,
                                    playLogs: gs.playLogs,
                                    awayBatterIndex: gs.awayBatterIndex || 0,
                                    homeBatterIndex: gs.homeBatterIndex || 0,
                                    currentBatter: gs.currentBatter || 'Esperando Bateador...',
                                    currentBatterId: gs.currentBatterId || null,
                                    balls: 0,
                                    strikes: 0,
                                    bases: { first: null, second: null, third: null },
                                });
                                return; // State fully restored from DB, skip manual batter calculation below
                            }
                        }

                        // Fallback: calculate batter index from plays when no /state endpoint data
                        interface ApiPlay { half: string; }
                        const plays: ApiPlay[] = data.plays || [];
                        const awayPA = plays.filter((p: ApiPlay) => p.half === 'top').length;
                        const homePA = plays.filter((p: ApiPlay) => p.half === 'bottom').length;
                        const awayIdx = awayLp.length > 0 ? awayPA % awayLp.length : 0;
                        const homeIdx = homeLp.length > 0 ? homePA % homeLp.length : 0;

                        set({
                            awayBatterIndex: awayIdx,
                            homeBatterIndex: homeIdx,
                        });

                        // Establecer el bateador actual según el inning actual
                        const { half } = get();
                        const currentLineup = half === 'top' ? awayLp : homeLp;
                        const index = half === 'top' ? awayIdx : homeIdx;

                        if (currentLineup.length > 0) {
                            const lineupItem = currentLineup[index];
                            const player = lineupItem?.player;
                            if (player) {
                                set({
                                    currentBatter: `${player.firstName} ${player.lastName}`,
                                    currentBatterId: lineupItem.playerId
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching game config", error);
                }
            },

            connectSocket: () => {
                const { gameId } = get();
                if (!gameId) return;

                // Si ya está conectado, unirse al room directamente
                if (socket.connected) {
                    socket.emit('joinGame', gameId);
                    const state = get();
                    const defLineup0 = state.half === 'top' ? state.homeLineup : state.awayLineup;
                    const pitcher0 = defLineup0.find((item: LineupItem) => item.position === '1' || item.position === 'P');
                    socket.emit('syncState', {
                        gameId,
                        fullState: {
                            inning: state.inning, half: state.half, outs: state.outs,
                            balls: state.balls, strikes: state.strikes,
                            homeScore: state.homeScore, awayScore: state.awayScore,
                            bases: state.bases, currentBatter: state.currentBatter,
                            currentBatterId: state.currentBatterId,
                            playLogs: state.playLogs,
                            homeLineup: state.homeLineup,
                            awayLineup: state.awayLineup,
                            currentPitcher: pitcher0?.player ? `${pitcher0.player.firstName} ${pitcher0.player.lastName}` : 'Pitcher Desconocido',
                        }
                    });
                    return;
                }

                // Si no está conectado, conectar y luego unirse
                socket.connect();
                socket.once('connect', () => {
                    socket.emit('joinGame', gameId);
                    const state = get();
                    const defLineup2 = state.half === 'top' ? state.homeLineup : state.awayLineup;
                    const pitcher2 = defLineup2.find((item: LineupItem) => item.position === '1' || item.position === 'P');
                    socket.emit('syncState', {
                        gameId,
                        fullState: {
                            inning: state.inning, half: state.half, outs: state.outs,
                            balls: state.balls, strikes: state.strikes,
                            homeScore: state.homeScore, awayScore: state.awayScore,
                            bases: state.bases, currentBatter: state.currentBatter,
                            currentBatterId: state.currentBatterId,
                            playLogs: state.playLogs,
                            homeLineup: state.homeLineup,
                            awayLineup: state.awayLineup,
                            currentPitcher: pitcher2?.player ? `${pitcher2.player.firstName} ${pitcher2.player.lastName}` : 'Pitcher Desconocido',
                        }
                    });
                });

                socket.on('gameStateUpdate', (data) => {
                    console.log("Update received from server", data);
                });
            },

            disconnectSocket: () => {
                socket.disconnect();
                socket.off('gameStateUpdate');
            },

            resetCount: () => set({ balls: 0, strikes: 0 }),

            clearBases: () => set({ bases: { first: null, second: null, third: null } }),

            cycleBatter: () => {
                const state = get();

                if (state.half === 'top') {
                    if (state.awayLineup.length > 0) {
                        const nextIndex = (state.awayBatterIndex + 1) % state.awayLineup.length;
                        const nextLineupItem = state.awayLineup[nextIndex];
                        const nextPlayer = nextLineupItem?.player;
                        if (nextPlayer) {
                            set({
                                awayBatterIndex: nextIndex,
                                currentBatter: `${nextPlayer.firstName} ${nextPlayer.lastName}`,
                                currentBatterId: nextLineupItem.playerId
                            });
                        }
                    } else {
                        set({
                            currentBatter: `Away Player #${Math.floor(Math.random() * 99) + 1}`,
                            currentBatterId: null
                        });
                    }
                } else {
                    if (state.homeLineup.length > 0) {
                        const nextIndex = (state.homeBatterIndex + 1) % state.homeLineup.length;
                        const nextLineupItem = state.homeLineup[nextIndex];
                        const nextPlayer = nextLineupItem?.player;
                        if (nextPlayer) {
                            set({
                                homeBatterIndex: nextIndex,
                                currentBatter: `${nextPlayer.firstName} ${nextPlayer.lastName}`,
                                currentBatterId: nextLineupItem.playerId
                            });
                        }
                    } else {
                        set({
                            currentBatter: `Home Player #${Math.floor(Math.random() * 99) + 1}`,
                            currentBatterId: null
                        });
                    }
                }
            },

            nextHalfInning: () => {
                const { half, inning, homeLineup, awayLineup, homeBatterIndex, awayBatterIndex } = get();
                const newHalf = half === 'top' ? 'bottom' : 'top';
                const newInning = half === 'bottom' ? inning + 1 : inning;

                get().addLog({ text: "Cambio de Inning", inningString: `${newHalf === 'top' ? '▲' : '▼'} ${newInning}` });

                const currentLineup = newHalf === 'top' ? awayLineup : homeLineup;
                const index = newHalf === 'top' ? awayBatterIndex : homeBatterIndex;
                let nextBatterName = `Player #${Math.floor(Math.random() * 99) + 1}`;
                let nextBatterId = null;

                if (currentLineup.length > 0) {
                    const lineupItem = currentLineup[index];
                    if (lineupItem && lineupItem.player) {
                        nextBatterName = `${lineupItem.player.firstName} ${lineupItem.player.lastName}`;
                        nextBatterId = lineupItem.playerId;
                    }
                }

                set({
                    outs: 0,
                    balls: 0,
                    strikes: 0,
                    bases: { first: null, second: null, third: null },
                    half: newHalf,
                    inning: newInning,
                    currentBatter: nextBatterName,
                    currentBatterId: nextBatterId,
                });
            },

            addOut: (customLogText?: string, isGroundout?: boolean, emitPlay: boolean = true) => {
                get().saveHistory();
                const state = get();
                const batter = state.currentBatter;
                const activeBatterId = state.currentBatterId; // Capture before cycling
                const activeInning = state.inning;
                const activeHalf = state.half;
                const totalOuts = state.outs + 1;
                let runsScored = 0;
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };

                const logContent = customLogText || `Out registrado: ${batter}`;
                const isDP = logContent.includes('Doble Play') || logContent.includes('DP');

                // Solo movemos corredores reales en la primera emisión (emitPlay=true)
                if (emitPlay) {
                    if (isDP) {
                        // Doble play asume la eliminación del bateador y del corredor de 1ra base
                        if (state.bases.third && state.bases.second && state.bases.first) {
                            runsScored++; // En la mayoría de los 6-4-3 con bases llenas, la carrera entra
                            newBases.third = state.bases.second;
                            newBaseIds.third = state.baseIds.second;
                            newBases.second = null;
                            newBaseIds.second = null;
                        } else if (state.bases.second && state.bases.first) {
                            newBases.third = state.bases.second;
                            newBaseIds.third = state.baseIds.second;
                            newBases.second = null;
                            newBaseIds.second = null;
                        }
                        newBases.first = null;
                        newBaseIds.first = null;
                    } else if (isGroundout && totalOuts < 3) {
                        // Avance forzado asumiendo un out de rutina no doble play en otra base
                        // Funciona así: El de 3ra anota si las bases previas estaban llenas
                        if (state.bases.third && state.bases.second && state.bases.first) {
                            runsScored++;
                            newBases.third = state.bases.second;
                            newBaseIds.third = state.baseIds.second;
                            newBases.second = state.bases.first;
                            newBaseIds.second = state.baseIds.first;
                        } else if (state.bases.second && state.bases.first) {
                            newBases.third = state.bases.second;
                            newBaseIds.third = state.baseIds.second;
                            newBases.second = state.bases.first;
                            newBaseIds.second = state.baseIds.first;
                        } else if (state.bases.first) {
                            newBases.second = state.bases.first;
                            newBaseIds.second = state.baseIds.first;
                        }
                        newBases.first = null; // El bateador es el out que no llega
                        newBaseIds.first = null;
                    }
                }

                get().addLog({ text: logContent, outs: totalOuts });

                if (totalOuts >= 3) {
                    // CRÍTICO: Avanzar el índice del bateador del equipo que acaba de batear
                    // ANTES de llamar nextHalfInning(). Sin esto, el siguiente inning del mismo
                    // equipo empezaría con el mismo 3er bateador en lugar del 4to.
                    // Solo avanzamos si emitPlay es true, para evitar avanzar doble si el 3er out fue el segundo de un DP
                    if (emitPlay) {
                        const { half: curHalf, awayBatterIndex, awayLineup, homeBatterIndex, homeLineup } = get();
                        if (curHalf === 'top') {
                            const nextIdx = (awayBatterIndex + 1) % (awayLineup.length || 9);
                            set({ awayBatterIndex: nextIdx });
                        } else {
                            const nextIdx = (homeBatterIndex + 1) % (homeLineup.length || 9);
                            set({ homeBatterIndex: nextIdx });
                        }
                    }
                    get().nextHalfInning();
                } else {
                    set((s) => ({
                        outs: totalOuts,
                        bases: newBases,
                        baseIds: newBaseIds,
                        homeScore: s.half === 'bottom' ? s.homeScore + runsScored : s.homeScore,
                        awayScore: s.half === 'top' ? s.awayScore + runsScored : s.awayScore,
                    }));
                    if (emitPlay) {
                        get().resetCount();
                        get().cycleBatter();
                    }
                }

                // Emitir jugada al backend con resultado WBSC correcto
                let resultSymbol = "OUT";

                if (customLogText) {
                    // Ponches
                    if (customLogText.includes('(K)')) resultSymbol = "KS";
                    else if (customLogText.includes('(ꓘ)')) resultSymbol = "K";
                    // Secuencia defensiva: "por la vía 6-3", "por la vía 5-4-3", etc.
                    else {
                        const seqMatch = customLogText.match(/(\d(?:-\d)+)/);
                        // Prefer [posNum] bracket notation injected by PlayLocationModal; fallback to bare digit
                        const bracketMatch = customLogText.match(/\[([1-9])\]/);
                        const posMatch = bracketMatch || customLogText.match(/\b([1-9])\b/);

                        if (seqMatch) {
                            // Multi-position sequence (e.g. 6-3, 5-4-3)
                            resultSymbol = seqMatch[1];
                        } else if (customLogText.includes('Elevado') || customLogText.includes('Fly')) {
                            resultSymbol = posMatch ? `F${posMatch[1]}` : 'FO';
                        } else if (customLogText.includes('Línea') || customLogText.includes('Linea')) {
                            resultSymbol = posMatch ? `L${posMatch[1]}` : 'LD';
                        } else if (customLogText.includes('Rola')) {
                            // Single-fielder groundout: use fielder-3 convention
                            resultSymbol = posMatch ? `${posMatch[1]}-3` : 'GO';
                        } else if (customLogText.includes('Doble Play') || customLogText.includes('DP')) {
                            resultSymbol = seqMatch ? `DP ${seqMatch[1]}` : 'DP';
                        }
                    }
                }

                if (emitPlay) {
                    emitPlayToBackend(get, resultSymbol, runsScored, 1, activeBatterId, activeInning, activeHalf);
                }
            },

            addStrike: () => {
                get().saveHistory();
                const strikes = get().strikes + 1;
                if (strikes >= 3) {
                    // Tercer strike = ponche tirándole (KS) por defecto
                    const batter = get().currentBatter;
                    get().addOut(`${batter} es Ponchado Tirándole (K)`);
                } else {
                    set({ strikes });
                }
            },

            addFoul: () => {
                const strikes = get().strikes;
                if (strikes < 2) {
                    get().saveHistory();
                    set({ strikes: strikes + 1 });
                }
            },

            addBall: () => {
                get().saveHistory();
                const balls = get().balls + 1;
                if (balls >= 4) {
                    // Base on balls logic (Walk)
                    const currentBases = get().bases;
                    const currentBaseIds = get().baseIds;
                    const batter = get().currentBatter;
                    const activeBatterId = get().currentBatterId; // Capture before cycling
                    let runs = 0;

                    const newBases = { ...currentBases };
                    const newBaseIds = { ...currentBaseIds };

                    if (currentBases.first && currentBases.second && currentBases.third) {
                        runs = 1;
                        // Corredor de 3ra anota — actualizar RUN_SCORED via emitPlayToBackend
                        newBases.third = currentBases.second;
                        newBaseIds.third = currentBaseIds.second;
                        newBases.second = currentBases.first;
                        newBaseIds.second = currentBaseIds.first;
                        newBases.first = batter;
                        newBaseIds.first = activeBatterId;
                    } else if (currentBases.first && currentBases.second) {
                        newBases.third = currentBases.second;
                        newBaseIds.third = currentBaseIds.second;
                        newBases.second = currentBases.first;
                        newBaseIds.second = currentBaseIds.first;
                        newBases.first = batter;
                        newBaseIds.first = activeBatterId;
                    } else if (currentBases.first) {
                        newBases.second = currentBases.first;
                        newBaseIds.second = currentBaseIds.first;
                        newBases.first = batter;
                        newBaseIds.first = activeBatterId;
                    } else {
                        newBases.first = batter;
                        newBaseIds.first = activeBatterId;
                    }

                    get().addLog({ text: `Base por Bolas a ${batter}` });

                    set((state) => ({
                        bases: newBases,
                        baseIds: newBaseIds,
                        homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore,
                        awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore,
                    }));

                    const captureInning = get().inning;
                    const captureHalf = get().half;
                    get().resetCount();
                    get().cycleBatter();
                    emitPlayToBackend(get, "BB", runs, 0, activeBatterId, captureInning, captureHalf);

                } else {
                    set({ balls });
                }
            },

            registerHit: (basesAdvanced: number, customLogText?: string) => {
                get().saveHistory();
                // 1 = Sencillo, 2 = Doble, 3 = Triple, 4 = HR
                const currentBases = get().bases;
                const currentBaseIds = get().baseIds;
                const batter = get().currentBatter;
                const activeBatterId = get().currentBatterId; // Capture before cycling
                let runsScored = 0;
                const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };
                const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };
                // Acumular IDs de corredores que anotan para emitir RUN_SCORED individuales
                const scorerIds: string[] = [];

                let hitName = "Hit";
                if (basesAdvanced === 1) hitName = "Sencillo";
                if (basesAdvanced === 2) hitName = "Doble";
                if (basesAdvanced === 3) hitName = "Triple";
                if (basesAdvanced === 4) hitName = "Jonrón";

                if (basesAdvanced === 4) {
                    // HR: todos anotan
                    runsScored = 1 + (currentBases.first ? 1 : 0) + (currentBases.second ? 1 : 0) + (currentBases.third ? 1 : 0);
                    if (currentBaseIds.third) scorerIds.push(currentBaseIds.third);
                    if (currentBaseIds.second) scorerIds.push(currentBaseIds.second);
                    if (currentBaseIds.first) scorerIds.push(currentBaseIds.first);
                    if (activeBatterId) scorerIds.push(activeBatterId); // El bateador también anota en HR
                } else if (basesAdvanced === 1) {
                    if (currentBases.third) { runsScored++; if (currentBaseIds.third) scorerIds.push(currentBaseIds.third); }
                    if (currentBases.second) { newBases.third = currentBases.second; newBaseIds.third = currentBaseIds.second; }
                    if (currentBases.first) { newBases.second = currentBases.first; newBaseIds.second = currentBaseIds.first; }
                    newBases.first = batter;
                    newBaseIds.first = activeBatterId;
                } else if (basesAdvanced === 2) {
                    if (currentBases.third) { runsScored++; if (currentBaseIds.third) scorerIds.push(currentBaseIds.third); }
                    if (currentBases.second) { runsScored++; if (currentBaseIds.second) scorerIds.push(currentBaseIds.second); }
                    if (currentBases.first) { newBases.third = currentBases.first; newBaseIds.third = currentBaseIds.first; }
                    newBases.second = batter;
                    newBaseIds.second = activeBatterId;
                } else if (basesAdvanced === 3) {
                    if (currentBases.third) { runsScored++; if (currentBaseIds.third) scorerIds.push(currentBaseIds.third); }
                    if (currentBases.second) { runsScored++; if (currentBaseIds.second) scorerIds.push(currentBaseIds.second); }
                    if (currentBases.first) { runsScored++; if (currentBaseIds.first) scorerIds.push(currentBaseIds.first); }
                    newBases.third = batter;
                    newBaseIds.third = activeBatterId;
                }

                // Si customLogText tiene formato 'E#|descripcion', extraer el símbolo del error
                let overrideSymbol: string | null = null;
                let displayLogText = customLogText;
                if (customLogText && customLogText.includes('|')) {
                    const parts = customLogText.split('|');
                    overrideSymbol = parts[0]; // 'E6'
                    displayLogText = parts[1];  // 'Batter se embasa por Error...'
                }

                let defaultLog = `${batter} conecta ${hitName}.`;
                if (runsScored > 0) defaultLog += ` (${runsScored} RBI)`;

                get().addLog({ text: displayLogText ? `${displayLogText}${runsScored > 0 ? ` productor de ${runsScored} carrera(s)` : ''}` : defaultLog });

                set((state) => ({
                    bases: newBases,
                    baseIds: newBaseIds,
                    homeScore: state.half === 'bottom' ? state.homeScore + runsScored : state.homeScore,
                    awayScore: state.half === 'top' ? state.awayScore + runsScored : state.awayScore,
                }));

                const captureInning = get().inning;
                const captureHalf = get().half;

                get().resetCount();
                get().cycleBatter();

                // Emitir al final — usar símbolo de error si aplica
                let hitSymbol = overrideSymbol || "H1";
                if (!overrideSymbol) {
                    if (basesAdvanced === 2) hitSymbol = "H2";
                    if (basesAdvanced === 3) hitSymbol = "H3";
                    if (basesAdvanced === 4) hitSymbol = "HR";
                }

                emitPlayToBackend(get, hitSymbol, 0, 0, activeBatterId, captureInning, captureHalf);

                // Emitir RUN_SCORED para cada corredor que anotó — esto cierra SU rombo en el boxscore
                for (const runnerId of scorerIds) {
                    emitPlayToBackend(get, 'RUN_SCORED', 1, 0, runnerId, captureInning, captureHalf);
                }
            },


            registerCustomPlay: (description: string) => {
                get().saveHistory();
                get().addLog({ text: `Jugada registrada: ${description}` });
                emitPlayToBackend(get, description, 0, 0, get().currentBatterId, get().inning, get().half);
            },

            executeAdvancedPlay: (newBases, runsScored, outsRecorded, desc) => {
                get().saveHistory();
                const captureInning = get().inning;
                const captureHalf = get().half;
                const captureBatterId = get().currentBatterId;
                const totalOuts = get().outs + outsRecorded;

                get().addLog({ text: `[AVANZADA]: ${desc}`, outs: outsRecorded > 0 ? totalOuts : undefined });

                if (totalOuts >= 3) {
                    get().nextHalfInning();
                } else {
                    set((state) => ({
                        outs: totalOuts,
                        bases: newBases,
                        homeScore: state.half === 'bottom' ? state.homeScore + runsScored : state.homeScore,
                        awayScore: state.half === 'top' ? state.awayScore + runsScored : state.awayScore,
                    }));
                    get().resetCount();
                    get().cycleBatter();
                }

                // Emitir tras setear
                emitPlayToBackend(get, desc, runsScored, outsRecorded, captureBatterId, captureInning, captureHalf);
            },

            executeBaseAction: (origin, dest, isOut, desc) => {
                get().saveHistory();
                const captureInning = get().inning;
                const captureHalf = get().half;
                const captureBatterId = get().currentBatterId;
                const totalOuts = get().outs + (isOut ? 1 : 0);
                let runs = 0;

                get().addLog({ text: desc, outs: isOut ? totalOuts : undefined });

                if (totalOuts >= 3) {
                    get().nextHalfInning();
                } else {
                    set((state) => {
                        const newBases = { ...state.bases };
                        const runnerNode = newBases[origin];
                        newBases[origin] = null; // Quita al corredor original

                        if (dest && !isOut) {
                            if (dest === 'home') runs++;
                            else newBases[dest] = runnerNode;
                        }

                        return {
                            outs: totalOuts,
                            bases: newBases,
                            homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore,
                            awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore,
                        };
                    });
                    // NO se resetea cuenta de bateador en un robo/WP
                }

                // Emitir el status final de la base robada
                emitPlayToBackend(get, desc, dest === 'home' && !isOut ? 1 : 0, isOut ? 1 : 0, captureBatterId, captureInning, captureHalf);
            },

            executeWildPitchOrPassedBall: (desc: string) => {
                get().saveHistory();
                const captureInning = get().inning;
                const captureHalf = get().half;
                const captureBatterId = get().currentBatterId;
                let runsScored = 0;
                const state = get();
                const batter = state.currentBatter;
                const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };
                const actionLogs: string[] = [];

                const isBallFour = state.balls === 3;
                const currentBaseIds = state.baseIds;
                const captureBatterIdWP = get().currentBatterId;

                const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };

                if (state.bases.third) {
                    runsScored++;
                    if (!isBallFour) actionLogs.push(`${state.bases.third} anota en carrera por ${desc}`);
                }
                if (state.bases.second) {
                    newBases.third = state.bases.second;
                    newBaseIds.third = currentBaseIds.second;
                    if (!isBallFour) actionLogs.push(`${state.bases.second} avanza a tercera por ${desc}`);
                }
                if (state.bases.first) {
                    newBases.second = state.bases.first;
                    newBaseIds.second = currentBaseIds.first;
                    if (!isBallFour) actionLogs.push(`${state.bases.first} avanza a segunda por ${desc}`);
                }

                if (isBallFour) {
                    newBases.first = batter;
                    newBaseIds.first = captureBatterIdWP;
                }

                set((s) => ({
                    bases: newBases,
                    baseIds: newBaseIds,
                    homeScore: s.half === 'bottom' ? s.homeScore + runsScored : s.homeScore,
                    awayScore: s.half === 'top' ? s.awayScore + runsScored : s.awayScore,
                }));

                if (isBallFour) {
                    get().resetCount();
                    get().cycleBatter();
                    get().addLog({ text: `Base por Bolas a ${batter}` });
                } else {
                    get().addBall();
                    // Agregar logs al historial de avance
                    if (actionLogs.length > 0) {
                        // El log funciona como una pila, así que los agregamos para que se lean juntos
                        actionLogs.forEach(logText => get().addLog({ text: logText }));
                    }
                    // Si actionLogs es 0 y no es Ball Four, simplemente es una bola errada sin avance,
                    // no es necesario contaminar el Log, basta con el update del count en la UI visual.
                }

                // WP/PB: Emitir plays al backend para corredores que ANOTAN.
                // El bateador actual no recibe ningún play (no es su PA).
                if (isBallFour) {
                    // Ball four: registrar el BB del bateador
                    emitPlayToBackend(get, 'BB', runsScored, 0, captureBatterId, captureInning, captureHalf);
                } else if (runsScored > 0 && state.bases.third) {
                    // Corredor en 3ra anotó — buscar su playerId en el lineup para cerrar su rombo
                    const runnerName = state.bases.third;
                    const battingLineup = captureHalf === 'top' ? state.awayLineup : state.homeLineup;
                    const runnerLineupItem = battingLineup.find((item: LineupItem) => {
                        const fullName = `${item.player?.firstName} ${item.player?.lastName}`;
                        return fullName === runnerName;
                    });
                    const runnerPlayerId = runnerLineupItem?.playerId ?? null;
                    if (runnerPlayerId) {
                        // Emitir play del corredor que anotó — esto cierra su rombo en el boxscore
                        emitPlayToBackend(get, 'WP_RUN', 1, 0, runnerPlayerId, captureInning, captureHalf);
                    }
                }
                // Si NO hay carreras y NO es ball four: solo se actualiza el estado del diamante,
                // no se registra ningún play en el boxscore.
            },


            executeFieldersChoice: (outRunnerId: 'first' | 'second' | 'third') => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + 1;
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                const batter = state.currentBatter;
                const activeBatterId = state.currentBatterId;
                const eliminatedRunnerName = newBases[outRunnerId];

                // 1. Eliminar al corredor seleccionado (puesto out)
                newBases[outRunnerId] = null;
                newBaseIds[outRunnerId] = null;

                // 2. Avanzar forzosamente corredores restantes y detectar quién anota
                let runsScored = 0;
                const scorerIds: string[] = [];

                // Corredor en 3ra: anota si las bases 1ra y 2da estaban ocupadas (forzado)
                if (state.bases.third && outRunnerId !== 'third') {
                    if (state.bases.first && state.bases.second) { // Forzado
                        runsScored++;
                        if (state.baseIds.third) scorerIds.push(state.baseIds.third);
                        newBases.third = null;
                        newBaseIds.third = null;
                    }
                }
                // Corredor en 2da: avanza a 3ra si 1ra estaba ocupada (forzado)
                if (state.bases.second && outRunnerId !== 'second') {
                    if (state.bases.first) { // Forzado
                        newBases.third = state.bases.second;
                        newBaseIds.third = state.baseIds.second;
                        newBases.second = null;
                        newBaseIds.second = null;
                    }
                }

                // 3. El bateador ocupa la primera base
                newBases.first = batter;
                newBaseIds.first = activeBatterId;

                get().addLog({ text: `Fielder's Choice (Bola Ocupada). ${batter} se embasa, pero ${eliminatedRunnerName} es puesto Out en ${outRunnerId === 'first' ? '1ra' : outRunnerId === 'second' ? '2da' : '3ra'}.`, outs: totalOuts });

                const captureInning = state.inning;
                const captureHalf = state.half;

                if (totalOuts >= 3) {
                    get().nextHalfInning();
                } else {
                    set((s) => ({
                        outs: totalOuts,
                        bases: newBases,
                        baseIds: newBaseIds,
                        homeScore: s.half === 'bottom' ? s.homeScore + runsScored : s.homeScore,
                        awayScore: s.half === 'top' ? s.awayScore + runsScored : s.awayScore,
                    }));
                    get().resetCount();
                    get().cycleBatter();
                }

                // Emitir FC para el bateador (no cuenta como hit, sí como AB)
                emitPlayToBackend(get, 'FC', 0, 1, activeBatterId, captureInning, captureHalf);

                // Emitir RUN_SCORED para cada corredor que anotó — cierra su rombo en boxscore
                for (const runnerId of scorerIds) {
                    emitPlayToBackend(get, 'RUN_SCORED', 1, 0, runnerId, captureInning, captureHalf);
                }
            },

            executeSacrifice: (type: 'fly' | 'bunt') => {
                const state = get();
                if (state.outs >= 2) {
                    alert('No se puede registrar un sacrificio (Fly o Toque) cuando ya hay 2 outs (Regla 9.08). Registra como Elevado o Rola de Out regular.');
                    return;
                }

                get().saveHistory();
                const batter = state.currentBatter;
                const totalOuts = state.outs + 1;
                let runsScored = 0;
                const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };
                const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };

                const scorerIds: string[] = [];
                const currentBaseIds = state.baseIds;

                // Todos los corredores avanzan una base.
                if (state.bases.third) {
                    runsScored++;
                    if (currentBaseIds.third) scorerIds.push(currentBaseIds.third);
                }
                if (state.bases.second) {
                    newBases.third = state.bases.second;
                    newBaseIds.third = currentBaseIds.second;
                }
                if (state.bases.first) {
                    newBases.second = state.bases.first;
                    newBaseIds.second = currentBaseIds.first;
                }

                const playName = type === 'fly' ? 'Fly de Sacrificio' : 'Toque de Sacrificio';

                get().addLog({ text: `${batter} se sacrifica con ${playName}${runsScored > 0 ? `, productor de ${runsScored} carrera(s)` : ''} (Avanzan corredores).`, outs: totalOuts });

                const captureInning = state.inning;
                const captureHalf = state.half;
                const captureBatterId = state.currentBatterId;

                // Con sacrificio nunca debería llegar a 3 outs porque bloqueamos state.outs >= 2 arriba
                // Pero dejamos la lógica por seguridad
                if (totalOuts >= 3) {
                    get().nextHalfInning();
                } else {
                    set((s) => ({
                        outs: totalOuts,
                        bases: newBases,
                        baseIds: newBaseIds,
                        homeScore: s.half === 'bottom' ? s.homeScore + runsScored : s.homeScore,
                        awayScore: s.half === 'top' ? s.awayScore + runsScored : s.awayScore,
                    }));
                    get().resetCount();
                    get().cycleBatter();
                }

                // El sacrificio anota RBI para el bateador, pero runsScored se emite separado para cerrar el rombo
                const symbol = type === 'fly' ? 'SF' : 'SH';
                emitPlayToBackend(get, symbol, 0, runsScored, captureBatterId, captureInning, captureHalf);

                for (const runnerId of scorerIds) {
                    emitPlayToBackend(get, 'RUN_SCORED', 1, 0, runnerId, captureInning, captureHalf);
                }
            }
        }),
        {
            name: 'scorekeeper-storage',
            // Solo persistir el gameId — todos los demás campos se resetean y recalculan
            // frescos desde la DB en cada carga para evitar foreign key violations y stale state.
            partialize: (state) => ({
                gameId: state.gameId,
            }),
        }
    )
);
