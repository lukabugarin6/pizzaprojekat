import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title: string;
  subtitle: string;
  imageUri: string | null;
  placeholderUri: string;
  border: string;
  fg: string;
  muted: string;
  danger: string;
  onPick: () => void;
  onClear: () => void;
};

export function ProductImageCard({
  title,
  subtitle,
  imageUri,
  placeholderUri,
  border,
  fg,
  muted,
  danger,
  onPick,
  onClear,
}: Props) {
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <Image
        source={{ uri: imageUri ? imageUri : placeholderUri }}
        style={styles.img}
        resizeMode="cover"
      />

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onPick}
          style={[styles.iconBtn, { borderColor: border }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add-outline" size={18} color={"#e67428"} />
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity
            onPress={onClear}
            style={[styles.iconBtn, { borderColor: border }]}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={{ color: fg, fontWeight: "900" }}>{title}</Text>
        {subtitle && (
          <Text style={{ color: muted, fontWeight: "700" }}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  img: { width: "100%", height: 170, backgroundColor: "rgba(0,0,0,0.08)" },
  actions: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    // borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  footer: { paddingHorizontal: 12, paddingVertical: 10 },
});
