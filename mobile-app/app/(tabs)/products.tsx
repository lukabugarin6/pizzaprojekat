// ProductsScreen.tsx
// ✅ FIXED: make create/update payloads consistent (no null sizes, strict price parsing)
// ✅ FIXED: remove duplicate DTO shadowing + tighten typing
// ✅ FIXED: safer category value handling (avoid null crashes in selects)
// ✅ FIXED: create/edit variants mapping uses validated numeric conversions
// ✅ Keeps: edit image keep/delete/replace via editImageRemoved + clear images on modal close

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Text,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { fetchCategories, type CategoryDto } from "../../api/categories";
import {
  fetchProductsGrouped,
  fetchProductDetails,
  createProduct,
  updateProduct,
  deleteProduct,
  type Language,
  type ProductTranslation,
  type ProductVariant,
} from "../../api/products";
import { useAuth } from "../../context/authContext";

// ✅ extracted components
import { LangTabs } from "../../components/products/lang-tabs";
import { ProductImageCard } from "../../components/products/product-image-card";
import { TranslationEditor } from "../../components/products/translation-editor";
import { VariantsEditor } from "../../components/products/variants-editor";
import { ProductCard } from "../../components/products/product-card";
import { CategorySelect } from "../../components/products/category-select";

// ✅ styles extracted
import { productsStyles as styles } from "../../styles/products.styles";
import { GorhomSheetModal } from "../../components/products/bottom-sheet-modal";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANG_META: Record<Language, { label: string; flag: string }> = {
  "sr-Latn": { label: "SR", flag: "🇷🇸" },
  en: { label: "EN", flag: "🇬🇧" },
  ru: { label: "RU", flag: "🇷🇺" },
};

function getCategoryLabel(cat: CategoryDto, lang: Language): string {
  const t = cat.translations ?? [];
  const exact = t.find((x) => x.language === lang)?.name;
  if (exact?.trim()) return exact;

  const sr = t.find((x) => x.language === "sr-Latn")?.name;
  if (sr?.trim()) return sr;

  const any = t[0]?.name;
  if (any?.trim()) return any;

  return String(cat.slug || "Kategorija");
}

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
      ...(x as any), // keep id if present
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
        ...(x as any), // keep id if present
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

async function pickImageFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    showToast("error", "Dozvola", "Potrebna je dozvola za galeriju.");
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

function parseSortOrder(input: string): number | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

// ✅ Strict numeric helpers (avoid NaN payloads)
function toNumberOrNull(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toNumberOrZero(value: any): number {
  const n = toNumberOrNull(value);
  return n === null ? 0 : n;
}

export default function ProductsScreen() {
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

  const placeholderImage = "https://via.placeholder.com/800x600?text=No+Image";

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

  const [grouped, setGrouped] = useState<{ categories: any[] }>({
    categories: [],
  });
  const [loading, setLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const [deleting, setDeleting] = useState(false);

  // ✅ list language switcher (drives /products/grouped?lang=xx)
  const [listLang, setListLang] = useState<Language>("sr-Latn");

  // ✅ translation cache, populated as user switches list language
  const [transCache, setTransCache] = useState<TransCache>({});

  // ✅ categories for modals (fetched from /categories)
  const [modalCategories, setModalCategories] = useState<CategoryDto[]>([]);
  const [modalCatsLoading, setModalCatsLoading] = useState(false);

  async function loadModalCategories() {
    setModalCatsLoading(true);
    try {
      const cats = await fetchCategories();
      const sorted = [...(Array.isArray(cats) ? cats : [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
      setModalCategories(sorted);
    } catch (e: any) {
      showToast(
        "error",
        "Greška",
        e?.message ?? "Neuspešno učitavanje kategorija.",
      );
    } finally {
      setModalCatsLoading(false);
    }
  }

  async function load(lang: Language = listLang) {
    setLoading(true);
    try {
      const data = await fetchProductsGrouped(lang);

      const cats = Array.isArray((data as any)?.categories)
        ? (data as any).categories
        : [];
      const sortedCats = [...cats].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );

      setGrouped({ categories: sortedCats });

      setSelectedCategoryId((prev) => {
        if (prev && sortedCats.some((c: any) => c.id === prev)) return prev;
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
      showToast("error", "Greška", e?.message ?? "Neuspešno učitavanje.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(listLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLang]);

  // load modal categories early (so the select is ready)
  useEffect(() => {
    loadModalCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = grouped.categories ?? [];

  const selectedId = useMemo(() => {
    if (!categories.length) return null;
    const exists =
      selectedCategoryId &&
      categories.some((c: any) => c.id === selectedCategoryId);
    return exists ? selectedCategoryId : categories[0].id;
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo(() => {
    if (!categories.length) return null;
    const byId = categories.find((c: any) => c.id === selectedId);
    return byId ?? categories[0] ?? null;
  }, [categories, selectedId]);

  const items = useMemo(() => {
    const list = selectedCategory?.items ?? [];
    return [...list].sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }, [selectedCategory]);

  // main screen category options (from grouped response)
  const categoryOptions = useMemo(
    () =>
      categories.map((c: any) => ({
        id: c.id,
        label: String(c.name || c.slug || "Kategorija"),
      })),
    [categories],
  );

  // modal category options (from /categories) – use translations
  const modalCategoryOptions = useMemo(() => {
    return (modalCategories ?? []).map((c) => ({
      id: c.id,
      label: getCategoryLabel(c, listLang),
    }));
  }, [modalCategories, listLang]);

  // CREATE
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newSortOrder, setNewSortOrder] = useState<string>("");

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

  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const [editSortOrder, setEditSortOrder] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const [editTranslations, setEditTranslations] = useState<
    ProductTranslation[]
  >(normalizeTranslations(undefined));
  const [editVariants, setEditVariants] = useState<ProductVariant[]>(
    normalizeVariants(undefined),
  );
  const [editLang, setEditLang] = useState<Language>("sr-Latn");

  const [editLoading, setEditLoading] = useState(false);

  // ✅ keep modal default category in sync with main screen selection
  useEffect(() => {
    if (!createOpen) setNewCategoryId(selectedId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ✅ when modals close, clear their image state
  useEffect(() => {
    if (!createOpen) {
      setNewImage(null);
    }
  }, [createOpen]);

  useEffect(() => {
    if (!editOpen) {
      setEditImage(null);
      setEditImageRemoved(false);
    }
  }, [editOpen]);

  function validateVariantsFilled(variants: any[], labelPrefix = "Varijanta") {
    if (!Array.isArray(variants) || variants.length === 0) {
      return "Morate uneti makar jednu varijantu.";
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];

      // size is optional but if present must be number
      const rawSize = v?.size;
      if (
        rawSize !== null &&
        rawSize !== undefined &&
        String(rawSize).trim() !== ""
      ) {
        const size = toNumberOrNull(rawSize);
        if (size === null)
          return `${labelPrefix} #${i + 1}: Veličina mora biti broj ili prazno`;
      }

      const price = toNumberOrNull(v?.price);
      if (price === null) return `${labelPrefix} #${i + 1}: Cena je obavezna`;
      if (price <= 0)
        return `${labelPrefix} #${i + 1}: Cena mora biti veća od 0`;
    }

    return null;
  }

  async function handleDeleteProduct() {
    if (!editingId) return;

    Alert.alert(
      "Brisanje proizvoda",
      "Da li ste sigurni? Ova akcija se ne može poništiti.",
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteProduct(editingId);
              await load(listLang);

              setEditOpen(false);
              setEditingId(null);
              setEditImageRemoved(false);

              showToast("success", "Obrisano", "Proizvod je obrisan.");
            } catch (e: any) {
              showToast(
                "error",
                "Brisanje nije uspelo",
                e?.message ?? "Pokušajte ponovo.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function validateCreate() {
    const catId = newCategoryId ?? selectedId;
    if (!catId) return "Nema izabrane kategorije";
    if (!newSlug.trim()) return "Slug je obavezan";

    const so = parseSortOrder(newSortOrder);
    if (newSortOrder.trim() && so === null) return "Sort order mora biti broj.";

    const variantsErr = validateVariantsFilled(newVariants);
    if (variantsErr) return variantsErr;

    return null;
  }

  function validateEdit() {
    const catId = editCategoryId ?? selectedId;
    if (!catId) return "Nema izabrane kategorije";
    if (!editSlug.trim()) return "Slug je obavezan";

    const so = parseSortOrder(editSortOrder);
    if (editSortOrder.trim() && so === null)
      return "Sort order mora biti broj.";

    const variantsErr = validateVariantsFilled(editVariants);
    if (variantsErr) return variantsErr;

    return null;
  }

  function buildTranslationsPayload(
    arr: ProductTranslation[] | undefined,
  ): ProductTranslation[] {
    const normalized = normalizeTranslations(arr);
    return normalized.map((t) => ({
      ...(t as any),
      language: t.language,
      name: (t.name ?? "").toString(),
      description: (t.description ?? "").toString(),
    }));
  }

  function buildTranslationsPayloadForEdit(arr: any[] | undefined): any[] {
    const normalized = normalizeTranslations(arr as any);
    return normalized.map((t: any) => ({
      id: t.id ?? undefined,
      language: t.language,
      name: (t.name ?? "").toString(),
      description: (t.description ?? "").toString(),
    }));
  }

  // ✅ IMPORTANT FIX: never send `size: null` if backend expects optional number
  // - If empty -> omit (undefined)
  // - If number -> send number
  function buildVariantsPayload(arr: ProductVariant[], keepId: boolean) {
    return (arr ?? []).map((v: any) => {
      const rawSize = v?.size;

      const sizeVal =
        rawSize === null ||
        rawSize === undefined ||
        String(rawSize).trim() === ""
          ? null
          : toNumberOrNull(rawSize); // number | null

      const priceNum = toNumberOrNull(v?.price) ?? 0;

      const sku =
        typeof v?.sku === "string" && v.sku.trim() ? v.sku.trim() : undefined;

      return {
        ...(keepId ? { id: v?.id ?? undefined } : {}),
        size: sizeVal, // ✅ ALWAYS present (null or number)
        price: priceNum,
        sku,
      };
    });
  }

  async function pickCreateImage() {
    const uri = await pickImageFromLibrary();
    if (uri) setNewImage(uri);
  }

  async function pickEditImage() {
    const uri = await pickImageFromLibrary();
    if (uri) {
      setEditImage(uri);
      setEditImageRemoved(false);
    }
  }

  async function handleCreate() {
    const err = validateCreate();
    if (err) return showToast("error", "Validacija", err);

    const catId = newCategoryId ?? selectedId;
    if (!catId)
      return showToast("error", "Validacija", "Nema izabrane kategorije.");

    setCreating(true);
    try {
      const so = parseSortOrder(newSortOrder);

      await createProduct({
        slug: newSlug.trim(),
        categoryId: catId,
        image: newImage ?? undefined,
        sortOrder: so ?? undefined,
        isActive: true,
        translations: buildTranslationsPayload(newTranslations),
        variants: buildVariantsPayload(newVariants, false),
      } as any);

      await load(listLang);

      setNewSlug("");
      setNewImage(null);
      setNewSortOrder("");
      setNewTranslations(normalizeTranslations(undefined));
      setNewVariants(normalizeVariants(undefined));
      setNewCategoryId(selectedId ?? null);
      setCreateOpen(false);

      showToast("success", "Kreirano", "Proizvod je kreiran.");
    } catch (e: any) {
      showToast(
        "error",
        "Kreiranje nije uspelo",
        e?.message ?? "Pokušajte ponovo.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function openEditById(productId: string) {
    setEditingId(productId);
    setEditLoading(true);
    setEditOpen(true);

    if (!modalCategories.length && !modalCatsLoading) {
      await loadModalCategories();
    }

    try {
      const details: any = await fetchProductDetails(productId);

      const catId = details?.category?.id ?? null;
      if (catId && categories.some((c: any) => c.id === catId)) {
        setSelectedCategoryId(catId);
      }

      setEditCategoryId(catId ?? selectedId ?? null);
      setEditSlug(details?.slug ?? "");

      setEditImageRemoved(false);
      setEditImage(details?.image ?? null);

      const so =
        typeof details?.sortOrder === "number" &&
        Number.isFinite(details.sortOrder)
          ? String(details.sortOrder)
          : "";
      setEditSortOrder(so);

      setEditIsActive(
        typeof details?.isActive === "boolean" ? details.isActive : true,
      );

      const t: any[] = (details?.translations ?? []).map((x: any) => ({
        id: x.id,
        language: x.language,
        name: x.name ?? "",
        description: x.description ?? "",
      }));
      setEditTranslations(normalizeTranslations(t as any) as any);

      const v: ProductVariant[] = (details?.variants ?? []).map((x: any) => ({
        ...(x as any),
        size: typeof x.size === "number" ? x.size : undefined,
        price: typeof x.price === "number" ? x.price : 0,
        sku: x.sku ?? undefined,
      }));
      setEditVariants(normalizeVariants(v));

      setEditLang(listLang);
    } catch (e: any) {
      showToast(
        "error",
        "Greška",
        e?.message ?? "Neuspešno učitavanje proizvoda.",
      );
      setEditOpen(false);
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSaveEdit() {
    const err = validateEdit();
    if (err) return showToast("error", "Validacija", err);
    if (!editingId) return;

    const catId = editCategoryId ?? selectedId;
    if (!catId)
      return showToast("error", "Validacija", "Nema izabrane kategorije.");

    setSaving(true);
    try {
      const so = parseSortOrder(editSortOrder);

      // ✅ image rules:
      // - removed -> null (delete)
      // - set to local uri -> replace/upload
      // - undefined / server path -> keep
      const imageField = editImageRemoved ? null : (editImage ?? undefined);

      await updateProduct(editingId, {
        slug: editSlug.trim(),
        categoryId: catId,
        image: imageField as any,
        sortOrder: so ?? undefined,
        isActive: editIsActive ?? true,
        translations: buildTranslationsPayloadForEdit(editTranslations as any),
        variants: buildVariantsPayload(editVariants, true),
      } as any);

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
      setEditOpen(false);
      setEditingId(null);

      showToast("success", "Sačuvano", "Proizvod je ažuriran.");
    } catch (e: any) {
      showToast(
        "error",
        "Ažuriranje nije uspelo",
        e?.message ?? "Pokušajte ponovo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const disabledStyle = isDark ? { opacity: 0.65 } : { opacity: 0.45 };

  // ✅ avoid passing null into CategorySelect if it can’t handle it
  const safeSelectedId = selectedId ?? categoryOptions[0]?.id ?? null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.container, { backgroundColor: bg }]}>
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
          {categoryOptions.length > 0 && safeSelectedId && (
            <CategorySelect
              value={safeSelectedId}
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
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: any) => (
                <ProductCard
                  name={item.name}
                  description={item.description ?? ""}
                  imageUri={imageUrl(item.image)}
                  border={border}
                  fg={fg}
                  muted={muted}
                  accent={accent}
                  onEdit={() => openEditById(item.id)}
                />
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
          onPress={() => {
            setNewCategoryId(safeSelectedId);
            if (!modalCategories.length && !modalCatsLoading) {
              loadModalCategories();
            }
            setCreateOpen(true);
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Kreiraj proizvod"
        >
          <Ionicons name="add-outline" size={28} color={accentFg} />
        </TouchableOpacity>

        {/* ----------------------- */}
        {/* ✅ CREATE MODAL */}
        {/* ----------------------- */}
        <GorhomSheetModal
          visible={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setNewImage(null);
          }}
          bg={bg}
          border={border}
          header={
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: fg }]}>
                Kreiraj proizvod
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setCreateOpen(false);
                  setNewImage(null);
                }}
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
                  creating && disabledStyle,
                ]}
                onPress={() => {
                  setCreateOpen(false);
                  setNewImage(null);
                }}
                disabled={creating}
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
                    // subtle depth
                    elevation: 2,
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  },
                  creating && disabledStyle,
                ]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.9}
              >
                {creating ? (
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
                      Kreiraj
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          }
        >
          <View style={{ marginBottom: 12 }}>
            {modalCatsLoading ? (
              <View style={{ paddingVertical: 10 }}>
                <ActivityIndicator color={fg} />
              </View>
            ) : modalCategoryOptions.length > 0 ? (
              (newCategoryId ?? safeSelectedId) && (
                <CategorySelect
                  value={newCategoryId ?? safeSelectedId}
                  options={modalCategoryOptions}
                  onChange={(id) => setNewCategoryId(id)}
                  fg={fg}
                  bg={bg}
                  border={border}
                  muted={muted}
                />
              )
            ) : (
              <Text style={{ color: muted, fontWeight: "700" }}>
                Nema kategorija.
              </Text>
            )}
          </View>

          <ProductImageCard
            title="Slika"
            subtitle=""
            imageUri={newImage ? imageUrl(newImage) : null}
            placeholderUri={placeholderImage}
            border={border}
            fg={fg}
            muted={muted}
            danger={danger}
            onPick={pickCreateImage}
            onClear={() => setNewImage(null)}
          />

          <View style={{ marginTop: 10 }}>
            <Text style={[styles.fieldLabel, { color: muted }]}>Slug</Text>
            <View style={[styles.inputWrap, { borderColor: border }]}>
              <TextInput
                style={[styles.input, { color: fg }]}
                placeholder="npr. protein-bar"
                placeholderTextColor={placeholder}
                value={newSlug}
                onChangeText={setNewSlug}
                selectionColor={accent}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={[styles.fieldLabel, { color: muted }]}>
              Sort order
            </Text>
            <View style={[styles.inputWrap, { borderColor: border }]}>
              <TextInput
                style={[styles.input, { color: fg }]}
                placeholder="npr. 10"
                placeholderTextColor={placeholder}
                value={newSortOrder}
                onChangeText={setNewSortOrder}
                selectionColor={accent}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          <TranslationEditor
            activeLang={createLang}
            onChangeLang={setCreateLang}
            translations={newTranslations}
            setTranslations={(fn) => setNewTranslations(fn)}
            fg={fg}
            muted={muted}
            border={border}
            placeholder={placeholder}
            accent={accent}
            hint={undefined}
            langMeta={LANG_META}
            normalizeTranslations={normalizeTranslations}
          />

          <VariantsEditor
            variants={newVariants}
            setVariants={(fn) => setNewVariants(fn)}
            fg={fg}
            muted={muted}
            border={border}
            placeholder={placeholder}
            accent={accent}
            danger={danger}
            normalizeVariants={normalizeVariants}
          />
        </GorhomSheetModal>

        {/* ----------------------- */}
        {/* ✅ EDIT MODAL */}
        {/* ----------------------- */}
        <GorhomSheetModal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingId(null);
            setEditImageRemoved(false);
            setEditImage(null);
          }}
          bg={bg}
          border={border}
          header={
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: fg }]}>
                Izmeni proizvod
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setEditOpen(false);
                  setEditingId(null);
                  setEditImageRemoved(false);
                  setEditImage(null);
                }}
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
                  { backgroundColor: "transparent", borderColor: danger },
                  (saving || deleting) && disabledStyle,
                ]}
                onPress={handleDeleteProduct}
                disabled={saving || deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator color={danger} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={danger} />
                    <Text style={[styles.cancelText, { color: danger }]}>
                      Obriši
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: accent, borderColor: accent },
                  (saving || deleting) && disabledStyle,
                ]}
                onPress={handleSaveEdit}
                disabled={saving || deleting}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={accentFg} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="save-outline" size={18} color={accentFg} />
                    <Text style={[styles.saveText, { color: accentFg }]}>
                      Sačuvaj
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          }
        >
          {editLoading ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator color={fg} />
              <Text
                style={{
                  color: muted,
                  textAlign: "center",
                  marginTop: 10,
                  fontWeight: "700",
                }}
              >
                Učitavam proizvod…
              </Text>
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                {modalCatsLoading ? (
                  <View style={{ paddingVertical: 10 }}>
                    <ActivityIndicator color={fg} />
                  </View>
                ) : modalCategoryOptions.length > 0 ? (
                  (editCategoryId ?? safeSelectedId) && (
                    <CategorySelect
                      value={editCategoryId ?? safeSelectedId}
                      options={modalCategoryOptions}
                      onChange={(id) => setEditCategoryId(id)}
                      fg={fg}
                      bg={bg}
                      border={border}
                      muted={muted}
                    />
                  )
                ) : (
                  <Text style={{ color: muted, fontWeight: "700" }}>
                    Nema kategorija.
                  </Text>
                )}
              </View>

              <ProductImageCard
                title="Slika"
                subtitle=""
                imageUri={editImage ? imageUrl(editImage) : null}
                placeholderUri={placeholderImage}
                border={border}
                fg={fg}
                muted={muted}
                danger={danger}
                onPick={pickEditImage}
                onClear={() => {
                  setEditImage(null);
                  setEditImageRemoved(true);
                }}
              />

              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Slug</Text>
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
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: muted }]}>
                  Sort order
                </Text>
                <View style={[styles.inputWrap, { borderColor: border }]}>
                  <TextInput
                    style={[styles.input, { color: fg }]}
                    placeholder="Broj (sortOrder)"
                    placeholderTextColor={placeholder}
                    value={editSortOrder}
                    onChangeText={setEditSortOrder}
                    selectionColor={accent}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <TranslationEditor
                activeLang={editLang}
                onChangeLang={setEditLang}
                translations={editTranslations}
                setTranslations={(fn) => setEditTranslations(fn)}
                fg={fg}
                muted={muted}
                border={border}
                placeholder={placeholder}
                accent={accent}
                // hint="Učitano sa servera (SR/EN/RU)."
                langMeta={LANG_META}
                normalizeTranslations={normalizeTranslations}
              />

              <VariantsEditor
                variants={editVariants}
                setVariants={(fn) => setEditVariants(fn)}
                fg={fg}
                muted={muted}
                border={border}
                placeholder={placeholder}
                accent={accent}
                danger={danger}
                normalizeVariants={normalizeVariants}
              />
            </>
          )}
        </GorhomSheetModal>
      </View>
    </SafeAreaView>
  );
}
