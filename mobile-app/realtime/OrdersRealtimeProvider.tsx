// src/realtime/OrdersRealtimeProvider.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/authContext";
import {
  connectOrdersSocket,
  disconnectOrdersSocket,
  onNewOrder,
  attachPushListeners,
  registerForPushAsync,
  type NewOrderEvent,
} from "./ordersRealtime";

import { acceptAdminOrder, rejectAdminOrder } from "../api/orders";

// ✅ your bottom sheet wrapper
import { GorhomSheetModal } from "../components/products/bottom-sheet-modal";

// Simple styles aligned with your "no radius / bottom border" vibe
import { productsStyles as styles } from "../styles/products.styles";

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

  const [incoming, setIncoming] = useState<NewOrderEvent | null>(null);
  const [busy, setBusy] = useState(false);

  // avoid re-opening same order repeatedly
  const openedRef = useRef<Set<string>>(new Set());

  const isAdmin = role === "admin" || role === "superuser";

  async function openIncoming(ev: NewOrderEvent) {
    if (!ev?.id) return;

    if (openedRef.current.has(ev.id)) return;
    openedRef.current.add(ev.id);

    setIncoming(ev);
  }

  useEffect(() => {
    if (!isAdmin) return;

    // 1) Socket
    connectOrdersSocket().catch(() => {});

    const unsub = onNewOrder((ev) => openIncoming(ev));

    // 2) Push listeners (foreground + tap)
    const detachPush = attachPushListeners((ev) => openIncoming(ev));

    // 3) Register push token (send to backend in your own endpoint)
    registerForPushAsync().then((token) => {
      if (!token) return;
      // TODO: POST /me/push-token
      // await savePushToken(token)
    });

    return () => {
      unsub();
      detachPush();
      disconnectOrdersSocket();
    };
  }, [isAdmin]);

  async function handleAccept() {
    if (!incoming?.id) return;
    setBusy(true);
    try {
      await acceptAdminOrder(incoming.id, { etaMinutes: 30 });
      setIncoming(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!incoming?.id) return;
    setBusy(true);
    try {
      await rejectAdminOrder(incoming.id, {});
      setIncoming(null);
    } finally {
      setBusy(false);
    }
  }

  // If you allow closing via backdrop/pan-down, decide what “close” means:
  // - If you want to re-open later from same event, delete from openedRef here.
  // - If you want to never re-open the same event, keep it as-is.
  function handleCloseSheet() {
    setIncoming(null);
    // openedRef.current.delete(incoming?.id ?? ""); // <- enable if you want re-open
  }

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  return (
    <>
      {children}

      {/* ✅ Global incoming order sheet */}
      <GorhomSheetModal
        visible={!!incoming}
        onClose={handleCloseSheet}
        bg={bg}
        nonClosable
        border={border}
        snapPoints={["45%"]}
        header={
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: fg }]}>
                Nova porudžbina
              </Text>
              <Text style={{ color: muted, marginTop: 2, fontWeight: "700" }}>
                Reagujte da biste nastavili.
              </Text>
            </View>

            {/* If you want a visible close button, uncomment */}
            {/* <TouchableOpacity
              onPress={handleCloseSheet}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Zatvori"
              style={styles.iconBtnNoBorder}
            >
              <Ionicons name="close-outline" size={26} color={fg} />
            </TouchableOpacity> */}
          </View>
        }
        footer={
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={handleReject}
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
        <View
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: border,
          }}
        >
          <Text style={{ fontWeight: "800", color: muted }}>Kod:</Text>
          <Text style={{ fontWeight: "800", color: fg, fontSize: 18 }}>
            {incoming?.publicCode ?? "-"}
          </Text>

          {typeof incoming?.total === "number" ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: "800", color: muted }}>Ukupno:</Text>
              <Text style={{ fontWeight: "800", color: fg, fontSize: 18 }}>
                {incoming.total} RSD
              </Text>
            </View>
          ) : null}
        </View>

        {/* optional extra info */}
        {/* <View style={{ marginTop: 12 }}>
          <Text style={{ color: muted, fontWeight: "700" }}>
            Dodajte ovde detalje (stavke, adresa, napomena…)
          </Text>
        </View> */}
      </GorhomSheetModal>
    </>
  );
}
