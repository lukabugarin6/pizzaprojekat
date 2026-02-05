// src/realtime/ordersSync.ts (or inside provider)
import { getTokens, refreshAccessToken } from "../api/auth";

function apiBaseNoSlash() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

async function apiGet(path: string) {
  const base = apiBaseNoSlash();
  let { accessToken } = await getTokens();

  // try once with current token
  let res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // if expired, refresh and retry once
  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) return null;
    ({ accessToken } = await getTokens());

    res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  if (!res.ok) return null;
  return res.json();
}

// You return PENDING with items. Your backend already returns items in adminList.
export async function fetchPendingOrders(): Promise<any[] | null> {
  return apiGet(`/orders/admin?status=PENDING`) as any; // adjust route if different
}
