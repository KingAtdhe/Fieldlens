import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Text } from "./Text";

/**
 * Corner brackets drawn in paper-white over the live camera, plus a slow sweeping
 * rule while a reading is in progress. No boxes, no glow — just marks.
 */
export function Viewfinder({ hint, busy }: { hint: string; busy: boolean }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (busy) {
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(sweep);
      sweep.value = 0;
    }
  }, [busy, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    top: `${8 + sweep.value * 84}%`,
    opacity: busy ? 1 : 0,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.frame}>
        <Corner style={{ top: 0, left: 0 }} h v />
        <Corner style={{ top: 0, right: 0 }} h v flipH />
        <Corner style={{ bottom: 0, left: 0 }} h v flipV />
        <Corner style={{ bottom: 0, right: 0 }} h v flipH flipV />
        <Animated.View style={[styles.sweep, sweepStyle]} />
      </View>
      <View style={styles.hintWrap}>
        <Text variant="small" italic color="rgba(251,248,242,0.92)" center style={styles.hintText}>
          {busy ? "Reading…" : hint}
        </Text>
      </View>
    </View>
  );
}

function Corner({
  style,
  flipH,
  flipV,
}: {
  style: object;
  h?: boolean;
  v?: boolean;
  flipH?: boolean;
  flipV?: boolean;
}) {
  const len = 28;
  const w = 1.5;
  return (
    <View style={[styles.corner, style]}>
      <View
        style={{
          position: "absolute",
          width: len,
          height: w,
          backgroundColor: PAPER,
          ...(flipV ? { bottom: 0 } : { top: 0 }),
          ...(flipH ? { right: 0 } : { left: 0 }),
        }}
      />
      <View
        style={{
          position: "absolute",
          width: w,
          height: len,
          backgroundColor: PAPER,
          ...(flipV ? { bottom: 0 } : { top: 0 }),
          ...(flipH ? { right: 0 } : { left: 0 }),
        }}
      />
    </View>
  );
}

const PAPER = "rgba(251,248,242,0.95)";

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "12%",
    bottom: "14%",
  },
  corner: { position: "absolute", width: 28, height: 28 },
  sweep: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: PAPER,
  },
  hintWrap: { position: "absolute", left: 32, right: 32, bottom: "6%" },
  hintText: {
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
