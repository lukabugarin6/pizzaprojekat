import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/authContext";
import { useStableAndroidNavBar } from "../hooks/useStableAndroidNavBar";
import { useColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { onRootLayout } = useStableAndroidNavBar(
    scheme === "dark" ? "#000" : "#fff",
    scheme === "dark",
  );
  // useEffect(() => {
  //   const requestNotificationPermissions = async () => {
  //     const { status } = await Notifications.getPermissionsAsync();

  //     if (status !== "granted") {
  //       const { status: newStatus } =
  //         await Notifications.requestPermissionsAsync();
  //     }
  //   };

  //   requestNotificationPermissions();
  // }, []);

  // useEffect(() => {
  //   const subscription = Notifications.addNotificationResponseReceivedListener(
  //     (response) => {
  //       const { userId, classId, className, type } =
  //         response.notification.request.content.data || {};
  //     },
  //   );

  //   return () => subscription.remove();
  // }, []);

  // if (!fontsLoaded) {
  //   return null;
  // }
  return (
    <View
      style={{
        flex: 1,
      }}
      onLayout={onRootLayout}
    >
      <AuthProvider>
        <StatusBar style={"light"} translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </View>
  );
}
