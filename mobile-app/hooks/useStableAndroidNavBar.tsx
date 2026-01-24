import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router"; // radi i sa Stack-om

export async function applyNavBar(mainColor: string, dark: boolean) {
  try {
    await NavigationBar.setVisibilityAsync("visible");
    await NavigationBar.setBehaviorAsync("inset-swipe");
    // (ako je dostupno) await NavigationBar.setPositionAsync("relative");
    await NavigationBar.setBackgroundColorAsync(mainColor);
    await SystemUI.setBackgroundColorAsync(mainColor);
    await NavigationBar.setButtonStyleAsync(dark ? "light" : "dark");
  } catch (e) {
    // ignoriši
  }
}

export function useStableAndroidNavBar(mainColor: string, isDark: boolean) {
  const retryRef = useRef<number | null>(null);

  const ensure = useCallback(() => {
    // 1) odmah
    applyNavBar(mainColor, isDark);
    // 2) kratko odloženo (posle layout/render cikla)
    retryRef.current = setTimeout(
      () => applyNavBar(mainColor, isDark),
      50,
    ) as any;
  }, [mainColor, isDark]);

  // A) kad se zavisi od teme/boje
  useEffect(() => {
    if (Platform.OS === "android") ensure();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current as any);
    };
  }, [ensure]);

  // B) kad app postane active (posle hot reload-a, dev menu-a, sl.)
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") ensure();
    });
    return () => sub.remove();
  }, [ensure]);

  // C) na fokus root stack-a (posle navigacije/reloada)
  useFocusEffect(
    Platform.OS === "android"
      ? useCallback(() => {
          ensure();
          return () => {};
        }, [ensure])
      : useCallback(() => {}, []),
  );

  // D) iz RootLayout View-a pozovi još i na prvi layout:
  const onRootLayout = useCallback(() => {
    if (Platform.OS === "android") ensure();
  }, [ensure]);

  return { onRootLayout };
}
