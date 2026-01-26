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
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";

import {
  fetchPublicRestaurantHours,
  updateRestaurantSettings,
  setRestaurantWeeklyHours,
  createRestaurantOverride,
  deleteRestaurantOverride,
  Weekday,
  WeeklyHoursRow,
  PublicRestaurantHoursResponse,
} from "../../api/restaurant"; // adjust path if needed

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
  openTime: string;
  closeTime: string;
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
  // simple client-side guard, backend validates anyway
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export default function SettingsTab() {
  const { logout } = useAuth();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // ✅ tokens (isti stil kao ostali screenovi)
  const bg = isDark ? "#000" : "#fff";
  const fg = isDark ? "#fff" : "#000";
  const border = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const danger = "#EB5757";
  const dangerFg = "#fff";
  const accent = isDark ? "#fff" : "#000";

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

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Europe/Belgrade");
  const [weekly, setWeekly] = useState<EditableDay[]>([]);
  const [manualClosedToday, setManualClosedToday] = useState(false);

  const activeOverrideId = server?.activeOverride?.id ?? null;
  const activeOverrideReason = server?.activeOverride?.reason ?? null;

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPublicRestaurantHours();
      setServer(data);

      setName(data.settings?.name ?? "");
      setTimezone(data.settings?.timezone ?? "Europe/Belgrade");
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

  const onSaveSettings = async () => {
    try {
      setSaving(true);
      await updateRestaurantSettings({ name, timezone });
      await load();
      Alert.alert("Sačuvano", "Podešavanja restorana su sačuvana.");
    } catch (e: any) {
      Alert.alert("Greška", e?.message ?? "Snimanje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveWeekly = async () => {
    try {
      // basic client validation
      for (const d of weekly) {
        if (!d.isClosed) {
          if (!isHHmm(d.openTime) || !isHHmm(d.closeTime)) {
            Alert.alert(
              "Neispravno vreme",
              `Proveri vreme za ${weekdayLabel[d.weekday]} (format HH:mm).`,
            );
            return;
          }
          if (d.openTime >= d.closeTime) {
            Alert.alert(
              "Neispravan opseg",
              `Zatvaranje mora biti posle otvaranja (${weekdayLabel[d.weekday]}).`,
            );
            return;
          }
        }
      }

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
    // Guard: if there is some other override active today (Vacation / special),
    // don’t let “manual closed” fight it.
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
        // only delete if our manual override is active
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <ActivityIndicator />
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

        {/* ===== Restaurant settings ===== */}
        <View style={[styles.card, { borderColor: border }]}>
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

          {/* Weekly hours */}
          <Text style={[styles.sectionTitle, { color: fg }]}>Radno vreme</Text>

          {weekly.map((d) => (
            <View
              key={d.weekday}
              style={[styles.dayRow, { borderColor: border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayName, { color: fg }]}>
                  {weekdayLabel[d.weekday]}
                </Text>
                <Text style={[styles.dayMeta, { color: muted }]}>
                  {d.isClosed ? "Zatvoreno" : `${d.openTime} – ${d.closeTime}`}
                </Text>
              </View>

              <View style={styles.dayRight}>
                <TouchableOpacity
                  onPress={() =>
                    updateDay(d.weekday, { isClosed: !d.isClosed })
                  }
                  style={[
                    styles.smallBtn,
                    { borderColor: border, backgroundColor: "transparent" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallBtnText, { color: fg }]}>
                    {d.isClosed ? "Otvori" : "Zatvori"}
                  </Text>
                </TouchableOpacity>
              </View>

              {!d.isClosed ? (
                <View style={styles.timeRow}>
                  <TextInput
                    value={d.openTime}
                    onChangeText={(t) => updateDay(d.weekday, { openTime: t })}
                    style={[
                      styles.timeInput,
                      {
                        color: fg,
                        backgroundColor: inputBg,
                        borderColor: border,
                      },
                    ]}
                    placeholder="15:00"
                    placeholderTextColor={muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={{ color: muted, paddingHorizontal: 8 }}>—</Text>
                  <TextInput
                    value={d.closeTime}
                    onChangeText={(t) => updateDay(d.weekday, { closeTime: t })}
                    style={[
                      styles.timeInput,
                      {
                        color: fg,
                        backgroundColor: inputBg,
                        borderColor: border,
                      },
                    ]}
                    placeholder="23:00"
                    placeholderTextColor={muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ) : null}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, { borderColor: border, marginTop: 10 }]}
            onPress={onSaveWeekly}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="time-outline" size={18} color={accent} />
                <Text style={[styles.primaryText, { color: fg }]}>
                  Sačuvaj radno vreme
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ===== Account ===== */}
        <View style={[styles.card, { borderColor: border, marginTop: 14 }]}>
          <Text style={[styles.cardTitle, { color: fg }]}>Nalog</Text>
          <Text style={[styles.cardSub, { color: muted }]}>
            Upravljanje nalogom
          </Text>

          <View style={styles.row}>
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
      </ScrollView>
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

  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardSub: { marginTop: 2, fontSize: 12, marginBottom: 12 },

  field: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 6 },
  hint: { fontSize: 11, marginTop: 6 },

  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  primaryBtn: {
    height: 46,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { fontWeight: "900" },

  divider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },

  sectionTitle: { fontSize: 14, fontWeight: "900", marginBottom: 8 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
  },

  warning: { marginTop: 6, fontSize: 11 },

  dayRow: {
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  dayName: { fontSize: 13, fontWeight: "900" },
  dayMeta: { marginTop: 2, fontSize: 11 },

  dayRight: { justifyContent: "center" },

  smallBtn: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { fontWeight: "900", fontSize: 12 },

  timeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  timeInput: {
    width: 88,
    height: 40,
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    fontSize: 13,
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

  footer: { marginTop: 12, fontSize: 11 },
});
