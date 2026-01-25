// components/order-status-modal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { HiMiniXMark } from 'react-icons/hi2';
import styles from './order-status-modal.module.scss';

type Props = {
  open: boolean;
  onClose: () => void;

  publicCode: string;
  token: string;
  apiBase: string;

  initialStatus?: 'pending' | 'accepted' | 'rejected';
  initialEta?: number | null;
  initialReason?: string | null;

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
  apiBase, // unused now, but keeping prop so you don't have to refactor callers yet
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

  // ✅ only sync UI state from props when modal opens / props change
  useEffect(() => {
    if (!open) return;
    setStatus(initialStatus);
    setEta(initialEta ?? null);
    setReason(initialReason ?? null);
  }, [open, initialStatus, initialEta, initialReason]);

  const handleClose = () => {
    if (status !== 'pending') onDone?.();
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
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft} />
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            <HiMiniXMark size={22} />
          </button>
        </div>

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
                  <div className={styles.loadingLabel}>Pratimo status…</div>
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
