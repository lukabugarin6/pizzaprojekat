// src/realtime/ordersRealtime.ts
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";

import { getTokens, refreshAccessToken } from "../api/auth";

// NOTE:
// fetchAdminOrders / acceptAdminOrder / rejectAdminOrder were imported but unused here.
// Keeping this file focused: realtime + push plumbing.

// --- Types (minimal) ---
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

function toNewOrderEventFromAny(payload: any): NewOrderEvent | null {
  const id = String(payload?.id ?? payload?.orderId ?? "").trim();
  const publicCode = String(payload?.publicCode ?? payload?.code ?? "").trim();

  if (!id || !publicCode) return null;

  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.amount === "number"
        ? payload.amount
        : undefined;

  return {
    id,
    publicCode,
    type: payload?.type,
    total,
    createdAt: payload?.createdAt,
  };
}

// ✅ Local notification (covers the “modal works but no push” scenario)
// - If your backend also sends push, you'll still get server pushes too.
// - You can disable this if you only want server pushes.
async function scheduleLocalOrderNotification(ev: NewOrderEvent) {
  try {
    const bodyParts: string[] = [`Kod: ${ev.publicCode}`];
    if (typeof ev.total === "number") bodyParts.push(`${ev.total} RSD`);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nova porudžbina",
        body: bodyParts.join(" • "),
        data: {
          orderId: ev.id,
          publicCode: ev.publicCode,
          type: ev.type,
          total: ev.total,
          createdAt: ev.createdAt,
        },
        sound: "default",
      },
      trigger: null, // immediately
    });
  } catch (e) {
    // don't crash realtime on notif errors
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
  if (!Device.isDevice) return null; // simulators usually no push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") return null;

  // ✅ When you use EAS builds, this is fine. (Expo Go behaves differently for push.)
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // ✅ Android channel must match "channelId" used in push payload
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
   * Useful when backend push isn't wired yet.
   * Default: true
   */
  localNotifyOnSocket?: boolean;
}) {
  const { localNotifyOnSocket = true } = opts ?? {};

  const base = apiBaseNoSlash();
  if (!base) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  // prevent duplicates
  if (socket?.connected) return socket;

  const { accessToken } = await getTokens();

  socket = io(`${base}/orders`, {
    transports: ["websocket"],
    auth: { token: accessToken || "" },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
  });

  socket.on("connect", () => {
    console.log("[orders socket] connected");
  });

  socket.on("disconnect", () => {
    console.log("[orders socket] disconnected");
  });

  socket.on("connect_error", async (err: any) => {
    console.log("[orders socket] connect_error:", err?.message ?? err);

    // If token expired, refresh once and update auth
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

  socket.on("orders:new", (payload: any) => {
    console.log("[orders:new] raw payload:", payload);

    const ev: NewOrderEvent = {
      id: String(payload?.id ?? ""),
      publicCode: String(payload?.publicCode ?? ""),

      type: payload?.type,
      status: payload?.status,
      total: typeof payload?.total === "number" ? payload.total : undefined,
      createdAt: payload?.createdAt,

      fullName: payload?.fullName,
      phone: payload?.phone,
      email: payload?.email,
      addressText: payload?.addressText ?? null,
      note: payload?.note ?? null,

      items: Array.isArray(payload?.items) ? payload.items : [],
    };

    console.log("[orders:new] parsed event:", ev);

    if (ev.id && ev.publicCode) emitNewOrder(ev);
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

  pushSubReceived = Notifications.addNotificationReceivedListener((n) => {
    // app is foreground
    console.log("[push received] content:", n.request.content);
    const data: any = n.request.content.data ?? {};

    const ev =
      toNewOrderEventFromAny({
        id: data?.orderId ?? data?.id,
        publicCode: data?.publicCode,
        type: data?.type,
        total: data?.total,
        createdAt: data?.createdAt,
      }) ?? null;

    if (ev) onOpenOrder(ev);
  });

  pushSubResponse = Notifications.addNotificationResponseReceivedListener(
    (resp) => {
      // user tapped notification
      console.log(
        "[push tap] notification:",
        resp.notification.request.content,
      );
      const data: any = resp.notification.request.content.data ?? {};

      const ev =
        toNewOrderEventFromAny({
          id: data?.orderId ?? data?.id,
          publicCode: data?.publicCode,
          type: data?.type,
          total: data?.total,
          createdAt: data?.createdAt,
        }) ?? null;

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
