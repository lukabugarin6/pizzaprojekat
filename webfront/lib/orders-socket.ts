// lib/orders-socket.ts
import { io } from 'socket.io-client';

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
}): () => void {
  const base = opts.apiBase.replace(/\/$/, '');

  const socket = io(`${base}/orders`, {
    transports: ['websocket'],
    auth: { publicCode: opts.publicCode, token: opts.token },
  });

  const onUpdate = (p: any) => {
    if (!p?.publicCode) return;
    opts.onUpdate(p as OrderUpdatePayload);
  };

  socket.on('order:update', onUpdate);

  // ✅ return proper cleanup
  return () => {
    socket.off('order:update', onUpdate);
    socket.disconnect();
  };
}
