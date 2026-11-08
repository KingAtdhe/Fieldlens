import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ModeId } from "@shared/schema";
import { getMode } from "@/modes";
import { space, useColors } from "@/theme";
import { Text } from "@/ui/Text";
import { Button, Rule } from "@/ui/primitives";
import { ModeRail } from "@/ui/ModeRail";
import { Viewfinder } from "@/ui/Viewfinder";
import { prepareImage } from "@/lib/image";
import { analyzeImage, ApiError } from "@/lib/api";
import { saveReading } from "@/lib/history";
import { useSettings } from "@/lib/settings";

type Phase = "idle" | "capturing" | "reading";

export default function CameraScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, ready, update } = useSettings();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [active, setActive] = useState(true);
  const [mode, setMode] = useState<ModeId>(settings.lastMode);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [still, setStill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (ready) setMode(settings.lastMode);
  }, [ready, settings.lastMode]);

  // Release the camera when the screen is not focused or the app is backgrounded.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
      return () => {
        sub.remove();
        setActive(false);
      };
    }, []),
  );

  const def = getMode(mode);
  const busy = phase !== "idle";

  const changeMode = (id: ModeId) => {
    setMode(id);
    setError(null);
    update({ lastMode: id });
  };

  const run = useCallback(
    async (uri: string, width?: number, height?: number) => {
      abortRef.current = false;
      setError(null);
      setStill(uri);
      setPhase("reading");
      try {
        const prepared = await prepareImage(uri, width, height);
        if (abortRef.current) return;
        const res = await analyzeImage({ mode, imageBase64: prepared.base64, note });
        if (abortRef.current) return;
        const reading = await saveReading({
          mode,
          note: note.trim() || undefined,
          sourceImageUri: prepared.uri,
          analysis: res.analysis,
          persist: settings.saveHistory,
        });
        if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setNote("");
        router.push({ pathname: "/reading/[id]", params: { id: reading.id } });
      } catch (err) {
        if (abortRef.current) return;
        if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(describeError(err));
      } finally {
        if (!abortRef.current) {
          setPhase("idle");
          setStill(null);
        }
      }
    },
    [mode, note, router, settings.haptics, settings.saveHistory],
  );

  const capture = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    setPhase("capturing");
    if (settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!photo?.uri) throw new Error("No photo");
      await run(photo.uri, photo.width, photo.height);
    } catch (err) {
      setPhase("idle");
      setError(describeError(err));
    }
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    await run(a.uri, a.width, a.height);
  };

  const cancel = () => {
    abortRef.current = true;
    setPhase("idle");
    setStill(null);
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permission, { backgroundColor: colors.paper, paddingTop: insets.top + 48 }]}>
        <Text variant="label" muted>
          Fieldlens
        </Text>
        <Text variant="display" style={{ marginTop: space.md }}>
          A camera that reads.
        </Text>
        <Text style={{ marginTop: space.lg }} color={colors.ink2}>
          Point it at a product, a label, a wall, a contract or a broken thing. It tells you what you are looking at and
          what to do about it.
        </Text>
        <Text style={{ marginTop: space.md }} color={colors.ink2}>
          It needs the camera to do that. Photos are sent for analysis and then kept only on this phone.
        </Text>
        <Button
          label={permission.canAskAgain ? "Allow camera" : "Open system settings"}
          style={{ marginTop: space.xxl }}
          onPress={() => {
            if (permission.canAskAgain) requestPermission();
            else import("expo-linking").then((L) => L.openSettings());
          }}
        />
        <Button label="Read a photo from the library instead" kind="ghost" onPress={pickFromLibrary} style={{ marginTop: space.sm }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Live camera or frozen still */}
      <View style={StyleSheet.absoluteFill}>
        {still ? (
          <Image source={{ uri: still }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : active ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            onCameraReady={() => setCameraReady(true)}
            mode="picture"
            autofocus="on"
            animateShutter={false}
          />
        ) : null}
        <Viewfinder hint={def.hint} busy={phase === "reading"} />
      </View>

      {/* Top chrome */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text variant="label" color="rgba(251,248,242,0.9)">
            Fieldlens
          </Text>
          <Text variant="label" color="rgba(251,248,242,0.55)">
            {def.numeral} · {def.name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <ChromeLink label="Readings" onPress={() => router.push("/history")} disabled={busy} />
          <ChromeLink label="Settings" onPress={() => router.push("/settings")} disabled={busy} />
        </View>
      </View>

      {/* Bottom panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.bottomWrap}
        pointerEvents="box-none"
      >
        <View style={[styles.panel, { backgroundColor: colors.paper, paddingBottom: insets.bottom + 12 }]}>
          <ModeRail value={mode} onChange={changeMode} disabled={busy} onLongPress={() => router.push("/modes")} />
          <Rule />

          {error ? (
            <Pressable onPress={() => setError(null)} style={styles.errorRow}>
              <View style={{ width: 8, height: 8, backgroundColor: colors.marker, marginTop: 7 }} />
              <Text variant="small" color={colors.ink} style={{ flex: 1 }}>
                {error}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              value={note}
              onChangeText={setNote}
              editable={!busy}
              placeholder={def.notePlaceholder}
              placeholderTextColor={colors.muted}
              style={[styles.note, { color: colors.ink, borderBottomColor: colors.rule }]}
              returnKeyType="done"
              maxLength={200}
            />
          )}

          <View style={styles.controls}>
            <ChromeLink
              label={busy ? " " : "Library"}
              onPress={pickFromLibrary}
              disabled={busy}
              color={colors.ink}
              style={{ width: 84 }}
            />

            {busy ? (
              <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel reading" style={styles.shutterOuter}>
                <View style={[styles.shutterRing, { borderColor: colors.ink }]}>
                  <ActivityIndicator color={colors.marker} />
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={capture}
                disabled={!cameraReady}
                accessibilityRole="button"
                accessibilityLabel={`Read with ${def.name} mode`}
                style={({ pressed }) => [styles.shutterOuter, { opacity: cameraReady ? 1 : 0.4, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <View style={[styles.shutterRing, { borderColor: colors.ink }]}>
                  <View style={[styles.shutterDot, { backgroundColor: colors.marker }]} />
                </View>
              </Pressable>
            )}

            <ChromeLink
              label={busy ? "Cancel" : "Flip"}
              onPress={busy ? cancel : () => setFacing((f) => (f === "back" ? "front" : "back"))}
              color={colors.ink}
              style={{ width: 84, alignItems: "flex-end" }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ChromeLink({
  label,
  onPress,
  disabled,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [{ opacity: disabled ? 0.35 : pressed ? 0.5 : 1 }, style]}
    >
      <Text variant="heading" color={color ?? "rgba(251,248,242,0.92)"}>
        {label}
      </Text>
    </Pressable>
  );
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "not_configured":
        return "No API key or server set yet. Open Settings and add your key.";
      case "network":
        return "No connection. Check your internet and try again.";
      case "timeout":
        return "That took too long. Try a closer, sharper photo.";
      case "rate_limited":
        return "Too many readings in a short time. Wait a moment.";
      case "unreadable_image":
        return "Couldn't make out enough in that photo. More light, less blur.";
      case "image_too_large":
        return "That image is too large to send.";
      default:
        return err.message || "The reading failed. Try again.";
    }
  }
  return "Something went wrong taking the photo. Try again.";
}

const styles = StyleSheet.create({
  permission: { flex: 1, paddingHorizontal: space.gutter + 4 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.gutter,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  panel: { paddingTop: 2 },
  note: {
    marginHorizontal: space.gutter,
    marginTop: 6,
    paddingVertical: 10,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorRow: {
    marginHorizontal: space.gutter,
    marginTop: 6,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
  },
  controls: {
    marginTop: 14,
    paddingHorizontal: space.gutter,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shutterOuter: { padding: 6 },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDot: { width: 22, height: 22, borderRadius: 11 },
});
