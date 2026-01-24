// src/api/users.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";

export type UserRow = {
  id: number;
  email: string;
  role?: string | null;
  name?: string | null;
};

export const usersEndpoints = {
  list: "/users/",
  createAdmin: "/users/admins",
  details: (id: number) => `/users/${id}/`,
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

export async function fetchUsers(): Promise<UserRow[]> {
  const res = await authedFetch(usersEndpoints.list, { method: "GET" });
  if (!res.ok) throw new Error(`Users load failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function deleteUser(id: number): Promise<void> {
  const res = await authedFetch(usersEndpoints.details(id), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function createAdmin(payload: {
  email: string;
  password: string;
}): Promise<UserRow> {
  const res = await authedFetch(usersEndpoints.createAdmin, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  return (await res.json()) as UserRow;
}
