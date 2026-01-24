import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProductVariant } from "../../api/products";

type Props = {
  title?: string;
  variants: ProductVariant[];
  setVariants: (updater: (prev: ProductVariant[]) => ProductVariant[]) => void;

  fg: string;
  muted: string;
  border: string;
  placeholder: string;
  accent: string;
  danger: string;

  normalizeVariants: (v?: ProductVariant[]) => ProductVariant[];
};

export function VariantsEditor({
  title = "Varijante",
  variants,
  setVariants,
  fg,
  muted,
  border,
  placeholder,
  accent,
  danger,
  normalizeVariants,
}: Props) {
  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  };

  const addVariant = () =>
    setVariants((prev) => [...prev, { size: undefined, price: 0 } as any]);

  const removeVariant = (index: number) => {
    setVariants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : (normalizeVariants(undefined) as any);
    });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: fg }]}>{title}</Text>

      {variants.map((v, idx) => (
        <View key={idx} style={styles.variantRow}>
          <View style={[styles.variantBlock, { borderColor: border }]}>
            <Text style={[styles.fieldLabel, { color: muted }]}>Količina</Text>
            <TextInput
              style={[styles.input, { color: fg }]}
              placeholder="npr. 250"
              placeholderTextColor={placeholder}
              value={typeof v.size === "number" ? String(v.size) : ""}
              onChangeText={(txt) =>
                updateVariant(idx, {
                  size: txt.trim() === "" ? undefined : Number(txt),
                })
              }
              keyboardType="numeric"
              selectionColor={accent}
            />
          </View>

          <View style={[styles.variantBlock, { borderColor: border }]}>
            <Text style={[styles.fieldLabel, { color: muted }]}>Cena</Text>
            <TextInput
              style={[styles.input, { color: fg }]}
              placeholder="npr. 1200"
              placeholderTextColor={placeholder}
              value={String((v as any).price ?? "")}
              onChangeText={(txt) =>
                updateVariant(idx, { price: Number(txt) } as any)
              }
              keyboardType="numeric"
              selectionColor={accent}
            />
          </View>

          <TouchableOpacity
            style={styles.trashBtn}
            onPress={() => removeVariant(idx)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ukloni varijantu"
          >
            <Ionicons name="trash-outline" size={18} color={danger} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={addVariant}
        activeOpacity={0.85}
      >
        <Ionicons name="add-outline" size={18} color={accent} />
        <Text style={{ color: accent, fontWeight: "800" }}>
          Dodaj varijantu
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "800", marginBottom: 6 },

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
  input: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },

  trashBtn: {
    width: 40,
    height: 46,
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
});
