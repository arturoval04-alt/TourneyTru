import { io } from 'socket.io-client';
import { getSocketUrl } from './api';

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Conectaremos manualmente al montar el componente
});
