// components/order-status-modal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { HiMiniXMark } from 'react-icons/hi2';
import {
  connectOrderSocket,
  type OrderUpdatePayload,
} from '@/lib/orders-socket';

// ⚠️ koristi svoje styles ako imaš; ovo je minimalna klasa struktura
import styles from './order-status-modal.module.scss';

type Props = {
  open: boolean;
  onClose: () => void;

  publicCode: string;
  token: string;
  apiBase: string;

  // ✅ optional initial state (for global provider + persistence)
  initialStatus?: 'pending' | 'accepted' | 'rejected';
  initialEta?: number | null;
  initialReason?: string | null;

  // ✅ called when user dismisses accepted/rejected (so provider can clear storage)
  onDone?: () => void;
};

function formatEta(eta: number | null | undefined) {
  if (eta === null || eta === undefined) return '—';
  if (!Number.isFinite(eta)) return '—';
  const n = Math.max(0, Math.trunc(eta));
  return `${n} min`;
}

export default function OrderStatusModal({
  open,
  onClose,
  publicCode,
  token,
  apiBase,
  initialStatus = 'pending',
  initialEta = null,
  initialReason = null,
  onDone,
}: Props) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>(
    initialStatus,
  );
  const [eta, setEta] = useState<number | null>(initialEta);
  const [reason, setReason] = useState<string | null>(initialReason);

  // if you want to show “connected / retrying”
  const [socketConnected, setSocketConnected] = useState(false);

  // keep a stable room key
  const key = useMemo(() => `${publicCode}:${token}`, [publicCode, token]);

  useEffect(() => {
    if (!open) return;

    // reset to initial when modal opens (important for navigation/back)
    setStatus(initialStatus);
    setEta(initialEta ?? null);
    setReason(initialReason ?? null);

    // if already handled, no need to keep socket open
    if (initialStatus !== 'pending') return;

    const cleanup = connectOrderSocket({
      apiBase,
      publicCode,
      token,
      onUpdate: (p: OrderUpdatePayload) => {
        // safety: ignore updates for other orders
        if (p.publicCode !== publicCode) return;

        setStatus(p.status);
        setEta(p.etaMinutes ?? null);
        setReason(p.reason ?? null);
      },
      // optional hooks (if you added them; safe to ignore if not supported)
      onConnect: () => setSocketConnected(true),
      onDisconnect: () => setSocketConnected(false),
    } as any);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    apiBase,
    key,
    publicCode,
    token,
    initialStatus,
    initialEta,
    initialReason,
  ]);

  // Close behavior:
  // - pending: just close (keep tracking in provider)
  // - accepted/rejected: close + call onDone (provider should clear)
  const handleClose = () => {
    if (status !== 'pending') {
      onDone?.();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Order status"
      onMouseDown={(e) => {
        // click outside closes (optional). keep it strict if you want:
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.modal}>
        {/* header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}></div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            <HiMiniXMark size={22} />
          </button>
        </div>

        {/* body */}
        <div className={styles.body}>
          {status === 'pending' && (
            <div className={styles.section}>
              <h3 className={styles.title}>Čekamo potvrdu…</h3>

              <p className={styles.text}>
                Restoran treba da prihvati ili odbije porudžbinu. Ovo obično
                traje kratko.
              </p>

              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <div className={styles.loadingMeta}>
                  <div className={styles.loadingLabel}>
                    {socketConnected ? 'Povezano' : 'Povezujem…'}
                  </div>
                  <div className={styles.loadingHint}>
                    Možeš zatvoriti ovaj prozor i nastaviti da pretražuješ —
                    status ostaje aktivan.
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'accepted' && (
            <div className={styles.section}>
              <h3 className={styles.title}>Porudžbina je prihvaćena ✅</h3>

              <div className={styles.infoBox}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Očekivano vreme</span>
                  <span className={styles.value}>{formatEta(eta)}</span>
                </div>
              </div>

              <p className={styles.textMuted}>
                Hvala! Pratite status porudžbine preko ovog koda ako bude
                potrebno.
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <div className={styles.section}>
              <h3 className={styles.title}>Porudžbina je odbijena ❌</h3>

              {reason ? (
                <div className={styles.infoBox}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Razlog</span>
                    <span className={styles.value}>{reason}</span>
                  </div>
                </div>
              ) : (
                <p className={styles.textMuted}>
                  Nije naveden razlog. Pokušajte ponovo ili izaberite pickup.
                </p>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className={styles.footer}>
          {status === 'pending' ? (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnGhost)}
              onClick={handleClose}
            >
              Zatvori
            </button>
          ) : (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnPrimary)}
              onClick={handleClose}
            >
              U redu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
