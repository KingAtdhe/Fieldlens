import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { listReadings, type Reading } from "@/lib/history";
import { formatDate } from "@/lib/format";
import { getMode } from "@/modes";
import { space, useColors } from "@/theme";
import { Text } from "@/ui/Text";
import { Rule, ToneMark } from "@/ui/primitives";

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Reading[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      listReadings().then((r) => alive && setItems(r));
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.rule }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text variant="heading">Back</Text>
        </Pressable>
        <Text variant="label" muted>
          {items.length} {items.length === 1 ? "reading" : "readings"}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.lg }}>
            <Text variant="display">Readings</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md }}>
            <Text color={colors.ink2}>Nothing read yet. Everything you point the camera at ends up here, kept only on this phone.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <Rule style={{ marginHorizontal: space.gutter }} />}
        renderItem={({ item }) => {
          const m = getMode(item.mode);
          return (
            <Pressable
              onPress={() => router.push({ pathname: "/reading/[id]", params: { id: item.id } })}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Image source={{ uri: item.imageUri }} style={[styles.thumb, { borderColor: colors.ruleStrong }]} contentFit="cover" />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
                  <Text variant="label" color={colors.marker}>
                    {m.numeral}
                  </Text>
                  <Text variant="label" muted>
                    {m.name} · {formatDate(item.createdAt)}
                  </Text>
                </View>
                <Text variant="heading" numberOfLines={1}>
                  {item.analysis.subject}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ToneMark tone={item.analysis.verdict.tone} size={8} />
                  <Text variant="small" color={colors[item.analysis.verdict.tone]} numberOfLines={1}>
                    {item.analysis.verdict.label}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
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
  row: { flexDirection: "row", gap: 14, paddingHorizontal: space.gutter, paddingVertical: 14, alignItems: "center" },
  thumb: { width: 60, height: 60, borderWidth: StyleSheet.hairlineWidth },
});
