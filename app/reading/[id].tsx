import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { deleteReading, getReading, type Reading } from "@/lib/history";
import { formatDate, readingToText } from "@/lib/format";
import { getMode } from "@/modes";
import { space, useColors } from "@/theme";
import { Text } from "@/ui/Text";
import { Caption, Rule, ToneMark } from "@/ui/primitives";

export default function ReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [reading, setReading] = useState<Reading | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReading(id).then((r) => setReading(r ?? null));
  }, [id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (reading === undefined) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  if (reading === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: space.gutter, paddingTop: insets.top + 24 }}>
        <Text variant="title">This reading is gone.</Text>
        <Pressable onPress={close} style={{ marginTop: space.lg }}>
          <Text variant="heading">Back</Text>
        </Pressable>
      </View>
    );
  }

  const mode = getMode(reading.mode);
  const a = reading.analysis;
  const tone = colors[a.verdict.tone];

  const share = async () => {
    try {
      await Share.share({ message: readingToText(reading) });
    } catch {
      // user dismissed
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(readingToText(reading));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const remove = () => {
    Alert.alert("Delete this reading?", "The photo and the result are removed from this phone.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReading(reading.id);
          close();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.rule }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
          <Text variant="heading">Close</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <Pressable onPress={copy} hitSlop={12} accessibilityRole="button">
            <Text variant="heading" color={copied ? colors.good : colors.ink}>
              {copied ? "Copied" : "Copy"}
            </Text>
          </Pressable>
          <Pressable onPress={share} hitSlop={12} accessibilityRole="button">
            <Text variant="heading">Share</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Meta line with thumbnail */}
        <View style={styles.meta}>
          <Image
            source={{ uri: reading.imageUri }}
            style={[styles.thumb, { borderColor: colors.ruleStrong }]}
            contentFit="cover"
            transition={120}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Caption>
              {mode.numeral} · {mode.name}
            </Caption>
            <Text variant="small" muted>
              {formatDate(reading.createdAt)}
            </Text>
            {reading.note ? (
              <Text variant="small" italic color={colors.ink2}>
                “{reading.note}”
              </Text>
            ) : null}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.block}>
          <Text variant="display">{a.subject}</Text>
        </View>

        {/* Verdict */}
        <View style={[styles.verdict, { borderTopColor: tone, borderBottomColor: colors.rule }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ToneMark tone={a.verdict.tone} size={12} />
            <Text variant="title" color={tone}>
              {a.verdict.label}
            </Text>
          </View>
          <Text style={{ marginTop: space.sm }} color={colors.ink}>
            {a.verdict.summary}
          </Text>
          <Text variant="label" muted style={{ marginTop: space.md }}>
            Confidence {a.confidence}
          </Text>
        </View>

        {/* Findings */}
        {a.findings.length > 0 && (
          <Section title="Findings">
            {a.findings.map((f, i) => (
              <View key={i}>
                <View style={styles.finding}>
                  <Text variant="label" color={f.severity ? colors[f.severity] : colors.muted} style={{ width: 28, paddingTop: 4 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{f.heading}</Text>
                    <Text style={{ marginTop: 2 }} color={colors.ink2}>
                      {f.body}
                    </Text>
                  </View>
                </View>
                {i < a.findings.length - 1 && <Rule />}
              </View>
            ))}
          </Section>
        )}

        {/* Facts */}
        {a.facts.length > 0 && (
          <Section title="Facts">
            {a.facts.map((f, i) => (
              <View key={i}>
                <View style={styles.factRow}>
                  <Text variant="small" muted style={{ width: "40%" }}>
                    {f.label}
                  </Text>
                  <Text variant="small" style={{ flex: 1 }}>
                    {f.value}
                  </Text>
                </View>
                {i < a.facts.length - 1 && <Rule />}
              </View>
            ))}
          </Section>
        )}

        {/* Actions */}
        {a.actions.length > 0 && (
          <Section title="Next">
            {a.actions.map((s, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={[styles.checkbox, { borderColor: colors.ink }]} />
                <Text style={{ flex: 1 }}>{s}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Caveats */}
        {a.caveats.length > 0 && (
          <Section title="Limits of this reading">
            {a.caveats.map((s, i) => (
              <Text key={i} variant="small" italic color={colors.ink2} style={{ marginBottom: 6 }}>
                {s}
              </Text>
            ))}
          </Section>
        )}

        <View style={styles.block}>
          <Rule strong />
          <Text variant="small" muted style={{ marginTop: space.md }}>
            {mode.disclaimer}
          </Text>
          <Pressable onPress={remove} hitSlop={12} style={{ marginTop: space.xl, alignSelf: "flex-start" }}>
            <Text variant="heading" color={colors.bad}>
              Delete reading
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Caption>{title}</Caption>
      <Rule strong style={{ marginTop: 8 }} />
      {children}
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
  meta: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
  },
  thumb: { width: 56, height: 56, borderWidth: StyleSheet.hairlineWidth },
  block: { paddingHorizontal: space.gutter, paddingTop: space.xl },
  verdict: {
    marginTop: space.xl,
    marginHorizontal: space.gutter,
    paddingVertical: space.lg,
    borderTopWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  finding: { flexDirection: "row", paddingVertical: 14 },
  factRow: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  actionRow: { flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "flex-start" },
  checkbox: { width: 14, height: 14, borderWidth: 1.5, marginTop: 5 },
});
