import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_KEY = "fieldlens.device";
const API_OVERRIDE_KEY = "fieldlens.apiBaseUrl";

export function defaultApiBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
  return (extra.apiBaseUrl ?? "").replace(/\/+$/, "");
}

export async function getApiBaseUrl(): Promise<string> {
  const override = await AsyncStorage.getItem(API_OVERRIDE_KEY);
  return (override ?? defaultApiBaseUrl()).replace(/\/+$/, "");
}

export async function setApiBaseUrl(url: string | null): Promise<void> {
  if (!url) await AsyncStorage.removeItem(API_OVERRIDE_KEY);
  else await AsyncStorage.setItem(API_OVERRIDE_KEY, url.trim());
}

/** Stable anonymous device id, stored in the keychain so it survives reinstall on iOS. */
export async function getDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
    return id;
  } catch {
    // SecureStore can be unavailable on some Android builds; fall back to AsyncStorage.
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    await AsyncStorage.setItem(DEVICE_KEY, id);
    return id;
  }
}

export function randomId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
