import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Language } from "../../api/products";

const LANGS: Language[] = ["sr-Latn", "en", "ru"];

const LANG_META: Record<Language, { label: string; flag: string }> = {
  "sr-Latn": { label: "SR", flag: "🇷🇸" },
  en: { label: "EN", flag: "🇬🇧" },
  ru: { label: "RU", flag: "🇷🇺" },
};

type Props = {
  active: Language;
  onChange: (l: Language) => void;
  fg: string;
  border: string;
  muted: string;

  // optional overrides if you ever add more langs
  langs?: Language[];
  meta?: Record<Language, { label: string; flag: string }>;
};

export function LangTabs({
  active,
  onChange,
  fg,
  border,
  muted,
  langs = LANGS,
  meta = LANG_META,
}: Props) {
  return (
    <View style={[styles.row, { borderColor: border }]}>
      {langs.map((l) => {
        const isActive = l === active;
        return (
          <TouchableOpacity
            key={l}
            onPress={() => onChange(l)}
            activeOpacity={0.85}
            style={[
              styles.tab,
              isActive && { borderColor: border, borderBottomWidth: 2 },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{meta[l]?.flag ?? "🏳️"}</Text>
            <Text
              style={{
                color: isActive ? fg : muted,
                fontWeight: isActive ? "900" : "800",
              }}
            >
              {meta[l]?.label ?? l}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 0,
  },
});
