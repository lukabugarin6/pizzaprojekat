import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  Modal,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import {
  fetchProductsGrouped,
  createProduct,
  updateProduct,
  type Language,
  type ProductTranslation,
  type ProductVariant,
} from "../../api/products";
import { useAuth } from "../../context/authContext";

const LANGS: Language[] = ["sr-Latn", "en", "ru"];

const LANG_META: Record<Language, { label: string; flag: string }> = {
  "sr-Latn": { label: "SR", flag: "🇷🇸" },
  en: { label: "EN", flag: "🇬🇧" },
  ru: { label: "RU", flag: "🇷🇺" },
};

function normalizeTranslations(t?: ProductTranslation[]): ProductTranslation[] {
  const base: ProductTranslation[] = [
    { language: "sr-Latn", name: "", description: "" },
    { language: "en", name: "", description: "" },
    { language: "ru", name: "", description: "" },
  ];

  if (!Array.isArray(t) || t.length === 0) return base;

  const map: Record<string, ProductTranslation> = {};
  for (const x of t) {
    map[x.language] = {
      language: x.language,
      name: x.name ?? "",
      description: x.description ?? "",
    };
  }

  return base.map((b) => map[b.language] ?? b);
}

function normalizeVariants(v?: ProductVariant[]): ProductVariant[] {
  return Array.isArray(v) && v.length > 0
    ? v.map((x) => ({
        // Treat "size" as quantity (količina)
        size:
          typeof x.size === "number" && !Number.isNaN(x.size)
            ? x.size
            : undefined,
        price:
          typeof x.price === "number" && !Number.isNaN(x.price) ? x.price : 0,
        sku: (x as any).sku ?? undefined,
      }))
    : [{ size: undefined, price: 0, sku: undefined } as any];
}

// DTO types for /products/grouped?lang=xx
type ProductVariantDto = {
  id: string;
  size: number | null;
  price: number;
  sku?: string | null;
};
type ProductCardItemDto = {
  id: string;
  slug: string;
  image?: string | null;
  sortOrder?: number;

  // translated by requested lang (ONLY ONE language coming from grouped)
  name: string;
  description: string;

  variants: ProductVariantDto[];
};
type ProductsCategoryDto = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: ProductCardItemDto[];
};
type ProductsGroupedResponseDto = { categories: ProductsCategoryDto[] };

/**
 * ✅ Custom cross-platform select (no native Picker bugs)
 */
function CategorySelect({
  value,
  options,
  onChange,
  fg,
  bg,
  border,
  muted,
}: {
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  fg: string;
  bg: string;
  border: string;
  muted: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Izaberi kategoriju"
        style={{
          height: 40,
          borderWidth: 1,
          borderColor: border,
          paddingHorizontal: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          minWidth: 170,
          overflow: "hidden",
        }}
      >
        <Text
          numberOfLines={1}
          style={{ color: fg, fontWeight: "800", maxWidth: 140 }}
        >
          {current?.label ?? "Kategorija"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={muted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              marginTop: Platform.OS === "ios" ? 90 : 80,
              marginHorizontal: 16,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: bg,
              padding: 10,
              maxHeight: "60%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: fg, fontWeight: "900" }}>
                Izaberi kategoriju
              </Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close-outline" size={22} color={fg} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(x) => x.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.id === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    activeOpacity={0.85}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        color: fg,
                        fontWeight: selected ? "900" : "700",
                        paddingRight: 10,
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={18} color={fg} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function LangTabs({
  active,
  onChange,
  fg,
  border,
  muted,
}: {
  active: Language;
  onChange: (l: Language) => void;
  fg: string;
  border: string;
  muted: string;
}) {
  return (
    <View style={[styles.langTabsRow, { borderColor: border }]}>
      {LANGS.map((l) => {
        const isActive = l === active;
        return (
          <TouchableOpacity
            key={l}
            onPress={() => onChange(l)}
            activeOpacity={0.85}
            style={[
              styles.langTab,
              isActive && { borderColor: border, borderBottomWidth: 2 },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{LANG_META[l].flag}</Text>
            <Text
              style={{
                color: isActive ? fg : muted,
                fontWeight: isActive ? "900" : "800",
              }}
            >
              {LANG_META[l].label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

async function pickImageFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Dozvola", "Potrebna je dozvola za galeriju.");
    return null;
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });

  if (res.canceled) return null;
  return res.assets?.[0]?.uri ?? null;
}

// local cache: we fill translations per product as user switches list language
type TransCache = Record<string, Partial<Record<Language, ProductTranslation>>>;

export default function ProductsScreen() {
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

  const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const imageUrl = (path?: string | null) => {
    if (!path) return "";
    if (/^(file|content):\/\//i.test(path)) return path;
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${apiBase}${p}`;
  };

  const [grouped, setGrouped] = useState<ProductsGroupedResponseDto>({
    categories: [],
  });
  const [loading, setLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // ✅ list language switcher (drives /products/grouped?lang=xx)
  const [listLang, setListLang] = useState<Language>("sr-Latn");

  // ✅ translation cache, populated as user switches list language
  const [transCache, setTransCache] = useState<TransCache>({});

  // CREATE
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newSlug, setNewSlug] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);

  const [newTranslations, setNewTranslations] = useState<ProductTranslation[]>(
    normalizeTranslations(undefined),
  );
  const [newVariants, setNewVariants] = useState<ProductVariant[]>(
    normalizeVariants(undefined),
  );
  const [createLang, setCreateLang] = useState<Language>("sr-Latn");

  // EDIT
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editSlug, setEditSlug] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);

  const [editTranslations, setEditTranslations] = useState<
    ProductTranslation[]
  >(normalizeTranslations(undefined));
  const [editVariants, setEditVariants] = useState<ProductVariant[]>(
    normalizeVariants(undefined),
  );
  const [editLang, setEditLang] = useState<Language>("sr-Latn");

  async function load(lang: Language = listLang) {
    setLoading(true);
    try {
      const data = (await fetchProductsGrouped(
        lang,
      )) as ProductsGroupedResponseDto | null;

      const cats = Array.isArray(data?.categories) ? data!.categories : [];
      const sortedCats = [...cats].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );

      setGrouped({ categories: sortedCats });

      // ✅ keep category selected if possible
      setSelectedCategoryId((prev) => {
        if (prev && sortedCats.some((c) => c.id === prev)) return prev;
        return sortedCats[0]?.id ?? null;
      });

      // ✅ update cache with this lang for all items
      setTransCache((prev) => {
        const next: TransCache = { ...prev };
        for (const c of sortedCats) {
          for (const it of c.items ?? []) {
            const id = it.id;
            const current = next[id] ?? {};
            current[lang] = {
              language: lang,
              name: it.name ?? "",
              description: it.description ?? "",
            };
            next[id] = current;
          }
        }
        return next;
      });
    } catch (e: any) {
      Alert.alert("Greška", e?.message ?? "Neuspešno učitavanje.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(listLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when listLang changes => refetch grouped with that lang
  useEffect(() => {
    load(listLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLang]);

  const categories = grouped.categories ?? [];

  const selectedId = useMemo(() => {
    if (!categories.length) return null;
    const exists =
      selectedCategoryId && categories.some((c) => c.id === selectedCategoryId);
    return exists ? selectedCategoryId : categories[0].id;
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo(() => {
    if (!categories.length) return null;
    const byId = categories.find((c) => c.id === selectedId);
    return byId ?? categories[0] ?? null;
  }, [categories, selectedId]);

  const items = useMemo(() => {
    const list = selectedCategory?.items ?? [];
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [selectedCategory]);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: String(c.name || c.slug || "Kategorija"),
      })),
    [categories],
  );

  // translations maps (CREATE/EDIT UI always shows sr/en/ru)
  const createTranslationsByLang = useMemo(() => {
    const map: Record<Language, ProductTranslation> = {
      "sr-Latn": { language: "sr-Latn", name: "", description: "" },
      en: { language: "en", name: "", description: "" },
      ru: { language: "ru", name: "", description: "" },
    };
    for (const t of newTranslations) map[t.language] = t;
    return map;
  }, [newTranslations]);

  const editTranslationsByLang = useMemo(() => {
    const map: Record<Language, ProductTranslation> = {
      "sr-Latn": { language: "sr-Latn", name: "", description: "" },
      en: { language: "en", name: "", description: "" },
      ru: { language: "ru", name: "", description: "" },
    };
    for (const t of editTranslations) map[t.language] = t;
    return map;
  }, [editTranslations]);

  // ✅ Validation (categoryId hidden, derived from selected category)
  function validateCreate() {
    if (!selectedCategory?.id) return "Nema izabrane kategorije";
    if (!newSlug.trim()) return "Slug je obavezan";

    for (const t of newTranslations) {
      if (!t.name.trim()) return `Naziv (${t.language}) je obavezan`;
      if (!t.description.trim()) return `Opis (${t.language}) je obavezan`;
    }

    for (let i = 0; i < newVariants.length; i++) {
      const v = newVariants[i];
      if (typeof v.price !== "number" || Number.isNaN(v.price))
        return `Varijanta #${i + 1}: cena je obavezna`;
    }

    return null;
  }

  function validateEdit() {
    if (!selectedCategory?.id) return "Nema izabrane kategorije";
    if (!editSlug.trim()) return "Slug je obavezan";

    for (const t of editTranslations) {
      if (!t.name.trim()) return `Naziv (${t.language}) je obavezan`;
      if (!t.description.trim()) return `Opis (${t.language}) je obavezan`;
    }

    for (let i = 0; i < editVariants.length; i++) {
      const v = editVariants[i];
      if (typeof v.price !== "number" || Number.isNaN(v.price))
        return `Varijanta #${i + 1}: cena je obavezna`;
    }

    return null;
  }

  // -------------------------
  // ✅ Create / Edit Image actions
  // -------------------------
  async function pickCreateImage() {
    const uri = await pickImageFromLibrary();
    if (uri) setNewImage(uri);
  }

  async function pickEditImage() {
    const uri = await pickImageFromLibrary();
    if (uri) setEditImage(uri);
  }

  // -------------------------
  // ✅ Create
  // -------------------------
  async function handleCreate() {
    const err = validateCreate();
    if (err) return Alert.alert("Validacija", err);

    setCreating(true);
    try {
      await createProduct({
        slug: newSlug.trim(),
        categoryId: selectedCategory!.id,
        image: newImage ?? undefined,
        translations: newTranslations.map((t) => ({
          language: t.language,
          name: t.name.trim(),
          description: t.description.trim(),
        })),
        variants: newVariants.map((v) => ({
          size:
            typeof v.size === "number" && !Number.isNaN(v.size)
              ? v.size
              : undefined,
          price: v.price,
          sku: (v as any).sku?.trim() ? (v as any).sku.trim() : undefined,
        })),
      } as any);

      await load(listLang);

      setNewSlug("");
      setNewImage(null);
      setNewTranslations(normalizeTranslations(undefined));
      setNewVariants(normalizeVariants(undefined));
      closeCreate();
    } catch (e: any) {
      Alert.alert("Kreiranje nije uspelo", e?.message ?? "Pokušajte ponovo.");
    } finally {
      setCreating(false);
    }
  }

  // -------------------------
  // ✅ Edit (NO fetch-by-id)
  // We populate translations from cache (built by switching list language)
  // -------------------------
  function openEdit(item: ProductCardItemDto) {
    setEditingId(item.id);

    setEditImage(item.image ?? null);
    setEditSlug(item.slug ?? "");

    // Build full sr/en/ru from cache + current item (current listLang always present)
    const cached = transCache[item.id] ?? {};
    const merged: ProductTranslation[] = normalizeTranslations([
      cached["sr-Latn"] ?? { language: "sr-Latn", name: "", description: "" },
      cached["en"] ?? { language: "en", name: "", description: "" },
      cached["ru"] ?? { language: "ru", name: "", description: "" },
      // ensure current lang definitely set from this item
      {
        language: listLang,
        name: item.name ?? "",
        description: item.description ?? "",
      },
    ]);

    setEditTranslations(merged);

    setEditVariants(
      normalizeVariants(
        (item.variants ?? []).map((v) => ({
          size: v.size ?? undefined,
          price: v.price ?? 0,
          sku: v.sku ?? undefined,
        })) as any,
      ),
    );

    // default tab = current list language (feels natural)
    setEditLang(listLang);

    setEditOpen(true);
    editAnim.setValue(0);
    Animated.timing(editAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  async function handleSaveEdit() {
    const err = validateEdit();
    if (err) return Alert.alert("Validacija", err);
    if (!editingId) return;

    setSaving(true);
    try {
      await updateProduct(editingId, {
        slug: editSlug.trim(),
        categoryId: selectedCategory!.id,
        image: editImage ?? null,
        translations: editTranslations.map((t) => ({
          language: t.language,
          name: t.name.trim(),
          description: t.description.trim(),
        })),
        variants: editVariants.map((v) => ({
          size:
            typeof v.size === "number" && !Number.isNaN(v.size)
              ? v.size
              : undefined,
          price: v.price,
          sku: (v as any).sku?.trim() ? (v as any).sku.trim() : undefined,
        })),
      } as any);

      // also update cache immediately (so no need to switch languages to see it)
      setTransCache((prev) => {
        const next = { ...prev };
        const cur = next[editingId] ?? {};
        for (const t of editTranslations) {
          cur[t.language] = {
            language: t.language,
            name: t.name ?? "",
            description: t.description ?? "",
          };
        }
        next[editingId] = cur;
        return next;
      });

      await load(listLang);
      closeEdit();
      Alert.alert("Sačuvano", "Proizvod je ažuriran.");
    } catch (e: any) {
      Alert.alert("Ažuriranje nije uspelo", e?.message ?? "Pokušajte ponovo.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------
  // ✅ Variant helpers
  // -------------------------
  function updateNewVariant(index: number, patch: Partial<ProductVariant>) {
    setNewVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }
  function addNewVariant() {
    setNewVariants((prev) => [...prev, { size: undefined, price: 0 } as any]);
  }
  function removeNewVariant(index: number) {
    setNewVariants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : ([{ size: undefined, price: 0 }] as any);
    });
  }

  function updateEditVariant(index: number, patch: Partial<ProductVariant>) {
    setEditVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }
  function addEditVariant() {
    setEditVariants((prev) => [...prev, { size: undefined, price: 0 } as any]);
  }
  function removeEditVariant(index: number) {
    setEditVariants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : ([{ size: undefined, price: 0 }] as any);
    });
  }

  // -------------------------
  // ✅ Animated sheets
  // -------------------------
  const createAnim = useRef(new Animated.Value(0)).current;
  const editAnim = useRef(new Animated.Value(0)).current;

  const openCreate = () => {
    setCreateOpen(true);
    createAnim.setValue(0);
    Animated.timing(createAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeCreate = () => {
    Animated.timing(createAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setCreateOpen(false);
    });
  };

  const closeEdit = () => {
    Animated.timing(editAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setEditOpen(false);
        setEditingId(null);
      }
    });
  };

  const createBackdropOpacity = createAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const createSheetTranslateY = createAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const createSheetOpacity = createAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const editBackdropOpacity = editAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const editSheetTranslateY = editAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const editSheetOpacity = editAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Title + lang switcher */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: fg }]}>Proizvodi</Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          <LangTabs
            active={listLang}
            onChange={setListLang}
            fg={fg}
            border={border}
            muted={muted}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          {categoryOptions.length > 0 && (
            <CategorySelect
              value={selectedId}
              options={categoryOptions}
              onChange={(id) => setSelectedCategoryId(id)}
              fg={fg}
              bg={bg}
              border={border}
              muted={muted}
            />
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
          {loading ? (
            <View style={{ paddingTop: 18 }}>
              <ActivityIndicator color={fg} />
            </View>
          ) : (
            <FlatList
              data={items}
              scrollEnabled={false}
              refreshing={loading}
              onRefresh={() => load(listLang)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.card, { borderColor: border }]}>
                  <View style={styles.cardHeaderRow}>
                    <Image
                      source={{ uri: imageUrl(item.image) }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.slug, { color: fg }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.smallMuted, { color: muted }]}>
                        {item?.description ?? ""}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => openEdit(item)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Izmeni proizvod"
                      style={styles.iconBtnNoBorder}
                    >
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color={accent}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ paddingTop: 18 }}>
                  <Text style={{ color: muted, fontWeight: "700" }}>
                    Nema proizvoda u ovoj kategoriji.
                  </Text>
                </View>
              }
            />
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent }]}
          onPress={openCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Kreiraj proizvod"
        >
          <Ionicons name="add-outline" size={28} color={accentFg} />
        </TouchableOpacity>

        {/* ----------------------- */}
        {/* ✅ CREATE MODAL */}
        {/* ----------------------- */}
        <Modal
          visible={createOpen}
          transparent
          animationType="fade"
          onRequestClose={closeCreate}
          statusBarTranslucent
        >
          <View style={StyleSheet.absoluteFill}>
            <Pressable onPress={closeCreate} style={StyleSheet.absoluteFill}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,1)",
                    opacity: createBackdropOpacity,
                  },
                ]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.sheetWrap,
                {
                  transform: [{ translateY: createSheetTranslateY }],
                  opacity: createSheetOpacity,
                },
              ]}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: bg, borderTopColor: border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: fg }]}>
                    Kreiraj proizvod
                  </Text>

                  <TouchableOpacity
                    onPress={closeCreate}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Zatvori"
                    style={styles.iconBtnNoBorder}
                  >
                    <Ionicons name="close-outline" size={26} color={fg} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: "78%" }}
                  contentContainerStyle={{ paddingBottom: 14 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Image card */}
                  <View style={[styles.imageCard, { borderColor: border }]}>
                    <Image
                      source={
                        newImage
                          ? { uri: imageUrl(newImage) }
                          : {
                              uri: "https://via.placeholder.com/800x600?text=No+Image",
                            }
                      }
                      style={styles.imageCardImg}
                      resizeMode="cover"
                    />

                    <View style={styles.imageActions}>
                      <TouchableOpacity
                        onPress={pickCreateImage}
                        style={[styles.imageIconBtn, { borderColor: border }]}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="image-outline" size={18} color={fg} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setNewImage(null)}
                        style={[styles.imageIconBtn, { borderColor: border }]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={danger}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.imageCardFooter}>
                      <Text style={{ color: fg, fontWeight: "900" }}>
                        Slika
                      </Text>
                      <Text style={{ color: muted, fontWeight: "700" }}>
                        Izaberi / obriši po potrebi
                      </Text>
                    </View>
                  </View>

                  {/* slug below image */}
                  <View style={[styles.inputWrap, { borderColor: border }]}>
                    <TextInput
                      style={[styles.input, { color: fg }]}
                      placeholder="Slug"
                      placeholderTextColor={placeholder}
                      value={newSlug}
                      onChangeText={setNewSlug}
                      selectionColor={accent}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: fg }]}>
                      Prevod
                    </Text>

                    <LangTabs
                      active={createLang}
                      onChange={setCreateLang}
                      fg={fg}
                      border={border}
                      muted={muted}
                    />

                    {(() => {
                      const t = createTranslationsByLang[createLang];
                      return (
                        <View style={[styles.subCard, { borderColor: border }]}>
                          <Text style={[styles.subTitle, { color: muted }]}>
                            {LANG_META[createLang].flag} {createLang}
                          </Text>

                          <View
                            style={[styles.inputWrap, { borderColor: border }]}
                          >
                            <TextInput
                              style={[styles.input, { color: fg }]}
                              placeholder="Naziv"
                              placeholderTextColor={placeholder}
                              value={t.name}
                              onChangeText={(v) =>
                                setNewTranslations((prev) => {
                                  const list = normalizeTranslations(prev);
                                  return list.map((x) =>
                                    x.language === createLang
                                      ? { ...x, name: v }
                                      : x,
                                  );
                                })
                              }
                              selectionColor={accent}
                            />
                          </View>

                          <View
                            style={[styles.inputWrap, { borderColor: border }]}
                          >
                            <TextInput
                              style={[
                                styles.input,
                                { color: fg, minHeight: 60 },
                              ]}
                              placeholder="Opis"
                              placeholderTextColor={placeholder}
                              multiline
                              value={t.description}
                              onChangeText={(v) =>
                                setNewTranslations((prev) => {
                                  const list = normalizeTranslations(prev);
                                  return list.map((x) =>
                                    x.language === createLang
                                      ? { ...x, description: v }
                                      : x,
                                  );
                                })
                              }
                              selectionColor={accent}
                            />
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: fg }]}>
                      Varijante
                    </Text>

                    {newVariants.map((v, idx) => (
                      <View key={idx} style={styles.variantRow}>
                        <View
                          style={[styles.variantBlock, { borderColor: border }]}
                        >
                          <Text style={[styles.fieldLabel, { color: muted }]}>
                            Količina
                          </Text>
                          <TextInput
                            style={[styles.input, { color: fg }]}
                            placeholder="npr. 250"
                            placeholderTextColor={placeholder}
                            value={
                              typeof v.size === "number" ? String(v.size) : ""
                            }
                            onChangeText={(txt) =>
                              updateNewVariant(idx, {
                                size:
                                  txt.trim() === "" ? undefined : Number(txt),
                              })
                            }
                            keyboardType="numeric"
                            selectionColor={accent}
                          />
                        </View>

                        <View
                          style={[styles.variantBlock, { borderColor: border }]}
                        >
                          <Text style={[styles.fieldLabel, { color: muted }]}>
                            Cena
                          </Text>
                          <TextInput
                            style={[styles.input, { color: fg }]}
                            placeholder="npr. 1200"
                            placeholderTextColor={placeholder}
                            value={String(v.price ?? "")}
                            onChangeText={(txt) =>
                              updateNewVariant(idx, { price: Number(txt) })
                            }
                            keyboardType="numeric"
                            selectionColor={accent}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => removeNewVariant(idx)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel="Ukloni varijantu"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={danger}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={addNewVariant}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-outline" size={18} color={accent} />
                      <Text style={{ color: accent, fontWeight: "800" }}>
                        Dodaj varijantu
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: "transparent", borderColor: border },
                    ]}
                    onPress={closeCreate}
                    disabled={creating}
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
                      creating && disabledStyle,
                    ]}
                    onPress={handleCreate}
                    disabled={creating}
                    activeOpacity={0.85}
                  >
                    {creating ? (
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

        {/* ----------------------- */}
        {/* ✅ EDIT MODAL */}
        {/* ----------------------- */}
        <Modal
          visible={editOpen}
          transparent
          animationType="fade"
          onRequestClose={closeEdit}
          statusBarTranslucent
        >
          <View style={StyleSheet.absoluteFill}>
            <Pressable onPress={closeEdit} style={StyleSheet.absoluteFill}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,1)",
                    opacity: editBackdropOpacity,
                  },
                ]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.sheetWrap,
                {
                  transform: [{ translateY: editSheetTranslateY }],
                  opacity: editSheetOpacity,
                },
              ]}
            >
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: bg, borderTopColor: border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: fg }]}>
                    Izmeni proizvod
                  </Text>

                  <TouchableOpacity
                    onPress={closeEdit}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Zatvori"
                    style={styles.iconBtnNoBorder}
                  >
                    <Ionicons name="close-outline" size={26} color={fg} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: "78%" }}
                  contentContainerStyle={{ paddingBottom: 14 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={[styles.imageCard, { borderColor: border }]}>
                    <Image
                      source={
                        editImage
                          ? { uri: imageUrl(editImage) }
                          : {
                              uri: "https://via.placeholder.com/800x600?text=No+Image",
                            }
                      }
                      style={styles.imageCardImg}
                      resizeMode="cover"
                    />

                    <View style={styles.imageActions}>
                      <TouchableOpacity
                        onPress={pickEditImage}
                        style={[styles.imageIconBtn, { borderColor: border }]}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="create-outline" size={18} color={fg} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setEditImage(null)}
                        style={[styles.imageIconBtn, { borderColor: border }]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={danger}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.imageCardFooter}>
                      <Text style={{ color: fg, fontWeight: "900" }}>
                        Slika
                      </Text>
                      <Text style={{ color: muted, fontWeight: "700" }}>
                        Promeni / obriši po potrebi
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.inputWrap, { borderColor: border }]}>
                    <TextInput
                      style={[styles.input, { color: fg }]}
                      placeholder="Slug"
                      placeholderTextColor={placeholder}
                      value={editSlug}
                      onChangeText={setEditSlug}
                      selectionColor={accent}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: fg }]}>
                      Prevod
                    </Text>

                    <LangTabs
                      active={editLang}
                      onChange={setEditLang}
                      fg={fg}
                      border={border}
                      muted={muted}
                    />

                    {/* tiny hint why some langs may be empty */}
                    <Text
                      style={{
                        color: muted,
                        fontWeight: "700",
                        marginBottom: 8,
                      }}
                    >
                      Popunjava se iz keša dok menjaš jezik gore (SR/EN/RU). Ako
                      nešto fali, samo upiši ručno.
                    </Text>

                    {(() => {
                      const t = editTranslationsByLang[editLang];
                      return (
                        <View style={[styles.subCard, { borderColor: border }]}>
                          <Text style={[styles.subTitle, { color: muted }]}>
                            {LANG_META[editLang].flag} {editLang}
                          </Text>

                          <View
                            style={[styles.inputWrap, { borderColor: border }]}
                          >
                            <TextInput
                              style={[styles.input, { color: fg }]}
                              placeholder="Naziv"
                              placeholderTextColor={placeholder}
                              value={t.name}
                              onChangeText={(v) =>
                                setEditTranslations((prev) => {
                                  const list = normalizeTranslations(prev);
                                  return list.map((x) =>
                                    x.language === editLang
                                      ? { ...x, name: v }
                                      : x,
                                  );
                                })
                              }
                              selectionColor={accent}
                            />
                          </View>

                          <View
                            style={[styles.inputWrap, { borderColor: border }]}
                          >
                            <TextInput
                              style={[
                                styles.input,
                                { color: fg, minHeight: 60 },
                              ]}
                              placeholder="Opis"
                              placeholderTextColor={placeholder}
                              multiline
                              value={t.description}
                              onChangeText={(v) =>
                                setEditTranslations((prev) => {
                                  const list = normalizeTranslations(prev);
                                  return list.map((x) =>
                                    x.language === editLang
                                      ? { ...x, description: v }
                                      : x,
                                  );
                                })
                              }
                              selectionColor={accent}
                            />
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: fg }]}>
                      Varijante
                    </Text>

                    {editVariants.map((v, idx) => (
                      <View key={idx} style={styles.variantRow}>
                        <View
                          style={[styles.variantBlock, { borderColor: border }]}
                        >
                          <Text style={[styles.fieldLabel, { color: muted }]}>
                            Količina
                          </Text>
                          <TextInput
                            style={[styles.input, { color: fg }]}
                            placeholder="npr. 250"
                            placeholderTextColor={placeholder}
                            value={
                              typeof v.size === "number" ? String(v.size) : ""
                            }
                            onChangeText={(txt) =>
                              updateEditVariant(idx, {
                                size:
                                  txt.trim() === "" ? undefined : Number(txt),
                              })
                            }
                            keyboardType="numeric"
                            selectionColor={accent}
                          />
                        </View>

                        <View
                          style={[styles.variantBlock, { borderColor: border }]}
                        >
                          <Text style={[styles.fieldLabel, { color: muted }]}>
                            Cena
                          </Text>
                          <TextInput
                            style={[styles.input, { color: fg }]}
                            placeholder="npr. 1200"
                            placeholderTextColor={placeholder}
                            value={String(v.price ?? "")}
                            onChangeText={(txt) =>
                              updateEditVariant(idx, { price: Number(txt) })
                            }
                            keyboardType="numeric"
                            selectionColor={accent}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => removeEditVariant(idx)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel="Ukloni varijantu"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={danger}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={addEditVariant}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-outline" size={18} color={accent} />
                      <Text style={{ color: accent, fontWeight: "800" }}>
                        Dodaj varijantu
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.fullBtn,
                    { backgroundColor: accent, borderColor: accent },
                    saving && disabledStyle,
                  ]}
                  onPress={handleSaveEdit}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={accentFg} />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color={accentFg}
                      />
                      <Text style={{ color: accentFg, fontWeight: "800" }}>
                        Sačuvaj
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
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
  container: { flex: 1, padding: 16, paddingTop: 24 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "800", flex: 1 },

  card: {
    borderBottomWidth: 1,
    borderRadius: 0,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 0,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  slug: { fontSize: 15, fontWeight: "800" },
  smallMuted: { fontSize: 12, fontWeight: "700" },

  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: "center",
    marginBottom: 10,
  },
  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "800", marginBottom: 6 },

  // language tabs
  langTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  langTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 0,
  },

  subCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
  },
  subTitle: { fontWeight: "800", marginBottom: 8 },

  // variants with labels
  variantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  variantBlock: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 0,
    overflow: "hidden",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },

  trashBtn: {
    width: 40,
    height: 46,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  iconBtnNoBorder: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  btnSecondary: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingVertical: 8,
  },

  fullBtn: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    height: 46,
    width: "100%",
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
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

  // image row (preview + actions)
  imageRow: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  imagePreview: {
    width: 140,
    height: 90,
    borderRadius: 0,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  smallActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  langPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  langPill: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // image card (create/edit modals)
  imageCard: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  imageCardImg: {
    width: "100%",
    height: 170,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  imageActions: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    gap: 10,
  },
  imageIconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  imageCardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
