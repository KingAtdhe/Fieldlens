import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { type, useColors } from "@/theme";

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  italic?: boolean;
  center?: boolean;
}

export function Text({ variant = "body", color, muted, italic, center, style, ...rest }: Props) {
  const colors = useColors();
  const base = type[variant] as TextStyle;
  const resolved: TextStyle = {
    ...base,
    color: color ?? (muted ? colors.muted : colors.ink),
    ...(italic && variant !== "label" && variant !== "mono" ? { fontFamily: "Fraunces_400Regular_Italic" } : null),
    ...(center ? { textAlign: "center" } : null),
  };
  return <RNText allowFontScaling maxFontSizeMultiplier={1.4} style={[resolved, style]} {...rest} />;
}
