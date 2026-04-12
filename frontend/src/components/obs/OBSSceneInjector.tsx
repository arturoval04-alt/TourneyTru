'use client';

import { useState } from 'react';
import { Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useOBSStore, OverlayInjectConfig, InjectionResult } from '@/store/obsStore';

interface Props {
    overlays: OverlayInjectConfig[];
}

export default function OBSSceneInjector({ overlays }: Props) {
    const { connectionState, injectScenes, refreshSceneItems } = useOBSStore();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<InjectionResult | null>(null);

    const isConnected = connectionState === 'connected';

    const handleInject = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await injectScenes(overlays);
            setResult(res);
            if (res.ok) await refreshSceneItems();
        } finally {
            setLoading(false);
        }
    };

    if (!isConnected) return null;

    return (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Preparar OBS</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Crea automáticamente la escena <span className="text-white font-bold">"ScoreKeeper"</span> en OBS con todos los overlays como fuentes Browser. Cada fuente empieza oculta — actívalas desde el Stream Deck.
            </p>

            {result && (
                <div className={`rounded-xl px-4 py-3 mb-4 text-xs border ${result.ok ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                    {result.ok ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Escena preparada correctamente
                            </div>
                            {result.created.length > 0 && (
                                <p className="text-green-400/70">✓ Creadas: {result.created.join(', ')}</p>
                            )}
                            {result.skipped.length > 0 && (
                                <p className="text-slate-400">⟳ Ya existían: {result.skipped.join(', ')}</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {result.error}
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleInject}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/30"
            >
                {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Inyectando escenas...</>
                    : <><Zap className="w-4 h-4" /> Inyectar a OBS ({overlays.length} overlays)</>
                }
            </button>

            <p className="text-[10px] text-slate-500 mt-2 text-center">
                Idempotente — si las fuentes ya existen, no las duplica
            </p>
        </div>
    );
}
