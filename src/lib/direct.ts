import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Analysis, AnalyzeResponse, ModeId } from "@shared/schema";
import { isAnalysis } from "@shared/schema";
import { READING_TOOL, systemPrompt } from "@shared/prompts";
import { ApiError } from "./errors";

/**
 * Developer mode: call the vision model straight from the phone with the user's own key.
 * For personal testing only. A public build must go through the Worker so the key stays server-side.
 */

const KEY = "fieldlens.anthropicKey";
const MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 50_000;

export async function getDirectKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return AsyncStorage.getItem(KEY);
  }
}

export async function setDirectKey(value: string | null): Promise<void> {
  const v = value?.trim() || null;
  try {
    if (v) await SecureStore.setItemAsync(KEY, v);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    if (v) await AsyncStorage.setItem(KEY, v);
    else await AsyncStorage.removeItem(KEY);
  }
}

export function looksLikeKey(v: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(v.trim());
}

export async function analyzeDirect(params: {
  key: string;
  mode: ModeId;
  imageBase64: string;
  locale: string;
  country?: string;
  note?: string;
}): Promise<AnalyzeResponse> {
  const started = Date.now();
  const note = params.note?.trim();
  const body = {
    model: MODEL,
    max_tokens: 1800,
    system: systemPrompt(params.mode, params.locale, params.country),
    tools: [READING_TOOL],
    tool_choice: { type: "tool", name: READING_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: params.imageBase64 } },
          {
            type: "text",
            text: note
              ? `User's note: "${note}"\n\nRead this photo in ${params.mode.toUpperCase()} mode.`
              : `Read this photo in ${params.mode.toUpperCase()} mode.`,
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": params.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error)?.name === "AbortError") throw new ApiError("timeout", "The reading took too long.");
    throw new ApiError("network", "No connection to the model.");
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new ApiError("bad_request", "That API key was rejected. Check it in Settings.");
    if (res.status === 429) throw new ApiError("rate_limited", "The model is busy or your account is out of credit.");
    if (res.status === 400 && /image/i.test(text)) throw new ApiError("unreadable_image", "The image could not be processed.");
    if (res.status === 400 && /credit|billing/i.test(text)) throw new ApiError("bad_request", "Your Anthropic account needs credit before it can be used.");
    throw new ApiError("upstream", `Model error (${res.status}).`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; name?: string; input?: unknown }>; model?: string };
  const tool = data.content?.find((c) => c.type === "tool_use" && c.name === READING_TOOL.name);
  const analysis = tool?.input as Analysis | undefined;
  if (!isAnalysis(analysis)) throw new ApiError("server", "The model returned an incomplete reading.");

  return { ok: true, id: `${Date.now()}`, analysis, model: data.model ?? MODEL, ms: Date.now() - started };
}
