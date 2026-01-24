import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type CategorySelectOption = { id: string; label: string };

type Props = {
  value: string | null;
  options: CategorySelectOption[];
  onChange: (id: string) => void;

  fg: string;
  bg: string;
  border: string;
  muted: string;

  // optional
  label?: string;
  accessibilityLabel?: string;
  minWidth?: number;
  maxLabelWidth?: number;
};

export function CategorySelect({
  value,
  options,
  onChange,
  fg,
  bg,
  border,
  muted,
  label = "Izaberi kategoriju",
  accessibilityLabel = "Izaberi kategoriju",
  minWidth = 170,
  maxLabelWidth = 140,
}: Props) {
  const [open, setOpen] = useState(false);

  const current = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  return (
    <>
      <Text
        numberOfLines={1}
        style={{
          color: fg,
          fontWeight: "800",
          maxWidth: maxLabelWidth,
          marginBottom: 10,
        }}
      >
        {"Kategorija"}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{
          height: 40,
          borderWidth: 1,
          borderColor: border,
          paddingHorizontal: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          minWidth,
          overflow: "hidden",
        }}
      >
        <Text
          numberOfLines={1}
          style={{ color: fg, fontWeight: "800", maxWidth: maxLabelWidth }}
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
              <Text style={{ color: fg, fontWeight: "900" }}>{label}</Text>

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
