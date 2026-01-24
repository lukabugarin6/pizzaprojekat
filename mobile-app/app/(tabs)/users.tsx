// app/(tabs)/users.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  useColorScheme,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  createAdmin,
  deleteUser,
  fetchUsers,
  type UserRow,
} from "../../api/users";
import { useAuth } from "../../context/authContext";

export default function UsersTab() {
  const { role, userId } = useAuth() as any;
  const isSuperuser = role === "superuser";

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // ✅ theme tokens
  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const placeholder = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";

  // ✅ accent
  const accent = "#e67428";
  const accentFg = "#fff";

  // ✅ delete icon color
  const danger = "#EB5757";

  useEffect(() => {
    if (!isSuperuser) router.replace("/(tabs)");
  }, [isSuperuser]);

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const canCreate = useMemo(() => {
    return !saving && email.trim().length > 0 && pass.trim().length > 0;
  }, [email, pass, saving]);

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? "Neuspešno učitavanje.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperuser) load();
  }, [isSuperuser]);

  // ✅ Animated modal
  const anim = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setAddOpen(true);
    setShowPass(false);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setAddOpen(false);
    });
  };

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const sheetTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const sheetOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const onDelete = (u: UserRow) => {
    if (userId != null && String(u.id) === String(userId)) {
      Alert.alert("Nije dozvoljeno", "Ne možete obrisati sopstveni nalog.");
      return;
    }

    Alert.alert("Obrisati korisnika?", u.email, [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e: any) {
            Alert.alert("Greška", e?.message ?? "Brisanje nije uspelo.");
          }
        },
      },
    ]);
  };

  const onCreate = async () => {
    if (!canCreate) return;

    setSaving(true);
    try {
      const created = await createAdmin({
        email: email.trim(),
        password: pass,
      });

      setUsers((prev) => [created, ...prev]);
      closeModal();
      setEmail("");
      setPass("");
      setShowPass(false);
    } catch (e: any) {
      Alert.alert("Greška", e?.message ?? "Kreiranje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperuser) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* ✅ sakrij status bar dok je modal otvoren */}
      <StatusBar hidden={addOpen} style={isDark ? "light" : "dark"} />

      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: fg }]}>Korisnici</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={fg} />
        ) : error ? (
          <View style={styles.empty}>
            <Text style={[styles.errorText, { color: fg, opacity: 0.9 }]}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={load}
              style={[
                styles.reloadBtn,
                { backgroundColor: accent, borderColor: accent },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[styles.reloadText, { color: accentFg }]}>
                Učitaj ponovo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(it) => String(it.id)}
            onRefresh={load}
            refreshing={loading}
            contentContainerStyle={{ paddingBottom: 120 }} // ✅ space for FAB
            renderItem={({ item }) => {
              const isMe = userId != null && String(item.id) === String(userId);

              return (
                <View style={[styles.row, { borderColor: border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.email, { color: fg }]}>
                      {item.email}
                    </Text>
                    <Text style={[styles.meta, { color: muted }]}>
                      {item.role ?? "user"}
                      {isMe ? " • (vi)" : ""}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.trashBtn,
                      { backgroundColor: "transparent" },
                      isMe && styles.trashBtnDisabled,
                    ]}
                    onPress={() => onDelete(item)}
                    activeOpacity={0.85}
                    disabled={isMe}
                    accessibilityRole="button"
                    accessibilityLabel="Obriši korisnika"
                  >
                    <Ionicons name="trash-outline" size={20} color={danger} />
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.muted, { color: muted }]}>
                  Nema korisnika
                </Text>
              </View>
            }
          />
        )}

        {/* ✅ Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent }]}
          onPress={openModal}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Dodaj korisnika"
        >
          <Ionicons name="add" size={26} color={accentFg} />
        </TouchableOpacity>

        {/* ✅ Modal */}
        <Modal
          visible={addOpen}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <View style={StyleSheet.absoluteFill}>
            <Pressable onPress={closeModal} style={StyleSheet.absoluteFill}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,1)",
                    opacity: backdropOpacity,
                  },
                ]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.sheetWrap,
                {
                  transform: [{ translateY: sheetTranslateY }],
                  opacity: sheetOpacity,
                },
              ]}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: bg, borderTopColor: border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: fg }]}>
                  Kreiraj korisnika
                </Text>

                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: border, backgroundColor: bg },
                  ]}
                >
                  <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    style={[styles.input, { color: fg }]}
                    placeholderTextColor={placeholder}
                    selectionColor={accent}
                    returnKeyType="next"
                  />
                </View>

                {/* ✅ Password sa eye toggle */}
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: border, backgroundColor: bg },
                  ]}
                >
                  <TextInput
                    placeholder="Lozinka"
                    value={pass}
                    onChangeText={setPass}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="password"
                    style={[styles.input, { color: fg, paddingRight: 44 }]}
                    placeholderTextColor={placeholder}
                    selectionColor={accent}
                    returnKeyType="done"
                    onSubmitEditing={onCreate}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPass((v) => !v)}
                    style={styles.eyeBtn}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPass ? "Sakrij lozinku" : "Prikaži lozinku"
                    }
                  >
                    <Ionicons
                      name={showPass ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={
                        isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)"
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: "transparent", borderColor: border },
                    ]}
                    onPress={closeModal}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.cancelText, { color: fg }]}>
                      Otkaži
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: accent, borderColor: accent },
                      !canCreate && disabledStyle,
                    ]}
                    onPress={onCreate}
                    disabled={!canCreate}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator color={accentFg} />
                    ) : (
                      <Text style={[styles.saveText, { color: accentFg }]}>
                        Kreiraj
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 60 },
  container: { flex: 1, paddingVertical: 16, paddingTop: 24 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: { fontSize: 24, fontWeight: "800", flex: 1 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderRadius: 0,
    padding: 16,
    marginBottom: 10,
  },
  email: { fontSize: 15, fontWeight: "700" },
  meta: { marginTop: 2, fontSize: 12 },

  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trashBtnDisabled: { opacity: 0.45 },

  empty: { paddingTop: 40, alignItems: "center" },
  muted: {},
  errorText: { marginBottom: 10, textAlign: "center" },

  reloadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 0,
    borderWidth: 1,
  },
  reloadText: { fontWeight: "800" },

  // ✅ Floating button
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 999, // ✅ 50% vibe
    alignItems: "center",
    justifyContent: "center",
    // optional: little depth without picking colors
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },

  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    position: "relative",
    justifyContent: "center",
    marginBottom: 10,
  },
  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
  },
  cancelText: { fontWeight: "800" },
  saveText: { fontWeight: "800" },
});
