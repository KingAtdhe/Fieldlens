import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModeId } from "@shared/schema";

export interface Settings {
  haptics: boolean;
  saveHistory: boolean;
  lastMode: ModeId;
  onboarded: boolean;
}

const DEFAULTS: Settings = { haptics: true, saveHistory: true, lastMode: "shop", onboarded: false };
const KEY = "fieldlens.settings.v1";

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULTS, ready: false, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      ready,
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [settings, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
