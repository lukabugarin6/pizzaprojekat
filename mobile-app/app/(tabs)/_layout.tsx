// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";

export default function TabsLayout() {
  const { isHydrating, isLoggedIn, role } = useAuth();

  if (isHydrating) return null;
  if (!isLoggedIn) return <Redirect href="/(auth)/login" />;

  const isSuperuser = role === "superuser";
  const isAdminOrSuperuser = role === "admin" || role === "superuser";

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      {/* PRODUCTS – admin + superuser */}
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          href: isAdminOrSuperuser ? "/products" : null, // 👈 key line
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />

      {/* USERS – samo superuser */}
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          href: isSuperuser ? "/users" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
