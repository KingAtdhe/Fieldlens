import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import type { Analysis, ModeId } from "@shared/schema";
import { randomId } from "./config";

export interface Reading {
  id: string;
  mode: ModeId;
  createdAt: number;
  note?: string;
  imageUri: string;
  analysis: Analysis;
}

const INDEX_KEY = "fieldlens.readings.v1";
const MAX_READINGS = 200;

function imagesDir(): Directory {
  const dir = new Directory(Paths.document, "readings");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function listReadings(): Promise<Reading[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Reading[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Readings the user chose not to keep live here until the app is closed. */
const ephemeral = new Map<string, Reading>();

export async function getReading(id: string): Promise<Reading | undefined> {
  const mem = ephemeral.get(id);
  if (mem) return mem;
  const all = await listReadings();
  return all.find((r) => r.id === id);
}

/**
 * Persists a reading. The image is copied from its temporary location into the app's
 * document directory so it survives cache eviction. With `persist: false` the reading
 * is held in memory only.
 */
export async function saveReading(input: {
  mode: ModeId;
  note?: string;
  sourceImageUri: string;
  analysis: Analysis;
  persist?: boolean;
}): Promise<Reading> {
  const id = randomId();
  if (input.persist === false) {
    const reading: Reading = {
      id,
      mode: input.mode,
      createdAt: Date.now(),
      note: input.note,
      imageUri: input.sourceImageUri,
      analysis: input.analysis,
    };
    ephemeral.set(id, reading);
    return reading;
  }
  const dest = new File(imagesDir(), `${id}.jpg`);
  try {
    await new File(input.sourceImageUri).copy(dest);
  } catch {
    // If copying fails we keep the original uri; the reading is still useful.
  }
  const reading: Reading = {
    id,
    mode: input.mode,
    createdAt: Date.now(),
    note: input.note,
    imageUri: dest.exists ? dest.uri : input.sourceImageUri,
    analysis: input.analysis,
  };
  const all = await listReadings();
  const next = [reading, ...all].slice(0, MAX_READINGS);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
  // Remove images of readings that fell off the end.
  for (const dropped of all.slice(MAX_READINGS - 1)) safeDeleteImage(dropped.imageUri);
  return reading;
}

export async function deleteReading(id: string): Promise<void> {
  if (ephemeral.delete(id)) return;
  const all = await listReadings();
  const target = all.find((r) => r.id === id);
  if (target) safeDeleteImage(target.imageUri);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(all.filter((r) => r.id !== id)));
}

export async function clearReadings(): Promise<void> {
  const all = await listReadings();
  for (const r of all) safeDeleteImage(r.imageUri);
  await AsyncStorage.removeItem(INDEX_KEY);
}

function safeDeleteImage(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists && uri.includes("/readings/")) f.delete();
  } catch {
    // ignore
  }
}
