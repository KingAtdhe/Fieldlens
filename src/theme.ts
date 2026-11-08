import { useColorScheme } from "react-native";

/**
 * Fieldlens visual language: a surveyor's notebook, not a chat app.
 * Warm paper, ink, hairline rules, one vermilion marker. No gradients, no glass, no glow.
 */

export interface Colors {
  paper: string; sheet: string; ink: string; ink2: string; muted: string; rule: string; ruleStrong: string;
  marker: string; good: string; caution: string; bad: string; neutral: string; overlay: string;
}

export const palette: { light: Colors; dark: Colors } = {
  light: {
    paper: "#F3EEE4",
    sheet: "#FBF8F2",
    ink: "#15130F",
    ink2: "#4A453C",
    muted: "#857D70",
    rule: "#D8CFBF",
    ruleStrong: "#B9AE9A",
    marker: "#C7441E",
    good: "#4C6B3C",
    caution: "#A8761A",
    bad: "#B2331E",
    neutral: "#5D6B78",
    overlay: "rgba(21,19,15,0.55)",
  },
  dark: {
    paper: "#14120E",
    sheet: "#1D1A15",
    ink: "#F0EADF",
    ink2: "#C9C1B3",
    muted: "#8E8676",
    rule: "#332E26",
    ruleStrong: "#4D463A",
    marker: "#E25A2E",
    good: "#8DB178",
    caution: "#D9A446",
    bad: "#E0624A",
    neutral: "#9AAAB8",
    overlay: "rgba(0,0,0,0.6)",
  },
};

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  displayRegular: "Fraunces_400Regular",
  displayItalic: "Fraunces_400Regular_Italic",
  body: "IBMPlexSans_400Regular",
  bodyMedium: "IBMPlexSans_500Medium",
  bodySemi: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  gutter: 20,
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" as const },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
} as const;

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === "dark" ? palette.dark : palette.light;
}

export function toneColor(colors: Colors, tone: "good" | "caution" | "bad" | "neutral"): string {
  return colors[tone];
}
