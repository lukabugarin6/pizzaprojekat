// src/realtime/OrdersRealtimeProvider.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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

import {
  fetchAdminOrders,
  acceptAdminOrder,
  rejectAdminOrder,
} from "../api/orders";

// Simple styles aligned with your "no radius / bottom border" vibe
import { productsStyles as styles } from "../styles/products.styles";

export function OrdersRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useAuth();

  const [incoming, setIncoming] = useState<NewOrderEvent | null>(null);
  const [busy, setBusy] = useState(false);

  // (optional) keep latest pending list in memory
  const openedRef = useRef<Set<string>>(new Set());

  const isAdmin = role === "admin" || role === "superuser";

  async function openIncoming(ev: NewOrderEvent) {
    if (!ev?.id) return;

    // avoid re-opening same order repeatedly
    if (openedRef.current.has(ev.id)) return;
    openedRef.current.add(ev.id);

    setIncoming(ev);
  }

  useEffect(() => {
    if (!isAdmin) return;

    // 1) Socket
    connectOrdersSocket().catch(() => {});

    const unsub = onNewOrder((ev) => {
      openIncoming(ev);
    });

    // 2) Push listeners (foreground + tap)
    const detachPush = attachPushListeners((ev) => openIncoming(ev));

    // 3) Register push token (send to backend in your own endpoint)
    // NOTE: you'll need an API endpoint to store this token per admin user
    registerForPushAsync().then((token) => {
      if (!token) return;
      // TODO: call your backend endpoint: POST /me/push-token
      // e.g. await savePushToken(token)
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

  return (
    <>
      {children}

      {/* ✅ Global incoming order modal */}
      <Modal visible={!!incoming} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View style={{ backgroundColor: "#fff", padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", flex: 1 }}>
                Nova porudžbina
              </Text>

              {/* no close button if you want to “force” action */}
              {/* If you want a hidden option, add it here */}
            </View>

            <View
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(0,0,0,0.15)",
              }}
            >
              <Text style={{ fontWeight: "800" }}>Kod:</Text>
              <Text style={{ fontWeight: "700" }}>{incoming?.publicCode}</Text>

              {typeof incoming?.total === "number" ? (
                <>
                  <Text style={{ marginTop: 8, fontWeight: "800" }}>
                    Ukupno:
                  </Text>
                  <Text style={{ fontWeight: "700" }}>
                    {incoming.total} RSD
                  </Text>
                </>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleReject}
                disabled={busy}
                style={[
                  styles.modalBtn,
                  { borderColor: "#EB5757", backgroundColor: "transparent" },
                  busy ? { opacity: 0.6 } : null,
                ]}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#EB5757" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#EB5757"
                    />
                    <Text style={[styles.cancelText, { color: "#EB5757" }]}>
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
                  { borderColor: "#e67428", backgroundColor: "#e67428" },
                  busy ? { opacity: 0.6 } : null,
                ]}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#fff"
                    />
                    <Text style={[styles.saveText, { color: "#fff" }]}>
                      Prihvati
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* optional: show details button to navigate */}
            {/* <TouchableOpacity ...>Detalji</TouchableOpacity> */}
          </View>
        </View>
      </Modal>
    </>
  );
}
