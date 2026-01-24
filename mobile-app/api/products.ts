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
  size?: number;
  price: number;
  sku?: string;
};

export type Product = {
  id: string;
  slug: string;
  image?: string | null;
  isActive?: boolean;

  category?: {
    id: string; // UUID
    slug?: string;
  };

  translations?: ProductTranslation[];
  variants?: ProductVariant[];
};

export type CreateProductPayload = {
  slug: string;
  image: string;
  categoryId: string;
  isActive?: boolean;
  translations?: ProductTranslation[];
  variants?: ProductVariant[];
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ✅ Grouped DTOs (kao web app)
export type ProductVariantDto = {
  id: string;
  size: number;
  price: number;
};

export type ProductCardItemDto = {
  slug: string;
  image?: string | null;
  name: string;
  description: string;
  variants: ProductVariantDto[];
  sortOrder?: number;
  id?: string;
};

export type ProductsCategoryDto = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: ProductCardItemDto[];
};

export type ProductsGroupedResponseDto = {
  categories: ProductsCategoryDto[];
};

export const productsEndpoints = {
  list: "/products",
  grouped: "/products/grouped",
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

// ✅ NEW: fetch grouped products (public-ish, ali i dalje authedFetch da radi isto kao ostalo)
export async function fetchProductsGrouped(
  lang: Language,
): Promise<ProductsGroupedResponseDto> {
  const url = `${productsEndpoints.grouped}?lang=${encodeURIComponent(lang)}`;

  const res = await authedFetch(url, { method: "GET" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Products grouped load failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  // ✅ safety: nekad proxy vrati HTML
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Products grouped non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  const data = (await res.json()) as ProductsGroupedResponseDto;
  return data && Array.isArray(data.categories) ? data : { categories: [] };
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
