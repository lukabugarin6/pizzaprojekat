// app/(tabs)/users.tsx
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { router } from "expo-router";
import {
  createUser,
  deleteUser,
  fetchUsers,
  type UserRow,
} from "../../api/users";
import { useAuth } from "../../context/authContext";

export default function UsersTab() {
  const { role } = useAuth();
  const isSuperuser = role === "superuser";

  useEffect(() => {
    if (!isSuperuser) router.replace("/(tabs)");
  }, [isSuperuser]);

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperuser) load();
  }, [isSuperuser]);

  const onDelete = (u: UserRow) => {
    Alert.alert("Delete user?", u.email, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Delete failed");
          }
        },
      },
    ]);
  };

  const onCreate = async () => {
    if (!email.trim() || !pass.trim()) {
      Alert.alert("Missing", "Email and password required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createUser({
        email: email.trim(),
        password: pass,
        role: newRole.trim(),
      });

      setUsers((prev) => [created, ...prev]);
      setAddOpen(false);
      setEmail("");
      setPass("");
      setNewRole("user");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperuser) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.reloadBtn}>
            <Text style={styles.reloadText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(it) => String(it.id)}
          onRefresh={load}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.meta}>{item.role ?? "user"}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>No users</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create user</Text>

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={Platform.OS === "ios" ? "#999" : "#999"}
            />
            <TextInput
              placeholder="Password"
              value={pass}
              onChangeText={setPass}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={Platform.OS === "ios" ? "#999" : "#999"}
            />
            <TextInput
              placeholder="Role (user/superuser)"
              value={newRole}
              onChangeText={setNewRole}
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={Platform.OS === "ios" ? "#999" : "#999"}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setAddOpen(false)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={onCreate}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", flex: 1 },
  addBtn: {
    backgroundColor: "#12a28d",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  email: { fontSize: 15, fontWeight: "700" },
  meta: { marginTop: 2, fontSize: 12, opacity: 0.65 },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EB5757",
  },
  deleteText: { color: "#fff", fontWeight: "800" },

  empty: { paddingTop: 40, alignItems: "center" },
  muted: { opacity: 0.6 },
  errorText: { color: "#EB5757", marginBottom: 10, textAlign: "center" },
  reloadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  reloadText: { fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "rgba(0,0,0,0.06)" },
  saveBtn: { backgroundColor: "#12a28d" },
  cancelText: { fontWeight: "800" },
  saveText: { color: "#fff", fontWeight: "800" },
});
