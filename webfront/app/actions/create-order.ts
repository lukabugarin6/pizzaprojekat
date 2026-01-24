'use server';

type CreateOrderPayload = {
  fullName: string;
  email: string;
  phone: string;
  note?: string;
  type: 'delivery' | 'pickup';
  addressText?: string | null;
  items: { variantId: string; quantity: number }[];
};

export async function createOrderAction(payload: CreateOrderPayload) {
  const base = process.env.ORDERS_API_BASE_URL;
  if (!base) throw new Error('Missing ORDERS_API_BASE_URL');

  const res = await fetch(`${base.replace(/\/$/, '')}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // prosledi jezik sa weba (opciono)
      'Accept-Language': 'sr-Latn',
    },
    body: JSON.stringify({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      note: payload.note ?? null,
      type: payload.type,
      addressText:
        payload.type === 'delivery' ? (payload.addressText ?? '') : null,
      items: payload.items,
    }),
    cache: 'no-store',
  });

  const txt = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Order failed: ${res.status}${txt ? `\n${txt}` : ''}`);
  }

  const data = txt ? JSON.parse(txt) : null;
  // očekuješ { publicCode, token, status, total }
  return data;
}
