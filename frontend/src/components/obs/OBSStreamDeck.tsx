'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw, Tv2, Layers, Download, Copy, Check, LayoutTemplate, RotateCcw } from 'lucide-react';
import { useOBSStore } from '@/store/obsStore';

// ── Preset de posiciones guardadas por el usuario ──────────────────────────────
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

interface OverlayMeta {
    id: string;
    name: string;
    emoji: string;
}

interface Props {
    overlaysMeta: OverlayMeta[];   // misma lista de OVERLAYS de StreamAdminPanel
}

const SCENE_NAME = 'ScoreKeeper';

export default function OBSStreamDeck({ overlaysMeta }: Props) {
    const {
        connectionState,
        sceneItems,
        scenes,
        currentScene,
        setSceneItemEnabled,
        setCurrentScene,
        refreshSceneItems,
    } = useOBSStore();

    const [toggling, setToggling] = useState<string | null>(null);
    const [switching, setSwitching] = useState<string | null>(null);
    const [exportingPositions, setExportingPositions] = useState(false);
    const [positionsJson, setPositionsJson] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [applyingPreset, setApplyingPreset] = useState(false);
    const [presetResult, setPresetResult] = useState<{ ok: boolean; count: number; skipped: number } | null>(null);

    const isConnected = connectionState === 'connected';

    // Refrescar items cuando se monta el deck
    useEffect(() => {
        if (isConnected) refreshSceneItems();
    }, [isConnected]); // eslint-disable-line

    if (!isConnected) return null;

    const hasScoreKeeperScene = scenes.includes(SCENE_NAME);

    if (!hasScoreKeeperScene) {
        return (
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="w-5 h-5 text-fuchsia-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Stream Deck</h3>
                </div>
                <p className="text-xs text-slate-500">
                    Primero usa <span className="text-white font-bold">"Preparar OBS"</span> para crear la escena ScoreKeeper.
                </p>
            </div>
        );
    }

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

    const handleExportPositions = async () => {
        const { obs } = useOBSStore.getState();
        if (!obs) return;
        setExportingPositions(true);
        setPositionsJson(null);
        try {
            const results: Record<string, any> = {};
            for (const item of sceneItems) {
                try {
                    const { sceneItemTransform } = await obs.call('GetSceneItemTransform', {
                        sceneName: SCENE_NAME,
                        sceneItemId: item.sceneItemId,
                    });
                    results[item.sourceName] = {
                        sceneItemId: item.sceneItemId,
                        transform: sceneItemTransform,
                    };
                } catch {
                    results[item.sourceName] = { error: 'no se pudo leer' };
                }
            }
            setPositionsJson(JSON.stringify(results, null, 2));
        } finally {
            setExportingPositions(false);
        }
    };

    const handleCopy = () => {
        if (!positionsJson) return;
        navigator.clipboard.writeText(positionsJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApplyPreset = async () => {
        const { obs } = useOBSStore.getState();
        if (!obs) return;
        setApplyingPreset(true);
        setPresetResult(null);
        let applied = 0;
        let skipped = 0;
        try {
            for (const item of sceneItems) {
                const transform = PRESET_LAYOUT[item.sourceName];
                if (!transform) { skipped++; continue; }
                await obs.call('SetSceneItemTransform', {
                    sceneName: SCENE_NAME,
                    sceneItemId: item.sceneItemId,
                    sceneItemTransform: {
                        positionX: transform.positionX,
                        positionY: transform.positionY,
                        scaleX: transform.scaleX,
                        scaleY: transform.scaleY,
                    },
                });
                applied++;
            }
            setPresetResult({ ok: true, count: applied, skipped });
        } catch (err: any) {
            setPresetResult({ ok: false, count: applied, skipped });
        } finally {
            setApplyingPreset(false);
        }
    };

    return (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Stream Deck</h3>
                <button
                    onClick={refreshSceneItems}
                    className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
                    title="Actualizar"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* ── Toggles de overlays ── */}
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Overlays · Escena ScoreKeeper
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {overlaysMeta.map(overlay => {
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
                                title={!exists ? 'No inyectado aún — usa "Preparar OBS"' : undefined}
                                className={`
                                    relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center
                                    transition-all duration-150 select-none
                                    ${!exists
                                        ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed'
                                        : isEnabled
                                            ? 'border-fuchsia-500/60 bg-fuchsia-500/15 shadow-lg shadow-fuchsia-900/20 hover:bg-fuchsia-500/20'
                                            : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/40'
                                    }
                                `}
                            >
                                {/* Indicador ON */}
                                {isEnabled && (
                                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9]" />
                                )}

                                <span className="text-xl">{overlay.emoji}</span>
                                <span className={`text-[10px] font-black uppercase tracking-wide leading-tight ${isEnabled ? 'text-fuchsia-200' : 'text-slate-400'}`}>
                                    {overlay.name}
                                </span>

                                {isLoading
                                    ? <div className="w-3 h-3 border border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                                    : isEnabled
                                        ? <Eye className="w-3 h-3 text-fuchsia-400" />
                                        : <EyeOff className="w-3 h-3 text-slate-600" />
                                }
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Cambio de escena ── */}
            {scenes.length > 1 && (
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Tv2 className="w-3.5 h-3.5" /> Escena activa en OBS
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {scenes.map(scene => {
                            const isActive = currentScene === scene;
                            const isLoading = switching === scene;
                            return (
                                <button
                                    key={scene}
                                    onClick={() => !isActive && handleSceneSwitch(scene)}
                                    disabled={isLoading}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                        ${isActive
                                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm shadow-sky-900/30'
                                            : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700/50'
                                        }
                                    `}
                                >
                                    {isLoading
                                        ? <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-sky-400 border-t-transparent rounded-full animate-spin" /> {scene}</span>
                                        : scene
                                    }
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Preset de posiciones ── */}
            <div className="border-t border-slate-700/30 pt-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <LayoutTemplate className="w-3.5 h-3.5" /> Mis posiciones guardadas
                    </p>
                    <button
                        onClick={handleApplyPreset}
                        disabled={applyingPreset || sceneItems.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        {applyingPreset
                            ? <><div className="w-3 h-3 border border-fuchsia-400 border-t-transparent rounded-full animate-spin" /> Aplicando...</>
                            : <><RotateCcw className="w-3 h-3" /> Restaurar layout</>
                        }
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 mb-2">
                    Restaura cada overlay a su posición/escala exacta guardada en tu preset (11 fuentes).
                </p>
                {presetResult && (
                    <div className={`rounded-lg px-3 py-2 text-[10px] font-bold border ${presetResult.ok ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                        {presetResult.ok
                            ? `✓ ${presetResult.count} overlays posicionados${presetResult.skipped > 0 ? ` · ${presetResult.skipped} sin preset` : ''}`
                            : `Error al aplicar — ${presetResult.count} completados antes del fallo`
                        }
                    </div>
                )}
            </div>

            {/* ── Exportar posiciones actuales ── */}
            <div className="border-t border-slate-700/30 pt-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" /> Exportar posiciones actuales
                    </p>
                    <button
                        onClick={handleExportPositions}
                        disabled={exportingPositions || sceneItems.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700/50 border border-slate-600/40 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        {exportingPositions
                            ? <><div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" /> Leyendo...</>
                            : <><Download className="w-3 h-3" /> Leer de OBS</>
                        }
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 mb-3">
                    Lee las posiciones/tamaños que tienes ahora mismo en OBS para usarlas como presets guardados.
                </p>

                {positionsJson && (
                    <div className="relative">
                        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                            {positionsJson}
                        </pre>
                        <button
                            onClick={handleCopy}
                            className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${copied ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                        >
                            {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
