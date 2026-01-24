'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  connectOrderSocket,
  type OrderUpdatePayload,
} from '@/lib/orders-socket';
import OrderStatusModal from '@/components/ui/order-status-modal';

type ActiveOrder = {
  publicCode: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected';
  etaMinutes?: number | null;
  reason?: string | null;
  createdAt?: number; // ms
};

type Ctx = {
  activeOrder: ActiveOrder | null;
  modalOpen: boolean;
  startTracking: (o: { publicCode: string; token: string }) => void;
  closeModal: () => void;
  clearOrder: () => void;
};

const OrderTrackingContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'pp_active_order_v1';
// opcionalno: izbriši ako stoji > 2h
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function OrderTrackingProvider({
  children,
  apiBase,
}: {
  children: React.ReactNode;
  apiBase: string; // npr NEXT_PUBLIC_ORDERS_SOCKET_URL
}) {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 1) Hydrate from storage (da preživi navigaciju / refresh)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ActiveOrder;
      if (!parsed?.publicCode || !parsed?.token) return;

      // expire
      if (parsed.createdAt && Date.now() - parsed.createdAt > MAX_AGE_MS) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setActiveOrder(parsed);

      // ako je pending, automatski pokaži modal kad user dođe bilo gde
      if (parsed.status === 'pending') setModalOpen(true);
    } catch {
      // ignore
    }
  }, []);

  // 2) Persist to storage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeOrder) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeOrder));
  }, [activeOrder]);

  // 3) Socket subscribe while pending (globalno!)
  useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status !== 'pending') return;

    const cleanup = connectOrderSocket({
      apiBase,
      publicCode: activeOrder.publicCode,
      token: activeOrder.token,
      onUpdate: (p: OrderUpdatePayload) => {
        setActiveOrder((prev) => {
          if (!prev) return prev;
          if (prev.publicCode !== p.publicCode) return prev;

          const next: ActiveOrder = {
            ...prev,
            status: p.status,
            etaMinutes: p.etaMinutes ?? prev.etaMinutes ?? null,
            reason: p.reason ?? null,
          };

          // kad stigne accepted/rejected, možeš ostaviti modal otvoren da pokaže poruku
          // i tek na "OK" ga obrisati
          return next;
        });
      },
    });

    return cleanup;
  }, [
    apiBase,
    activeOrder?.publicCode,
    activeOrder?.token,
    activeOrder?.status,
  ]);

  const startTracking = (o: { publicCode: string; token: string }) => {
    const next: ActiveOrder = {
      publicCode: o.publicCode,
      token: o.token,
      status: 'pending',
      etaMinutes: null,
      reason: null,
      createdAt: Date.now(),
    };
    setActiveOrder(next);
    setModalOpen(true); // global modal
  };

  const closeModal = () => setModalOpen(false);

  const clearOrder = () => {
    setActiveOrder(null);
    setModalOpen(false);
  };

  const value = useMemo(
    () => ({ activeOrder, modalOpen, startTracking, closeModal, clearOrder }),
    [activeOrder, modalOpen],
  );

  return (
    <OrderTrackingContext.Provider value={value}>
      {children}

      {/* global modal render */}
      {activeOrder ? (
        <OrderStatusModal
          open={modalOpen}
          onClose={() => {
            // ako je još pending, samo zatvori modal ali zadrži tracking
            // (pa kad se user vrati, možeš ponovo otvoriti ručno)
            // ja bih ovde ostavio samo close:
            closeModal();
          }}
          publicCode={activeOrder.publicCode}
          token={activeOrder.token}
          apiBase={apiBase}
          // ako ti modal treba ove vrednosti:
          initialStatus={activeOrder.status}
          initialEta={activeOrder.etaMinutes ?? null}
          initialReason={activeOrder.reason ?? null}
          onDone={() => {
            // kad user klikne "OK" na accepted/rejected
            clearOrder();
          }}
        />
      ) : null}
    </OrderTrackingContext.Provider>
  );
}

export function useOrderTracking() {
  const ctx = useContext(OrderTrackingContext);
  if (!ctx)
    throw new Error(
      'useOrderTracking must be used within OrderTrackingProvider',
    );
  return ctx;
}
