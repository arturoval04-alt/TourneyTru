import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/live_games';

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Conectaremos manualmente al montar el componente
});
