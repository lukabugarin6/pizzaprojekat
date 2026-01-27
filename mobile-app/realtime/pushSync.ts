import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerForPushAsync } from "./ordersRealtime";
import { apiFetch } from "../api/apiClient";
import { getTokens } from "../api/auth";

const STORAGE_KEY = "expoPushToken";

export async function registerAndSyncPushToken() {
  // 1) Moraš biti ulogovan (JWT)
  const { accessToken } = await getTokens();
  if (!accessToken) return;

  // 2) Uzmemo Expo push token
  const expoToken = await registerForPushAsync();
  if (!expoToken) return;

  // 3) Ne šalji opet isti token
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved === expoToken) return;

  // 4) Sync na backend
  await apiFetch("/auth/me/push-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`, // ✅ JWT
    },
    body: JSON.stringify({ token: expoToken }), // ✅ Expo push token
  });

  // 5) Zapamti lokalno
  await AsyncStorage.setItem(STORAGE_KEY, expoToken);
}
