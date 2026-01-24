// src/api/products.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";

export type Language = "sr-Latn" | "en" | "ru";

export type ProductTranslation = {
  // NOTE: for edit, server has id, but create doesn't
  id?: string;
  language: Language;
  name: string;
  description: string;
};

export type ProductVariant = {
  id?: string;
  size?: number;
  price: number;
  sku?: string;
};

export type Product = {
  id: string;
  slug: string;
  image?: string | null;
  isActive?: boolean;
  sortOrder?: number;

  category?: {
    id: string;
    slug?: string;
    sortOrder?: number;
    translations?: CategoryTranslationDto[];
  };

  translations?: ProductTranslationDto[];
  variants?: ProductVariantDtoFull[];
};

export type CreateProductPayload = {
  slug: string;
  image?: string | null; // local uri (file://) or null for delete (update only)
  categoryId: string;
  isActive?: boolean;
  translations?: ProductTranslation[];
  variants?: ProductVariant[];
  sortOrder?: number;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ✅ Grouped DTOs
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

// ✅ details DTOs
export type ProductTranslationDto = {
  id: string;
  language: Language;
  name: string;
  description: string;
};

export type CategoryTranslationDto = {
  id: string;
  language: Language;
  name: string;
};

export type ProductVariantDtoFull = {
  id: string;
  size: number | null;
  price: number;
  sku?: string | null;
};

export type ProductDetailsDto = {
  id: string;
  slug: string;
  image?: string | null;
  isActive?: boolean;
  sortOrder?: number;

  category?: {
    id: string;
    slug?: string;
    sortOrder?: number;
    translations?: CategoryTranslationDto[];
  };

  translations?: ProductTranslationDto[];
  variants?: ProductVariantDtoFull[];
};

export const productsEndpoints = {
  list: "/products",
  grouped: "/products/grouped",
  details: (id: string) => `/products/${id}`,
};

// ------------------------
// Auth helpers
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

async function authedFetchForm(path: string, init?: RequestInit) {
  const { accessToken } = await getTokens();

  // ⚠️ do NOT set Content-Type for multipart FormData
  let res = await apiFetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
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
      },
    });
  }

  return res;
}

// ------------------------
// GETs (JSON)
// ------------------------

export async function fetchProducts(): Promise<Product[]> {
  const res = await authedFetchJson(productsEndpoints.list, { method: "GET" });
  if (!res.ok) throw new Error(`Products load failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as Product[]) : [];
}

export async function fetchProductsGrouped(
  lang: Language,
): Promise<ProductsGroupedResponseDto> {
  const url = `${productsEndpoints.grouped}?lang=${encodeURIComponent(lang)}`;

  const res = await authedFetchJson(url, { method: "GET" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Products grouped load failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Products grouped non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  const data = (await res.json()) as ProductsGroupedResponseDto;
  return data && Array.isArray(data.categories) ? data : { categories: [] };
}

export async function fetchProductDetails(
  id: string,
): Promise<ProductDetailsDto> {
  const url = productsEndpoints.details(id);

  const res = await authedFetchJson(url, { method: "GET" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Product details load failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Product details non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  const data = (await res.json()) as ProductDetailsDto;
  if (!data?.id) throw new Error("Product details invalid response");
  return data;
}

// ------------------------
// POST/PUT (multipart)
// ------------------------

function isLocalFileUri(uri: string) {
  return /^(file|content):\/\//i.test(uri);
}

/**
 * Build multipart payload:
 * - Always send "data" as JSON string
 * - Send "image" only if local uri (file:// / content://)
 * - For delete (update only): include image:null inside JSON
 */
function toFormDataForProduct(
  payload: CreateProductPayload | UpdateProductPayload,
) {
  const fd = new FormData();

  const { image, ...rest } = payload as any;

  const json =
    image === null
      ? { ...rest, image: null } // ✅ delete case (server checks updateData.image === null)
      : rest; // ✅ keep existing / normal update

  fd.append("data", JSON.stringify(json));

  return { fd, image };
}

/**
 * React Native needs file objects in FormData like:
 * { uri, name, type }
 */
function appendImageIfNeeded(fd: FormData, imageUri: string) {
  const name = `image_${Date.now()}.jpg`;
  const type = "image/jpeg";

  fd.append("image", {
    uri: imageUri,
    name,
    type,
  } as any);
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const { fd, image } = toFormDataForProduct(payload);

  // ✅ attach only if local uri
  if (typeof image === "string" && image.trim() && isLocalFileUri(image)) {
    appendImageIfNeeded(fd, image);
  }

  const res = await authedFetchForm(productsEndpoints.list, {
    method: "POST",
    body: fd as any,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as Product;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const { fd, image } = toFormDataForProduct(payload);

  // ✅ update rules:
  // - image is local string => upload/replace
  // - image is null => delete (already included in JSON)
  // - image is undefined or server path => keep (do not upload)
  if (typeof image === "string" && image.trim() && isLocalFileUri(image)) {
    appendImageIfNeeded(fd, image);
  }

  const res = await authedFetchForm(productsEndpoints.details(id), {
    method: "PUT",
    body: fd as any,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as Product;
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await authedFetchJson(productsEndpoints.details(productId), {
    method: "DELETE",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Delete failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }
  // backend verovatno vraća 200/204; oba su ok
}
