// app/(tabs)/index.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../context/authContext";

export default function HomeTab() {
  const { user, role } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.text}>Logged as: {user?.email ?? "unknown"}</Text>
      <Text style={styles.text}>Role: {role ?? "unknown"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40, gap: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  text: { fontSize: 14, opacity: 0.8 },
});
