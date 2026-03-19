import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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
    playLogs: PlayLog[];
    homeLineup: LineupItem[];
    awayLineup: LineupItem[];
    homeBatterIndex: number;
    awayBatterIndex: number;
};

export interface GameState extends BaseState {
    gameId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    playbackId: string | null;

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
    executeAdvancedPlay: (newBases: { first: string | null, second: string | null, third: string | null }, newBaseIds: { first: string | null, second: string | null, third: string | null }, runsScored: number, outsRecorded: number, desc: string) => void;
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

    // Time Travel (Undo)
    history: BaseState[];
    saveHistory: () => void;
    undo: () => void;
}

let gameChannel: RealtimeChannel | null = null;

// Helper para enviar estado completo consolidado directamente a Supabase (Serverless)
const emitPlayToBackend = async (get: () => GameState, resultStr: string, runsScored: number = 0, outsOffensive: number = 0, currentBatterIdOverride: string | null = null, inningOverride: number | null = null, halfOverride: string | null = null, outsBeforeOverride: number | null = null) => {
    const stateSnapshot = get();
    if (!stateSnapshot.gameId) return;

    // 1. Identificar actores
    const activeBatterId = currentBatterIdOverride || stateSnapshot.currentBatterId;
    const defensiveLineup = stateSnapshot.half === 'top' ? stateSnapshot.homeLineup : stateSnapshot.awayLineup;
    const currentPitcher = defensiveLineup.find((item: LineupItem) => item.position === "1" || item.position === "P");
    const activePitcherId = currentPitcher ? currentPitcher.playerId : null;

    const payloadInning = inningOverride !== null ? inningOverride : stateSnapshot.inning;
    const payloadHalf = halfOverride !== null ? halfOverride : stateSnapshot.half;
    const payloadOutsBefore = outsBeforeOverride !== null ? outsBeforeOverride : Math.max(0, stateSnapshot.outs - outsOffensive);

    try {
        // En lugar de Socket.io, guardamos directo en la DB
        await supabase.from('plays').insert({
            game_id: stateSnapshot.gameId,
            inning: payloadInning,
            half: payloadHalf,
            outs_before_play: payloadOutsBefore,
            result: resultStr,
            rbi: runsScored, 
            runs_scored: runsScored,
            outs_recorded: outsOffensive,
            batter_id: activeBatterId,
            pitcher_id: activePitcherId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        // 2. Sincronizar estado global en la tabla Games
        const nextState = get(); 
        await supabase.from('games').update({
            home_score: nextState.homeScore,
            away_score: nextState.awayScore,
            current_inning: nextState.inning,
            half: nextState.half,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
        }).eq('id', stateSnapshot.gameId);

        // 3. Broadcast Realtime
        if (gameChannel) {
            gameChannel.send({
                type: 'broadcast',
                event: 'gameStateUpdate',
                payload: {
                    lastPlay: { result: resultStr, inning: payloadInning, half: payloadHalf },
                    fullState: {
                        inning: nextState.inning,
                        half: nextState.half,
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
                        playbackId: nextState.playbackId,
                        currentPitcher: (() => {
                            const defLineup = nextState.half === 'top' ? nextState.homeLineup : nextState.awayLineup;
                            const p = defLineup.find((item: LineupItem) => item.position === '1' || item.position === 'P');
                            return p?.player ? `${p.player.firstName} ${p.player.lastName}` : 'Pitcher Desconocido';
                        })(),
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error in serverless emitPlayToBackend:", error);
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
            gameId: null,
            homeTeamId: null,
            awayTeamId: null,
            playbackId: null,
            playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
            homeLineup: [],
            awayLineup: [],
            homeBatterIndex: 0,
            awayBatterIndex: 0,
            history: [],

            setGameId: (id: string) => {
                if (get().gameId === id) return;
                set({
                    gameId: id,
                    homeTeamId: null,
                    awayTeamId: null,
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
                    awayBatterIndex: 0,
                    homeBatterIndex: 0,
                    playLogs: [{ text: "Inicio del partido", inningString: "▲ 1" }],
                    history: [],
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
                    playLogs: [...state.playLogs], homeLineup: [...state.homeLineup],
                    awayLineup: [...state.awayLineup], homeBatterIndex: state.homeBatterIndex,
                    awayBatterIndex: state.awayBatterIndex,
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
                    const { data, error } = await supabase
                        .from('games')
                        .select(`
                            id, home_score, away_score, current_inning, half, 
                            home_team_id, away_team_id, playback_id,
                            lineups (*, player:players (*)),
                            plays (*)
                        `)
                        .eq('id', gameId)
                        .single();

                    if (error) throw error;
                    if (data) {
                        const gameData = data as any;
                        const sanitizeLineup = (lp: any[]) => lp.map(l => ({
                            playerId: l.player_id, teamId: l.team_id,
                            position: l.position, battingOrder: l.batting_order,
                            dhForPosition: l.dh_for_position,
                            player: l.player ? { id: l.player.id, firstName: l.player.first_name, lastName: l.player.last_name } : undefined
                        }));

                        const homeLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.home_team_id) || []).sort((a,b) => a.battingOrder - b.battingOrder);
                        const awayLp = sanitizeLineup(gameData.lineups?.filter((l: any) => l.team_id === gameData.away_team_id) || []).sort((a,b) => a.battingOrder - b.battingOrder);

                        set({
                            homeLineup: homeLp,
                            awayLineup: awayLp,
                            homeTeamId: gameData.home_team_id,
                            awayTeamId: gameData.away_team_id,
                            playbackId: gameData.playback_id
                        });

                        if (gameData.plays && gameData.plays.length > 0) {
                            const plays = gameData.plays.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                            const awayPA = plays.filter((p: any) => p.half === 'top').length;
                            const homePA = plays.filter((p: any) => p.half === 'bottom').length;
                            const awayIdx = awayLp.length > 0 ? awayPA % awayLp.length : 0;
                            const homeIdx = homeLp.length > 0 ? homePA % homeLp.length : 0;
                            const activeHalf = gameData.half || 'top';
                            const currentLineup = activeHalf === 'top' ? awayLp : homeLp;
                            const currentIndex = activeHalf === 'top' ? awayIdx : homeIdx;

                            set({
                                inning: gameData.current_inning || 1, half: activeHalf,
                                homeScore: gameData.home_score || 0, awayScore: gameData.away_score || 0,
                                awayBatterIndex: awayIdx, homeBatterIndex: homeIdx,
                                currentBatter: currentLineup[currentIndex]?.player ? `${currentLineup[currentIndex].player.firstName} ${currentLineup[currentIndex].player.lastName}` : 'Desconocido',
                                currentBatterId: currentLineup[currentIndex]?.playerId || null,
                                playLogs: plays.map((p: any) => ({ text: `Inning ${p.inning}: ${p.result}` })).reverse()
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
                if (gameChannel) gameChannel.unsubscribe();
                gameChannel = supabase.channel(`game-${gameId}`, { config: { broadcast: { self: false } } });
                gameChannel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') console.log(`Realtime subscribed: game-${gameId}`);
                });
            },

            disconnectSocket: () => {
                if (gameChannel) { gameChannel.unsubscribe(); gameChannel = null; }
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
                const { half, inning } = get();
                const newHalf = half === 'top' ? 'bottom' : 'top';
                const newInning = half === 'bottom' ? inning + 1 : inning;
                set({ outs: 0, balls: 0, strikes: 0, bases: { first: null, second: null, third: null }, baseIds: { first: null, second: null, third: null }, half: newHalf, inning: newInning });
                get().cycleBatter();
            },

            addBall: () => {
                get().saveHistory();
                const balls = get().balls + 1;
                if (balls >= 4) {
                    const state = get();
                    const newBases = { ...state.bases };
                    const newBaseIds = { ...state.baseIds };
                    let runs = 0;
                    if (state.bases.first && state.bases.second && state.bases.third) {
                        runs = 1; newBases.third = state.bases.second; newBaseIds.third = state.baseIds.second;
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
                    get().cycleBatter();
                    emitPlayToBackend(get, "BB", runs, 0, cid);
                } else set({ balls });
            },

            addStrike: () => {
                get().saveHistory();
                const strikes = get().strikes + 1;
                if (strikes >= 3) get().addOut(`${get().currentBatter} ponchado (K)`);
                else set({ strikes });
            },

            addFoul: () => { if (get().strikes < 2) set({ strikes: get().strikes + 1 }); },

            addOut: (customLogText, isGroundout, emitPlay = true) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + 1;
                const activeBatterId = state.currentBatterId;
                if (totalOuts >= 3) {
                    get().nextHalfInning();
                    if (emitPlay) emitPlayToBackend(get, customLogText || "OUT", 0, 1, activeBatterId);
                } else {
                    set({ outs: totalOuts, balls: 0, strikes: 0 });
                    get().cycleBatter();
                    if (emitPlay) emitPlayToBackend(get, customLogText || "OUT", 0, 1, activeBatterId);
                }
            },

            registerHit: (bases, customLogText) => {
                get().saveHistory();
                const state = get();
                const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };
                const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };
                let runs = 0;
                const activeId = state.currentBatterId;
                if (bases === 1) {
                    if (state.bases.third) runs++;
                    newBases.third = state.bases.second; newBases.second = state.bases.first; newBases.first = state.currentBatter;
                    newBaseIds.third = state.baseIds.second; newBaseIds.second = state.baseIds.first; newBaseIds.first = activeId;
                } else if (bases === 2) {
                    if (state.bases.third) runs++; if (state.bases.second) runs++;
                    newBases.third = state.bases.first; newBases.second = state.currentBatter;
                    newBaseIds.third = state.baseIds.first; newBaseIds.second = activeId;
                } else if (bases === 4) {
                    runs = 1 + (state.bases.first ? 1 : 0) + (state.bases.second ? 1 : 0) + (state.bases.third ? 1 : 0);
                }
                set({ balls: 0, strikes: 0, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                get().cycleBatter();
                emitPlayToBackend(get, customLogText || `H${bases}`, runs, 0, activeId);
            },

            executeAdvancedPlay: (newBases, newBaseIds, runs, outs, desc) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + outs;
                const activeId = state.currentBatterId;
                if (totalOuts >= 3) get().nextHalfInning();
                else set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                emitPlayToBackend(get, desc, runs, outs, activeId);
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
                if (totalOuts >= 3) get().nextHalfInning();
                else set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore });
                emitPlayToBackend(get, desc, runs, isOut ? 1 : 0, rid);
            },

            executeWildPitchOrPassedBall: (desc) => {
                get().saveHistory();
                get().addBall();
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
                if (totalOuts >= 3) get().nextHalfInning();
                else { set({ outs: totalOuts, bases: newBases, baseIds: newBaseIds }); get().cycleBatter(); }
                emitPlayToBackend(get, "FC", 0, 1, activeId);
            },

            executeSacrifice: (type) => {
                get().saveHistory();
                const state = get();
                const totalOuts = state.outs + 1;
                const activeId = state.currentBatterId;
                let runs = 0;
                if (state.bases.third) runs = 1;
                if (totalOuts >= 3) get().nextHalfInning();
                else { set({ outs: totalOuts, homeScore: state.half === 'bottom' ? state.homeScore + runs : state.homeScore, awayScore: state.half === 'top' ? state.awayScore + runs : state.awayScore }); get().cycleBatter(); }
                emitPlayToBackend(get, type === 'fly' ? 'SF' : 'SH', runs, 1, activeId);
            },

            registerCustomPlay: (desc) => {
                get().saveHistory();
                emitPlayToBackend(get, desc, 0, 0, get().currentBatterId);
            }
        }),
        {
            name: 'scorekeeper-storage',
            partialize: (state) => ({ gameId: state.gameId }),
        }
    )
);
