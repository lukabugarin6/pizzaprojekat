import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: string;
  description: string;
  imageUri: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  onEdit: () => void;
};

export function ProductCard({
  name,
  description,
  imageUri,
  border,
  fg,
  muted,
  accent,
  onEdit,
}: Props) {
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.row}>
        <Image
          source={{ uri: imageUri }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.desc, { color: muted }]} numberOfLines={3}>
            {description}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.85}
          style={styles.iconBtn}
        >
          <Ionicons name="create-outline" size={22} color={accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderBottomWidth: 1, borderRadius: 0, padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 0,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  title: { fontSize: 15, fontWeight: "800" },
  desc: { fontSize: 12, fontWeight: "700" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
