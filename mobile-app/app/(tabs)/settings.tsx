// app/(tabs)/settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useAuth } from "../../context/authContext";

import {
  fetchPublicRestaurantHours,
  setRestaurantWeeklyHours,
  createRestaurantOverride,
  deleteRestaurantOverride,
  Weekday,
  WeeklyHoursRow,
  PublicRestaurantHoursResponse,
} from "../../api/restaurant";

import { GorhomSheetModal } from "../../components/products/bottom-sheet-modal";

const weekdayLabel: Record<Weekday, string> = {
  1: "Ponedeljak",
  2: "Utorak",
  3: "Sreda",
  4: "Četvrtak",
  5: "Petak",
  6: "Subota",
  7: "Nedelja",
};

type EditableDay = {
  weekday: Weekday;
  isClosed: boolean;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
};

function normalizeWeekly(weekly: WeeklyHoursRow[]): EditableDay[] {
  const byDay = new Map<Weekday, WeeklyHoursRow>();
  for (const w of weekly) byDay.set(w.weekday, w);

  const days: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

  return days.map((d) => {
    const row = byDay.get(d);
    return {
      weekday: d,
      isClosed: row?.isClosed ?? true,
      openTime: row?.openTime ?? "15:00",
      closeTime: row?.closeTime ?? "23:00",
    };
  });
}

function isHHmm(v: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function fmtHours(d: EditableDay) {
  if (d.isClosed) return "Zatvoreno";
  return `${d.openTime} – ${d.closeTime}`;
}

function hhmmToDate(hhmm: string) {
  const [hh, mm] = String(hhmm ?? "")
    .split(":")
    .map((x) => Number(x));
  const d = new Date();
  d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return d;
}
function dateToHHmm(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function SettingsTab() {
  const { logout } = useAuth();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";

  const accent = "#e67428";
  const accentFg = "#fff";
  const danger = "#EB5757";

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  const onLogout = () => {
    Alert.alert("Odjava", "Da li ste sigurni da želite da se odjavite?", [
      { text: "Otkaži", style: "cancel" },
      { text: "Odjavi se", style: "destructive", onPress: logout },
    ]);
  };

  // ===== restaurant state =====
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [server, setServer] = useState<PublicRestaurantHoursResponse | null>(
    null,
  );

  const [weekly, setWeekly] = useState<EditableDay[]>([]);
  const [manualClosedToday, setManualClosedToday] = useState(false);

  const activeOverrideId = server?.activeOverride?.id ?? null;
  const activeOverrideReason = server?.activeOverride?.reason ?? null;

  // ===== weekly modal state =====
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [editingWeekday, setEditingWeekday] = useState<Weekday | null>(null);

  // time picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState<"open" | "close">("open");
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  const editingDay = useMemo(() => {
    if (!editingWeekday) return null;
    return weekly.find((d) => d.weekday === editingWeekday) ?? null;
  }, [editingWeekday, weekly]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPublicRestaurantHours();
      setServer(data);

      setWeekly(normalizeWeekly(data.weekly));

      setManualClosedToday(
        data.effective?.source === "override" &&
          data.activeOverride?.reason === "MANUAL_CLOSED",
      );
    } catch (e: any) {
      Alert.alert(
        "Greška",
        e?.message ?? "Nije uspelo učitavanje podešavanja.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateWeekly = () => {
    for (const d of weekly) {
      if (!d.isClosed) {
        if (!isHHmm(d.openTime) || !isHHmm(d.closeTime)) {
          Alert.alert(
            "Neispravno vreme",
            `Proveri vreme za ${weekdayLabel[d.weekday]} (format HH:mm).`,
          );
          return false;
        }
        if (d.openTime >= d.closeTime) {
          Alert.alert(
            "Neispravan opseg",
            `Zatvaranje mora biti posle otvaranja (${weekdayLabel[d.weekday]}).`,
          );
          return false;
        }
      }
    }
    return true;
  };

  const onSaveWeekly = async () => {
    if (!validateWeekly()) return;

    try {
      setSaving(true);

      await setRestaurantWeeklyHours({
        items: weekly.map((d) => ({
          weekday: d.weekday,
          isClosed: d.isClosed,
          openTime: d.isClosed ? null : d.openTime,
          closeTime: d.isClosed ? null : d.closeTime,
        })),
      });

      await load();
      Alert.alert("Sačuvano", "Radno vreme je ažurirano.");
    } catch (e: any) {
      Alert.alert("Greška", e?.message ?? "Ažuriranje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  const toggleManualClosedToday = async (next: boolean) => {
    const hasOtherOverride =
      server?.effective?.source === "override" &&
      server?.activeOverride &&
      server?.activeOverride?.reason !== "MANUAL_CLOSED";

    if (next && hasOtherOverride) {
      Alert.alert(
        "Ne može",
        `Već postoji aktivan override (${server?.activeOverride?.reason ?? "override"}). Obriši/izmeni njega prvo.`,
      );
      return;
    }

    try {
      setSaving(true);

      const today = new Date().toISOString().slice(0, 10);

      if (next) {
        await createRestaurantOverride({
          dateFrom: today,
          dateTo: today,
          isClosed: true,
          reason: "MANUAL_CLOSED",
        });
      } else {
        if (activeOverrideId && activeOverrideReason === "MANUAL_CLOSED") {
          await deleteRestaurantOverride(activeOverrideId);
        }
      }

      await load();
    } catch (e: any) {
      Alert.alert("Greška", e?.message ?? "Promena nije uspela.");
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (weekday: Weekday, patch: Partial<EditableDay>) => {
    setWeekly((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)),
    );
  };

  const openEditDay = (weekday: Weekday) => {
    setEditingWeekday(weekday);
    setWeeklyModalOpen(true);
  };

  const closeWeeklyModal = () => {
    if (saving) return;
    setWeeklyModalOpen(false);
    setEditingWeekday(null);
    setPickerOpen(false);
  };

  const openTimePicker = (field: "open" | "close") => {
    if (!editingDay) return;
    setPickerField(field);
    setPickerValue(
      hhmmToDate(field === "open" ? editingDay.openTime : editingDay.closeTime),
    );
    setPickerOpen(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android sends "dismissed" when cancelled
    if (Platform.OS === "android") {
      setPickerOpen(false);
    }
    if (event.type === "dismissed") return;
    const d = selected ?? pickerValue;
    setPickerValue(d);

    if (!editingDay) return;
    const hhmm = dateToHHmm(d);
    if (pickerField === "open")
      updateDay(editingDay.weekday, { openTime: hhmm });
    else updateDay(editingDay.weekday, { closeTime: hhmm });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <ActivityIndicator color={fg} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: bg }]}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <Text style={[styles.title, { color: fg }]}>Podešavanja</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          Upravljanje restoranom i nalogom
        </Text>

        {/* ===== Restaurant ===== */}
        <View style={[styles.card, { borderColor: border }]}>
          {/* Quick close */}
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowTitle, { color: fg }]}>
                Ne radimo danas
              </Text>
              <Text style={[styles.rowDesc, { color: muted }]}>
                Brzo zatvaranje (override) koje gazi radno vreme.
              </Text>
              {server?.effective?.source === "override" &&
              server?.activeOverride?.reason &&
              server?.activeOverride?.reason !== "MANUAL_CLOSED" ? (
                <Text style={[styles.warning, { color: muted }]}>
                  Aktivno: {server.activeOverride.reason}
                </Text>
              ) : null}
            </View>

            <Switch
              value={manualClosedToday}
              onValueChange={(v) => {
                setManualClosedToday(v);
                toggleManualClosedToday(v);
              }}
              disabled={saving}
            />
          </View>

          <View style={[styles.divider, { borderColor: border }]} />

          {/* Weekly hours preview list */}
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: fg }]}>
                Radno vreme
              </Text>
              <Text
                style={{
                  color: muted,
                  fontWeight: "700",
                  marginTop: 2,
                  fontSize: 12,
                }}
              >
                Tapni dan da izmeniš. Sačuvaj kada završiš.
              </Text>
            </View>

            {/* <TouchableOpacity
              onPress={onSaveWeekly}
              disabled={saving}
              activeOpacity={0.85}
              style={[
                styles.smallPill,
                { borderColor: border, backgroundColor: "transparent" },
                saving && disabledStyle,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={fg} />
              ) : (
                <View
                  style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Ionicons name="time-outline" size={16} color={fg} />
                  <Text style={{ color: fg, fontWeight: "900", fontSize: 12 }}>
                    Sačuvaj
                  </Text>
                </View>
              )}
            </TouchableOpacity> */}
          </View>

          <View style={{ marginTop: 8 }}>
            {weekly.map((d) => (
              <TouchableOpacity
                key={d.weekday}
                onPress={() => openEditDay(d.weekday)}
                activeOpacity={0.85}
                style={[styles.weekRow, { borderColor: border }]}
                accessibilityRole="button"
                accessibilityLabel={`Izmeni ${weekdayLabel[d.weekday]}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayName, { color: fg }]}>
                    {weekdayLabel[d.weekday]}
                  </Text>
                  <Text style={[styles.dayMeta, { color: muted }]}>
                    {fmtHours(d)}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color={muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ===== Account ===== */}
        <View style={[styles.card, { borderColor: border, marginTop: 0 }]}>
          <View
            style={{
              ...styles.row,
            }}
          >
            <View>
              <Text style={[styles.cardTitle, { color: fg }]}>Nalog</Text>
              <Text style={[styles.cardSub, { color: muted }]}>
                Upravljanje nalogom
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.outlineBtn,
                { borderColor: danger, backgroundColor: "transparent" },
              ]}
              onPress={onLogout}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Odjavi se"
            >
              <Ionicons name="log-out-outline" size={20} color={danger} />
              <Text style={[styles.outlineText, { color: danger }]}>
                Odjavi se
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ===== Weekly edit modal (bottom sheet) ===== */}
      <GorhomSheetModal
        visible={weeklyModalOpen}
        onClose={closeWeeklyModal}
        bg={bg}
        border={border}
        header={
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: fg }]}>
                {editingDay ? weekdayLabel[editingDay.weekday] : "Radno vreme"}
              </Text>
              {editingDay ? (
                <Text style={{ color: muted, marginTop: 2, fontWeight: "700" }}>
                  {fmtHours(editingDay)}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={closeWeeklyModal}
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
                saving && disabledStyle,
              ]}
              onPress={closeWeeklyModal}
              disabled={saving}
              activeOpacity={0.85}
            >
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Ionicons name="close-outline" size={18} color={fg} />
                <Text style={[styles.cancelText, { color: fg }]}>Zatvori</Text>
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
                saving && disabledStyle,
              ]}
              onPress={async () => {
                await onSaveWeekly();
                setWeeklyModalOpen(false);
                setEditingWeekday(null);
              }}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color={accentFg} />
              ) : (
                <View
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={accentFg}
                  />
                  <Text style={[styles.saveText, { color: accentFg }]}>
                    Sačuvaj
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetInner}>
          {!editingDay ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator color={fg} />
            </View>
          ) : (
            <>
              {/* Open/Closed toggle */}
              <View style={[styles.sheetCard, { borderColor: border }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.rowTitle, { color: fg }]}>
                      Zatvoreno
                    </Text>
                    <Text style={[styles.rowDesc, { color: muted }]}>
                      Ako je zatvoreno, vremena se ignorišu.
                    </Text>
                  </View>

                  <Switch
                    value={editingDay.isClosed}
                    onValueChange={(v) =>
                      updateDay(editingDay.weekday, { isClosed: v })
                    }
                    disabled={saving}
                  />
                </View>
              </View>

              {/* Time pickers */}
              {!editingDay.isClosed ? (
                <View
                  style={[
                    styles.sheetCard,
                    { borderColor: border, marginTop: 12 },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: muted }]}>
                    Vreme
                  </Text>

                  <TouchableOpacity
                    onPress={() => openTimePicker("open")}
                    disabled={saving}
                    activeOpacity={0.85}
                    style={[
                      styles.timeRowBtn,
                      { borderColor: border, backgroundColor: "transparent" },
                      saving && disabledStyle,
                    ]}
                  >
                    <Text style={{ color: muted, fontWeight: "800" }}>
                      Otvaranje
                    </Text>
                    <Text style={{ color: fg, fontWeight: "900" }}>
                      {editingDay.openTime}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openTimePicker("close")}
                    disabled={saving}
                    activeOpacity={0.85}
                    style={[
                      styles.timeRowBtn,
                      { borderColor: border, backgroundColor: "transparent" },
                      saving && disabledStyle,
                    ]}
                  >
                    <Text style={{ color: muted, fontWeight: "800" }}>
                      Zatvaranje
                    </Text>
                    <Text style={{ color: fg, fontWeight: "900" }}>
                      {editingDay.closeTime}
                    </Text>
                  </TouchableOpacity>

                  {pickerOpen ? (
                    <View style={{ marginTop: 8 }}>
                      <DateTimePicker
                        mode="time"
                        value={pickerValue}
                        onChange={onPickerChange}
                        is24Hour
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                      />
                      {Platform.OS === "ios" ? (
                        <TouchableOpacity
                          onPress={() => setPickerOpen(false)}
                          activeOpacity={0.85}
                          style={[
                            styles.pickerDoneBtn,
                            { borderColor: border },
                            saving && disabledStyle,
                          ]}
                          disabled={saving}
                        >
                          <Text style={{ color: fg, fontWeight: "900" }}>
                            Gotovo
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: muted, fontWeight: "700" }}>
                    Dan je zatvoren.
                  </Text>
                </View>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </GorhomSheetModal>
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
    paddingVertical: 12,
  },

  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardSub: { marginTop: 2, fontSize: 12, marginBottom: 12 },

  divider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },

  sectionTitle: { fontSize: 14, fontWeight: "900" },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowDesc: { marginTop: 2, fontSize: 12 },

  warning: { marginTop: 6, fontSize: 11 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  // Weekly list
  weekRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  dayName: { fontSize: 13, fontWeight: "900" },
  dayMeta: { marginTop: 3, fontSize: 11, fontWeight: "700" },

  smallPill: {
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  // Logout (old style)
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  outlineBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  outlineText: { fontWeight: "900" },

  // Modal/sheet styles (aligned with Orders)
  iconBtnNoBorder: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

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
    paddingBottom: 160,
    paddingLeft: 0,
  },

  sheetCard: {
    borderTopWidth: 1,
    paddingVertical: 12,
  },

  timeRowBtn: {
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pickerDoneBtn: {
    borderWidth: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
});
