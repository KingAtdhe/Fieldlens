import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MODES } from "@/modes";
import { useSettings } from "@/lib/settings";
import { space, useColors } from "@/theme";
import { Text } from "@/ui/Text";
import { Rule } from "@/ui/primitives";

export default function ModesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { update } = useSettings();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.rule }]}>
        <Text variant="label" muted>
          Five ways of looking
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="heading">Done</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {MODES.map((m, i) => (
          <Pressable
            key={m.id}
            onPress={() => {
              update({ lastMode: m.id });
              router.back();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={styles.item}>
              <Text variant="label" color={colors.marker} style={{ width: 36, paddingTop: 8 }}>
                {m.numeral}
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="title">{m.name}</Text>
                <Text style={{ marginTop: 6 }} color={colors.ink2}>
                  {m.description}
                </Text>
                <Text variant="small" italic muted style={{ marginTop: 8 }}>
                  {m.hint}
                </Text>
              </View>
            </View>
            {i < MODES.length - 1 && <Rule style={{ marginHorizontal: space.gutter }} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  item: { flexDirection: "row", paddingHorizontal: space.gutter, paddingVertical: space.xl },
});
