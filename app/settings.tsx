import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useSettings } from "@/lib/settings";
import { clearReadings } from "@/lib/history";
import { defaultApiBaseUrl, getApiBaseUrl, setApiBaseUrl } from "@/lib/config";
import { space, useColors } from "@/theme";
import { Text } from "@/ui/Text";
import { Caption, Rule } from "@/ui/primitives";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const [apiUrl, setApiUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const saveUrl = async () => {
    const trimmed = apiUrl.trim();
    if (trimmed && !/^https:\/\/[^\s/]+/.test(trimmed)) {
      Alert.alert("Address must start with https://");
      return;
    }
    await setApiBaseUrl(trimmed === defaultApiBaseUrl() ? null : trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearAll = () => {
    Alert.alert("Delete all readings?", "Every photo and result stored on this phone is removed.", [
      { text: "Keep", style: "cancel" },
      { text: "Delete all", style: "destructive", onPress: () => clearReadings() },
    ]);
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.rule }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text variant="heading">Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.block}>
          <Text variant="display">Settings</Text>
        </View>

        <Group title="Behaviour">
          <Row label="Haptic feedback">
            <Switch
              value={settings.haptics}
              onValueChange={(v) => update({ haptics: v })}
              trackColor={{ true: colors.ink, false: colors.rule }}
              thumbColor={colors.paper}
            />
          </Row>
          <Rule />
          <Row label="Keep readings on this phone" hint="Turn off to discard each result after you close it.">
            <Switch
              value={settings.saveHistory}
              onValueChange={(v) => update({ saveHistory: v })}
              trackColor={{ true: colors.ink, false: colors.rule }}
              thumbColor={colors.paper}
            />
          </Row>
        </Group>

        <Group title="Server">
          <Text variant="small" color={colors.ink2} style={{ marginBottom: 8 }}>
            Photos are sent to this address for analysis and are not stored there.
          </Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://fieldlens-api.example.workers.dev"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.ink, borderBottomColor: colors.ruleStrong }]}
            onSubmitEditing={saveUrl}
            returnKeyType="done"
          />
          <Pressable onPress={saveUrl} hitSlop={10} style={{ marginTop: 12, alignSelf: "flex-start" }}>
            <Text variant="heading" color={saved ? colors.good : colors.ink}>
              {saved ? "Saved" : "Save address"}
            </Text>
          </Pressable>
        </Group>

        <Group title="Data">
          <Pressable onPress={clearAll} hitSlop={10} style={{ paddingVertical: 12 }}>
            <Text variant="heading" color={colors.bad}>
              Delete all readings
            </Text>
          </Pressable>
        </Group>

        <Group title="About">
          <Text variant="small" color={colors.ink2}>
            Fieldlens {version}. Readings are produced by a vision model and can be wrong. Nothing in this app is medical,
            legal or financial advice.
          </Text>
        </Group>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Caption>{title}</Caption>
      <Rule strong style={{ marginTop: 8, marginBottom: 6 }} />
      {children}
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text variant="heading">{label}</Text>
        {hint ? (
          <Text variant="small" color={colors.muted} style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  block: { paddingHorizontal: space.gutter, paddingTop: space.xl },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  input: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
