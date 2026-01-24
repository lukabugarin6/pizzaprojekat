import React, { useMemo } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { LangTabs } from "./lang-tabs";
import type { Language, ProductTranslation } from "../../api/products";

type Props = {
  title?: string;
  activeLang: Language;
  onChangeLang: (l: Language) => void;

  translations: ProductTranslation[];
  setTranslations: (
    updater: (prev: ProductTranslation[]) => ProductTranslation[],
  ) => void;

  fg: string;
  muted: string;
  border: string;
  placeholder: string;
  accent: string;

  // optional hint (npr edit cache hint)
  hint?: string;
  langMeta: Record<Language, { label: string; flag: string }>;
  normalizeTranslations: (t?: ProductTranslation[]) => ProductTranslation[];
};

export function TranslationEditor({
  title = "Prevod",
  activeLang,
  onChangeLang,
  translations,
  setTranslations,
  fg,
  muted,
  border,
  placeholder,
  accent,
  hint,
  langMeta,
  normalizeTranslations,
}: Props) {
  const byLang = useMemo(() => {
    const map: Record<Language, ProductTranslation> = {
      "sr-Latn": { language: "sr-Latn", name: "", description: "" },
      en: { language: "en", name: "", description: "" },
      ru: { language: "ru", name: "", description: "" },
    } as any;

    for (const t of translations) map[t.language] = t;
    return map;
  }, [translations]);

  const t = byLang[activeLang];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: fg }]}>{title}</Text>

      <LangTabs
        active={activeLang}
        onChange={onChangeLang}
        fg={fg}
        border={border}
        muted={muted}
      />

      {!!hint && (
        <Text style={{ color: muted, fontWeight: "700", marginBottom: 8 }}>
          {hint}
        </Text>
      )}

      <View style={[styles.subCard, { borderColor: border }]}>
        <Text style={[styles.subTitle, { color: muted }]}>
          {langMeta[activeLang].flag} {langMeta[activeLang].label}
        </Text>

        <View style={[styles.inputWrap, { borderColor: border }]}>
          <TextInput
            style={[styles.input, { color: fg }]}
            placeholder="Naziv"
            placeholderTextColor={placeholder}
            value={t.name}
            onChangeText={(v) =>
              setTranslations((prev) => {
                const list = normalizeTranslations(prev);
                return list.map((x) =>
                  x.language === activeLang ? { ...x, name: v } : x,
                );
              })
            }
            selectionColor={accent}
          />
        </View>

        <View style={[styles.inputWrap, { borderColor: border }]}>
          <TextInput
            style={[styles.input, { color: fg, minHeight: 60 }]}
            placeholder="Opis"
            placeholderTextColor={placeholder}
            multiline
            value={t.description}
            onChangeText={(v) =>
              setTranslations((prev) => {
                const list = normalizeTranslations(prev);
                return list.map((x) =>
                  x.language === activeLang ? { ...x, description: v } : x,
                );
              })
            }
            selectionColor={accent}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "800", marginBottom: 6 },
  subCard: { borderWidth: 1, borderRadius: 0, padding: 10, marginBottom: 10 },
  subTitle: { fontWeight: "800", marginBottom: 8 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: "center",
    marginBottom: 10,
  },
  input: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
