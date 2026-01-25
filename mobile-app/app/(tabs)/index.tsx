// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useAuth } from "../../context/authContext";
import {
  fetchAdminOrders,
  acceptAdminOrder,
  rejectAdminOrder,
  type AdminOrderDto,
  type OrderStatus,
} from "../../api/orders";

import { GorhomSheetModal } from "../../components/products/bottom-sheet-modal";
import { useOrdersRealtime } from "../../realtime/OrdersRealtimeProvider";

type StatusTab = "all" | OrderStatus;

function showToast(
  type: "success" | "error" | "info",
  text1: string,
  text2?: string,
) {
  Toast.show({
    type,
    text1,
    text2,
    position: "bottom",
    visibilityTime: 2200,
  });
}

function formatMoneyRSD(n: number) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0 RSD";
  return `${Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")} RSD`;
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo}. ${hh}:${mm}`;
}

function statusLabel(s: StatusTab) {
  if (s === "all") return "Sve";
  if (s === "pending") return "Na čekanju";
  if (s === "accepted") return "Prihvaćeno";
  if (s === "rejected") return "Odbijeno";
  return s;
}

function statusColor(
  status: OrderStatus,
  accent: string,
  ok: string,
  danger: string,
) {
  if (status === "pending") return accent;
  if (status === "accepted") return ok;
  return danger;
}

// ✅ for +/- picker (5 min steps)
function clampEtaMinutes(v: any) {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return 30;
  const m = Math.trunc(n);
  // if (m === 0) return 5;
  if (m > 600) return 600;
  return m;
}
function stepEta(v: number, delta: number) {
  return Math.min(600, Math.max(5, v + delta));
}

function dayKeyFromIso(iso?: string | null) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`; // stable key
}

function labelFromDayKey(key: string, todayKey: string) {
  if (key === todayKey) return "Danas";
  if (key === "unknown") return "Nepoznat datum";

  // key: YYYY-MM-DD -> DD.MM.YYYY
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}.${m}.${y}`;
}

type OrdersSection = { key: string; title: string; data: AdminOrderDto[] };

export default function HomeTab() {
  const { ordersChangedKey } = useOrdersRealtime();

  const insets = useSafeAreaInsets();

  const { role } = useAuth();
  if (role !== "admin" && role !== "superuser") return <Redirect href="/" />;

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const placeholder = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";

  const accent = "#e67428";
  const accentFg = "#fff";
  const danger = "#EB5757";
  const ok = "#27AE60";

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  const [tab, setTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState<AdminOrderDto[]>([]);

  // Details sheet
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<AdminOrderDto | null>(null);

  // Accept sheet
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptOrder, setAcceptOrder] = useState<AdminOrderDto | null>(null);
  const [acceptEtaMinutes, setAcceptEtaMinutes] = useState<number>(30);
  const [accepting, setAccepting] = useState(false);

  const tabs: StatusTab[] = useMemo(
    () => ["all", "pending", "accepted", "rejected"],
    [],
  );

  async function load(selectedTab: StatusTab = tab, mode?: "refresh") {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const q = selectedTab === "all" ? undefined : { status: selectedTab };
      const data = await fetchAdminOrders(q as any);

      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return tb - ta;
      });

      setOrders(sorted);
    } catch (e: any) {
      showToast("error", "Greška", e?.message ?? "Neuspešno učitavanje.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ordersChangedKey]);

  // ✅ "today key" helper for header counts
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // ✅ totals
  const todayOrdersCount = useMemo(() => {
    return orders.reduce((acc, o) => {
      return dayKeyFromIso(o.createdAt) === todayKey ? acc + 1 : acc;
    }, 0);
  }, [orders, todayKey]);

  const headerCount = useMemo(() => {
    // only "all" should show "Ukupno danas"
    if (tab === "all") return `Ukupno danas: ${todayOrdersCount}`;
    return `${statusLabel(tab)}: ${orders.length}`;
  }, [orders.length, tab, todayOrdersCount]);

  const emptyText = useMemo(() => {
    if (loading) return "";
    if (tab === "all") return "Nema Porudžbina.";
    return `Nema Porudžbina za status: ${statusLabel(tab)}.`;
  }, [loading, tab]);

  const sections: OrdersSection[] = useMemo(() => {
    const map = new Map<string, AdminOrderDto[]>();
    for (const o of orders) {
      const k = dayKeyFromIso(o.createdAt);
      const arr = map.get(k);
      if (arr) arr.push(o);
      else map.set(k, [o]);
    }

    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "unknown" && b === "unknown") return 0;
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b.localeCompare(a);
    });

    return keys.map((k) => ({
      key: k,
      title: labelFromDayKey(k, todayKey),
      data:
        (map.get(k) ?? []).sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          return tb - ta;
        }) ?? [],
    }));
  }, [orders, todayKey]);

  function openDetails(o: AdminOrderDto) {
    setDetailsOrder(o);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetailsOrder(null);
  }

  function openAccept(o: AdminOrderDto) {
    setAcceptOrder(o);

    const initial =
      typeof o.etaMinutes === "number" && Number.isFinite(o.etaMinutes)
        ? clampEtaMinutes(o.etaMinutes)
        : 30;
    setAcceptEtaMinutes(initial);

    setAcceptOpen(true);
  }

  function closeAccept() {
    if (accepting) return;
    setAcceptOpen(false);
    setAcceptOrder(null);
  }

  async function confirmAccept() {
    if (!acceptOrder?.id) return;

    const eta = clampEtaMinutes(acceptEtaMinutes);

    setAccepting(true);
    try {
      await acceptAdminOrder(acceptOrder.id, { etaMinutes: eta });

      showToast("success", "Prihvaćeno", `ETA: ${eta} min`);
      closeAccept();
      await load(tab, "refresh");
    } catch (e: any) {
      showToast(
        "error",
        "Prihvatanje nije uspelo",
        e?.message ?? "Pokušajte ponovo.",
      );
    } finally {
      setAccepting(false);
    }
  }

  function confirmReject(o: AdminOrderDto) {
    Alert.alert("Odbij Porudžbinu", `Da li si siguran?\nKod: ${o.publicCode}`, [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Odbij",
        style: "destructive",
        onPress: async () => {
          try {
            await rejectAdminOrder(o.id, {});
            showToast("success", "Odbijeno", `Kod: ${o.publicCode}`);
            await load(tab, "refresh");
          } catch (e: any) {
            showToast(
              "error",
              "Odbijanje nije uspelo",
              e?.message ?? "Pokušajte ponovo.",
            );
          }
        },
      },
    ]);
  }

  const renderOrder = ({ item }: { item: AdminOrderDto }) => {
    const sc = statusColor(item.status, accent, ok, danger);
    const showActions = item.status === "pending";

    return (
      <View style={[styles.rowCard, { borderColor: border }]}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.code, { color: fg }]}>{item.publicCode}</Text>

            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: muted }]}>
                {formatTime(item.createdAt)}
              </Text>

              <Text style={[styles.dot, { color: muted }]}>•</Text>

              <Text style={[styles.meta, { color: muted }]}>
                {item.type === "delivery" ? "Dostava" : "Preuzimanje"}
              </Text>

              <Text style={[styles.dot, { color: muted }]}>•</Text>

              <Text style={[styles.meta, { color: sc, fontWeight: "900" }]}>
                {statusLabel(item.status)}
              </Text>

              {typeof item.etaMinutes === "number" &&
              Number.isFinite(item.etaMinutes) ? (
                <>
                  <Text style={[styles.dot, { color: muted }]}>•</Text>
                  <Text style={[styles.meta, { color: muted }]}>
                    ETA {item.etaMinutes}m
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.total, { color: fg }]}>
              {formatMoneyRSD(item.total)}
            </Text>

            <TouchableOpacity
              onPress={() => openDetails(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Detalji"
              style={styles.iconBtnNoBorder}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={fg}
              />
            </TouchableOpacity>
          </View>
        </View>

        {showActions ? (
          <View style={[styles.actionsRow, { borderColor: border }]}>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                {
                  backgroundColor: "transparent",
                  borderColor: border,
                  borderWidth: 1,
                },
                accepting && disabledStyle,
              ]}
              onPress={() => openAccept(item)}
              disabled={accepting}
              activeOpacity={0.85}
            >
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={accent}
                />
                <Text style={[styles.cancelText, { color: fg }]}>Prihvati</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                {
                  backgroundColor: "transparent",
                  borderColor: danger,
                  borderWidth: 1,
                },
                accepting && disabledStyle,
              ]}
              onPress={() => confirmReject(item)}
              disabled={accepting}
              activeOpacity={0.85}
            >
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={danger}
                />
                <Text style={[styles.cancelText, { color: danger }]}>
                  Odbij
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: bg,
          paddingTop: Math.max(18, insets.top + 10),
        },
      ]}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: fg }]}>Porudžbine</Text>

          <TouchableOpacity
            onPress={() => load(tab, "refresh")}
            disabled={loading || refreshing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Osveži"
            style={[
              styles.iconBtnNoBorder,
              (loading || refreshing) && disabledStyle,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator color={fg} />
            ) : (
              <Ionicons name="refresh-outline" size={22} color={fg} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ color: muted, fontWeight: "700", marginBottom: 10 }}>
          {headerCount}
        </Text>

        {/* Tabs */}
        <View style={[styles.tabsRow, { borderColor: border }]}>
          {tabs.map((t) => {
            const active = t === tab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                activeOpacity={0.9}
                style={styles.tabBtn}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? accent : fg, opacity: active ? 1 : 0.8 },
                  ]}
                >
                  {statusLabel(t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingTop: 18 }}>
            <ActivityIndicator color={fg} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 110 }}
            refreshing={refreshing}
            onRefresh={() => load(tab, "refresh")}
            renderItem={renderOrder}
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, { borderColor: border }]}>
                <Text style={[styles.sectionTitle, { color: fg }]}>
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={{ paddingTop: 18 }}>
                <Text style={{ color: muted, fontWeight: "700" }}>
                  {emptyText}
                </Text>
              </View>
            }
          />
        )}

        {/* DETAILS SHEET */}
        <GorhomSheetModal
          visible={detailsOpen}
          onClose={closeDetails}
          bg={bg}
          border={border}
          header={
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: fg }]}>Detalji</Text>

              <TouchableOpacity
                onPress={closeDetails}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Zatvori"
                style={styles.iconBtnNoBorder}
              >
                <Ionicons name="close-outline" size={26} color={fg} />
              </TouchableOpacity>
            </View>
          }
        >
          <BottomSheetScrollView contentContainerStyle={styles.sheetInner}>
            {!detailsOrder ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator color={fg} />
              </View>
            ) : (
              <>
                {/* ⛳ keep your existing details JSX here (unchanged) */}
                {(detailsOrder.items ?? []).map(() => null)}
              </>
            )}
          </BottomSheetScrollView>
        </GorhomSheetModal>

        {/* ACCEPT (ETA) SHEET */}
        <GorhomSheetModal
          visible={acceptOpen}
          onClose={closeAccept}
          bg={bg}
          border={border}
          header={
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: fg }]}>Prihvati</Text>

              <TouchableOpacity
                onPress={closeAccept}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Zatvori"
                style={styles.iconBtnNoBorder}
              >
                <Ionicons name="close-outline" size={26} color={fg} />
              </TouchableOpacity>
            </View>
          }
          footer={
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "transparent",
                    borderColor: border,
                    borderWidth: 1,
                  },
                  accepting && disabledStyle,
                ]}
                onPress={closeAccept}
                disabled={accepting}
                activeOpacity={0.85}
              >
                <View
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <Ionicons name="close-outline" size={18} color={fg} />
                  <Text style={[styles.cancelText, { color: fg }]}>Otkaži</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: accent,
                    borderColor: accent,
                    borderWidth: 1,
                    elevation: 2,
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  },
                  accepting && disabledStyle,
                ]}
                onPress={confirmAccept}
                disabled={accepting}
                activeOpacity={0.9}
              >
                {accepting ? (
                  <ActivityIndicator color={accentFg} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={accentFg}
                    />
                    <Text style={[styles.saveText, { color: accentFg }]}>
                      Potvrdi
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          }
        >
          <View style={styles.sheetInner}>
            <Text style={[styles.fieldLabel, { color: muted }]}>ETA (min)</Text>

            <View
              style={[
                localStyles.etaWrap,
                { borderColor: border },
                accepting && disabledStyle,
              ]}
            >
              <TouchableOpacity
                disabled={accepting}
                onPress={() => setAcceptEtaMinutes((v) => stepEta(v, -5))}
                style={localStyles.etaBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="remove-outline" size={18} color={fg} />
              </TouchableOpacity>

              <Text style={[localStyles.etaValue, { color: fg }]}>
                {Math.max(1, acceptEtaMinutes)}m
              </Text>

              <TouchableOpacity
                disabled={accepting}
                onPress={() => setAcceptEtaMinutes((v) => stepEta(v, +5))}
                style={localStyles.etaBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="add-outline" size={18} color={fg} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.inputWrap, { borderColor: border, marginTop: 10 }]}
            >
              <TextInput
                style={[styles.input, { color: fg }]}
                placeholder="npr. 30"
                placeholderTextColor={placeholder}
                value={String(acceptEtaMinutes)}
                onChangeText={(t) => setAcceptEtaMinutes(clampEtaMinutes(t))}
                selectionColor={accent}
                keyboardType="number-pad"
                editable={!accepting}
                returnKeyType="done"
              />
            </View>

            {acceptOrder?.publicCode ? (
              <Text style={{ color: muted, fontWeight: "700", marginTop: 8 }}>
                Kod: {acceptOrder.publicCode}
              </Text>
            ) : null}
          </View>
        </GorhomSheetModal>
      </View>
    </SafeAreaView>
  );
}

// ✅ styles aligned with your productsStyles approach
const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  safe: { flex: 1 },
  container: { flex: 1, padding: 16, paddingTop: 24 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "800", flex: 1 },

  iconBtnNoBorder: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  tabBtn: {
    paddingVertical: 6,
  },
  tabText: { fontSize: 13, fontWeight: "900" },

  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  rowCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rightCol: { alignItems: "flex-end", gap: 6 },

  code: { fontSize: 18, fontWeight: "900" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  meta: { fontSize: 12, fontWeight: "700" },
  dot: { fontSize: 12, fontWeight: "900" },

  total: { fontSize: 14, fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },

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

  sheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    // paddingTop: 12,
    paddingBottom: 40,
  },

  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: "center",
    marginBottom: 10,
  },
  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
});

const localStyles = StyleSheet.create({
  etaWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    height: 44,
  },
  etaBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  etaValue: {
    flex: 1,
    textAlign: "center",
    fontWeight: "900",
  },
});
