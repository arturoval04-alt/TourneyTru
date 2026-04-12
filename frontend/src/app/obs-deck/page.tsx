'use client';

import { useEffect, useState } from 'react';
import ActionPanel from '@/components/controls/ActionPanel';
import { useOBSStore } from '@/store/obsStore';
import { useGameStore } from '@/store/gameStore';
import { OVERLAYS } from '@/lib/overlaysConfig';
import OBSStreamDeck from '@/components/obs/OBSStreamDeck';
import OBSConnectPanel from '@/components/obs/OBSConnectPanel';
import { Layers, Wifi } from 'lucide-react';
import { getUser, isLoggedIn } from '@/lib/auth';

const overlaysMeta = OVERLAYS.map(o => ({ id: o.id, name: o.name, emoji: o.emoji }));

export default function OBSDeckPage() {
    const { connectionState } = useOBSStore();
    const [gameId, setGameId] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [canScore, setCanScore] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        setCanScore(
            isLoggedIn() &&
            ['admin', 'organizer', 'presi', 'scorekeeper', 'streamer'].includes(getUser()?.role ?? ''),
        );

        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        setGameId(params.get('gameId'));
    }, []);

    // Auto-conectar usando las credenciales guardadas en localStorage
    useEffect(() => {
        const { connectionState: state, connect } = useOBSStore.getState();
        if (state !== 'disconnected') return;
        try {
            const raw = localStorage.getItem('obs_credentials');
            if (!raw) return;
            const creds = JSON.parse(raw);
            useOBSStore.setState({ credentials: creds });
            connect(creds).catch(() => {});
        } catch {}
    }, []);

    // Título de la ventana
    useEffect(() => {
        document.title = 'Stream Deck · ScoreKeeper';
    }, []);

    useEffect(() => {
        if (!gameId || !canScore) return;

        const store = useGameStore.getState();
        store.setGameId(gameId);
        store.fetchGameConfig().then(() => {
            useGameStore.getState().connectSocket();
        });

        return () => {
            useGameStore.getState().disconnectSocket();
        };
    }, [canScore, gameId]);

    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';

    return (
        <div className="min-h-screen bg-slate-950 text-white p-3 flex flex-col gap-3">
            {/* Header mínimo */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Layers className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Stream Deck</span>
                <div className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className={`text-[10px] font-bold ${isConnected ? 'text-green-400' : isConnecting ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {isConnected ? 'OBS conectado' : isConnecting ? 'Conectando...' : 'Sin conexión'}
                </span>
            </div>

            {hasMounted && canScore && gameId && (
                <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
                    <ActionPanel />
                </div>
            )}

            {hasMounted && canScore && !gameId && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    Abre esta ventana desde un juego para cargar también el control de anotación.
                </div>
            )}

            {/* Panel de conexión si no está conectado */}
            {!isConnected && !isConnecting && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Wifi className="w-8 h-8 text-slate-600" />
                    <p className="text-xs text-slate-500 max-w-xs">
                        No hay conexión activa con OBS. Conéctate primero desde la pestaña Stream en el panel principal.
                    </p>
                    <div className="w-full">
                        <OBSConnectPanel />
                    </div>
                </div>
            )}

            {isConnecting && (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs">
                    <div className="w-4 h-4 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                    Conectando a OBS...
                </div>
            )}

            {/* Stream Deck */}
            {isConnected && (
                <OBSStreamDeck overlaysMeta={overlaysMeta} />
            )}
        </div>
    );
}
