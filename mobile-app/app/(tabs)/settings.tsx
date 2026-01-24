// app/(tabs)/settings.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";

export default function SettingsTab() {
  const { logout } = useAuth();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // ✅ tokens (isti stil kao ostali screenovi)
  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";

  const danger = "#EB5757";
  const dangerFg = "#fff";

  const onLogout = () => {
    Alert.alert("Odjava", "Da li ste sigurni da želite da se odjavite?", [
      { text: "Otkaži", style: "cancel" },
      { text: "Odjavi se", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.title, { color: fg }]}>Podešavanja</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          Upravljanje nalogom
        </Text>

        <View style={[styles.card, { borderColor: border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: fg }]}>Odjava</Text>
              <Text style={[styles.rowDesc, { color: muted }]}>
                Odjavite se sa ovog uređaja
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: danger }]}
              onPress={onLogout}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Odjavi se"
            >
              <Ionicons name="log-out-outline" size={20} color={dangerFg} />
              <Text style={[styles.logoutText, { color: dangerFg }]}>
                Odjavi se
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 60 },

  container: { flex: 1, padding: 16, paddingTop: 24 },

  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 13, marginBottom: 16 },

  card: {
    borderTopWidth: 1,
    borderRadius: 0,
    padding: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowDesc: { marginTop: 2, fontSize: 12 },

  logoutBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 0, // ✅ flat style
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: { fontWeight: "800" },
});
