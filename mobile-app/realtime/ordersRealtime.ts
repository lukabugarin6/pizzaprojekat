// src/realtime/ordersRealtime.ts
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";

import { getTokens, refreshAccessToken } from "../api/auth";

// --- Types ---
export type NewOrderEvent = {
  id: string;
  publicCode: string;

  type?: string;
  status?: string;
  total?: number;
  createdAt?: string;

  fullName?: string;
  phone?: string;
  email?: string;
  addressText?: string | null;
  note?: string | null;

  items?: Array<{
    id?: string;
    productId?: string;
    variantId?: string;
    productName?: string;
    variantSize?: number | null;
    unitPrice?: number;
    quantity?: number;
    lineTotal?: number;
  }>;
};

type Listener = (ev: NewOrderEvent) => void;

let socket: Socket | null = null;
const listeners: Set<Listener> = new Set();

// push listener subs (so we don't attach duplicates)
let pushSubReceived: Notifications.Subscription | null = null;
let pushSubResponse: Notifications.Subscription | null = null;

// -----------------------
// HELPERS
// -----------------------
function apiBaseNoSlash() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

/**
 * Normalize event from any source (socket payload OR push notification data).
 * Requires BOTH id and publicCode (admin needs id for accept/reject).
 */
function normalizeNewOrderEvent(payload: any): NewOrderEvent | null {
  const id = String(payload?.id ?? payload?.orderId ?? "").trim();
  const publicCode = String(payload?.publicCode ?? payload?.code ?? "").trim();
  if (!id || !publicCode) return null;

  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.amount === "number"
        ? payload.amount
        : undefined;

  const items = Array.isArray(payload?.items) ? payload.items : undefined;

  return {
    id,
    publicCode,

    type: payload?.type,
    status: payload?.status,
    total,
    createdAt: payload?.createdAt,

    fullName: payload?.fullName,
    phone: payload?.phone,
    email: payload?.email,
    addressText: payload?.addressText ?? null,
    note: payload?.note ?? null,

    items,
  };
}

// ✅ Local notification fallback
async function scheduleLocalOrderNotification(ev: NewOrderEvent) {
  try {
    const bodyParts: string[] = [`Kod: ${ev.publicCode}`];
    if (typeof ev.total === "number")
      bodyParts.push(`${Math.round(ev.total)} RSD`);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nova porudžbina",
        body: bodyParts.join(" "),
        sound: "default",

        // ✅ important on Android (must match setNotificationChannelAsync)
        ...(Platform.OS === "android" ? { channelId: "orders" as any } : {}),

        // ✅ store FULL event in data so a tap/receive can re-open with details
        data: {
          orderId: ev.id,
          id: ev.id,
          publicCode: ev.publicCode,

          type: ev.type,
          status: ev.status,
          total: ev.total,
          createdAt: ev.createdAt,

          fullName: ev.fullName,
          phone: ev.phone,
          email: ev.email,
          addressText: ev.addressText,
          note: ev.note,

          items: ev.items ?? [],
        },
      },
      trigger: null, // immediately
    });
  } catch (e) {
    console.log("[orders:local-notif] failed:", e);
  }
}

// -----------------------
// PUBSUB
// -----------------------
export function onNewOrder(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitNewOrder(ev: NewOrderEvent) {
  for (const cb of listeners) cb(ev);
}

// -----------------------
// PUSH
// -----------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // iOS
    shouldShowList: true, // iOS
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  console.log("[push] expo token:", token);
  return token;
}

// -----------------------
// SOCKET
// -----------------------
export async function connectOrdersSocket(opts?: {
  /**
   * If true, create a local notification on socket "orders:new" too.
   * Default: true
   */
  localNotifyOnSocket?: boolean;
}) {
  const { localNotifyOnSocket = true } = opts ?? {};

  const base = apiBaseNoSlash();
  if (!base) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  if (socket?.connected) return socket;

  const { accessToken } = await getTokens();

  socket = io(`${base}/orders`, {
    transports: ["websocket"],
    auth: { token: accessToken || "" },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
  });

  socket.on("connect_error", async (err: any) => {
    const msg = String(err?.message ?? "").toLowerCase();
    if (msg.includes("jwt") || msg.includes("token")) {
      const ok = await refreshAccessToken();
      if (ok) {
        const { accessToken: t2 } = await getTokens();
        if (socket) {
          socket.auth = { token: t2 || "" };
          socket.connect();
        }
      }
    }
  });

  socket.on("orders:new", async (payload: any) => {
    const ev = normalizeNewOrderEvent(payload);

    if (!ev) return;

    emitNewOrder(ev);

    if (localNotifyOnSocket) {
      await scheduleLocalOrderNotification(ev);
    }
  });

  return socket;
}

export function disconnectOrdersSocket() {
  socket?.disconnect();
  socket = null;
}

// -----------------------
// APP-LEVEL PUSH LISTENERS
// -----------------------
export function attachPushListeners(onOpenOrder: (ev: NewOrderEvent) => void) {
  // prevent duplicate subscriptions if called multiple times
  if (pushSubReceived || pushSubResponse) {
    return () => {
      pushSubReceived?.remove();
      pushSubResponse?.remove();
      pushSubReceived = null;
      pushSubResponse = null;
    };
  }

  const buildFromNotif = (data: any) => {
    // data can contain either minimal or full fields; we try full first
    const ev = normalizeNewOrderEvent({
      id: data?.orderId ?? data?.id,
      publicCode: data?.publicCode ?? data?.code,

      type: data?.type,
      status: data?.status,
      total: data?.total,
      createdAt: data?.createdAt,

      fullName: data?.fullName,
      phone: data?.phone,
      email: data?.email,
      addressText: data?.addressText,
      note: data?.note,

      items: data?.items,
    });

    return ev;
  };

  pushSubReceived = Notifications.addNotificationReceivedListener((n) => {
    const data: any = n.request.content.data ?? {};
    const ev = buildFromNotif(data);
    if (ev) onOpenOrder(ev);
  });

  pushSubResponse = Notifications.addNotificationResponseReceivedListener(
    (resp) => {
      const data: any = resp.notification.request.content.data ?? {};
      const ev = buildFromNotif(data);
      if (ev) onOpenOrder(ev);
    },
  );

  return () => {
    pushSubReceived?.remove();
    pushSubResponse?.remove();
    pushSubReceived = null;
    pushSubResponse = null;
  };
}
