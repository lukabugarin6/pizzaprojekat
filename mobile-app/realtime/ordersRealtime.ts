// src/realtime/ordersRealtime.ts
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";

import { getTokens, refreshAccessToken } from "../api/auth";
import {
  fetchAdminOrders,
  acceptAdminOrder,
  rejectAdminOrder,
} from "../api/orders";

// --- Types (minimal) ---
export type NewOrderEvent = {
  id: string;
  publicCode: string;
  type?: string;
  total?: number;
  createdAt?: string;
};

type Listener = (ev: NewOrderEvent) => void;

let socket: Socket | null = null;
let listeners: Set<Listener> = new Set();

export function onNewOrder(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitNewOrder(ev: NewOrderEvent) {
  for (const cb of listeners) cb(ev);
}

function apiBaseNoSlash() {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
  return raw;
}

// -----------------------
// PUSH
// -----------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // ✅ iOS
    shouldShowList: true, // ✅ iOS
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

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  return token;
}

// -----------------------
// SOCKET
// -----------------------
export async function connectOrdersSocket() {
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
    // console.log("orders socket connected");
  });

  socket.on("disconnect", async () => {
    // console.log("orders socket disconnected");
  });

  socket.on("connect_error", async (err: any) => {
    // If token expired, refresh once and update auth
    if (
      String(err?.message ?? "")
        .toLowerCase()
        .includes("jwt")
    ) {
      const ok = await refreshAccessToken();
      if (ok) {
        const { accessToken: t2 } = await getTokens();
        socket!.auth = { token: t2 || "" };
        socket!.connect();
      }
    }
  });

  socket.on("orders:new", (payload: any) => {
    // expected: { id, publicCode, ... }
    const ev: NewOrderEvent = {
      id: String(payload?.id ?? ""),
      publicCode: String(payload?.publicCode ?? ""),
      type: payload?.type,
      total: typeof payload?.total === "number" ? payload.total : undefined,
      createdAt: payload?.createdAt,
    };
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
  const subReceived = Notifications.addNotificationReceivedListener((n) => {
    // if app is foreground and you want modal instantly:
    const data: any = n.request.content.data ?? {};
    if (data?.orderId && data?.publicCode) {
      onOpenOrder({
        id: String(data.orderId),
        publicCode: String(data.publicCode),
      });
    }
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener(
    (resp) => {
      // user tapped notification (background -> open app)
      const data: any = resp.notification.request.content.data ?? {};
      if (data?.orderId && data?.publicCode) {
        onOpenOrder({
          id: String(data.orderId),
          publicCode: String(data.publicCode),
        });
      }
    },
  );

  return () => {
    subReceived.remove();
    subResponse.remove();
  };
}
