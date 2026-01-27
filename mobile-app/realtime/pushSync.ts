import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerForPushAsync } from "./ordersRealtime";
import { apiFetch } from "../api/apiClient";
import { getTokens } from "../api/auth";

const STORAGE_KEY = "expoPushToken";

export async function registerAndSyncPushToken() {
  console.log("[push-sync] start");

  const { accessToken } = await getTokens();
  console.log("[push-sync] has access?", !!accessToken);
  if (!accessToken) return;

  const expoToken = await registerForPushAsync();
  console.log("[push-sync] expoToken:", expoToken);
  if (!expoToken) return;

  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  console.log("[push-sync] saved token same?", saved === expoToken);
  if (saved === expoToken) return;

  const res = await apiFetch("/auth/me/push-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token: expoToken }),
  });

  if (!res.ok) {
    console.log("[push-sync] backend failed", res.status);
    return; // <-- NE snimaj lokalno
  }

  console.log("[push-sync] apiFetch done:", res?.status ?? "no status");

  await AsyncStorage.setItem(STORAGE_KEY, expoToken);
  console.log("[push-sync] stored locally");
}
