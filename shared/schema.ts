/**
 * Shared contract between the Fieldlens app and the vision backend.
 * Keep this file dependency-free: it is imported by both React Native and the Cloudflare Worker.
 */

export const MODE_IDS = ["shop", "label", "home", "paper", "repair"] as const;
export type ModeId = (typeof MODE_IDS)[number];

export type Tone = "good" | "caution" | "bad" | "neutral";
export type Confidence = "high" | "medium" | "low";

export interface Finding {
  heading: string;
  body: string;
  severity?: Tone;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Analysis {
  /** What the camera saw, as a short noun phrase. */
  subject: string;
  verdict: {
    /** 1–3 words, e.g. "Worth buying", "Document first", "Not worth repairing". */
    label: string;
    tone: Tone;
    /** One or two plain sentences. */
    summary: string;
  };
  confidence: Confidence;
  /** Ordered, most important first. 2–6 items. */
  findings: Finding[];
  /** Short key/value facts. 0–8 items. */
  facts: Fact[];
  /** Concrete next steps. 0–5 items. */
  actions: string[];
  /** Limits of what can be read from the image. 0–3 items. */
  caveats: string[];
}

export interface AnalyzeRequest {
  mode: ModeId;
  /** Base64 JPEG, no data: prefix. Longest edge ≤ 1600 px. */
  image: string;
  /** BCP-47 tag such as "de-DE". The answer is written in this language. */
  locale: string;
  /** ISO 3166-1 alpha-2 country, used for law/market specifics. */
  country?: string;
  /** Optional free text from the user, e.g. "price is 49 €". */
  note?: string;
}

export interface AnalyzeResponse {
  ok: true;
  id: string;
  analysis: Analysis;
  model: string;
  ms: number;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code:
      | "bad_request"
      | "image_too_large"
      | "unreadable_image"
      | "rate_limited"
      | "upstream"
      | "server";
    message: string;
  };
}

export const MAX_IMAGE_BASE64_BYTES = 4_500_000;

export function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const verdict = v.verdict as Record<string, unknown> | undefined;
  return (
    typeof v.subject === "string" &&
    !!verdict &&
    typeof verdict.label === "string" &&
    typeof verdict.summary === "string" &&
    ["good", "caution", "bad", "neutral"].includes(String(verdict.tone)) &&
    ["high", "medium", "low"].includes(String(v.confidence)) &&
    Array.isArray(v.findings) &&
    Array.isArray(v.facts) &&
    Array.isArray(v.actions) &&
    Array.isArray(v.caveats)
  );
}
