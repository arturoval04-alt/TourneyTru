/**
 * obsStore — Estado global de la conexión OBS WebSocket.
 * Usa obs-websocket-js v5 (protocolo OBS WS 5.x).
 *
 * Persiste credenciales en localStorage para reconectar
 * automáticamente entre páginas (gamescheduled ↔ gamecast).
 */

import { create } from 'zustand';
import OBSWebSocket from 'obs-websocket-js';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type OBSConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBSCredentials {
    host: string;   // ej. "localhost" o "192.168.1.x"
    port: number;   // por defecto 4455
    password: string;
}

export interface OBSSceneItem {
    sceneItemId: number;
    sourceName: string;
    sceneItemEnabled: boolean;
}

export interface OBSStore {
    // Estado de conexión
    obs: OBSWebSocket | null;
    connectionState: OBSConnectionState;
    errorMessage: string | null;
    credentials: OBSCredentials | null;

    // Estado de OBS (post-conexión)
    currentScene: string | null;
    scenes: string[];
    sceneItems: OBSSceneItem[];  // items de la escena ScoreKeeper

    // Acciones
    connect: (creds: OBSCredentials) => Promise<void>;
    disconnect: () => Promise<void>;
    refreshSceneItems: () => Promise<void>;
    setSceneItemEnabled: (sourceName: string, enabled: boolean) => Promise<void>;
    setCurrentScene: (sceneName: string) => Promise<void>;
    injectScenes: (overlays: OverlayInjectConfig[]) => Promise<InjectionResult>;
}

export interface OverlayInjectConfig {
    id: string;
    name: string;
    url: string;
    width: number;
    height: number;
}

export interface InjectionResult {
    ok: boolean;
    created: string[];
    skipped: string[];
    error?: string;
}

const STORAGE_KEY = 'obs_credentials';
const SCENE_NAME = 'ScoreKeeper';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadCredentials(): OBSCredentials | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveCredentials(creds: OBSCredentials) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

function clearCredentials() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useOBSStore = create<OBSStore>((set, get) => ({
    obs: null,
    connectionState: 'disconnected',
    errorMessage: null,
    credentials: loadCredentials(),
    currentScene: null,
    scenes: [],
    sceneItems: [],

    connect: async (creds: OBSCredentials) => {
        const { obs: existing } = get();
        // Limpiar conexión previa si existe
        if (existing) {
            try { await existing.disconnect(); } catch { /* ignore */ }
        }

        const obs = new OBSWebSocket();
        set({ obs, connectionState: 'connecting', errorMessage: null, credentials: creds });

        try {
            await obs.connect(`ws://${creds.host}:${creds.port}`, creds.password || undefined);

            saveCredentials(creds);

            // Obtener escenas actuales
            const { scenes, currentProgramSceneName } = await obs.call('GetSceneList');
            const sceneNames = (scenes as { sceneName: string }[]).map(s => s.sceneName);

            set({
                connectionState: 'connected',
                scenes: sceneNames,
                currentScene: currentProgramSceneName,
            });

            // Cargar items de escena ScoreKeeper si existe
            if (sceneNames.includes(SCENE_NAME)) {
                await get().refreshSceneItems();
            }

            // Escuchar cambios de escena
            obs.on('CurrentProgramSceneChanged', ({ sceneName }) => {
                set({ currentScene: sceneName });
            });

            // Reconectar automáticamente si se cae la conexión
            obs.on('ConnectionClosed', () => {
                set({ connectionState: 'disconnected', sceneItems: [], currentScene: null });
            });

        } catch (err: any) {
            set({
                connectionState: 'error',
                errorMessage: err?.message ?? 'Error al conectar con OBS',
                obs: null,
            });
            clearCredentials();
            throw err;
        }
    },

    disconnect: async () => {
        const { obs } = get();
        if (obs) {
            try { await obs.disconnect(); } catch { /* ignore */ }
        }
        clearCredentials();
        set({
            obs: null,
            connectionState: 'disconnected',
            errorMessage: null,
            credentials: null,
            currentScene: null,
            scenes: [],
            sceneItems: [],
        });
    },

    refreshSceneItems: async () => {
        const { obs } = get();
        if (!obs) return;
        try {
            const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: SCENE_NAME });
            set({
                sceneItems: (sceneItems as any[]).map(item => ({
                    sceneItemId: item.sceneItemId,
                    sourceName: item.sourceName,
                    sceneItemEnabled: item.sceneItemEnabled,
                })),
            });
        } catch { /* escena no existe todavía */ }
    },

    setSceneItemEnabled: async (sourceName: string, enabled: boolean) => {
        const { obs, sceneItems } = get();
        if (!obs) return;
        const item = sceneItems.find(i => i.sourceName === sourceName);
        if (!item) return;
        await obs.call('SetSceneItemEnabled', {
            sceneName: SCENE_NAME,
            sceneItemId: item.sceneItemId,
            sceneItemEnabled: enabled,
        });
        set({
            sceneItems: sceneItems.map(i =>
                i.sourceName === sourceName ? { ...i, sceneItemEnabled: enabled } : i
            ),
        });
    },

    setCurrentScene: async (sceneName: string) => {
        const { obs } = get();
        if (!obs) return;
        await obs.call('SetCurrentProgramScene', { sceneName });
        set({ currentScene: sceneName });
    },

    injectScenes: async (overlays: OverlayInjectConfig[]): Promise<InjectionResult> => {
        const { obs, scenes } = get();
        if (!obs) return { ok: false, created: [], skipped: [], error: 'No conectado a OBS' };

        const created: string[] = [];
        const skipped: string[] = [];

        try {
            // 1. Crear escena "ScoreKeeper" si no existe
            if (!scenes.includes(SCENE_NAME)) {
                await obs.call('CreateScene', { sceneName: SCENE_NAME });
                set(s => ({ scenes: [...s.scenes, SCENE_NAME] }));
            }

            // 2. Obtener fuentes existentes en la escena
            const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: SCENE_NAME });
            const existingNames = new Set((sceneItems as any[]).map(i => i.sourceName));

            // 3. Crear cada overlay como Browser Source
            for (const overlay of overlays) {
                const inputName = `SK - ${overlay.name}`;

                if (existingNames.has(inputName)) {
                    skipped.push(inputName);
                    continue;
                }

                try {
                    // Crear la fuente Browser Source
                    await obs.call('CreateInput', {
                        sceneName: SCENE_NAME,
                        inputName,
                        inputKind: 'browser_source',
                        inputSettings: {
                            url: overlay.url,
                            width: overlay.width,
                            height: overlay.height,
                            css: 'body { background-color: transparent !important; margin: 0; padding: 0; overflow: hidden; }',
                            shutdown: true,              // Shutdown source when not visible
                            restart_when_active: true,   // Refresh when shown
                            fps_custom: false,
                            reroute_audio: false,
                        },
                        sceneItemEnabled: false, // Empieza oculto
                    });
                    created.push(inputName);
                } catch (itemErr: any) {
                    // Si ya existe el input en otra escena, solo añadirlo
                    if (itemErr?.message?.includes('already exists')) {
                        skipped.push(inputName);
                    } else {
                        console.warn(`No se pudo crear ${inputName}:`, itemErr);
                    }
                }
            }

            // 4. Recargar items de la escena
            await get().refreshSceneItems();

            return { ok: true, created, skipped };
        } catch (err: any) {
            return { ok: false, created, skipped, error: err?.message ?? 'Error desconocido' };
        }
    },
}));
