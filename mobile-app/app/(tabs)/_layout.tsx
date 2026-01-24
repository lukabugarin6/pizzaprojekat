// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { useColorScheme, Platform } from "react-native";

export default function TabsLayout() {
  const { isHydrating, isLoggedIn, role } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  if (isHydrating) return null;
  if (!isLoggedIn) return <Redirect href="/(auth)/login" />;

  const isSuperuser = role === "superuser";
  const isAdminOrSuperuser = role === "admin" || role === "superuser";

  // ✅ theme tokens (isti kao login)
  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";

  // tab icon/text colors
  const activeTint = fg;
  const inactiveTint = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // ✅ tab colors
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,

        // ✅ tab bar styling (flat, border)
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: 1,
          // iOS shadow off (optional)
          ...(Platform.OS === "ios" ? { shadowOpacity: 0 } : { elevation: 0 }),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Porudžbine",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />

      {/* PRODUCTS – admin + superuser */}
      <Tabs.Screen
        name="products"
        options={{
          title: "Artikli",
          href: isAdminOrSuperuser ? "/products" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pizza-outline" color={color} size={size} />
          ),
        }}
      />

      {/* USERS – samo superuser */}
      <Tabs.Screen
        name="users"
        options={{
          title: "Korisnici",
          href: isSuperuser ? "/users" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Podešavanja",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
