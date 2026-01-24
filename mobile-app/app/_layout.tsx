import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/authContext";
import { useStableAndroidNavBar } from "../hooks/useStableAndroidNavBar";
import { useColorScheme, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { RootSiblingParent } from "react-native-root-siblings";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const scheme = useColorScheme();

  const { onRootLayout } = useStableAndroidNavBar(
    scheme === "dark" ? "#000" : "#fff",
    scheme === "dark",
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <RootSiblingParent>
        <View style={styles.flex} onLayout={onRootLayout}>
          <AuthProvider>
            <StatusBar
              style="light"
              translucent
              backgroundColor="transparent"
            />

            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </BottomSheetModalProvider>

            <Toast topOffset={200} />
          </AuthProvider>
        </View>
      </RootSiblingParent>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
