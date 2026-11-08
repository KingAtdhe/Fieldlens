import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { palette } from "@/theme";
import { SettingsProvider } from "@/lib/settings";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;

  const [loaded, error] = useFonts({
    Fraunces_400Regular: require("../assets/fonts/Fraunces_400Regular.ttf"),
    Fraunces_400Regular_Italic: require("../assets/fonts/Fraunces_400Regular_Italic.ttf"),
    Fraunces_600SemiBold: require("../assets/fonts/Fraunces_600SemiBold.ttf"),
    Fraunces_700Bold: require("../assets/fonts/Fraunces_700Bold.ttf"),
    IBMPlexSans_400Regular: require("../assets/fonts/IBMPlexSans_400Regular.ttf"),
    IBMPlexSans_500Medium: require("../assets/fonts/IBMPlexSans_500Medium.ttf"),
    IBMPlexSans_600SemiBold: require("../assets/fonts/IBMPlexSans_600SemiBold.ttf"),
    IBMPlexMono_400Regular: require("../assets/fonts/IBMPlexMono_400Regular.ttf"),
    IBMPlexMono_500Medium: require("../assets/fonts/IBMPlexMono_500Medium.ttf"),
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.paper).catch(() => {});
  }, [colors.paper]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
              animation: "fade_from_bottom",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="reading/[id]" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="history" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="modes" options={{ presentation: "modal" }} />
          </Stack>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
