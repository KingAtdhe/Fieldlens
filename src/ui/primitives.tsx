import React from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { space, useColors, type Colors } from "@/theme";
import { Text } from "./Text";
import type { Tone } from "@shared/schema";

/** Hairline horizontal rule, the primary structural device of the design. */
export function Rule({ strong, style }: { strong?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: strong ? colors.ruleStrong : colors.rule },
        style,
      ]}
    />
  );
}

/** Small uppercase mono label with an optional leading rule, like a form field caption. */
export function Caption({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <Text variant="label" color={color} muted={!color}>
      {children}
    </Text>
  );
}

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, kind = "primary", compact, style, onPress, disabled, ...rest }: ButtonProps) {
  const colors = useColors();
  const skin = buttonSkin(colors, kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: skin.bg,
          borderColor: skin.border,
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text variant="heading" color={skin.fg} center>
        {label}
      </Text>
    </Pressable>
  );
}

function buttonSkin(c: Colors, kind: NonNullable<ButtonProps["kind"]>) {
  switch (kind) {
    case "primary":
      return { bg: c.ink, fg: c.paper, border: c.ink };
    case "secondary":
      return { bg: "transparent", fg: c.ink, border: c.ink };
    case "danger":
      return { bg: "transparent", fg: c.bad, border: c.bad };
    default:
      return { bg: "transparent", fg: c.ink, border: "transparent" };
  }
}

/** A square ink mark whose colour carries the verdict tone. Replaces icons. */
export function ToneMark({ tone, size = 10 }: { tone: Tone; size?: number }) {
  const colors = useColors();
  return <View style={{ width: size, height: size, backgroundColor: colors[tone] }} />;
}

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ flex: 1, backgroundColor: colors.paper }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: space.xl,
    paddingVertical: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: space.lg,
  },
});
