'use client';

import { useState, useEffect } from 'react';
import { Radio, Copy, Check, ExternalLink, Monitor, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { isLoggedIn } from '@/lib/auth';
import api from '@/lib/api';

interface Props {
    gameId: string;
    forceView?: 'admin' | 'fan';
}

interface OverlayConfig {
    id: string;
    name: string;
    description: string;
    query: string;
    width: number;
    height: number;
    emoji: string;
    color: string;
}

const OVERLAYS: OverlayConfig[] = [
    { id: 'full', name: 'Full Overlay', description: 'Bateador, pitcher y marcador en pantalla completa', query: '?view=full', width: 1920, height: 1080, emoji: '🖥️', color: 'from-sky-500/20 to-sky-600/10' },
    { id: 'compact', name: 'Compact ESPN', description: 'Scoreboard compacto estilo ESPN/MLB con bateador y pitcher', query: '?view=compact', width: 480, height: 180, emoji: '📊', color: 'from-amber-500/20 to-amber-600/10' },
    { id: 'score', name: 'Score Bar', description: 'Solo la barra de marcador inferior', query: '?view=score', width: 1920, height: 120, emoji: '🏆', color: 'from-emerald-500/20 to-emerald-600/10' },
    { id: 'field', name: 'Campo', description: 'Diamante con defensores y bases iluminadas', query: '?view=field', width: 800, height: 900, emoji: '⚾', color: 'from-green-500/20 to-green-600/10' },
    { id: 'batter', name: 'Bateador', description: 'Tarjeta del bateador actual con foto y stats', query: '?view=batter', width: 400, height: 500, emoji: '🏏', color: 'from-sky-500/20 to-sky-600/10' },
    { id: 'pitcher', name: 'Pitcher', description: 'Tarjeta del pitcher actual con foto y stats', query: '?view=pitcher', width: 400, height: 400, emoji: '⚡', color: 'from-emerald-500/20 to-emerald-600/10' },
    { id: 'playbyplay', name: 'Play-by-Play', description: 'Últimas 4 jugadas como lower third', query: '?view=playbyplay', width: 600, height: 300, emoji: '📋', color: 'from-violet-500/20 to-violet-600/10' },
    { id: 'ondeck', name: 'On Deck', description: 'Próximos 3 bateadores — ideal entre entradas', query: '?view=ondeck', width: 480, height: 400, emoji: '👥', color: 'from-orange-500/20 to-orange-600/10' },
    { id: 'lineup-away', name: 'Lineup Visitante', description: 'Alineación completa del equipo visitante', query: '?view=lineup&team=away', width: 600, height: 800, emoji: '📑', color: 'from-rose-500/20 to-rose-600/10' },
    { id: 'lineup-home', name: 'Lineup Local', description: 'Alineación completa del equipo local', query: '?view=lineup&team=home', width: 600, height: 800, emoji: '📑', color: 'from-cyan-500/20 to-cyan-600/10' },
    { id: 'matchup', name: 'Duelo Pitchers', description: 'Comparativa de pitchers iniciales con stats del torneo', query: '?view=matchup', width: 1280, height: 500, emoji: '🔥', color: 'from-red-500/20 to-red-600/10' },
];

export default function StreamAdminPanel({ gameId, forceView }: Props) {
    const { facebookStreamUrl, streamStatus } = useGameStore();
    const [isAdmin, setIsAdmin] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showObs, setShowObs] = useState(false);
    const [overlayAccessToken, setOverlayAccessToken] = useState<string | null>(null);

    const baseUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/gamecast/${gameId}/overlay`
        : `/gamecast/${gameId}/overlay`;

    const buildOverlayUrl = (overlay: OverlayConfig) => {
        const url = new URL(`${baseUrl}${overlay.query}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        if (overlayAccessToken) {
            url.searchParams.set('ot', overlayAccessToken);
        }
        return typeof window !== 'undefined' ? url.toString() : `${baseUrl}${url.search}`;
    };

    useEffect(() => {
        setIsAdmin(forceView === 'admin' || (forceView !== 'fan' && isLoggedIn()));
    }, [forceView]);

    useEffect(() => {
        if (facebookStreamUrl) setUrlInput(facebookStreamUrl);
    }, [facebookStreamUrl]);

    useEffect(() => {
        if (!gameId) return;
        api.get(`/games/${gameId}/stream-info`).then(({ data }) => {
            if (data.facebookStreamUrl) setUrlInput(data.facebookStreamUrl);
            if (data.overlayAccessToken) setOverlayAccessToken(data.overlayAccessToken);
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
            await api.post(`/games/${gameId}/stream`, { facebookStreamUrl: urlInput.trim() });
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
            await api.delete(`/games/${gameId}/stream`);
        } catch {
            setError('Error al detener el stream.');
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = (overlay: OverlayConfig) => {
        const url = buildOverlayUrl(overlay);
        navigator.clipboard.writeText(url);
        setCopiedId(overlay.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openPreview = (overlay: OverlayConfig) => {
        window.open(buildOverlayUrl(overlay), '_blank', 'width=960,height=540');
    };

    const isLive = streamStatus === 'live';
    const isEnded = streamStatus === 'ended';

    // ── VISTA ADMIN ────────────────────────────────────────────────────────────
    if (isAdmin) {
        return (
            <div className="flex flex-col gap-6 animate-fade-in-up">
                {/* Stream Control Panel */}
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-700/30 pb-4">
                        <Radio className={`w-7 h-7 ${isLive ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                        <h2 className="text-xl font-black text-white">Gestionar Transmisión</h2>
                        {isLive && (
                            <span className="ml-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest border border-rose-500/30">
                                EN VIVO
                            </span>
                        )}
                    </div>

                    <div className="max-w-2xl flex flex-col gap-5">
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
                    </div>
                </div>

                {/* ── OVERLAY GALLERY ─────────────────────────────────────── */}
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-700/30 pb-4">
                        <Monitor className="w-6 h-6 text-sky-400" />
                        <h2 className="text-xl font-black text-white">Overlays para OBS</h2>
                        <span className="ml-auto text-xs text-slate-500 font-mono">{OVERLAYS.length} disponibles</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {OVERLAYS.map((overlay) => {
                            const isCopied = copiedId === overlay.id;
                            const overlayUrl = buildOverlayUrl(overlay);
                            return (
                                <div
                                    key={overlay.id}
                                    className={`group bg-gradient-to-br ${overlay.color} border border-slate-700/40 rounded-xl p-4 hover:border-sky-500/40 transition-all hover:shadow-lg hover:shadow-sky-900/10`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-2xl">{overlay.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black text-white">{overlay.name}</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{overlay.description}</p>
                                        </div>
                                    </div>

                                    {/* Dimensions */}
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-3">
                                        <Monitor className="w-3 h-3" />
                                        <span className="font-mono">{overlay.width} × {overlay.height}</span>
                                    </div>

                                    {/* URL */}
                                    <div className="bg-slate-900/60 rounded-lg px-3 py-2 mb-3 overflow-hidden">
                                        <p className="text-[10px] text-slate-500 font-mono truncate">{overlayUrl}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyUrl(overlay)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${isCopied
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 border border-sky-500/30'
                                                }`}
                                        >
                                            {isCopied ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar URL</>}
                                        </button>
                                        <button
                                            onClick={() => openPreview(overlay)}
                                            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/30 transition-all"
                                            title="Abrir preview"
                                        >
                                            <Eye className="w-3 h-3" /> Preview
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* OBS Instructions (collapsible) */}
                    <div className="mt-6">
                        <button
                            onClick={() => setShowObs(!showObs)}
                            className="flex items-center gap-2 text-sm font-black text-sky-400 uppercase tracking-widest hover:text-sky-300 transition-colors w-full"
                        >
                            <Monitor className="w-4 h-4" />
                            Instrucciones OBS — Browser Source
                            {showObs ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                        </button>

                        {showObs && (
                            <div className="mt-3 bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 flex flex-col gap-3 animate-fade-in-up">
                                <ol className="text-xs text-slate-400 flex flex-col gap-2 list-decimal list-inside">
                                    <li>En OBS, añade una nueva fuente <span className="text-white font-bold">&quot;Browser&quot;</span></li>
                                    <li>Pega la URL del overlay que deseas usar (usa el botón <span className="text-sky-400 font-bold">Copiar URL</span> de arriba)</li>
                                    <li>Configura las dimensiones recomendadas para ese overlay (se muestra en cada tarjeta)</li>
                                    <li>En CSS personalizado, pega: <span className="font-mono text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded">body {'{'} background: transparent !important; {'}'}</span></li>
                                    <li>Activa <em className="text-white">&quot;Shutdown source when not visible&quot;</em></li>
                                    <li>Activa <em className="text-white">&quot;Refresh browser when scene becomes active&quot;</em></li>
                                </ol>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 text-xs">
                                    <span className="font-bold text-amber-400">💡 Pro tip:</span>
                                    <span className="text-amber-200/80 ml-1">Puedes usar múltiples overlays a la vez en diferentes escenas de OBS para tener control total de lo que se muestra.</span>
                                </div>
                            </div>
                        )}
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
