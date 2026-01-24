// src/api/orders.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";

// ------------------------
// Types
// ------------------------

export type OrderStatus = "pending" | "accepted" | "rejected";
export type OrderType = "delivery" | "pickup";

export type OrderItemDto = {
  id: string;
  productName: string;
  variantSize: number | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type HandledByDto = {
  id: number;
  email: string;
};

export type AdminOrderDto = {
  id: string;
  publicCode: string;

  // ✅ added customer fields (from Order entity)
  email: string;
  fullName: string;
  phone: string;

  type: OrderType;
  addressText: string | null;
  note: string | null;
  status: OrderStatus;
  etaMinutes: number | null;
  total: number;
  createdAt: string; // ISO
  handledAt: string | null; // ISO
  handledBy: HandledByDto | null;
  items: OrderItemDto[];
};

export type AdminListOrdersQuery = {
  status?: OrderStatus; // omit => backend returns ALL
};

export type AcceptOrderPayload = {
  etaMinutes: number;
};

export type RejectOrderPayload = {
  // ako tvoj RejectOrderDto nema polja, slobodno ostavi prazno {}
  // reason?: string;
  [key: string]: any;
};

export type AcceptOrderResponse = {
  ok: true;
  id: string;
  publicCode: string;
  status: OrderStatus; // "accepted"
  etaMinutes: number | null;
};

export type RejectOrderResponse = {
  ok: true;
  id: string;
  publicCode: string;
  status: OrderStatus; // "rejected"
};

// ------------------------
// Endpoints
// ------------------------

export const ordersAdminEndpoints = {
  list: "/admin/orders",
  accept: (id: string) => `/admin/orders/${id}/accept`,
  reject: (id: string) => `/admin/orders/${id}/reject`,
};

// ------------------------
// Auth helpers (same pattern as products.ts)
// ------------------------

async function authedFetchJson(path: string, init?: RequestInit) {
  const { accessToken } = await getTokens();

  let res = await apiFetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) return res;

    const { accessToken: access2 } = await getTokens();
    res = await apiFetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: access2 ? `Bearer ${access2}` : "",
        "Content-Type": "application/json",
      },
    });
  }

  return res;
}

// ------------------------
// API
// ------------------------

function buildQuery(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /admin/orders
 * - default: returns ALL (if you omit status)
 * - filter: /admin/orders?status=pending
 */
export async function fetchAdminOrders(
  q?: AdminListOrdersQuery,
): Promise<AdminOrderDto[]> {
  const url = `${ordersAdminEndpoints.list}${buildQuery(q ?? {})}`;

  const res = await authedFetchJson(url, { method: "GET" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Admin orders load failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Admin orders non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as AdminOrderDto[]) : [];
}

/**
 * POST /admin/orders/:id/accept
 * body: { etaMinutes }
 */
export async function acceptAdminOrder(
  orderId: string,
  payload: AcceptOrderPayload,
): Promise<AcceptOrderResponse> {
  const res = await authedFetchJson(ordersAdminEndpoints.accept(orderId), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Accept failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Accept non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as AcceptOrderResponse;
}

/**
 * POST /admin/orders/:id/reject
 * body: {} ili npr { reason: "..." } (zavisi od RejectOrderDto)
 */
export async function rejectAdminOrder(
  orderId: string,
  payload: RejectOrderPayload = {},
): Promise<RejectOrderResponse> {
  const res = await authedFetchJson(ordersAdminEndpoints.reject(orderId), {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Reject failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Reject non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as RejectOrderResponse;
}
