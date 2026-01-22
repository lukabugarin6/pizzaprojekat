// src/api/products.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";

export type Language = "sr-Latn" | "en" | "ru";

export type ProductTranslation = {
  language: Language;
  name: string;
  description: string;
};

export type ProductVariant = {
  size?: number; // optional for drinks/sandwiches
  price: number;
  sku?: string; // optional (depends on your DTO/entity)
};

export type Product = {
  id: string;
  slug: string;
  image?: string | null;
  isActive?: boolean;

  category?: {
    id: string; // ✅ UUID
    slug?: string;
  };

  translations?: ProductTranslation[];
  variants?: ProductVariant[];
};

export type CreateProductPayload = {
  slug: string;
  image: string;
  categoryId: string; // ✅ UUID
  isActive?: boolean;
  translations?: ProductTranslation[];
  variants?: ProductVariant[];
};

// For your current backend PUT, you likely update only scalar fields.
// If you extend backend to "replace/sync" translations/variants, this will work too.
export type UpdateProductPayload = Partial<CreateProductPayload>;

export const productsEndpoints = {
  list: "/products", // ✅ no trailing slash unless your backend requires it
  details: (id: string) => `/products/${id}`,
};

async function authedFetch(path: string, init?: RequestInit) {
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

export async function fetchProducts(): Promise<Product[]> {
  const res = await authedFetch(productsEndpoints.list, { method: "GET" });
  if (!res.ok) throw new Error(`Products load failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as Product[]) : [];
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const res = await authedFetch(productsEndpoints.list, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as Product;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await authedFetch(productsEndpoints.details(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as Product;
}
