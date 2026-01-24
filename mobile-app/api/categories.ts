// src/api/categories.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";
import type { Language } from "./products";

export type CategoryTranslationDto = {
  id: string;
  language: Language;
  name: string;
};

export type CategoryDto = {
  id: string;
  slug?: string | null;
  sortOrder?: number | null;
  translations?: CategoryTranslationDto[];
  isActive?: boolean | null;
};

export const categoriesEndpoints = {
  list: "/categories",
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

export async function fetchCategories(): Promise<CategoryDto[]> {
  const res = await authedFetch(categoriesEndpoints.list, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Categories load failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Categories non-json: ${ct}${txt ? `\n${txt}` : ""}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as CategoryDto[]) : [];
}
