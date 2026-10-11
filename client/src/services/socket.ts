import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to backend gateway:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });
  }

  return socket;
}

export const API_BASE = `${BACKEND_URL}/api`;
