import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/auth';
import api from '@/lib/api';

export interface PlayLog {
    text: string;
    outs?: number; // Outs recorded in this play
    totalOuts?: number; // Total outs in inning after this play
    inningString?: string;
}

export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
}

export interface LineupItem {
    playerId: string;
    teamId: string;
    position: string;
    battingOrder: number;
    dhForPosition?: string | null;
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
    currentPitcher: string;
    playLogs: PlayLog[];
    homeLineup: LineupItem[];
    awayLineup: LineupItem[];
    homeBatterIndex: number;
    awayBatterIndex: number;
    homeTeamName: string;
    awayTeamName: string;
};

export interface GameState extends BaseState {
    gameId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    playbackId: string | null;
    plays: any[];
    winningPitcher: any;
    mvpBatter1: any;
    mvpBatter2: any;
    status: string | null;
    maxInnings: number;
    shouldPromptEndGame: boolean;
    clearEndGamePrompt: () => void;

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
    executeAdvancedPlay: (newBases: { first: string | null, second: string | null, third: string | null }, newBaseIds: { first: string | null, second: string | null, third: string | null }, runsScored: number, outsRecorded: number, desc: string, additionalRunnerOutIds?: string[]) => void;
    executeBaseAction: (origin: 'first' | 'second' | 'third', dest: 'second' | 'third' | 'home' | null, isOut: boolean, desc: string) => void;
    executeWildPitchOrPassedBall: (desc: string) => void;
    executeFieldersChoice: (outRunnerId: 'first' | 'second' | 'third') => void;
    executeSacrifice: (type: 'fly' | 'bunt') => void;
    registerCustomPlay: (description: string) => void;
    cycleBatter: () => void;
    nextHalfInning: () => void;
    resetCount: () => void;
    clearBases: () => void;
    addLog: (log: PlayLog) => void;
    syncStateToBackend: () => void;

    // Time Travel (Undo)
    history: BaseState[];
    saveHistory: () => void;
    undo: () => void;
}

let gameSocket: Socket | null = null;

const emitPlayToBackend = async (get: () => GameState, resultStr: string, runsScored: number = 0, outsOffensive: number = 0, currentBatterIdOverride: string | null = null, inningOverride: number | null = null, halfOverride: string | null = null, outsBeforeOverride: number | null = null, silent: boolean = false) => {
    const stateSnapshot = get();
    if (!stateSnapshot.gameId) return;

    const activeBatterId = currentBatterIdOverride || stateSnapshot.currentBatterId;
    const defensiveLineup = stateSnapshot.half === 'top' ? stateSnapshot.homeLineup : stateSnapshot.awayLineup;
    const currentPitcher = defensiveLineup.find((item: LineupItem) => item.position === "1" || item.position === "P");
    const activePitcherId = currentPitcher ? currentPitcher.playerId : null;

    const payloadInning = inningOverride !== null ? inningOverride : stateSnapshot.inning;
    const payloadHalf = halfOverride !== null ? halfOverride : stateSnapshot.half;
    const payloadOutsBefore = outsBeforeOverride !== null ? outsBeforeOverride : Math.max(0, stateSnapshot.outs - outsOffensive);
    
    const logText = resultStr.includes('|') ? resultStr.split('|')[1] : resultStr;
    const resCode = resultStr.includes('|') ? resultStr.split('|')[0] : resultStr;
    const timestamp = Date.now().toString();

    // Actualizar log local y playbackId inmediatamente
    const totalAfter = payloadOutsBefore + outsOffensive;
    if (!silent) {
        useGameStore.setState(state => ({
            playLogs: [{ text: `Inning ${payloadInning}: ${logText}`, outs: outsOffensive, totalOuts: totalAfter }, ...state.playLogs],
            playbackId: timestamp
        }));
    }

    const nextState = get();

    // Un solo emit al backend — él hace todo: DB, update game, broadcast
    if (gameSocket?.connected) {
        gameSocket.emit('registerPlay', {
            gameId: stateSnapshot.gameId,
            token: getAccessToken(),
            playInfo: {
                inning: payloadInning,
                half: payloadHalf,
                outs_before_play: payloadOutsBefore,
                result: resultStr,
                rbi: runsScored,
                runs_scored: runsScored,
                outs_recorded: outsOffensive,
                batter_id: activeBatterId,
                pitcher_id: activePitcherId,
                scored: resultStr.includes('RUN_SCORED') || (resCode === 'HR' && activeBatterId === stateSnapshot.currentBatterId),
                playbackId: timestamp
            },
            fullState: {
                inning: payloadInning,
                half: payloadHalf,
                outs: nextState.outs,
                balls: nextState.balls,
                strikes: nextState.strikes,
                homeScore: nextState.homeScore,
                awayScore: nextState.awayScore,
                bases: nextState.bases,
                currentBatter: nextState.currentBatter,
                currentBatterId: nextState.currentBatterId,
                playLogs: nextState.playLogs,
                homeLineup: nextState.homeLineup,
                awayLineup: nextState.awayLineup,
                playbackId: timestamp,
                lastPlay: { result: resCode, description: logText, inning: payloadInning, half: payloadHalf },
            },
        });
        // Pequeña espera para evitar colisiones si se llama en bucle rápido sin await real de socket
        await new Promise(resolve => setTimeout(resolve, 50));
    } else {
        // Fallback HTTP si el socket no está conectado
        try {
            await api.post(`/games/${stateSnapshot.gameId}/plays`, {
                inning: payloadInning, half: payloadHalf,
                outs_before_play: payloadOutsBefore, result: resultStr,
                rbi: runsScored, runs_scored: runsScored, outs_recorded: outsOffensive,
                batter_id: activeBatterId, pitcher_id: activePitcherId,
            });
        } catch (e) {
            console.error("Fallback HTTP play failed:", e);
        }
    }
};

const syncStateToBackend = (get: () => GameState) => {
    const state = get();
    if (!state.gameId) return;

    if (gameSocket?.connected) {
        gameSocket.emit('syncState', {
            gameId: state.gameId,
            token: getAccessToken(),
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
                playbackId: Date.now().toString()
            }
        });
    }
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
            bases: { first: null, second: null, third: null },
            baseIds: { first: null, second: null, third: null },
            currentBatter: "Esperando Lineup",
            currentBatterId: null,
            currentPitcher: "Esperando Pitcher...",
            gameId: null,
            homeTeamId: null,
            awayTeamId: null,
            homeTeamName: 'HOME',
            awayTeamName: 'AWAY',
            playbackId: null,
            plays: [],
            playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
            homeLineup: [],
            awayLineup: [],
            homeBatterIndex: 0,
            awayBatterIndex: 0,
            history: [],
            winningPitcher: null,
            mvpBatter1: null,
            mvpBatter2: null,
            status: null,
            maxInnings: 7,
            shouldPromptEndGame: false,

            clearEndGamePrompt: () => set({ shouldPromptEndGame: false }),

            setGameId: (id: string) => {
                if (get().gameId === id) return;
                set({
                    gameId: id,
                    homeTeamId: null,
                    awayTeamId: null,
                    homeTeamName: 'HOME',
                    awayTeamName: 'AWAY',
                    playbackId: null,
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
                    currentPitcher: 'Cargando pitcher...',
                    awayBatterIndex: 0,
                    homeBatterIndex: 0,
                    playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
                    history: [],
                    winningPitcher: null,
                    mvpBatter1: null,
                    mvpBatter2: null,
                    status: null,
                    maxInnings: 7,
                    shouldPromptEndGame: false,
                });
            },

            saveHistory: () => {
                const state = get();
                const snapshot: BaseState = {
                    inning: state.inning, half: state.half, outs: state.outs,
                    balls: state.balls, strikes: state.strikes,
                    homeScore: state.homeScore, awayScore: state.awayScore,
                    bases: { ...state.bases }, baseIds: { ...state.baseIds },
                    currentBatter: state.currentBatter, currentBatterId: state.currentBatterId,
                    currentPitcher: state.currentPitcher,
                    playLogs: [...state.playLogs], homeLineup: [...state.homeLineup],
                    awayLineup: [...state.awayLineup], homeBatterIndex: state.homeBatterIndex,
                    awayBatterIndex: state.awayBatterIndex,
                    homeTeamName: state.homeTeamName, awayTeamName: state.awayTeamName,
                };
                set((s) => ({ history: [...s.history.slice(-20), snapshot] }));
            },

            undo: () => {
                const { history } = get();
                if (history.length === 0) return;
                const previousState = history[history.length - 1];
                set({ ...previousState, history: history.slice(0, -1) });
                emitPlayToBackend(get, "🔙 UNDO", 0, 0, get().currentBatterId, get().inning, get().half);
            },

            addLog: (log: PlayLog) => set((state) => ({ playLogs: [log, ...state.playLogs] })),

            fetchGameConfig: async () => {
                const { gameId } = get();
                if (!gameId) return;
                try {
                    const { data: gameData } = await api.get(`/games/${gameId}/state`);
                    console.log("[fetchGameConfig] Data received:", gameData);

                    if (gameData) {
                        set({ maxInnings: gameData.maxInnings ?? 7 });
                        const sanitizeLineup = (lp: any[]) => lp.map(l => ({
                            playerId: l.player_id, teamId: l.team_id,
                            position: l.position, battingOrder: l.batting_order,
                            dhForPosition: l.dh_for_position,
                            player: l.player ? { 
                                id: l.player.id, 
                                firstName: l.player.first_name || l.player.firstName, 
                                lastName: l.player.last_name || l.player.lastName,
                                photoUrl: l.player.photo_url || l.player.photoUrl || undefined
                            } : undefined
                        }));

                        const homeLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.home_team_id) || []).sort((a,b) => a.battingOrder - b.battingOrder);
                        const awayLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.away_team_id) || []).sort((a,b) => a.battingOrder - b.battingOrder);

                        set({
                            homeLineup: homeLp,
                            awayLineup: awayLp,
                            homeTeamId: gameData.home_team_id,
                            awayTeamId: gameData.away_team_id,
                            homeTeamName: gameData.home_team_name || 'HOME',
                            awayTeamName: gameData.away_team_name || 'AWAY',
                            playbackId: gameData.playback_id,
                            plays: gameData.plays || []
                        });

                        if (gameData.plays && gameData.plays.length > 0) {
                            const plays = gameData.plays.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            const awayPA = plays.filter((p: any) => p.half === 'top').length;
                            const homePA = plays.filter((p: any) => p.half === 'bottom').length;
                            const awayIdx = awayLp.length > 0 ? awayPA % awayLp.length : 0;
                            const homeIdx = homeLp.length > 0 ? homePA % homeLp.length : 0;
                            const activeHalf = gameData.half || 'top';
                            const currentLineup = activeHalf === 'top' ? awayLp : homeLp;
                            const defensiveLineup = activeHalf === 'top' ? homeLp : awayLp;
                            const currentIndex = activeHalf === 'top' ? awayIdx : homeIdx;

                            const pitcher = defensiveLineup.find((p: any) => p.position === 'P' || p.position === '1');
                            const pName = pitcher?.player ? `${pitcher.player.firstName} ${pitcher.player.lastName}` : 'Esperando Pitcher...';

                            set({
                                inning: gameData.current_inning || 1, half: activeHalf,
                                homeScore: gameData.home_score || 0, awayScore: gameData.away_score || 0,
                                awayBatterIndex: awayIdx, homeBatterIndex: homeIdx,
                                currentBatter: currentLineup[currentIndex]?.player ? `${currentLineup[currentIndex].player.firstName} ${currentLineup[currentIndex].player.lastName}` : 'Desconocido',
                                currentBatterId: currentLineup[currentIndex]?.playerId || null,
                                currentPitcher: pName,
                                winningPitcher: gameData.winningPitcher,
                                mvpBatter1: gameData.mvpBatter1,
                                mvpBatter2: gameData.mvpBatter2,
                                status: gameData.status,
                                playLogs: plays.map((p: any) => {
                                    const logText = (p.result || '').includes('|') ? p.result.split('|')[1] : p.result;
                                    return { text: `Inning ${p.inning}: ${logText}` };
                                }).reverse()
                            });
                        } else {
                            // No hay jugadas aún, inicializar con el primer bateador
                            const activeHalf = gameData.half || 'top';
                            const currentLineup = activeHalf === 'top' ? awayLp : homeLp;
                            const defensiveLineup = activeHalf === 'top' ? homeLp : awayLp;
                            
                            const pitcher = defensiveLineup.find((p: any) => p.position === 'P' || p.position === '1');
                            const pName = pitcher?.player ? `${pitcher.player.firstName} ${pitcher.player.lastName}` : 'Esperando Pitcher...';

                            set({
                                inning: gameData.current_inning || 1, half: activeHalf,
                                homeScore: gameData.home_score || 0, awayScore: gameData.away_score || 0,
                                awayBatterIndex: 0, homeBatterIndex: 0,
                                currentBatter: currentLineup[0]?.player ? `${currentLineup[0].player.firstName} ${currentLineup[0].player.lastName}` : 'Esperando Lineup',
                                currentBatterId: currentLineup[0]?.playerId || null,
                                currentPitcher: pName,
                                winningPitcher: gameData.winningPitcher,
                                mvpBatter1: gameData.mvpBatter1,
                                mvpBatter2: gameData.mvpBatter2,
                                status: gameData.status,
                                playLogs: [{ text: "Inicio del partido", inningString: `▲ 1` }]
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching game config", error);
                }
            },

            connectSocket: () => {
                const { gameId } = get();
                if (!gameId) return;
                if (gameSocket) gameSocket.disconnect();

                const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                gameSocket = io(`${backendUrl}/live_games`, {
                    auth: { token: getAccessToken() },
                    transports: ['websocket'],
                });

                gameSocket.on('connect', () => {
                    console.log(`Socket connected: game-${gameId}`);
                    gameSocket!.emit('joinGame', gameId);
                });

                gameSocket.on('disconnect', () => console.log('Socket disconnected'));

                // Listen for game state updates from the backend (broadcast by the scorekeeper)
                gameSocket.on('gameStateUpdate', (data: any) => {
                    const fs = data?.fullState;
                    if (!fs) return;

                    // Only update if the incoming state is newer than our local state
                    const currentPlaybackId = get().playbackId || 0;
                    const newPlaybackId = fs.playbackId || 0;
                    
                    if (newPlaybackId <= currentPlaybackId && currentPlaybackId !== 0) {
                        console.log('[GameStore] Ignoring stale update:', fs.lastPlay?.result);
                        return;
                    }

                    console.log('[Gamecast] gameStateUpdate received:', fs.lastPlay?.result);
                    set({
                        inning: fs.inning ?? get().inning,
                        half: fs.half ?? get().half,
                        outs: fs.outs ?? get().outs,
                        balls: fs.balls ?? get().balls,
                        strikes: fs.strikes ?? get().strikes,
                        homeScore: fs.homeScore ?? get().homeScore,
                        awayScore: fs.awayScore ?? get().awayScore,
                        bases: fs.bases ?? get().bases,
                        currentBatter: fs.currentBatter ?? get().currentBatter,
                        currentBatterId: fs.currentBatterId ?? get().currentBatterId,
                        playLogs: fs.playLogs ?? get().playLogs,
                        playbackId: newPlaybackId,
                    });
                });
            },

            disconnectSocket: () => {
                if (gameSocket) { gameSocket.disconnect(); gameSocket = null; }
            },

            resetCount: () => set({ balls: 0, strikes: 0 }),
            clearBases: () => set({ bases: { first: null, second: null, third: null }, baseIds: { first: null, second: null, third: null } }),

            cycleBatter: () => {
                const state = get();
                if (state.half === 'top') {
                    const nextIndex = (state.awayBatterIndex + 1) % (state.awayLineup.length || 1);
                    const item = state.awayLineup[nextIndex];
                    set({ awayBatterIndex: nextIndex, currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                } else {
                    const nextIndex = (state.homeBatterIndex + 1) % (state.homeLineup.length || 1);
                    const item = state.homeLineup[nextIndex];
                    set({ homeBatterIndex: nextIndex, currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                }
            },

            nextHalfInning: () => {
                const { half, inning, maxInnings, homeScore, awayScore } = get();
                const newHalf = half === 'top' ? 'bottom' : 'top';
                const newInning = half === 'bottom' ? inning + 1 : inning;

                // ── Fin de juego automático ──────────────────────────────────
                // Al acabar la parte alta de la última entrada y va ganando local
                const endAfterTop = half === 'top' && inning >= maxInnings && homeScore > awayScore;
                // Al acabar la parte baja de la última entrada
                const endAfterBottom = half === 'bottom' && inning >= maxInnings;

                if (endAfterTop || endAfterBottom) {
                    set({ shouldPromptEndGame: true });
                    // Igual limpiamos el conteo y bases para no dejar estado sucio
                    set({
                        outs: 0, balls: 0, strikes: 0,
                        bases: { first: null, second: null, third: null },
                        baseIds: { first: null, second: null, third: null },
                    });
                    return; // No avanzamos al siguiente half — el modal lo manejará
                }
                // ─────────────────────────────────────────────────────────────

                // Add inning divider to play-by-play log
                const dividerSymbol = newHalf === 'top' ? '▲' : '▼';
                set((s) => ({
                    outs: 0,
                    balls: 0,
                    strikes: 0,
                    bases: { first: null, second: null, third: null },
                    baseIds: { first: null, second: null, third: null },
                    half: newHalf,
                    inning: newInning,
                    playLogs: [{ text: '', inningString: `${dividerSymbol} ${newInning}` }, ...s.playLogs],
                }));

                // Update current batter to whoever is up NEXT in the NEW half without incrementing their index!
                const stateAfterHalfChange = get();
                if (newHalf === 'top') {
                    const idx = stateAfterHalfChange.awayBatterIndex;
                    const item = stateAfterHalfChange.awayLineup[idx];
                    set({ currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                } else {
                    const idx = stateAfterHalfChange.homeBatterIndex;
                    const item = stateAfterHalfChange.homeLineup[idx];
                    set({ currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                }
            },

            addBall: () => {
                get().saveHistory();
                const balls = get().balls + 1;
                if (balls >= 4) {
                    // ... (lógica de BB existente)
                    const state = get();
                    const newBases = { ...state.bases };
                    const newBaseIds = { ...state.baseIds };
                    let runs = 0;
                    let scoredRunnerId: string | null = null;
                    if (state.bases.first && state.bases.second && state.bases.third) {
                        runs = 1;
                        scoredRunnerId = state.baseIds.third;
                        newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
                        newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                    } else if (state.bases.first && state.bases.second) {
                        newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
                        newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                    } else if (state.bases.first) {
                        newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                    }
                    newBases.first = state.currentBatter;
                    newBaseIds.first = state.currentBatterId;
                    set({ balls: 0, strikes: 0, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                    const cid = state.currentBatterId;
                    const batterName = state.currentBatter;
                    get().cycleBatter();
                    emitPlayToBackend(get, `BB|${batterName} recibe Base por Bolas`, runs, 0, cid);
                    if (scoredRunnerId) {
                        emitPlayToBackend(get, 'RUN_SCORED|Corredor anota por BB', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                    }
                } else {
                    set({ balls });
                    syncStateToBackend(get);
                }
            },

            addStrike: () => {
                get().saveHistory();
                const strikes = get().strikes + 1;
                if (strikes >= 3) {
                    const batter = get().currentBatter;
                    get().addOut(`KS|${batter} es Ponchado Tirándole (K)`);
                }
                else {
                    set({ strikes });
                    syncStateToBackend(get);
                }
            },

            addFoul: () => { 
                if (get().strikes < 2) {
                    set({ strikes: get().strikes + 1 }); 
                    syncStateToBackend(get);
                }
            },

            addOut: (customLogText, isGroundout, emitPlay = true) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + 1;
                const activeBatterId = state.currentBatterId;
                
                // 1. Emit the play BEFORE resetting the state (important for the 3rd out context)
                if (emitPlay) {
                    emitPlayToBackend(get, customLogText || "OUT", 0, 1, activeBatterId, state.inning, state.half, state.outs);
                }

                // 2. Update local state
                if (totalOuts >= 3) {
                    get().cycleBatter(); // advance past the batter who made the 3rd out
                    get().nextHalfInning();
                    // Force a broadcast of the newly wiped clean inning so fans don't get stuck on "2 outs pre-strikeout"
                    syncStateToBackend(get);
                } else {
                    set({ outs: totalOuts, balls: 0, strikes: 0 });
                    get().cycleBatter();
                    // Just 1 or 2 outs: sync so fans see the new count and batter
                    syncStateToBackend(get);
                }
            },

            registerHit: async (bases, customLogText) => {
                get().saveHistory();
                const state = get();
                const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };
                const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };
                let runs = 0;
                const activeId = state.currentBatterId;
                // Track which runners scored so we can emit individual RUN_SCORED plays
                const scoredRunnerIds: string[] = [];

                if (bases === 1) {
                    if (state.bases.third) { runs++; if (state.baseIds.third) scoredRunnerIds.push(state.baseIds.third); }
                    newBases.third = state.bases.second; newBases.second = state.bases.first; newBases.first = state.currentBatter;
                    newBaseIds.third = state.baseIds.second; newBaseIds.second = state.baseIds.first; newBaseIds.first = activeId;
                } else if (bases === 2) {
                    if (state.bases.third) { runs++; if (state.baseIds.third) scoredRunnerIds.push(state.baseIds.third); }
                    if (state.bases.second) { runs++; if (state.baseIds.second) scoredRunnerIds.push(state.baseIds.second); }
                    newBases.third = state.bases.first; newBases.second = state.currentBatter;
                    newBaseIds.third = state.baseIds.first; newBaseIds.second = activeId;
                } else if (bases === 3) {
                    if (state.bases.third) { runs++; if (state.baseIds.third) scoredRunnerIds.push(state.baseIds.third); }
                    if (state.bases.second) { runs++; if (state.baseIds.second) scoredRunnerIds.push(state.baseIds.second); }
                    if (state.bases.first) { runs++; if (state.baseIds.first) scoredRunnerIds.push(state.baseIds.first); }
                    newBases.third = state.currentBatter;
                    newBaseIds.third = activeId;
                } else if (bases === 4) {
                    if (state.bases.third) { runs++; if (state.baseIds.third) scoredRunnerIds.push(state.baseIds.third); }
                    if (state.bases.second) { runs++; if (state.baseIds.second) scoredRunnerIds.push(state.baseIds.second); }
                    if (state.bases.first) { runs++; if (state.baseIds.first) scoredRunnerIds.push(state.baseIds.first); }
                    runs++; // batter scores too
                }
                set({ balls: 0, strikes: 0, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                get().cycleBatter();
                // Emit the batter's play (HR/H3/H2/H1)
                let finalLog = customLogText || `H${bases}`;
                if (bases === 4) {
                    const mainDesc = finalLog.includes('|') ? finalLog.split('|')[1] : finalLog;
                    finalLog = `HR|${mainDesc} de ${runs} carreras`;
                }
                await emitPlayToBackend(get, finalLog, runs, 0, activeId);
                
                // Emit individual RUN_SCORED plays for each runner who scored
                for (const runnerId of scoredRunnerIds) {
                    await emitPlayToBackend(get, 'RUN_SCORED|Corredor anota', 1, 0, runnerId, state.inning, state.half, state.outs, true);
                }

                // Emit individual ADV plays for runners who just advanced
                if (state.bases.third && newBaseIds.third !== state.baseIds.third) {
                    await emitPlayToBackend(get, 'ADV|Corredor avanza a 3ra', 0, 0, state.baseIds.third, state.inning, state.half, state.outs, true);
                }
                if (state.bases.second && newBaseIds.second !== state.baseIds.second) {
                    await emitPlayToBackend(get, 'ADV|Corredor avanza a 2da', 0, 0, state.baseIds.second, state.inning, state.half, state.outs, true);
                }
                if (state.bases.first && newBaseIds.first !== state.baseIds.first) {
                    await emitPlayToBackend(get, 'ADV|Corredor avanza a 1ra', 0, 0, state.baseIds.first, state.inning, state.half, state.outs, true);
                }
            },

            executeAdvancedPlay: async (newBases, newBaseIds, runs, outs, desc, additionalRunnerOutIds = []) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + outs;
                const activeId = state.currentBatterId;
                
                let currentOutsInPlay = state.outs;
                // 1. Emitir outs de corredores primero (silenciosos)
                for (const runnerId of additionalRunnerOutIds) {
                    await emitPlayToBackend(get, `RUNNER_OUT|${desc.split('|')[0]}`, 0, 1, runnerId, state.inning, state.half, currentOutsInPlay, true);
                    currentOutsInPlay++;
                }

                // 2. Emitir la jugada del bateador (o la principal)
                const mainOuts = Math.max(0, outs - additionalRunnerOutIds.length);
                await emitPlayToBackend(get, desc, runs, mainOuts, activeId, state.inning, state.half, currentOutsInPlay);
                
                if (totalOuts >= 3) {
                    get().cycleBatter();
                    get().nextHalfInning();
                    syncStateToBackend(get);
                } else {
                    set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                    get().cycleBatter();
                    syncStateToBackend(get);
                }
            },

            executeBaseAction: (origin, dest, isOut, desc) => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                const runner = newBases[origin];
                const rid = newBaseIds[origin];
                newBases[origin] = null; newBaseIds[origin] = null;
                let runs = 0;
                if (dest && !isOut) { if (dest === 'home') runs++; else { newBases[dest] = runner; newBaseIds[dest] = rid; } }
                const totalOuts = state.outs + (isOut ? 1 : 0);
                
                emitPlayToBackend(get, desc, runs, isOut ? 1 : 0, rid, state.inning, state.half, state.outs);

                if (totalOuts >= 3) {
                    get().nextHalfInning();
                    syncStateToBackend(get);
                } else {
                    set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                    syncStateToBackend(get);
                }
            },

            executeWildPitchOrPassedBall: (desc) => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                let runs = 0;
                let scoredRunnerId: string | null = null;
                // Advance all runners 1 base
                if (state.bases.third) {
                    runs = 1;
                    scoredRunnerId = state.baseIds.third;
                    newBases.third = null; newBaseIds.third = null;
                }
                if (state.bases.second) {
                    newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
                    newBases.second = null; newBaseIds.second = null;
                }
                if (state.bases.first) {
                    newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                    newBases.first = null; newBaseIds.first = null;
                }
                set({ bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                syncStateToBackend(get);
                // Emit WP_RUN if runner scored from 3rd
                if (scoredRunnerId) {
                    emitPlayToBackend(get, 'WP_RUN|Carrera por Wild Pitch / Passed Ball', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                }
                // Emit advancements for others
                if (state.bases.second && newBaseIds.third) {
                    emitPlayToBackend(get, 'ADV|Avanza a 3ra por WP/PB', 0, 0, state.baseIds.second, state.inning, state.half, state.outs);
                }
                if (state.bases.first && newBaseIds.second) {
                    emitPlayToBackend(get, 'ADV|Avanza a 2da por WP/PB', 0, 0, state.baseIds.first, state.inning, state.half, state.outs);
                }
            },

            executeFieldersChoice: (outRunnerId) => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                newBases[outRunnerId] = null; newBaseIds[outRunnerId] = null;
                newBases.first = state.currentBatter; newBaseIds.first = state.currentBatterId;
                const totalOuts = state.outs + 1;
                const activeId = state.currentBatterId;
                
                emitPlayToBackend(get, "FC|Bola Ocupada", 0, 1, activeId, state.inning, state.half, state.outs);

                if (totalOuts >= 3) {
                    get().cycleBatter();
                    get().nextHalfInning();
                    syncStateToBackend(get);
                } else { 
                    set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds }); 
                    get().cycleBatter(); 
                    syncStateToBackend(get);
                }
            },

            executeSacrifice: (type) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + 1;
                const activeId = state.currentBatterId;
                let runs = 0;
                let scoredRunnerId: string | null = null;
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                // Runner on 3rd scores on sacrifice
                if (state.bases.third) {
                    runs = 1;
                    scoredRunnerId = state.baseIds.third;
                    newBases.third = null; newBaseIds.third = null;
                }
                // Advance remaining runners (for bunt sacrifices mainly)
                if (type === 'bunt') {
                    if (state.bases.second && !newBases.third) {
                        newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
                        newBases.second = null; newBaseIds.second = null;
                    }
                    if (state.bases.first && !newBases.second) {
                        newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                        newBases.first = null; newBaseIds.first = null;
                    }
                }
                
                const res = type === 'fly' ? 'SF|Fly de Sacrificio' : 'SH|Toque de Sacrificio';
                emitPlayToBackend(get, res, runs, 1, activeId, state.inning, state.half, state.outs);
                if (scoredRunnerId) {
                    emitPlayToBackend(get, 'RUN_SCORED|Anote por Sacrificio', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                }

                if (totalOuts >= 3) {
                    get().cycleBatter();
                    get().nextHalfInning();
                    syncStateToBackend(get);
                } else { 
                    set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore }); 
                    get().cycleBatter(); 
                    syncStateToBackend(get);
                }
                
                // Advancements on bunt sacrifice
                if (type === 'bunt') {
                    if (state.bases.second && newBaseIds.third) {
                        emitPlayToBackend(get, 'ADV|Avanza a 3ra por Sacrificio', 0, 0, state.baseIds.second, state.inning, state.half, state.outs);
                    }
                    if (state.bases.first && newBaseIds.second) {
                        emitPlayToBackend(get, 'ADV|Avanza a 2da por Sacrificio', 0, 0, state.baseIds.first, state.inning, state.half, state.outs);
                    }
                }
            },

            registerCustomPlay: (desc) => {
                get().saveHistory();
                emitPlayToBackend(get, desc, 0, 0, get().currentBatterId);
            },

            syncStateToBackend: () => {
                syncStateToBackend(get);
            }
        }),
        {
            name: 'scorekeeper-storage',
            partialize: (state) => ({ gameId: state.gameId }),
        }
    )
);
