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
  onConnect?: () => void;
  onDisconnect?: () => void;
}): () => void {
  const base = opts.apiBase.replace(/\/$/, '');

  const socket = io(`${base}/orders`, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    timeout: 10000,
    // ✅ backend guest subscribe uses payload token, not handshake auth
    // auth: { publicCode: opts.publicCode, token: opts.token }, // <- not needed for guest flow
  });

  const subscribe = () => {
    socket.emit(
      'order:subscribe',
      { publicCode: opts.publicCode, token: opts.token },
      // optional ack (server returns { ok: true })
      (ack: any) => {
        // if gateway throws it may come as undefined; still fine
        // console.log('[orders socket] subscribe ack', ack);
      },
    );
  };

  const handleUpdate = (p: any) => {
    if (!p?.publicCode) return;
    opts.onUpdate(p as OrderUpdatePayload);
  };

  const handleConnect = () => {
    opts.onConnect?.();
    // ✅ IMPORTANT: join room after connect
    subscribe();
  };

  const handleDisconnect = () => opts.onDisconnect?.();

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('order:update', handleUpdate);

  socket.on('connect_error', (err) => {
    console.error('[orders socket] connect_error', err?.message ?? err);
  });

  // optional: also resubscribe on reconnect attempts
  socket.io.on('reconnect', () => subscribe());

  return () => {
    // optional: unsubscribe before disconnect
    socket.emit('order:unsubscribe', { publicCode: opts.publicCode });

    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('order:update', handleUpdate);
    socket.disconnect();
  };
}
