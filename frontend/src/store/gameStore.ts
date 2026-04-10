import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
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
    homeLineup: LineupItem[];   // FULL lineup (includes FLEX) — used for Field, Alineaciones, pitcher lookup
    awayLineup: LineupItem[];   // FULL lineup (includes FLEX)
    homeBattingOrder: LineupItem[];  // Batting-only lineup (excludes FLEX) — used for batter rotation
    awayBattingOrder: LineupItem[];  // Batting-only lineup (excludes FLEX)
    homeBatterIndex: number;
    awayBatterIndex: number;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogoUrl: string | null;
    awayTeamLogoUrl: string | null;
    homeTeamShort: string;
    awayTeamShort: string;
    tournamentName: string;
    // ─── Contadores del turno al bate actual (swing metrics) ─────────────────
    paSwings: number;    // swings y fallas en el turno actual
    paContacts: number;  // fouls + bolas en juego del turno actual
    paPitches: number;   // total de pitcheos vistos en el turno actual
};

export interface GameState extends BaseState {
    gameId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    playbackId: string | null;
    plays: any[];
    winningPitcher: any;
    losingPitcher: any;
    savePitcher: any;
    mvpBatter1: any;
    mvpBatter2: any;
    status: string | null;
    maxInnings: number;
    shouldPromptEndGame: boolean;
    clearEndGamePrompt: () => void;
    facebookStreamUrl: string | null;
    streamStatus: string;
    pendingPlays: number; // jugadas en cola esperando envío
    socketConnected: boolean; // estado de conexión del socket en tiempo real
    phantomOutCandidates: string[]; // runner IDs que anotarán como carrera sucia por out fantasma

    // Acciones earned-run
    markPhantomOut: (runnerIds: string[]) => void;

    // Conexión
    setGameId: (id: string) => void;
    fetchGameConfig: () => Promise<void>;
    connectSocket: () => void;
    disconnectSocket: () => void;

    // Acciones (Play by play basics)
    addBall: () => void;
    addStrike: () => void;
    addSwing: () => void;
    addFoul: () => void;
    addOut: (customLogText?: string, isGroundout?: boolean, emitPlay?: boolean) => void;
    registerHit: (basesAdvanced: number, customLogText?: string) => void;
    executeAdvancedPlay: (newBases: { first: string | null, second: string | null, third: string | null }, newBaseIds: { first: string | null, second: string | null, third: string | null }, runsScored: number, outsRecorded: number, desc: string, additionalRunnerOutIds?: string[]) => void;
    executeBaseAction: (origin: 'first' | 'second' | 'third', dest: 'second' | 'third' | 'home' | null, isOut: boolean, desc: string) => void;
    executeWildPitchOrPassedBall: (desc: string) => void;
    executeWildPitch: () => void;
    executePassedBall: () => void;
    executeBalk: () => void;
    executeFieldersChoice: (outRunnerId: 'first' | 'second' | 'third') => void;
    executeSacrifice: (type: 'fly' | 'bunt', dests?: Record<string, string>) => void;
    registerHBP: () => void;
    registerIBB: () => void;
    registerDroppedThirdStrike: () => void;
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
    undo: () => Promise<void>;
}

let gameSocket: Socket | null = null;

// IDs de las jugadas creadas en la acción actual (para soporte de undo)
let currentActionPlayIds: string[] = [];

// ─── Cola de jugadas offline ──────────────────────────────────────────────────
interface QueuedPlay {
    id: string;
    playInfo: {
        inning: number; half: string; outs_before_play: number; result: string;
        rbi: number; runs_scored: number; outs_recorded: number;
        batter_id: string | null; pitcher_id: string | null;
        runners_on_base?: string; balls_on_play?: number; strikes_on_play?: number;
        swings_in_pa?: number; contacts_in_pa?: number; pitches_in_pa?: number;
    };
}

const QUEUE_KEY = (gameId: string) => `play_queue_${gameId}`;

function getPlayQueue(gameId: string): QueuedPlay[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY(gameId)) || '[]'); }
    catch { return []; }
}

function addPlayToQueue(gameId: string, playInfo: QueuedPlay['playInfo']): string {
    const queue = getPlayQueue(gameId);
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    queue.push({ id, playInfo });
    localStorage.setItem(QUEUE_KEY(gameId), JSON.stringify(queue));
    return id;
}

function removePlayFromQueue(gameId: string, id: string) {
    const queue = getPlayQueue(gameId).filter(p => p.id !== id);
    localStorage.setItem(QUEUE_KEY(gameId), JSON.stringify(queue));
}

async function flushPlayQueue(gameId: string, onProgress: (n: number) => void) {
    const queue = getPlayQueue(gameId);
    if (!queue.length) return;
    for (const play of queue) {
        try {
            if (gameSocket?.connected) {
                // Preferir socket cuando está disponible — más confiable que HTTP en reconexión
                const timestamp = Date.now().toString();
                gameSocket.emit('registerPlay', {
                    gameId,
                    playInfo: { ...play.playInfo, playbackId: timestamp },
                    fullState: null,
                });
                await new Promise(resolve => setTimeout(resolve, 300)); // esperar que el backend procese
            } else {
                await api.post(`/games/${gameId}/plays`, play.playInfo);
            }
            removePlayFromQueue(gameId, play.id);
            onProgress(getPlayQueue(gameId).length);
        } catch {
            break; // Sigue sin conexión, parar
        }
    }
}

const emitPlayToBackend = async (get: () => GameState, resultStr: string, runsScored: number = 0, outsOffensive: number = 0, currentBatterIdOverride: string | null = null, inningOverride: number | null = null, halfOverride: string | null = null, outsBeforeOverride: number | null = null, silent: boolean = false) => {
    const stateSnapshot = get();
    if (!stateSnapshot.gameId) return;

    const activeBatterId = currentBatterIdOverride || stateSnapshot.currentBatterId;
    const defensiveLineup = stateSnapshot.half === 'top' ? stateSnapshot.homeLineup : stateSnapshot.awayLineup;
    const currentPitcher = defensiveLineup.find((item: LineupItem) => item.position === "1" || item.position === "P");
    const activePitcherId = currentPitcher ? currentPitcher.playerId : null;

    // Contexto sabermérico: se captura justo antes de que el turno termine
    const b = stateSnapshot.bases;
    const runnersOnBase = `${b.first ? '1' : '0'}${b.second ? '1' : '0'}${b.third ? '1' : '0'}`;
    const ballsOnPlay = stateSnapshot.balls;
    const strikesOnPlay = stateSnapshot.strikes;
    const paSwings = stateSnapshot.paSwings;
    const paContacts = stateSnapshot.paContacts;
    const paPitches = stateSnapshot.paPitches;

    const payloadInning = inningOverride !== null ? inningOverride : stateSnapshot.inning;
    const payloadHalf = halfOverride !== null ? halfOverride : stateSnapshot.half;
    const payloadOutsBefore = outsBeforeOverride !== null ? outsBeforeOverride : Math.max(0, stateSnapshot.outs - outsOffensive);
    
    // Si es un RUN_SCORED de un corredor marcado como out fantasma → carrera sucia
    if (resultStr.startsWith('RUN_SCORED') && activeBatterId && stateSnapshot.phantomOutCandidates.includes(activeBatterId)) {
        resultStr = resultStr.includes('UNEARNED') ? resultStr : resultStr + '|UNEARNED';
    }

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
                playbackId: timestamp,
                // Contexto sabermérico
                runners_on_base: runnersOnBase,
                balls_on_play: ballsOnPlay,
                strikes_on_play: strikesOnPlay,
                swings_in_pa: paSwings,
                contacts_in_pa: paContacts,
                pitches_in_pa: paPitches,
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
        // Socket no conectado — intentar HTTP, si falla encolar para reintento
        const playPayload = {
            inning: payloadInning, half: payloadHalf,
            outs_before_play: payloadOutsBefore, result: resultStr,
            rbi: runsScored, runs_scored: runsScored, outs_recorded: outsOffensive,
            batter_id: activeBatterId, pitcher_id: activePitcherId,
            runners_on_base: runnersOnBase,
            balls_on_play: ballsOnPlay,
            strikes_on_play: strikesOnPlay,
            swings_in_pa: paSwings,
            contacts_in_pa: paContacts,
            pitches_in_pa: paPitches,
        };
        const queueId = addPlayToQueue(stateSnapshot.gameId, playPayload);
        useGameStore.setState({ pendingPlays: getPlayQueue(stateSnapshot.gameId).length });
        try {
            await api.post(`/games/${stateSnapshot.gameId}/plays`, playPayload);
            removePlayFromQueue(stateSnapshot.gameId, queueId);
            useGameStore.setState({ pendingPlays: getPlayQueue(stateSnapshot.gameId).length });
        } catch (e) {
            console.warn('[Queue] Sin conexión — jugada guardada en cola, se enviará al reconectar.');
            // Si el socket se reconectó entre tanto, flushar ahora mismo
            if (gameSocket?.connected && stateSnapshot.gameId) {
                const gid = stateSnapshot.gameId;
                flushPlayQueue(gid, (remaining) => {
                    useGameStore.setState({ pendingPlays: remaining });
                }).then(() => {
                    if (gameSocket?.connected) syncStateToBackend(get);
                });
            }
        }
    }
};

const syncStateToBackend = (get: () => GameState) => {
    const state = get();
    if (!state.gameId) return;

    if (gameSocket?.connected) {
        gameSocket.emit('syncState', {
            gameId: state.gameId,
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
            homeTeamLogoUrl: null,
            awayTeamLogoUrl: null,
            homeTeamShort: 'HOM',
            awayTeamShort: 'AWA',
            tournamentName: '',
            playbackId: null,
            plays: [],
            playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
            homeLineup: [],
            awayLineup: [],
            homeBattingOrder: [],
            awayBattingOrder: [],
            homeBatterIndex: 0,
            awayBatterIndex: 0,
            history: [],
            winningPitcher: null,
            losingPitcher: null,
            savePitcher: null,
            mvpBatter1: null,
            mvpBatter2: null,
            status: null,
            maxInnings: 7,
            shouldPromptEndGame: false,
            facebookStreamUrl: null,
            streamStatus: 'offline',
            pendingPlays: 0,
            socketConnected: false,
            phantomOutCandidates: [],
            paSwings: 0,
            paContacts: 0,
            paPitches: 0,

            clearEndGamePrompt: () => set({ shouldPromptEndGame: false }),

            markPhantomOut: (runnerIds: string[]) => {
                set(s => ({ phantomOutCandidates: [...new Set([...s.phantomOutCandidates, ...runnerIds])] }));
            },

            setGameId: (id: string) => {
                if (get().gameId === id) return;
                set({
                    gameId: id,
                    homeTeamId: null,
                    awayTeamId: null,
                    homeTeamName: 'HOME',
                    awayTeamName: 'AWAY',
                    homeTeamLogoUrl: null,
                    awayTeamLogoUrl: null,
                    homeTeamShort: 'HOM',
                    awayTeamShort: 'AWA',
                    tournamentName: '',
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
                    homeBattingOrder: [],
                    awayBattingOrder: [],
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
                    awayLineup: [...state.awayLineup],
                    homeBattingOrder: [...state.homeBattingOrder],
                    awayBattingOrder: [...state.awayBattingOrder],
                    homeBatterIndex: state.homeBatterIndex,
                    awayBatterIndex: state.awayBatterIndex,
                    homeTeamName: state.homeTeamName, awayTeamName: state.awayTeamName,
                    homeTeamLogoUrl: state.homeTeamLogoUrl, awayTeamLogoUrl: state.awayTeamLogoUrl,
                    homeTeamShort: state.homeTeamShort, awayTeamShort: state.awayTeamShort,
                    tournamentName: state.tournamentName,
                    paSwings: state.paSwings, paContacts: state.paContacts, paPitches: state.paPitches,
                };
                // Resetear el tracking de IDs de la nueva acción que está por comenzar
                currentActionPlayIds = [];
                set((s) => ({ history: [...s.history.slice(-20), snapshot] }));
            },

            undo: async () => {
                const { history, gameId } = get();
                if (history.length === 0) return;

                // Eliminar de DB las jugadas de la última acción
                if (currentActionPlayIds.length > 0 && gameId) {
                    try {
                        await api.delete(`/games/${gameId}/plays`, { data: { playIds: currentActionPlayIds } });
                        console.log(`[Undo] Eliminadas ${currentActionPlayIds.length} jugada(s) de DB.`);
                    } catch (e) {
                        console.warn('[Undo] Error eliminando jugadas de DB:', e);
                    }
                    currentActionPlayIds = [];
                }

                const previousState = history[history.length - 1];
                set({ ...previousState, history: history.slice(0, -1) });
                syncStateToBackend(get);
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

                        // Excluir del lineup OFENSIVO (batting order) a jugadores cubiertos por DH (son solo defensivos / FLEX)
                        const filterBattingLineup = (lp: LineupItem[]) => {
                            const covered = new Set(
                                lp.filter(l => l.position === 'DH' && l.dhForPosition).map(l => l.dhForPosition as string)
                            );
                            if (!covered.size) return lp;
                            const normPos = (p: string) => p?.toUpperCase().trim() === '1' ? 'P' : p?.toUpperCase().trim();
                            return lp.filter(l => l.position === 'DH' || !covered.has(normPos(l.position)));
                        };

                        // Lineup COMPLETO (incluye FLEX): para Campo, Alineaciones, pitcher lookup
                        const homeFullLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.home_team_id && l.is_active !== false) || []).sort((a: any,b: any) => a.battingOrder - b.battingOrder);
                        const awayFullLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.away_team_id && l.is_active !== false) || []).sort((a: any,b: any) => a.battingOrder - b.battingOrder);

                        // Batting order FILTRADO (excluye FLEX): para rotación de bateadores
                        const homeBatLp = filterBattingLineup(homeFullLp);
                        const awayBatLp = filterBattingLineup(awayFullLp);

                        set({
                            homeLineup: homeFullLp,    // Full for Field/Alineaciones
                            awayLineup: awayFullLp,    // Full for Field/Alineaciones
                            homeBattingOrder: homeBatLp, // Filtered for batter rotation
                            awayBattingOrder: awayBatLp, // Filtered for batter rotation
                            homeTeamId: gameData.home_team_id,
                            awayTeamId: gameData.away_team_id,
                            homeTeamName: gameData.home_team_name || 'HOME',
                            awayTeamName: gameData.away_team_name || 'AWAY',
                            homeTeamLogoUrl: gameData.home_team_logo || null,
                            awayTeamLogoUrl: gameData.away_team_logo || null,
                            homeTeamShort: gameData.home_team_short || 'HOM',
                            awayTeamShort: gameData.away_team_short || 'AWA',
                            tournamentName: gameData.tournament_name || '',
                            playbackId: gameData.playback_id,
                            plays: gameData.plays || []
                        });

                        if (gameData.plays && gameData.plays.length > 0) {
                            const plays = gameData.plays.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            // Solo contar plays que son turno al bate real (excluir ADV, RUN_SCORED, SB, etc.)
                            const NON_PA_CODES = ['SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED', 'RUNNER_OUT', 'UNDO'];
                            const isPAPlay = (p: any) => {
                                const code = (p.result || '').split('|')[0].toUpperCase().trim();
                                return !NON_PA_CODES.some(x => code.startsWith(x));
                            };
                            const awayPA = plays.filter((p: any) => p.half === 'top' && isPAPlay(p)).length;
                            const homePA = plays.filter((p: any) => p.half === 'bottom' && isPAPlay(p)).length;
                            // Use BATTING ORDER (without FLEX) for batter index
                            const awayIdx = awayBatLp.length > 0 ? awayPA % awayBatLp.length : 0;
                            const homeIdx = homeBatLp.length > 0 ? homePA % homeBatLp.length : 0;
                            const activeHalf = gameData.half || 'top';
                            // Current batter comes from BATTING ORDER
                            const currentBatOrder = activeHalf === 'top' ? awayBatLp : homeBatLp;
                            // Pitcher comes from FULL lineup (includes FLEX)
                            const defensiveFullLineup = activeHalf === 'top' ? homeFullLp : awayFullLp;
                            const currentIndex = activeHalf === 'top' ? awayIdx : homeIdx;

                            const pitcher = defensiveFullLineup.find((p: any) => p.position === 'P' || p.position === '1');
                            const pName = pitcher?.player ? `${pitcher.player.firstName} ${pitcher.player.lastName}` : 'Esperando Pitcher...';

                            set({
                                inning: gameData.current_inning || 1, half: activeHalf,
                                homeScore: gameData.home_score || 0, awayScore: gameData.away_score || 0,
                                awayBatterIndex: awayIdx, homeBatterIndex: homeIdx,
                                currentBatter: currentBatOrder[currentIndex]?.player ? `${currentBatOrder[currentIndex].player.firstName} ${currentBatOrder[currentIndex].player.lastName}` : 'Desconocido',
                                currentBatterId: currentBatOrder[currentIndex]?.playerId || null,
                                currentPitcher: pName,
                                winningPitcher: gameData.winningPitcher,
                                losingPitcher: gameData.losingPitcher,
                                savePitcher: gameData.savePitcher,
                                mvpBatter1: gameData.mvpBatter1,
                                mvpBatter2: gameData.mvpBatter2,
                                status: gameData.status,
                                playLogs: plays.map((p: any) => {
                                    const logText = p.description || ((p.result || '').includes('|') ? p.result.split('|')[1] : p.result);
                                    return { text: `Inning ${p.inning}: ${logText}` };
                                }).reverse()
                            });
                        } else {
                            // No hay jugadas aún, inicializar con el primer bateador
                            const activeHalf = gameData.half || 'top';
                            // Current batter from BATTING ORDER
                            const currentBatOrder = activeHalf === 'top' ? awayBatLp : homeBatLp;
                            // Pitcher from FULL lineup
                            const defensiveFullLineup = activeHalf === 'top' ? homeFullLp : awayFullLp;
                            
                            const pitcher = defensiveFullLineup.find((p: any) => p.position === 'P' || p.position === '1');
                            const pName = pitcher?.player ? `${pitcher.player.firstName} ${pitcher.player.lastName}` : 'Esperando Pitcher...';

                            set({
                                inning: gameData.current_inning || 1, half: activeHalf,
                                homeScore: gameData.home_score || 0, awayScore: gameData.away_score || 0,
                                awayBatterIndex: 0, homeBatterIndex: 0,
                                currentBatter: currentBatOrder[0]?.player ? `${currentBatOrder[0].player.firstName} ${currentBatOrder[0].player.lastName}` : 'Esperando Lineup',
                                currentBatterId: currentBatOrder[0]?.playerId || null,
                                currentPitcher: pName,
                                winningPitcher: gameData.winningPitcher,
                                losingPitcher: gameData.losingPitcher,
                                savePitcher: gameData.savePitcher,
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

                // Restaurar badge si hay jugadas en cola de sesión anterior
                const existingQueue = getPlayQueue(gameId);
                if (existingQueue.length > 0) {
                    useGameStore.setState({ pendingPlays: existingQueue.length });
                    console.log(`[Queue] Cola restaurada: ${existingQueue.length} jugada(s) pendiente(s).`);
                }

                const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                gameSocket = io(`${backendUrl}/live_games`, {
                    transports: ['websocket'],
                    withCredentials: true,
                    reconnectionAttempts: 8,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 15000,
                });

                gameSocket.on('connect', async () => {
                    useGameStore.setState({ socketConnected: true });
                    console.log(`Socket connected: game-${gameId}`);
                    gameSocket!.emit('joinGame', gameId);
                    const { gameId: gid } = get();
                    if (!gid) return;
                    // Vaciar cola de jugadas pendientes
                    const pending = getPlayQueue(gid);
                    if (pending.length > 0) {
                        console.log(`[Queue] Reconectado — enviando ${pending.length} jugada(s) pendiente(s)...`);
                        await flushPlayQueue(gid, (remaining) => {
                            useGameStore.setState({ pendingPlays: remaining });
                        });
                    }
                    // Pedir el estado completo del backend PRIMERO.
                    // Si el backend ya tiene un estado activo (bases, outs, etc.), lo usamos.
                    // Solo si el backend no tiene nada, el handler de fullStateSync sube el estado local.
                    gameSocket!.emit('requestFullSync', { gameId: gid });
                });

                gameSocket.on('disconnect', () => {
                    console.log('Socket disconnected');
                    useGameStore.setState({ socketConnected: false, pendingPlays: getPlayQueue(get().gameId || '').length });
                    // Importar toast dinámicamente para evitar dependencia circular con módulos de servidor
                    if (typeof window !== 'undefined') {
                        import('sonner').then(({ toast }) => toast.warning('Conexión perdida. Reconectando...'));
                    }
                });

                // Si el backend rechaza por token expirado, reconectar con token fresco (una sola vez)
                let authRetried = false;
                gameSocket.on('exception', async (err: any) => {
                    const msg = typeof err === 'string' ? err : err?.message || '';
                    if ((msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('auth')) && !authRetried) {
                        authRetried = true;
                        console.warn('[Socket] Sesi?n expirada ? intentando refresh y reconexi?n...');
                        try {
                            await api.post('/auth/refresh', {});
                            gameSocket?.disconnect().connect();
                        } catch (refreshError) {
                            console.warn('[Socket] No se pudo refrescar la sesi?n del socket:', refreshError);
                        }
                    }
                });

                // También vaciar cola cuando el navegador recupera conexión a internet
                const handleOnline = async () => {
                    const { gameId: gid } = get();
                    if (!gid) return;
                    if (getPlayQueue(gid).length === 0) return;
                    console.log('[Queue] Conexión restaurada — vaciando cola...');
                    await flushPlayQueue(gid, (remaining) => {
                        useGameStore.setState({ pendingPlays: remaining });
                    });
                };
                window.addEventListener('online', handleOnline);

                // Recibir el ID del play guardado en DB para soporte de undo
                gameSocket.on('play_registered', (data: { playId: string }) => {
                    if (data?.playId) currentActionPlayIds.push(data.playId);
                });

                // Fallback: si el backend no pudo guardar la jugada en DB, reintentamos vía HTTP
                gameSocket.on('play_db_error', async (data: { playInfo: any }) => {
                    console.warn('[GameStore] play_db_error recibido, reintentando vía HTTP...');
                    const { gameId: gid } = get();
                    if (!gid) return;
                    const pi = data.playInfo;
                    try {
                        await api.post(`/games/${gid}/plays`, {
                            inning: pi.inning, half: pi.half,
                            outs_before_play: pi.outs_before_play ?? 0,
                            result: pi.result,
                            rbi: pi.rbi ?? 0,
                            runs_scored: pi.runs_scored ?? 0,
                            outs_recorded: pi.outs_recorded ?? 0,
                            batter_id: pi.batter_id,
                            pitcher_id: pi.pitcher_id,
                        });
                        console.log('[GameStore] Jugada recuperada vía HTTP.');
                    } catch (e) {
                        console.error('[GameStore] Fallback HTTP también falló:', e);
                    }
                });

                gameSocket.on('streamStatusUpdate', (data: { facebookStreamUrl: string | null; streamStatus: string }) => {
                    set({ facebookStreamUrl: data.facebookStreamUrl, streamStatus: data.streamStatus });
                });

                // Respuesta al requestFullSync — reemplazar estado completo incondicionalmente
                gameSocket.on('fullStateSync', (data: any) => {
                    const fs = data?.fullState ?? data;
                    if (!fs) {
                        // El backend no tiene estado activo para este juego.
                        // Subimos el estado local (cargado vía HTTP) para que los demás clientes lo reciban.
                        console.log('[GameStore] fullStateSync: sin estado en backend, sincronizando estado local...');
                        syncStateToBackend(get);
                        return;
                    }
                    console.log('[GameStore] fullStateSync received');
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
                        playbackId: fs.playbackId ? String(fs.playbackId) : get().playbackId,
                    });
                });

                // Listen for game state updates from the backend (broadcast by the scorekeeper)
                gameSocket.on('gameStateUpdate', (data: any) => {
                    const fs = data?.fullState;
                    if (!fs) return;

                    // Only update if the incoming state is newer than our local state
                    const currentPlaybackId = Number(get().playbackId) || 0;
                    const newPlaybackId = Number(fs.playbackId) || 0;
                    const currentLogCount = get().playLogs.length;
                    const newLogCount = (fs.playLogs ?? []).length;

                    // Rechazar si es más viejo por playbackId O por conteo de jugadas
                    if (currentPlaybackId !== 0 && newPlaybackId <= currentPlaybackId && newLogCount <= currentLogCount) {
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
                        // Nunca reducir el historial — si el update tiene menos jugadas, conservar el local
                        playLogs: (fs.playLogs && fs.playLogs.length >= currentLogCount) ? fs.playLogs : get().playLogs,
                        playbackId: newPlaybackId > currentPlaybackId ? String(newPlaybackId) : get().playbackId,
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
                // Resetear contadores del turno al cambiar de bateador
                set({ paSwings: 0, paContacts: 0, paPitches: 0 });
                // Use BATTING ORDER (excludes FLEX) for rotation — FLEX never bats
                if (state.half === 'top') {
                    const nextIndex = (state.awayBatterIndex + 1) % (state.awayBattingOrder.length || 1);
                    const item = state.awayBattingOrder[nextIndex];
                    set({ awayBatterIndex: nextIndex, currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                } else {
                    const nextIndex = (state.homeBatterIndex + 1) % (state.homeBattingOrder.length || 1);
                    const item = state.homeBattingOrder[nextIndex];
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
                    phantomOutCandidates: [],
                    paSwings: 0, paContacts: 0, paPitches: 0,
                    playLogs: [{ text: '', inningString: `${dividerSymbol} ${newInning}` }, ...s.playLogs],
                }));

                // Update current batter to whoever is up NEXT in the NEW half without incrementing their index!
                // Use BATTING ORDER for batter, FULL LINEUP for pitcher
                const stateAfterHalfChange = get();
                if (newHalf === 'top') {
                    const idx = stateAfterHalfChange.awayBatterIndex;
                    const item = stateAfterHalfChange.awayBattingOrder[idx];
                    set({ currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                } else {
                    const idx = stateAfterHalfChange.homeBatterIndex;
                    const item = stateAfterHalfChange.homeBattingOrder[idx];
                    set({ currentBatter: item?.player ? `${item.player.firstName} ${item.player.lastName}` : 'Bateador', currentBatterId: item?.playerId || null });
                }
                // Update pitcher from FULL lineup (includes FLEX)
                const stateForPitcher = get();
                const defensiveFullLineup = newHalf === 'top' ? stateForPitcher.homeLineup : stateForPitcher.awayLineup;
                const pitcher = defensiveFullLineup.find((p: LineupItem) => p.position === 'P' || p.position === '1');
                if (pitcher?.player) {
                    set({ currentPitcher: `${pitcher.player.firstName} ${pitcher.player.lastName}` });
                }
            },

            addBall: () => {
                get().saveHistory();
                const balls = get().balls + 1;
                set(s => ({ paPitches: s.paPitches + 1 }));
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
                set(s => ({ paPitches: s.paPitches + 1 }));
                if (strikes >= 3) {
                    const batter = get().currentBatter;
                    get().addOut(`KS|${batter} es Ponchado Tirándole (K)`);
                }
                else {
                    set({ strikes });
                    syncStateToBackend(get);
                }
            },

            // Strike tirándole y fallando: cuenta como strike Y como swing (whiff)
            addSwing: () => {
                get().saveHistory();
                const strikes = get().strikes + 1;
                set(s => ({ paPitches: s.paPitches + 1, paSwings: s.paSwings + 1 }));
                if (strikes >= 3) {
                    const batter = get().currentBatter;
                    get().addOut(`KS|${batter} es Ponchado Tirándole (K)`);
                } else {
                    set({ strikes });
                    syncStateToBackend(get);
                }
            },

            addFoul: () => {
                // Foul = swing con contacto: siempre suma pitcheo y contacto, solo suma strike si hay < 2
                set(s => ({ paPitches: s.paPitches + 1, paContacts: s.paContacts + 1 }));
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
                
                // 1. Update local state temporarly so `nextState.outs` inside emitPlayToBackend reads the updated value
                set({ outs: totalOuts, balls: 0, strikes: 0 });
                get().cycleBatter();
                
                // 2. Emit the play (will broadcast fullState with outs = totalOuts)
                if (emitPlay) {
                    emitPlayToBackend(get, customLogText || "OUT", 0, 1, activeBatterId, state.inning, state.half, state.outs);
                }

                // 3. Reset inning if 3 outs (this creates a new log divider, allowing the syncState broadcast to reach OBS properly)
                if (totalOuts >= 3) {
                    get().nextHalfInning();
                    // Force a broadcast of the newly wiped clean inning so fans don't get stuck on "3 outs"
                    syncStateToBackend(get);
                } else {
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
                get().executeWildPitch();
            },

            executeWildPitch: () => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                let runs = 0;
                let scoredRunnerId: string | null = null;
                if (state.bases.third) { runs = 1; scoredRunnerId = state.baseIds.third; newBases.third = null; newBaseIds.third = null; }
                if (state.bases.second) { newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second; newBases.second = null; newBaseIds.second = null; }
                if (state.bases.first) { newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first; newBases.first = null; newBaseIds.first = null; }
                set({ bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                syncStateToBackend(get);
                if (scoredRunnerId) emitPlayToBackend(get, 'WP_RUN|Carrera por Wild Pitch', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                if (state.bases.second && newBaseIds.third) emitPlayToBackend(get, 'ADV|Avanza a 3ra por Wild Pitch', 0, 0, state.baseIds.second, state.inning, state.half, state.outs);
                if (state.bases.first && newBaseIds.second) emitPlayToBackend(get, 'ADV|Avanza a 2da por Wild Pitch', 0, 0, state.baseIds.first, state.inning, state.half, state.outs);
            },

            executePassedBall: () => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                let runs = 0;
                let scoredRunnerId: string | null = null;
                if (state.bases.third) { runs = 1; scoredRunnerId = state.baseIds.third; newBases.third = null; newBaseIds.third = null; }
                if (state.bases.second) { newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second; newBases.second = null; newBaseIds.second = null; }
                if (state.bases.first) { newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first; newBases.first = null; newBaseIds.first = null; }
                set({ bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                syncStateToBackend(get);
                // PB_RUN marks the run as UNEARNED for the pitcher (catcher's fault)
                if (scoredRunnerId) emitPlayToBackend(get, 'PB_RUN|Carrera por Passed Ball (Imbateable)', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                if (state.bases.second && newBaseIds.third) emitPlayToBackend(get, 'ADV|Avanza a 3ra por Passed Ball', 0, 0, state.baseIds.second, state.inning, state.half, state.outs);
                if (state.bases.first && newBaseIds.second) emitPlayToBackend(get, 'ADV|Avanza a 2da por Passed Ball', 0, 0, state.baseIds.first, state.inning, state.half, state.outs);
            },

            executeBalk: () => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                let runs = 0;
                let scoredRunnerId: string | null = null;
                if (state.bases.third) { runs = 1; scoredRunnerId = state.baseIds.third; newBases.third = null; newBaseIds.third = null; }
                if (state.bases.second) { newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second; newBases.second = null; newBaseIds.second = null; }
                if (state.bases.first) { newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first; newBases.first = null; newBaseIds.first = null; }
                set({ bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                syncStateToBackend(get);
                // BK_RUN is earned (balk = pitcher's fault)
                if (scoredRunnerId) emitPlayToBackend(get, 'BK_RUN|Carrera por Balk', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                if (state.bases.second && newBaseIds.third) emitPlayToBackend(get, 'ADV|Avanza a 3ra por Balk', 0, 0, state.baseIds.second, state.inning, state.half, state.outs);
                if (state.bases.first && newBaseIds.second) emitPlayToBackend(get, 'ADV|Avanza a 2da por Balk', 0, 0, state.baseIds.first, state.inning, state.half, state.outs);
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

            executeSacrifice: async (type, dests) => {
                get().saveHistory();
                const state = get();
                const activeId = state.currentBatterId;
                
                let newBases = { ...state.bases };
                let newBaseIds = { ...state.baseIds };
                let runs = 0;
                let outsOnPlay = 1; // Batter is definitely OUT on a valid sacrifice
                
                let scoredRunnerIds: string[] = [];
                let outRunnerIds: string[] = [];
                let advRunnerIds: string[] = [];
                let descSuffix = '';

                // If dests provided (from modal)
                if (dests) {
                    newBases = { first: null, second: null, third: null };
                    newBaseIds = { first: null, second: null, third: null };
                    
                    const currentRunners = [
                        ...(state.bases.third ? [{ key:'third', name: state.bases.third, id: state.baseIds.third, startBase: '3B' }] : []),
                        ...(state.bases.second ? [{ key:'second', name: state.bases.second, id: state.baseIds.second, startBase: '2B' }] : []),
                        ...(state.bases.first ? [{ key:'first', name: state.bases.first, id: state.baseIds.first, startBase: '1B' }] : []),
                    ];

                    currentRunners.forEach(r => {
                        const dest = dests[r.key];
                        if (dest === 'home') {
                            runs++;
                            if (r.id) scoredRunnerIds.push(r.id);
                            descSuffix += ` (Anota de ${r.startBase})`;
                        } else if (dest === '3B') {
                            newBases.third = r.name; newBaseIds.third = r.id;
                            if (r.startBase !== '3B' && r.id) advRunnerIds.push(r.id);
                        } else if (dest === '2B') {
                            newBases.second = r.name; newBaseIds.second = r.id;
                            if (r.startBase !== '2B' && r.id) advRunnerIds.push(r.id);
                        } else if (dest === '1B') {
                            newBases.first = r.name; newBaseIds.first = r.id;
                        } else if (dest === 'out') {
                            outsOnPlay++;
                            if (r.id) outRunnerIds.push(r.id);
                            descSuffix += ` (Out final ${r.name})`;
                        }
                    });
                } else {
                    // Fallback to legacy behaviour
                    if (state.bases.third) {
                        runs = 1;
                        if (state.baseIds.third) scoredRunnerIds.push(state.baseIds.third);
                        newBases.third = null; newBaseIds.third = null;
                        descSuffix += ` (Anota de 3B)`;
                    }
                    if (type === 'bunt') {
                        if (state.bases.second && !newBases.third) {
                            newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
                            newBases.second = null; newBaseIds.second = null;
                            if (state.baseIds.second) advRunnerIds.push(state.baseIds.second);
                        }
                        if (state.bases.first && !newBases.second) {
                            newBases.second = state.bases.first; newBaseIds.second = state.baseIds.first;
                            newBases.first = null; newBaseIds.first = null;
                            if (state.baseIds.first) advRunnerIds.push(state.baseIds.first);
                        }
                    }
                }

                const totalOuts = state.outs + outsOnPlay;
                const res = type === 'fly' ? `SF|Fly de Sacrificio${descSuffix}` : `SH|Toque de Sacrificio${descSuffix}`;
                
                let currentOutsInPlay = state.outs;
                // 1. Emit runner outs (silent)
                for (const runnerId of outRunnerIds) {
                    await emitPlayToBackend(get, `RUNNER_OUT|Out en intento de avance`, 0, 1, runnerId, state.inning, state.half, currentOutsInPlay, true);
                    currentOutsInPlay++;
                }

                // 2. Emit batter play
                await emitPlayToBackend(get, res, runs, 1, activeId, state.inning, state.half, currentOutsInPlay);
                currentOutsInPlay++;
                
                // 3. Emit runs and advances
                for (const runnerId of scoredRunnerIds) {
                    await emitPlayToBackend(get, 'RUN_SCORED|Anota por Sacrificio', 1, 0, runnerId, state.inning, state.half, currentOutsInPlay, true);
                }
                for (const runnerId of advRunnerIds) {
                    await emitPlayToBackend(get, 'ADV|Avanza por Sacrificio', 0, 0, runnerId, state.inning, state.half, currentOutsInPlay, true);
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
            },

            registerCustomPlay: (desc) => {
                get().saveHistory();
                emitPlayToBackend(get, desc, 0, 0, get().currentBatterId);
            },

            // ─── HBP: Hit By Pitch ──────────────────────────────────────
            registerHBP: () => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                let runs = 0;
                let scoredRunnerId: string | null = null;
                // Same logic as BB: push runners if forced
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
                emitPlayToBackend(get, `HBP|${batterName} es Golpeado por Lanzamiento`, runs, 0, cid);
                if (scoredRunnerId) {
                    emitPlayToBackend(get, 'RUN_SCORED|Corredor anota por HBP', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                }
            },

            // ─── IBB: Intentional Walk ──────────────────────────────────
            registerIBB: () => {
                get().saveHistory();
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
                emitPlayToBackend(get, `IBB|${batterName} recibe Base Intencional`, runs, 0, cid);
                if (scoredRunnerId) {
                    emitPlayToBackend(get, 'RUN_SCORED|Corredor anota por IBB', 1, 0, scoredRunnerId, state.inning, state.half, state.outs);
                }
            },

            // ─── KWP: Dropped Third Strike (bateador llega a 1ra) ───────
            registerDroppedThirdStrike: () => {
                get().saveHistory();
                const state = get();
                const newBases = { ...state.bases };
                const newBaseIds = { ...state.baseIds };
                // Only allowed if first base is empty OR there are 2 outs
                // Batter reaches first, count as K for pitcher but batter on base
                newBases.first = state.currentBatter;
                newBaseIds.first = state.currentBatterId;
                set({ balls: 0, strikes: 0, bases: newBases, baseIds: newBaseIds });
                const cid = state.currentBatterId;
                const batterName = state.currentBatter;
                get().cycleBatter();
                emitPlayToBackend(get, `KWP|${batterName} Ponchado pero llega a 1ra (Dropped 3rd Strike)`, 0, 0, cid);
                syncStateToBackend(get);
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
