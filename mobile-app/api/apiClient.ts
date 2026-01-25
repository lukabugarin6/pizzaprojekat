// src/api/apiClient.ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

// mali helper da napravi apsolutan url
export function absUrl(path: string) {
  if (!API_BASE_URL) return path;
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}

// osnovni fetch wrapper (bez auth) — samo normalizuje URL
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = absUrl(path);

  return fetch(url, init);
}
