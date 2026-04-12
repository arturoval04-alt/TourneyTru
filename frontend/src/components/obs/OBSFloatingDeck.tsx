'use client';

import { useState } from 'react';
import { Eye, EyeOff, Tv2, Layers, RotateCcw, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';
import { useOBSStore } from '@/store/obsStore';
import { OVERLAYS } from '@/lib/overlaysConfig';

// Preset de posiciones (mismas que OBSStreamDeck)
const PRESET_LAYOUT: Record<string, { positionX: number; positionY: number; scaleX: number; scaleY: number }> = {
    'SK - Full Overlay':     { positionX: 0,    positionY: 0,    scaleX: 2,                   scaleY: 2 },
    'SK - Compact ESPN':     { positionX: 0,    positionY: 1686, scaleX: 2.633333444595337,    scaleY: 2.633333444595337 },
    'SK - Score Bar':        { positionX: 0,    positionY: 0,    scaleX: 1,                   scaleY: 1 },
    'SK - Campo':            { positionX: 691,  positionY: -329, scaleX: 3.0975000858306885,   scaleY: 3.097777843475342 },
    'SK - Bateador':         { positionX: 0,    positionY: 478,  scaleX: 2.4149999618530273,   scaleY: 2.4159998893737793 },
    'SK - Pitcher':          { positionX: 2577, positionY: 882,  scaleX: 1.9149999618530273,   scaleY: 1.9149999618530273 },
    'SK - Play-by-Play':     { positionX: 2724, positionY: 266,  scaleX: 1.8600000143051147,   scaleY: 1.8600000143051147 },
    'SK - On Deck':          { positionX: 2746, positionY: 1248, scaleX: 2.2791666984558105,   scaleY: 2.2799999713897705 },
    'SK - Lineup Visitante': { positionX: 2220, positionY: 0,    scaleX: 2.700000047683716,    scaleY: 2.700000047683716 },
    'SK - Lineup Local':     { positionX: 0,    positionY: 0,    scaleX: 2.698333263397217,    scaleY: 2.6987500190734863 },
    'SK - Duelo Pitchers':   { positionX: 350,  positionY: 458,  scaleX: 2.438281297683716,    scaleY: 2.437999963760376 },
};

const SCENE_NAME = 'ScoreKeeper';

export default function OBSFloatingDeck() {
    const {
        connectionState,
        sceneItems,
        scenes,
        currentScene,
        setSceneItemEnabled,
        setCurrentScene,
        refreshSceneItems,
    } = useOBSStore();

    const [open, setOpen] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);
    const [switching, setSwitching] = useState<string | null>(null);
    const [applyingPreset, setApplyingPreset] = useState(false);
    const [presetOk, setPresetOk] = useState<boolean | null>(null);

    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';

    // Si no hay credenciales guardadas Y no está conectado, no mostrar nada
    const hasCredentials = typeof window !== 'undefined' && !!localStorage.getItem('obs_credentials');
    if (!isConnected && !isConnecting && !hasCredentials) return null;

    const handleToggle = async (sourceName: string, currentEnabled: boolean) => {
        setToggling(sourceName);
        try {
            await setSceneItemEnabled(sourceName, !currentEnabled);
        } finally {
            setToggling(null);
        }
    };

    const handleSceneSwitch = async (sceneName: string) => {
        setSwitching(sceneName);
        try {
            await setCurrentScene(sceneName);
        } finally {
            setSwitching(null);
        }
    };

    const handleApplyPreset = async () => {
        const { obs } = useOBSStore.getState();
        if (!obs) return;
        setApplyingPreset(true);
        setPresetOk(null);
        try {
            for (const item of sceneItems) {
                const t = PRESET_LAYOUT[item.sourceName];
                if (!t) continue;
                await obs.call('SetSceneItemTransform', {
                    sceneName: SCENE_NAME,
                    sceneItemId: item.sceneItemId,
                    sceneItemTransform: { positionX: t.positionX, positionY: t.positionY, scaleX: t.scaleX, scaleY: t.scaleY },
                });
            }
            setPresetOk(true);
            setTimeout(() => setPresetOk(null), 2500);
        } catch {
            setPresetOk(false);
            setTimeout(() => setPresetOk(null), 2500);
        } finally {
            setApplyingPreset(false);
        }
    };

    const enabledCount = sceneItems.filter(i => i.sceneItemEnabled).length;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

            {/* Panel expandido */}
            {open && isConnected && (
                <div className="w-72 max-h-[80vh] overflow-y-auto bg-slate-950/95 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl shadow-2xl shadow-fuchsia-900/30 flex flex-col">
                    {/* Header del panel */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
                        <Layers className="w-4 h-4 text-fuchsia-400" />
                        <span className="text-xs font-black text-white uppercase tracking-widest flex-1">Stream Deck</span>
                        <button
                            onClick={refreshSceneItems}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* Overlays grid */}
                        <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Overlays</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {OVERLAYS.map(overlay => {
                                    const sourceName = `SK - ${overlay.name}`;
                                    const item = sceneItems.find(i => i.sourceName === sourceName);
                                    const isEnabled = item?.sceneItemEnabled ?? false;
                                    const isLoading = toggling === sourceName;
                                    const exists = !!item;

                                    return (
                                        <button
                                            key={overlay.id}
                                            onClick={() => exists && handleToggle(sourceName, isEnabled)}
                                            disabled={!exists || isLoading}
                                            title={!exists ? 'No inyectado — usa "Preparar OBS"' : overlay.name}
                                            className={`
                                                relative flex flex-col items-center gap-1 p-2 rounded-xl border text-center
                                                transition-all duration-150 select-none
                                                ${!exists
                                                    ? 'border-slate-800 bg-slate-900/30 opacity-30 cursor-not-allowed'
                                                    : isEnabled
                                                        ? 'border-fuchsia-500/60 bg-fuchsia-500/15 shadow-md shadow-fuchsia-900/20'
                                                        : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/40'
                                                }
                                            `}
                                        >
                                            {isEnabled && (
                                                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-fuchsia-400 shadow-[0_0_4px_#e879f9]" />
                                            )}
                                            <span className="text-base leading-none">{overlay.emoji}</span>
                                            <span className={`text-[8px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${isEnabled ? 'text-fuchsia-200' : 'text-slate-400'}`}>
                                                {overlay.name}
                                            </span>
                                            {isLoading
                                                ? <div className="w-2.5 h-2.5 border border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                                                : isEnabled
                                                    ? <Eye className="w-2.5 h-2.5 text-fuchsia-400" />
                                                    : <EyeOff className="w-2.5 h-2.5 text-slate-600" />
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Restaurar preset */}
                        <div className="border-t border-slate-800/60 pt-3">
                            <button
                                onClick={handleApplyPreset}
                                disabled={applyingPreset || sceneItems.length === 0}
                                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border disabled:opacity-40 disabled:cursor-not-allowed
                                    ${presetOk === true ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                    : presetOk === false ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                                    : 'bg-fuchsia-600/20 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/30'}
                                `}
                            >
                                {applyingPreset
                                    ? <><div className="w-3 h-3 border border-fuchsia-400 border-t-transparent rounded-full animate-spin" /> Aplicando...</>
                                    : presetOk === true ? '✓ Layout restaurado'
                                    : presetOk === false ? '✗ Error al aplicar'
                                    : <><RotateCcw className="w-3 h-3" /> Restaurar layout</>
                                }
                            </button>
                        </div>

                        {/* Cambio de escena */}
                        {scenes.length > 1 && (
                            <div className="border-t border-slate-800/60 pt-3">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Tv2 className="w-3 h-3" /> Escena activa
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {scenes.map(scene => {
                                        const isActive = currentScene === scene;
                                        const isLoading = switching === scene;
                                        return (
                                            <button
                                                key={scene}
                                                onClick={() => !isActive && handleSceneSwitch(scene)}
                                                disabled={isLoading}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border
                                                    ${isActive
                                                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                                                        : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700/50'
                                                    }`}
                                            >
                                                {isLoading
                                                    ? <span className="flex items-center gap-1"><div className="w-2 h-2 border border-sky-400 border-t-transparent rounded-full animate-spin" />{scene}</span>
                                                    : scene
                                                }
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Botón flotante / pill */}
            <button
                onClick={() => isConnected && setOpen(o => !o)}
                disabled={isConnecting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all border
                    ${isConnecting
                        ? 'bg-slate-800 border-slate-600 text-slate-400 cursor-wait shadow-slate-900/30'
                        : !isConnected
                            ? 'bg-slate-800/80 border-slate-700 text-slate-500 cursor-default shadow-slate-900/20'
                            : open
                                ? 'bg-slate-900 border-fuchsia-500/40 text-fuchsia-300 shadow-fuchsia-900/30'
                                : 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-fuchsia-900/50 hover:bg-fuchsia-500'
                    }`}
            >
                {isConnecting
                    ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : <Layers className="w-4 h-4" />
                }
                Stream Deck
                {isConnecting && <span className="text-[10px] font-bold normal-case text-slate-400">conectando...</span>}
                {isConnected && !open && enabledCount > 0 && (
                    <span className="bg-white/20 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                        {enabledCount}
                    </span>
                )}
                {isConnected && (open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
            </button>
        </div>
    );
}
