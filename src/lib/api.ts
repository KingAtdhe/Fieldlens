import * as Localization from "expo-localization";
import type { AnalyzeRequest, AnalyzeResponse, ErrorResponse, ModeId } from "@shared/schema";
import { isAnalysis } from "@shared/schema";
import Constants from "expo-constants";
import { getApiBaseUrl, getDeviceId } from "./config";

import { ApiError } from "./errors";
import { analyzeDirect, getDirectKey } from "./direct";

export { ApiError };

const TIMEOUT_MS = 45_000;

export function deviceLocale(): { locale: string; country?: string } {
  const first = Localization.getLocales()[0];
  return {
    locale: first?.languageTag ?? "en-GB",
    country: first?.regionCode ?? undefined,
  };
}

export async function analyzeImage(params: {
  mode: ModeId;
  imageBase64: string;
  note?: string;
}): Promise<AnalyzeResponse> {
  const { locale, country } = deviceLocale();

  // Developer mode: the user's own key on this phone, no server in between.
  const directKey = await getDirectKey();
  if (directKey) {
    return analyzeDirect({ key: directKey, mode: params.mode, imageBase64: params.imageBase64, locale, country, note: params.note });
  }

  const base = await getApiBaseUrl();
  if (!base || base.includes("YOUR-SUBDOMAIN")) {
    throw new ApiError("not_configured", "No analysis server and no API key set. Open Settings.");
  }

  const body: AnalyzeRequest = {
    mode: params.mode,
    image: params.imageBase64,
    locale,
    country,
    note: params.note?.trim() || undefined,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${base}/v1/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-fieldlens-device": await getDeviceId(),
        "x-fieldlens-client": `app/${Constants.expoConfig?.version ?? "1.0.0"}`,
        ...(appToken() ? { "x-fieldlens-token": appToken() } : null),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError("timeout", "The reading took too long. Try again with a sharper, closer photo.");
    }
    throw new ApiError("network", "No connection to the analysis server.");
  }
  clearTimeout(timer);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("server", `Unexpected reply from the server (${res.status}).`);
  }

  const payload = json as AnalyzeResponse | ErrorResponse;
  if (!payload || typeof payload !== "object" || !("ok" in payload)) {
    throw new ApiError("server", "Malformed reply from the server.");
  }
  if (!payload.ok) {
    throw new ApiError(payload.error.code, payload.error.message);
  }
  if (!isAnalysis(payload.analysis)) {
    throw new ApiError("server", "The server returned an incomplete reading.");
  }
  return payload;
}

function appToken(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { appToken?: string };
  return extra.appToken ?? "";
}
