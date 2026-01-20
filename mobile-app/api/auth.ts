// src/api/auth.ts
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./apiClient";

export const STORAGE = {
  access: "auth_access_token",
  refresh: "auth_refresh_token",
  role: "auth_role",
  user: "auth_user_json",
} as const;

export const endpoints = {
  login: "/auth/login/",
  refresh: "/auth/refresh/",
  me: "/auth/me/",
};

export type UserRole = "superuser" | "user" | string;

export type MeResponse = {
  id: number;
  email?: string;
  role?: UserRole;
  name?: string;
};

export async function getTokens() {
  const accessToken = await SecureStore.getItemAsync(STORAGE.access);
  const refreshToken = await SecureStore.getItemAsync(STORAGE.refresh);
  return { accessToken, refreshToken };
}

export async function setTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(STORAGE.access, access);
  if (refresh) await SecureStore.setItemAsync(STORAGE.refresh, refresh);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(STORAGE.access);
  await SecureStore.deleteItemAsync(STORAGE.refresh);
  await SecureStore.deleteItemAsync(STORAGE.role);
  await SecureStore.deleteItemAsync(STORAGE.user);
}

export async function getSavedUser() {
  const raw = await SecureStore.getItemAsync(STORAGE.user);
  return raw ? (JSON.parse(raw) as MeResponse) : null;
}

export async function getSavedRole() {
  return (await SecureStore.getItemAsync(STORAGE.role)) as UserRole | null;
}

export async function saveUserAndRole(user: MeResponse | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(STORAGE.user);
    await SecureStore.deleteItemAsync(STORAGE.role);
    return;
  }
  await SecureStore.setItemAsync(STORAGE.user, JSON.stringify(user));
  if (user.role)
    await SecureStore.setItemAsync(STORAGE.role, String(user.role));
}

export async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return false;

  const res = await apiFetch(endpoints.refresh, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) return false;

  const data = await res.json().catch(() => null);
  const newAccess = data?.access;
  if (!newAccess) return false;

  await setTokens(newAccess);
  return true;
}

export async function fetchMeAuthed(): Promise<MeResponse | null> {
  const { accessToken } = await getTokens();
  if (!accessToken) return null;

  let res = await apiFetch(endpoints.me, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) return null;

    const { accessToken: access2 } = await getTokens();
    if (!access2) return null;

    res = await apiFetch(endpoints.me, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access2}`,
        "Content-Type": "application/json",
      },
    });
  }

  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}

export async function loginRequest(email: string, password: string) {
  const res = await apiFetch(endpoints.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Login failed: ${res.status}${txt ? `\n${txt}` : ""}`);
  }

  // očekujemo: { access, refresh, user: { ... } }
  const data = await res.json();

  const access = data?.access_token;
  const refresh = data?.access_token;
  const user = data?.user as MeResponse | undefined;

  if (!access || !refresh) throw new Error("Login response missing tokens");

  await setTokens(access, refresh);

  // ako backend vraća user, snimi; ako ne, povuci /me posle
  if (user) {
    await saveUserAndRole(user);
    return { access, refresh, user };
  }

  const me = await fetchMeAuthed();
  await saveUserAndRole(me);
  return { access, refresh, user: me };
}
