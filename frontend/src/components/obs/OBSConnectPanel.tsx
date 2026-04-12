'use client';

import { useState } from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useOBSStore, OBSCredentials } from '@/store/obsStore';

export default function OBSConnectPanel() {
    const { connectionState, errorMessage, credentials, connect, disconnect } = useOBSStore();

    const [host, setHost] = useState(credentials?.host ?? 'localhost');
    const [port, setPort] = useState(String(credentials?.port ?? 4455));
    const [password, setPassword] = useState(credentials?.password ?? '');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const creds: OBSCredentials = {
                host: host.trim() || 'localhost',
                port: parseInt(port) || 4455,
                password: password,
            };
            await connect(creds);
        } catch { /* error ya en el store */ } finally {
            setConnecting(false);
        }
    };

    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting' || connecting;

    return (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">OBS WebSocket</h3>
                {isConnected && (
                    <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                        CONECTADO · {credentials?.host}:{credentials?.port}
                    </span>
                )}
            </div>

            {/* Advertencia HTTP */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300 leading-relaxed">
                    OBS WebSocket requiere que accedas a esta app por <strong>http://</strong> (no https) o desde localhost. Los navegadores bloquean WebSocket no-seguro desde páginas HTTPS.
                </p>
            </div>

            {!isConnected ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">IP / Host</label>
                            <input
                                type="text"
                                value={host}
                                onChange={e => setHost(e.target.value)}
                                placeholder="localhost"
                                className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
                                disabled={isConnecting}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Puerto</label>
                            <input
                                type="number"
                                value={port}
                                onChange={e => setPort(e.target.value)}
                                placeholder="4455"
                                className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
                                disabled={isConnecting}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Contraseña (opcional)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
                            disabled={isConnecting}
                            onKeyDown={e => e.key === 'Enter' && handleConnect()}
                        />
                    </div>

                    {errorMessage && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
                    >
                        {isConnecting
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando...</>
                            : <><Wifi className="w-3.5 h-3.5" /> Conectar a OBS</>
                        }
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">OBS Studio enlazado</p>
                        <p className="text-xs text-slate-400">Listo para inyectar escenas y controlar overlays</p>
                    </div>
                    <button
                        onClick={disconnect}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition border border-slate-700/40 hover:border-red-500/20"
                    >
                        <LogOut className="w-3 h-3" /> Desconectar
                    </button>
                </div>
            )}
        </div>
    );
}
