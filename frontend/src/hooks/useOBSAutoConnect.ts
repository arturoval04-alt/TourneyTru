/**
 * useOBSAutoConnect — Se llama una vez al montar cualquier página que
 * use el panel de stream. Si hay credenciales guardadas en localStorage
 * y no hay conexión activa, intenta reconectar automáticamente.
 */
'use client';

import { useEffect } from 'react';
import { useOBSStore } from '@/store/obsStore';

export function useOBSAutoConnect() {
    useEffect(() => {
        const { connectionState, connect } = useOBSStore.getState();
        if (connectionState !== 'disconnected') return;

        // Leer directamente de localStorage para evitar el problema de SSR
        // (el store puede haberse inicializado en servidor con credentials: null)
        try {
            const raw = localStorage.getItem('obs_credentials');
            if (!raw) return;
            const creds = JSON.parse(raw);
            // Sincronizar credentials en el store si está vacío
            useOBSStore.setState({ credentials: creds });
            connect(creds).catch(() => { /* silencioso — el store guarda el error */ });
        } catch {
            // ignore parse errors
        }
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
