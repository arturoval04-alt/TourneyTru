'use client';

import { useState, useEffect } from 'react';
import { Radio, Copy, Check, ExternalLink } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { isLoggedIn, getAccessToken } from '@/lib/auth';
import api from '@/lib/api';

interface Props {
    gameId: string;
    forceView?: 'admin' | 'fan';
}

export default function StreamAdminPanel({ gameId, forceView }: Props) {
    const { facebookStreamUrl, streamStatus } = useGameStore();
    const [isAdmin, setIsAdmin] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const overlayUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/gamecast/${gameId}/overlay`
        : `/gamecast/${gameId}/overlay`;

    useEffect(() => {
        setIsAdmin(forceView === 'admin' || (forceView !== 'fan' && isLoggedIn()));
    }, [forceView]);

    // Sync URL input when store updates (e.g. from socket)
    useEffect(() => {
        if (facebookStreamUrl) setUrlInput(facebookStreamUrl);
    }, [facebookStreamUrl]);

    // Fetch current stream info on mount
    useEffect(() => {
        if (!gameId) return;
        api.get(`/games/${gameId}/stream-info`).then(({ data }) => {
            if (data.facebookStreamUrl) setUrlInput(data.facebookStreamUrl);
            useGameStore.setState({
                facebookStreamUrl: data.facebookStreamUrl ?? null,
                streamStatus: data.streamStatus ?? 'offline',
            });
        }).catch(() => {/* silently ignore */ });
    }, [gameId]);

    const handleStartStream = async () => {
        if (!urlInput.trim()) { setError('Pega la URL de Facebook Live primero.'); return; }
        setError(null);
        setLoading(true);
        try {
            await api.post(`/games/${gameId}/stream`, { facebookStreamUrl: urlInput.trim() }, {
                headers: { Authorization: `Bearer ${getAccessToken()}` },
            });
        } catch {
            setError('Error al iniciar el stream. Verifica tu sesión.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndStream = async () => {
        setError(null);
        setLoading(true);
        try {
            await api.delete(`/games/${gameId}/stream`, {
                headers: { Authorization: `Bearer ${getAccessToken()}` },
            });
        } catch {
            setError('Error al detener el stream.');
        } finally {
            setLoading(false);
        }
    };

    const copyOverlayUrl = () => {
        navigator.clipboard.writeText(overlayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isLive = streamStatus === 'live';
    const isEnded = streamStatus === 'ended';

    // ── VISTA ADMIN ────────────────────────────────────────────────────────────
    if (isAdmin) {
        return (
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 lg:p-10 shadow-lg animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700/30 pb-4">
                    <Radio className={`w-7 h-7 ${isLive ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                    <h2 className="text-xl font-black text-white">Gestionar Transmisión</h2>
                    {isLive && (
                        <span className="ml-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest border border-rose-500/30">
                            EN VIVO
                        </span>
                    )}
                </div>

                <div className="max-w-2xl flex flex-col gap-6">
                    {/* URL input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-300">URL de Facebook Live</label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="https://fb.watch/..."
                            className="w-full bg-slate-800/80 border border-slate-600/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
                        />
                        <p className="text-xs text-slate-500">Crea el live en Facebook, copia la URL pública (fb.watch/...) y pégala aquí.</p>
                    </div>

                    {error && (
                        <p className="text-sm text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">{error}</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleStartStream}
                            disabled={loading || isLive}
                            className="flex-1 py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wider transition-all bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-rose-900/30"
                        >
                            {loading && !isLive ? 'Iniciando...' : '🔴 Iniciar Stream'}
                        </button>
                        <button
                            onClick={handleEndStream}
                            disabled={loading || !isLive}
                            className="flex-1 py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wider transition-all bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                        >
                            {loading && isLive ? 'Deteniendo...' : 'Detener Stream'}
                        </button>
                    </div>

                    {/* OBS instructions */}
                    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 flex flex-col gap-3">
                        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest">Instrucciones OBS — Browser Source</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono break-all flex-1 bg-slate-900/60 px-3 py-2 rounded-lg">{overlayUrl}</span>
                            <button
                                onClick={copyOverlayUrl}
                                className="shrink-0 p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 transition-colors"
                                title="Copiar URL"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                            </button>
                        </div>
                        <ul className="text-xs text-slate-400 flex flex-col gap-1 list-disc list-inside">
                            <li>Ancho: <span className="text-white font-bold">1920</span> · Alto: <span className="text-white font-bold">1080</span></li>
                            <li>CSS: <span className="font-mono text-slate-300">body {'{'} background: transparent !important; {'}'}</span></li>
                            <li>Activa <em>Shutdown source when not visible</em></li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // ── VISTA FANS ─────────────────────────────────────────────────────────────
    return (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 lg:p-12 shadow-lg animate-fade-in-up min-h-[400px] flex flex-col items-center justify-center text-center gap-6">
            {isLive ? (
                <>
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-2xl font-black text-white uppercase tracking-wider">EN VIVO</span>
                    </div>
                    <p className="text-slate-400 max-w-md">
                        El juego se está transmitiendo en Facebook Live. Haz clic para verlo con el marcador en tiempo real.
                    </p>
                    {facebookStreamUrl && (
                        <a
                            href={facebookStreamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#1877F2] hover:bg-[#1468d8] text-white font-black text-base uppercase tracking-wider transition-colors shadow-lg shadow-blue-900/30"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Ver en Facebook
                        </a>
                    )}
                    <p className="text-slate-500 text-sm">O sigue el marcador en tiempo real en las pestañas de arriba ↑</p>
                </>
            ) : isEnded ? (
                <>
                    <Radio className="w-14 h-14 text-slate-600" />
                    <h2 className="text-xl font-black text-slate-400">Transmisión finalizada</h2>
                    <p className="text-slate-500 max-w-md">La transmisión ha concluido. Puedes seguir el marcador en tiempo real aquí arriba ↑</p>
                </>
            ) : (
                <>
                    <Radio className="w-14 h-14 text-slate-600" />
                    <h2 className="text-xl font-black text-slate-400">Sin transmisión activa</h2>
                    <p className="text-slate-500 max-w-md">Cuando el administrador inicie la transmisión aparecerá aquí. Sigue el juego en tiempo real en las pestañas de arriba ↑</p>
                </>
            )}
        </div>
    );
}
