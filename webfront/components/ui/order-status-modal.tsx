// components/order-status-modal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import styles from './order-status-modal.module.scss';
import { HiMiniXMark, HiMiniCheckBadge, HiMiniXCircle } from 'react-icons/hi2';
import { useCart } from '@/context/cart/cart-context';

type OrderStatus = 'pending' | 'accepted' | 'rejected';

type OrderStatusModalT = {
  ariaLabel: string;
  closeAria: string;

  pending: {
    title: string;
    text: string;
    trackingLabel: string;
    trackingHint: string;
  };

  accepted: {
    title: string;
    thanks: string;
    etaLabel: string;
    etaUnknown: string; // e.g. "—"
    minSuffix: string; // e.g. "min" / "мин"
  };

  rejected: {
    title: string;
    reasonLabel: string;
    noReason: string;
  };

  buttons: {
    close: string;
    ok: string;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;

  publicCode: string;
  token: string;
  apiBase: string;

  initialStatus?: OrderStatus;
  initialEta?: number | null;
  initialReason?: string | null;

  onDone?: () => void;

  // ✅ translations for this modal
  t: OrderStatusModalT;
};

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
  t,
}: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [eta, setEta] = useState<number | null>(initialEta);
  const [reason, setReason] = useState<string | null>(initialReason);

  const { clearCart } = useCart();

  const formatEta = useMemo(() => {
    return (v: number | null | undefined) => {
      if (v === null || v === undefined) return t.accepted.etaUnknown;
      if (!Number.isFinite(v)) return t.accepted.etaUnknown;
      const n = Math.max(0, Math.trunc(v));
      return `${n} ${t.accepted.minSuffix}`;
    };
  }, [t.accepted.etaUnknown, t.accepted.minSuffix]);

  // ✅ only sync UI state from props when modal opens / props change
  useEffect(() => {
    if (!open) return;
    setStatus(initialStatus);
    setEta(initialEta ?? null);
    setReason(initialReason ?? null);
  }, [open, initialStatus, initialEta, initialReason]);

  // ✅ when order reaches terminal state, clear cart items
  useEffect(() => {
    if (!open) return;
    if (status === 'accepted') {
      clearCart();
    }
  }, [open, status, clearCart]);

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
      aria-label={t.ariaLabel}
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
            aria-label={t.closeAria}
          >
            <HiMiniXMark size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {status === 'pending' && (
            <div className={styles.section}>
              <h3 className={styles.title}>{t.pending.title}</h3>

              <p className={styles.text}>{t.pending.text}</p>

              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <div className={styles.loadingMeta}>
                  <div className={styles.loadingLabel}>
                    {t.pending.trackingLabel}
                  </div>
                  <div className={styles.loadingHint}>
                    {t.pending.trackingHint}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'accepted' && (
            <div className={styles.section}>
              <h3 className={styles.title}>
                {t.accepted.title}
                <HiMiniCheckBadge className={styles.statusIconAccepted} />
              </h3>

              <p className={styles.text}>{t.accepted.thanks}</p>

              <div className={styles.infoBox}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>{t.accepted.etaLabel}</span>
                  <span className={styles.value}>{formatEta(eta)}</span>
                </div>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className={styles.section}>
              <h3 className={styles.title}>
                {t.rejected.title}
                <HiMiniXCircle className={styles.statusIconRejected} />
              </h3>

              {reason ? (
                <div className={styles.infoBox}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>
                      {t.rejected.reasonLabel}
                    </span>
                    <span className={styles.value}>{reason}</span>
                  </div>
                </div>
              ) : (
                <p className={styles.textMuted}>{t.rejected.noReason}</p>
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
              {t.buttons.close}
            </button>
          ) : (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnPrimary)}
              onClick={handleClose}
            >
              {t.buttons.ok}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
