// lib/orders-socket.ts
import { io, Socket } from 'socket.io-client';

export type OrderUpdatePayload = {
  publicCode: string;
  status: 'pending' | 'accepted' | 'rejected';
  etaMinutes?: number | null;
  reason?: string | null;
};

export function connectOrderSocket(opts: {
  apiBase: string;
  publicCode: string;
  token: string;
  onUpdate: (p: OrderUpdatePayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}): () => void {
  const base = opts.apiBase.replace(/\/$/, '');

  const socket = io(`${base}/orders`, {
    // transports: ['websocket'], // <- ukloni
    auth: { publicCode: opts.publicCode, token: opts.token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    timeout: 10000,
  });

  const handleUpdate = (p: any) => {
    if (!p?.publicCode) return;
    opts.onUpdate(p as OrderUpdatePayload);
  };

  const handleConnect = () => opts.onConnect?.();
  const handleDisconnect = () => opts.onDisconnect?.();

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('order:update', handleUpdate);

  // helpful for debugging
  socket.on('connect_error', (err) => {
    console.error('[orders socket] connect_error', err?.message ?? err);
  });

  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('order:update', handleUpdate);
    socket.disconnect();
  };
}
