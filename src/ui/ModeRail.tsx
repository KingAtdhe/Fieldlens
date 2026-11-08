import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { ModeId } from "@shared/schema";
import { MODES } from "@/modes";
import { space, useColors } from "@/theme";
import { Text } from "./Text";

interface Props {
  value: ModeId;
  onChange: (id: ModeId) => void;
  disabled?: boolean;
  onLongPress?: (id: ModeId) => void;
}

/** Five modes laid out like tabs on a file folder: numeral, name, a marker bar under the active one. */
export function ModeRail({ value, onChange, disabled, onLongPress }: Props) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      bounces={false}
    >
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${m.name} mode`}
            disabled={disabled}
            onPress={() => {
              if (!active) Haptics.selectionAsync().catch(() => {});
              onChange(m.id);
            }}
            onLongPress={() => onLongPress?.(m.id)}
            style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : disabled ? 0.45 : 1 }]}
          >
            <View style={styles.tabInner}>
              <Text variant="label" color={active ? colors.marker : colors.muted}>
                {m.numeral}
              </Text>
              <Text
                variant="heading"
                color={active ? colors.ink : colors.muted}
                style={{ fontFamily: active ? "IBMPlexSans_600SemiBold" : "IBMPlexSans_500Medium" }}
              >
                {m.name}
              </Text>
            </View>
            <View style={[styles.bar, { backgroundColor: active ? colors.marker : "transparent" }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: space.gutter - 4, gap: 4 },
  tab: { paddingHorizontal: 12, paddingTop: 10 },
  tabInner: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 10 },
  bar: { height: 2 },
});
