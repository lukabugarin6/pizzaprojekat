// app/(tabs)/products.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  Switch,
  ScrollView,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchProducts,
  createProduct,
  updateProduct,
  Product,
  Language,
  ProductTranslation,
  ProductVariant,
} from "../../api/products";
import { useAuth } from "../../context/authContext";

const LANGS: Language[] = ["sr-Latn", "en", "ru"];

function normalizeTranslations(t?: ProductTranslation[]): ProductTranslation[] {
  return Array.isArray(t) && t.length > 0
    ? t.map((x) => ({
        language: x.language,
        name: x.name ?? "",
        description: x.description ?? "",
      }))
    : [
        { language: "sr-Latn", name: "", description: "" },
        { language: "en", name: "", description: "" },
        { language: "ru", name: "", description: "" },
      ];
}

function normalizeVariants(v?: ProductVariant[]): ProductVariant[] {
  return Array.isArray(v) && v.length > 0
    ? v.map((x) => ({
        size: typeof x.size === "number" ? x.size : undefined,
        price: typeof x.price === "number" ? x.price : 0,
        sku: x.sku ?? undefined,
      }))
    : [{ size: undefined, price: 0, sku: undefined }];
}

function isValidUuid(v: string) {
  // simple uuid v4-ish check (good enough for client-side validation)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v.trim(),
  );
}

export default function ProductsScreen() {
  const { role } = useAuth();

  // 🔒 hard guard (bitno)
  if (role !== "admin" && role !== "superuser") {
    return <Redirect href="/" />;
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // CREATE form state
  const [newSlug, setNewSlug] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newTranslations, setNewTranslations] = useState<ProductTranslation[]>(
    normalizeTranslations(undefined),
  );
  const [newVariants, setNewVariants] = useState<ProductVariant[]>(
    normalizeVariants(undefined),
  );

  // per-item edit UI (expand/collapse)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await fetchProducts();
      // ensure editable fields exist
      const normalized = data.map((p) => ({
        ...p,
        translations: normalizeTranslations(p.translations),
        variants: normalizeVariants(p.variants),
        isActive: p.isActive ?? true,
      }));
      setProducts(normalized);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function validateCreate() {
    if (!newSlug.trim()) return "Slug is required";
    if (!newImage.trim()) return "Image is required";
    if (!newCategoryId.trim()) return "CategoryId is required";
    if (!isValidUuid(newCategoryId)) return "CategoryId must be a UUID";

    // translations: name/description required (your DTO)
    for (const t of newTranslations) {
      if (!t.name.trim()) return `Translation (${t.language}) name is required`;
      if (!t.description.trim())
        return `Translation (${t.language}) description is required`;
    }

    // variants: price required
    for (let i = 0; i < newVariants.length; i++) {
      const v = newVariants[i];
      if (typeof v.price !== "number" || Number.isNaN(v.price))
        return `Variant #${i + 1} price is required`;
    }

    return null;
  }

  async function handleCreate() {
    const err = validateCreate();
    if (err) {
      Alert.alert("Validation", err);
      return;
    }

    try {
      const created = await createProduct({
        slug: newSlug.trim(),
        image: newImage.trim(),
        categoryId: newCategoryId.trim(),
        isActive: newIsActive,
        translations: newTranslations.map((t) => ({
          language: t.language,
          name: t.name.trim(),
          description: t.description.trim(),
        })),
        variants: newVariants.map((v) => ({
          // keep undefined out if you want
          size:
            typeof v.size === "number" && !Number.isNaN(v.size)
              ? v.size
              : undefined,
          price: v.price,
          sku: v.sku?.trim() ? v.sku.trim() : undefined,
        })),
      });

      // normalize returned item for editing
      const normalized: Product = {
        ...created,
        translations: normalizeTranslations(created.translations),
        variants: normalizeVariants(created.variants),
        isActive: created.isActive ?? true,
      };

      setProducts((p) => [normalized, ...p]);

      // reset form
      setNewSlug("");
      setNewImage("");
      setNewCategoryId("");
      setNewIsActive(true);
      setNewTranslations(normalizeTranslations(undefined));
      setNewVariants(normalizeVariants(undefined));
    } catch (e: any) {
      Alert.alert("Create failed", e.message);
    }
  }

  async function handleSave(item: Product) {
    // Basic validation for edit
    if (!item.slug?.trim()) {
      Alert.alert("Validation", "Slug is required");
      return;
    }
    if (!item.image?.trim()) {
      Alert.alert("Validation", "Image is required");
      return;
    }
    const catId = item.category?.id ?? "";
    if (!catId.trim() || !isValidUuid(catId)) {
      Alert.alert("Validation", "CategoryId must be a UUID");
      return;
    }

    // translations required
    const tlist = normalizeTranslations(item.translations);
    for (const t of tlist) {
      if (!t.name.trim()) {
        Alert.alert(
          "Validation",
          `Translation (${t.language}) name is required`,
        );
        return;
      }
      if (!t.description.trim()) {
        Alert.alert(
          "Validation",
          `Translation (${t.language}) description is required`,
        );
        return;
      }
    }

    const vlist = normalizeVariants(item.variants);
    for (let i = 0; i < vlist.length; i++) {
      const v = vlist[i];
      if (typeof v.price !== "number" || Number.isNaN(v.price)) {
        Alert.alert("Validation", `Variant #${i + 1} price is required`);
        return;
      }
    }

    try {
      const updated = await updateProduct(item.id, {
        slug: item.slug.trim(),
        image: item.image?.trim() ?? "",
        categoryId: catId.trim(),
        isActive: item.isActive ?? true,
        translations: tlist.map((t) => ({
          language: t.language,
          name: t.name.trim(),
          description: t.description.trim(),
        })),
        variants: vlist.map((v) => ({
          size:
            typeof v.size === "number" && !Number.isNaN(v.size)
              ? v.size
              : undefined,
          price: v.price,
          sku: v.sku?.trim() ? v.sku.trim() : undefined,
        })),
      });

      const normalized: Product = {
        ...updated,
        translations: normalizeTranslations(updated.translations),
        variants: normalizeVariants(updated.variants),
        isActive: updated.isActive ?? true,
      };

      setProducts((prev) =>
        prev.map((x) => (x.id === item.id ? normalized : x)),
      );
      Alert.alert("Saved", "Product updated");
    } catch (e: any) {
      Alert.alert("Update failed", e.message);
    }
  }

  // helpers for editing list items
  function updateItem(id: string, patch: Partial<Product>) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function updateItemCategoryId(id: string, categoryId: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              category: { ...(p.category ?? { id: "" }), id: categoryId },
            }
          : p,
      ),
    );
  }

  function updateItemTranslation(
    id: string,
    lang: Language,
    patch: Partial<ProductTranslation>,
  ) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const list = normalizeTranslations(p.translations);
        const next = list.map((t) =>
          t.language === lang ? { ...t, ...patch } : t,
        );
        return { ...p, translations: next };
      }),
    );
  }

  function updateItemVariant(
    id: string,
    index: number,
    patch: Partial<ProductVariant>,
  ) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const list = normalizeVariants(p.variants);
        const next = list.map((v, i) => (i === index ? { ...v, ...patch } : v));
        return { ...p, variants: next };
      }),
    );
  }

  function addItemVariant(id: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const list = normalizeVariants(p.variants);
        return { ...p, variants: [...list, { size: undefined, price: 0 }] };
      }),
    );
  }

  function removeItemVariant(id: string, index: number) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const list = normalizeVariants(p.variants);
        const next = list.filter((_, i) => i !== index);
        return {
          ...p,
          variants: next.length ? next : [{ size: undefined, price: 0 }],
        };
      }),
    );
  }

  // create-form variant helpers
  function updateNewVariant(index: number, patch: Partial<ProductVariant>) {
    setNewVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function addNewVariant() {
    setNewVariants((prev) => [...prev, { size: undefined, price: 0 }]);
  }

  function removeNewVariant(index: number) {
    setNewVariants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ size: undefined, price: 0 }];
    });
  }

  const createTranslationsByLang = useMemo(() => {
    const map: Record<Language, ProductTranslation> = {
      "sr-Latn": { language: "sr-Latn", name: "", description: "" },
      en: { language: "en", name: "", description: "" },
      ru: { language: "ru", name: "", description: "" },
    };
    for (const t of newTranslations) map[t.language] = t;
    return map;
  }, [newTranslations]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.title}>Products</Text>

      {/* CREATE */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create product</Text>

        <TextInput
          style={styles.input}
          placeholder="Slug (unique)"
          value={newSlug}
          onChangeText={setNewSlug}
        />

        <TextInput
          style={styles.input}
          placeholder="Image (e.g. /images/kapricoza.png)"
          value={newImage}
          onChangeText={setNewImage}
        />

        <TextInput
          style={styles.input}
          placeholder="Category ID (UUID)"
          value={newCategoryId}
          onChangeText={setNewCategoryId}
          autoCapitalize="none"
        />

        <View style={styles.rowBetween}>
          <Text>Active</Text>
          <Switch value={newIsActive} onValueChange={setNewIsActive} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Translations</Text>
          {LANGS.map((lang) => {
            const t = createTranslationsByLang[lang];
            return (
              <View key={lang} style={styles.subCard}>
                <Text style={styles.subTitle}>{lang}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={t.name}
                  onChangeText={(v) =>
                    setNewTranslations((prev) => {
                      const list = normalizeTranslations(prev);
                      return list.map((x) =>
                        x.language === lang ? { ...x, name: v } : x,
                      );
                    })
                  }
                />
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="Description"
                  multiline
                  value={t.description}
                  onChangeText={(v) =>
                    setNewTranslations((prev) => {
                      const list = normalizeTranslations(prev);
                      return list.map((x) =>
                        x.language === lang ? { ...x, description: v } : x,
                      );
                    })
                  }
                />
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variants</Text>

          {newVariants.map((v, idx) => (
            <View key={idx} style={styles.variantRow}>
              <TextInput
                style={[styles.input, styles.variantInput]}
                placeholder="Size (optional)"
                value={typeof v.size === "number" ? String(v.size) : ""}
                onChangeText={(txt) =>
                  updateNewVariant(idx, {
                    size: txt.trim() === "" ? undefined : Number(txt),
                  })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.variantInput]}
                placeholder="Price"
                value={String(v.price ?? "")}
                onChangeText={(txt) =>
                  updateNewVariant(idx, {
                    price: Number(txt),
                  })
                }
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => removeNewVariant(idx)}
              >
                <Ionicons name="trash-outline" size={18} color="#d11" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.btnSecondary} onPress={addNewVariant}>
            <Ionicons name="add-outline" size={18} color="#12a28d" />
            <Text style={{ color: "#12a28d" }}>Add variant</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={{ color: "#fff" }}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={products}
        scrollEnabled={false}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOpen = !!expanded[item.id];
          const translations = normalizeTranslations(item.translations);
          const variants = normalizeVariants(item.variants);
          const catId = item.category?.id ?? "";

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.slug}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  <Ionicons
                    name={
                      isOpen ? "chevron-up-outline" : "chevron-down-outline"
                    }
                    size={20}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Slug"
                value={item.slug}
                onChangeText={(v) => updateItem(item.id, { slug: v })}
              />

              <TextInput
                style={styles.input}
                placeholder="Image"
                value={item.image ?? ""}
                onChangeText={(v) => updateItem(item.id, { image: v })}
              />

              <TextInput
                style={styles.input}
                placeholder="Category ID (UUID)"
                value={catId}
                onChangeText={(v) => updateItemCategoryId(item.id, v)}
                autoCapitalize="none"
              />

              <View style={styles.rowBetween}>
                <Text>Active</Text>
                <Switch
                  value={item.isActive ?? true}
                  onValueChange={(v) => updateItem(item.id, { isActive: v })}
                />
              </View>

              {isOpen && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Translations</Text>
                    {translations.map((t) => (
                      <View key={t.language} style={styles.subCard}>
                        <Text style={styles.subTitle}>{t.language}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Name"
                          value={t.name}
                          onChangeText={(v) =>
                            updateItemTranslation(item.id, t.language, {
                              name: v,
                            })
                          }
                        />
                        <TextInput
                          style={[styles.input, { minHeight: 60 }]}
                          placeholder="Description"
                          multiline
                          value={t.description}
                          onChangeText={(v) =>
                            updateItemTranslation(item.id, t.language, {
                              description: v,
                            })
                          }
                        />
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Variants</Text>

                    {variants.map((v, idx) => (
                      <View key={idx} style={styles.variantRow}>
                        <TextInput
                          style={[styles.input, styles.variantInput]}
                          placeholder="Size (optional)"
                          value={
                            typeof v.size === "number" ? String(v.size) : ""
                          }
                          onChangeText={(txt) =>
                            updateItemVariant(item.id, idx, {
                              size: txt.trim() === "" ? undefined : Number(txt),
                            })
                          }
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.input, styles.variantInput]}
                          placeholder="Price"
                          value={String(v.price ?? "")}
                          onChangeText={(txt) =>
                            updateItemVariant(item.id, idx, {
                              price: Number(txt),
                            })
                          }
                          keyboardType="numeric"
                        />

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => removeItemVariant(item.id, idx)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#d11"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={() => addItemVariant(item.id)}
                    >
                      <Ionicons name="add-outline" size={18} color="#12a28d" />
                      <Text style={{ color: "#12a28d" }}>Add variant</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => handleSave(item)}
              >
                <Ionicons name="save-outline" size={18} color="#12a28d" />
                <Text style={{ color: "#12a28d" }}>Save</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },

  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 6,
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "700", marginBottom: 6 },

  subCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  subTitle: { fontWeight: "700", marginBottom: 8 },

  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  variantInput: { flex: 1 },

  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  btn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12a28d",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  btnSecondary: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    padding: 8,
  },
});
