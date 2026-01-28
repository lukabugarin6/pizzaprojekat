// src/realtime/OrdersRealtimeProvider.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import { useAuth } from "../context/authContext";
import {
  connectOrdersSocket,
  disconnectOrdersSocket,
  onNewOrder,
  attachPushListeners,
  type NewOrderEvent,
} from "./ordersRealtime";

import { acceptAdminOrder, rejectAdminOrder } from "../api/orders";
import { GorhomSheetModal } from "../components/products/bottom-sheet-modal";
import { productsStyles as styles } from "../styles/products.styles";

import ReactContext from "react";
import { registerAndSyncPushToken } from "./pushSync";

type OrdersRealtimeCtx = {
  lastNewOrderKey: number;
  lastNewOrder?: NewOrderEvent | null;

  ordersChangedKey: number;

  markHandled: (ev: Pick<NewOrderEvent, "id" | "publicCode">) => void;
  bumpOrdersChanged: () => void;
};

const OrdersRealtimeContext = ReactContext.createContext<OrdersRealtimeCtx>({
  lastNewOrderKey: 0,
  lastNewOrder: null,
  ordersChangedKey: 0,
  markHandled: () => {},
  bumpOrdersChanged: () => {},
});

export function useOrdersRealtime() {
  return React.useContext(OrdersRealtimeContext);
}

function isDelivery(type?: string) {
  const t = String(type ?? "").toLowerCase();
  return t.includes("delivery");
}
function formatType(type?: string) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("delivery")) return "Dostava";
  if (t.includes("pickup") || t.includes("pick_up")) return "Preuzimanje";
  return type ? String(type) : "-";
}
function moneyRsd(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return `${Math.round(n)} RSD`;
}
function safeText(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : "-";
}
function formatDateDMYHM(iso?: string) {
  const s = String(iso ?? "").trim();
  if (!s) return "";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}.${mm}.${yyyy}. ${hh}:${min}`;
}

function clampEtaMinutes(v: any) {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const m = Math.trunc(n);
  if (m < 1) return 1;
  if (m > 600) return 600;
  return m;
}

function handledKey(ev: Pick<NewOrderEvent, "id" | "publicCode">) {
  const id = String(ev?.id ?? "").trim();
  const code = String(ev?.publicCode ?? "").trim();
  return `${id}::${code}`;
}

// ✅ detect "empty payload" (ghost reopen)
function isThinOrEmpty(ev: NewOrderEvent | null) {
  if (!ev) return true;

  const hasIdOrCode =
    !!String(ev.id ?? "").trim() || !!String(ev.publicCode ?? "").trim();
  if (!hasIdOrCode) return true;

  const items = Array.isArray((ev as any).items) ? (ev as any).items : [];
  const hasItems = items.length > 0;

  const hasAnyMeaningfulField =
    !!String(ev.publicCode ?? "").trim() ||
    typeof ev.total === "number" ||
    !!String(ev.fullName ?? "").trim() ||
    !!String(ev.phone ?? "").trim() ||
    !!String(ev.email ?? "").trim() ||
    !!String(ev.addressText ?? "").trim() ||
    !!String(ev.note ?? "").trim();

  return !hasAnyMeaningfulField && !hasItems;
}

// ✅ Build event from push notification data
function buildEventFromNotifData(data: any): NewOrderEvent | null {
  const id = String(data?.orderId ?? data?.id ?? "").trim();
  const publicCode = String(data?.publicCode ?? data?.code ?? "").trim();
  if (!id || !publicCode) return null;

  return {
    id,
    publicCode,

    type: data?.type,
    status: data?.status,
    total: typeof data?.total === "number" ? data.total : undefined,
    createdAt: data?.createdAt,

    fullName: data?.fullName,
    phone: data?.phone,
    email: data?.email,
    addressText: data?.addressText ?? null,
    note: data?.note ?? null,

    items: Array.isArray(data?.items) ? data.items : undefined,
  };
}

export function OrdersRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useAuth();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";

  const accent = "#e67428";
  const accentFg = "#fff";
  const danger = "#EB5757";

  const isAdmin = role === "admin" || role === "superuser";

  // ✅ QUEUE of incoming orders (FIFO) + browsing
  const [incomingQueue, setIncomingQueue] = useState<NewOrderEvent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const incoming = incomingQueue[activeIndex] ?? null;
  const queueCount = incomingQueue.length;

  const [busy, setBusy] = useState(false);

  // ✅ ETA per order (so you can browse without losing values)
  const [etaByKey, setEtaByKey] = useState<Record<string, number>>({});

  const etaMinutes = useMemo(() => {
    if (!incoming) return 15;
    const k = handledKey(incoming);
    return etaByKey[k] ?? 15;
  }, [incoming, etaByKey]);

  const setEtaMinutes = useCallback(
    (updater: (v: number) => number) => {
      setEtaByKey((prev) => {
        const ev = incoming;
        if (!ev) return prev;
        const k = handledKey(ev);
        const cur = prev[k] ?? 15;
        return { ...prev, [k]: updater(cur) };
      });
    },
    [incoming],
  );

  // ✅ tap-to-edit ETA (same box styles)
  const [etaEditing, setEtaEditing] = useState(false);
  const [etaDraft, setEtaDraft] = useState("");
  const etaInputRef = useRef<TextInput>(null);

  const commitEta = useCallback(() => {
    const n = clampEtaMinutes(etaDraft);

    // ❗️invalid (empty, 0, NaN) -> keep editing & refocus
    if (n === null) {
      requestAnimationFrame(() => etaInputRef.current?.focus());
      return;
    }

    setEtaMinutes(() => n);
    setEtaDraft("");
    setEtaEditing(false);
  }, [etaDraft, setEtaMinutes]);

  // ✅ when switching queue item, exit edit mode
  useEffect(() => {
    setEtaEditing(false);
    setEtaDraft("");
  }, [incoming?.id]);

  const openedRef = useRef<Set<string>>(new Set());
  const handledRef = useRef<Set<string>>(new Set());

  // ✅ context signals
  const [lastNewOrderKey, setLastNewOrderKey] = useState(0);
  const [lastNewOrder, setLastNewOrder] = useState<NewOrderEvent | null>(null);
  const [ordersChangedKey, setOrdersChangedKey] = useState(0);

  const bumpOrdersChanged = useCallback(() => {
    setOrdersChangedKey((x) => x + 1);
  }, []);

  const markHandled = useCallback(
    (ev: Pick<NewOrderEvent, "id" | "publicCode">) => {
      handledRef.current.add(handledKey(ev));
    },
    [],
  );

  // ✅ keep activeIndex in range if queue shrinks
  useEffect(() => {
    if (activeIndex > incomingQueue.length - 1) {
      setActiveIndex(Math.max(0, incomingQueue.length - 1));
    }
  }, [incomingQueue.length, activeIndex]);

  // ✅ replace existing queued item if the same order comes with richer payload
  const upsertIntoQueue = useCallback((ev: NewOrderEvent) => {
    setIncomingQueue((prev) => {
      const key = handledKey(ev);

      const idx = prev.findIndex((x) => handledKey(x) === key);
      if (idx === -1) return [...prev, ev];

      const cur = prev[idx];
      const curItems = Array.isArray((cur as any)?.items)
        ? (cur as any).items
        : [];
      const nextItems = Array.isArray((ev as any)?.items)
        ? (ev as any).items
        : [];

      if (curItems.length === 0 && nextItems.length > 0) {
        const copy = [...prev];
        copy[idx] = ev;
        return copy;
      }

      return prev;
    });
  }, []);

  const openIncoming = useCallback(
    async (ev: NewOrderEvent) => {
      if (!ev?.id && !ev?.publicCode) return;

      const key = handledKey(ev);

      // already handled -> ignore
      if (handledRef.current.has(key)) return;

      // ignore empty/ghost payload
      if (isThinOrEmpty(ev)) return;

      // first time we ever saw this exact order -> signal + opened
      const firstTime = !openedRef.current.has(key);
      if (firstTime) {
        openedRef.current.add(key);

        setLastNewOrder(ev);
        setLastNewOrderKey((x) => x + 1);

        // new order means list changed
        bumpOrdersChanged();
      }

      // push/upgrade into queue
      upsertIntoQueue(ev);
    },
    [bumpOrdersChanged, upsertIntoQueue],
  );

  // ✅ COLD START: if user tapped notification to open the app (killed -> open)
  useEffect(() => {
    console.log("[push-sync] isAdmin?", isAdmin, "role=", role);

    if (!isAdmin) return;

    let cancelled = false;

    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const data: any = last?.notification?.request?.content?.data ?? null;
        if (cancelled || !data) return;

        const ev = buildEventFromNotifData(data);
        if (!ev) return;

        // This will be safely deduped by openedRef/handledRef anyway
        await openIncoming(ev);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, openIncoming, role]);

  useEffect(() => {
    console.log("[push-sync] isAdmin?", isAdmin, "role=", role);
    if (!isAdmin) return;

    // push token sync
    registerAndSyncPushToken().catch((e) => {
      if (__DEV__) console.log("[push-sync] failed", e);
    });

    // connect socket + subscribe to events
    connectOrdersSocket({ localNotifyOnSocket: true }).catch(() => {});
    const unsub = onNewOrder((ev) => openIncoming(ev));

    // ✅ IMPORTANT:
    // attachPushListeners now:
    // - opens on TAP always
    // - opens on RECEIVED only when app is active AND socket is NOT connected
    const detachPush = attachPushListeners((ev) => openIncoming(ev));

    return () => {
      unsub();
      detachPush();
      disconnectOrdersSocket();
    };
  }, [isAdmin, openIncoming, role]);

  // ✅ remove a specific order (by index) and keep index stable
  const removeAt = useCallback((idx: number) => {
    setIncomingQueue((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      return prev.slice(0, idx).concat(prev.slice(idx + 1));
    });

    setActiveIndex((i) => {
      if (idx < i) return Math.max(0, i - 1);
      if (idx === i) return Math.max(0, i); // will be clamped by effect if needed
      return i;
    });
  }, []);

  // pager
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < incomingQueue.length - 1;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(incomingQueue.length - 1, i + 1));
  }, [incomingQueue.length]);

  // ✅ REJECT confirm modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const rejectInputRef = useRef<TextInput>(null);

  // when order changes, close reject modal
  useEffect(() => {
    setRejectOpen(false);
    setRejectReason("");
  }, [incoming?.id]);

  const openRejectModal = useCallback(() => {
    if (busy) return;
    setRejectReason("");
    setRejectOpen(true);
    requestAnimationFrame(() => rejectInputRef.current?.focus());
  }, [busy]);

  const closeRejectModal = useCallback(() => {
    if (busy) return;
    setRejectOpen(false);
    setRejectReason("");
  }, [busy]);

  async function handleAccept() {
    if (!incoming?.id) return;

    const eta = clampEtaMinutes(etaMinutes);
    if (!eta) return;

    // ✅ block late reopen
    markHandled(incoming);

    const currentId = incoming.id;
    const idx = activeIndex;

    // ✅ move UI forward immediately
    removeAt(idx);

    setBusy(true);
    try {
      await acceptAdminOrder(currentId, { etaMinutes: eta });
      bumpOrdersChanged();
    } finally {
      setBusy(false);
    }
  }

  // ✅ final reject after confirm
  async function confirmReject() {
    if (!incoming?.id) return;

    const reason = rejectReason.trim();
    if (!reason) {
      requestAnimationFrame(() => rejectInputRef.current?.focus());
      return;
    }

    // close modal first (so UI feels snappy), then continue
    setRejectOpen(false);

    markHandled(incoming);

    const currentId = incoming.id;
    const idx = activeIndex;

    removeAt(idx);

    setBusy(true);
    try {
      await rejectAdminOrder(currentId, { reason });
      bumpOrdersChanged();
    } finally {
      setBusy(false);
      setRejectReason("");
    }
  }

  function handleCloseSheet() {
    // nonClosable, but just in case
    if (!incoming) return;
    removeAt(activeIndex);
  }

  // ✅ if current becomes ghost/empty, auto-remove it
  useEffect(() => {
    if (!incoming) return;
    if (isThinOrEmpty(incoming)) removeAt(activeIndex);
  }, [incoming, activeIndex, removeAt]);

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  const items = useMemo(() => {
    const arr = (incoming as any)?.items;
    return Array.isArray(arr) ? arr : [];
  }, [incoming]);

  const showAddress =
    isDelivery(incoming?.type) && !!(incoming as any)?.addressText;

  const createdLabel = formatDateDMYHM(incoming?.createdAt);

  return (
    <OrdersRealtimeContext.Provider
      value={{
        lastNewOrderKey,
        lastNewOrder,
        ordersChangedKey,
        markHandled,
        bumpOrdersChanged,
      }}
    >
      {children}

      {/* ✅ Reject reason modal (step back if closed) */}
      <Modal
        visible={rejectOpen}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              padding: 16,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                padding: 14,
              }}
            >
              <Text style={{ color: fg, fontWeight: "900", fontSize: 16 }}>
                Razlog odbijanja
              </Text>
              <Text style={{ color: muted, marginTop: 6, fontWeight: "700" }}>
                Unesi kratko objašnjenje (obavezno).
              </Text>

              <TextInput
                ref={rejectInputRef}
                value={rejectReason}
                onChangeText={setRejectReason}
                autoFocus
                multiline
                textAlignVertical="top"
                selectionColor={accent}
                placeholder="Npr. Nema sastojaka / Ne možemo isporučiti u tom terminu..."
                placeholderTextColor={muted}
                style={{
                  marginTop: 12,
                  minHeight: 110,
                  borderWidth: 1,
                  borderColor: border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: fg,
                  fontWeight: "700",
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  disabled={busy}
                  onPress={closeRejectModal}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 44,
                    borderWidth: 1,
                    borderColor: border,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(busy ? disabledStyle : null),
                  }}
                >
                  <Text style={{ color: fg, fontWeight: "900" }}>Nazad</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={busy}
                  onPress={confirmReject}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 44,
                    borderWidth: 1,
                    borderColor: danger,
                    backgroundColor: danger,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(busy ? disabledStyle : null),
                  }}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      Potvrdi odbijanje
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <GorhomSheetModal
        visible={!!incoming}
        onClose={handleCloseSheet}
        bg={bg}
        nonClosable
        border={border}
        snapPoints={["100%"]}
        header={
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: fg }]}>
                Nova porudžbina
              </Text>

              <Text style={{ color: muted, marginTop: 2, fontWeight: "700" }}>
                {formatType(incoming?.type)}
                {createdLabel ? ` ${createdLabel}` : ""}
              </Text>
            </View>

            {/* ✅ pager + ETA controls */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* pager */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: border,
                  height: 36,
                }}
              >
                <TouchableOpacity
                  disabled={busy || !canPrev}
                  onPress={goPrev}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-back-outline" size={18} color={fg} />
                </TouchableOpacity>

                <Text
                  style={{ color: fg, fontWeight: "900", paddingHorizontal: 8 }}
                >
                  {queueCount === 0
                    ? "0/0"
                    : `${activeIndex + 1}/${queueCount}`}
                </Text>

                <TouchableOpacity
                  disabled={busy || !canNext}
                  onPress={goNext}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color={fg}
                  />
                </TouchableOpacity>
              </View>

              {/* ETA +/- + tap-to-edit */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: border,
                  height: 36,
                }}
              >
                <TouchableOpacity
                  disabled={busy || etaEditing}
                  onPress={() => setEtaMinutes((v) => Math.max(5, v - 5))}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="remove-outline" size={18} color={fg} />
                </TouchableOpacity>

                <View
                  style={{
                    width: 54,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!etaEditing ? (
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => {
                        setEtaDraft(String(Math.max(1, etaMinutes)));
                        setEtaEditing(true);
                        requestAnimationFrame(() =>
                          etaInputRef.current?.focus(),
                        );
                      }}
                      activeOpacity={0.85}
                      style={{
                        width: 54,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: fg, fontWeight: "900" }}>
                        {Math.max(1, etaMinutes)}m
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      ref={etaInputRef}
                      value={etaDraft}
                      onChangeText={(t) => setEtaDraft(t.replace(/[^\d]/g, ""))}
                      onSubmitEditing={commitEta}
                      onBlur={commitEta}
                      autoFocus
                      keyboardType="number-pad"
                      returnKeyType="done"
                      selectionColor={accent}
                      style={{
                        width: 54,
                        height: 36,
                        color: fg,
                        fontWeight: "900",
                        textAlign: "center",
                        textAlignVertical: "center",
                        paddingVertical: 0,
                        paddingHorizontal: 0,
                        margin: 0,
                        includeFontPadding: false,
                      }}
                    />
                  )}
                </View>

                <TouchableOpacity
                  disabled={busy || etaEditing}
                  onPress={() => setEtaMinutes((v) => Math.min(600, v + 5))}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-outline" size={18} color={fg} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        footer={
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={openRejectModal}
              disabled={busy}
              style={[
                styles.modalBtn,
                { borderColor: danger, backgroundColor: "transparent" },
                busy ? disabledStyle : null,
              ]}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={danger} />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={danger}
                  />
                  <Text style={[styles.cancelText, { color: danger }]}>
                    Odbij
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              disabled={busy}
              style={[
                styles.modalBtn,
                { borderColor: accent, backgroundColor: accent },
                busy ? disabledStyle : null,
              ]}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={accentFg} />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={accentFg}
                  />
                  <Text style={[styles.saveText, { color: accentFg }]}>
                    Prihvati
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      >
        {/* 1) STAVKE + UKUPNO */}
        <View
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: border,
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              {items.length === 0 ? (
                <Text style={{ color: muted, fontWeight: "700" }}>
                  Nema stavki u payload-u.
                </Text>
              ) : (
                items.map((it: any, idx: number) => {
                  const name = safeText(it?.productName);
                  const size =
                    it?.variantSize === null || it?.variantSize === undefined
                      ? ""
                      : ` • ${it.variantSize}`;

                  const qty =
                    typeof it?.quantity === "number" &&
                    Number.isFinite(it.quantity)
                      ? it.quantity
                      : null;

                  const line =
                    typeof it?.lineTotal === "number" &&
                    Number.isFinite(it.lineTotal)
                      ? it.lineTotal
                      : null;

                  return (
                    <View
                      key={it?.id ?? `${incoming?.id ?? "order"}:${idx}`}
                      style={{
                        paddingBottom: 10,
                        borderBottomWidth: idx === items.length - 1 ? 0 : 1,
                      }}
                    >
                      <Text
                        style={{ color: fg, fontWeight: "800", fontSize: 16 }}
                      >
                        {name}
                        {size && `${size}cm`} {qty !== null ? `x${qty}` : "x-"}
                      </Text>

                      <Text
                        style={{ color: fg, marginTop: 2, fontWeight: "800" }}
                      >
                        {line !== null ? moneyRsd(line) : "-"}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ alignItems: "flex-start" }}>
              <Text style={{ fontWeight: "800", color: muted }}>Ukupno:</Text>
              <Text style={{ fontWeight: "800", color: fg, fontSize: 18 }}>
                {moneyRsd(incoming?.total)}
              </Text>
            </View>
          </View>
        </View>

        {(incoming as any)?.note ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: "800", color: muted, marginBottom: 6 }}>
              Napomena
            </Text>
            <Text
              style={{
                color: fg,
                fontWeight: "500",
                paddingBottom: 10,
                fontSize: 36,
              }}
            >
              {safeText((incoming as any)?.note)}
            </Text>
          </View>
        ) : null}

        {/* 3) KUPAC */}
        <View
          style={{
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <Text style={{ fontWeight: "800", color: muted, marginBottom: 6 }}>
            Kupac
          </Text>

          <Text style={{ color: fg, fontWeight: "800" }}>
            {safeText((incoming as any)?.fullName)}
          </Text>

          <Text style={{ color: fg, marginTop: 4, fontWeight: "700" }}>
            📞 {safeText((incoming as any)?.phone)}
          </Text>

          <Text style={{ color: fg, marginTop: 4, fontWeight: "700" }}>
            ✉️ {safeText((incoming as any)?.email)}
          </Text>

          {showAddress ? (
            <View style={{ marginTop: 10 }}>
              <Text
                style={{ fontWeight: "800", color: muted, marginBottom: 6 }}
              >
                Adresa
              </Text>
              <Text style={{ color: fg, fontWeight: "700" }}>
                {safeText((incoming as any)?.addressText)}
              </Text>
            </View>
          ) : null}
        </View>
      </GorhomSheetModal>
    </OrdersRealtimeContext.Provider>
  );
}
