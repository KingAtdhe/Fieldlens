import {
  MAX_IMAGE_BASE64_BYTES,
  MODE_IDS,
  isAnalysis,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type ErrorResponse,
  type ModeId,
} from "../../../shared/schema";
import { READING_TOOL, systemPrompt } from "./prompts";

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_TOKEN?: string;
  MODEL: string;
  RATE_LIMIT_PER_HOUR: string;
  ALLOWED_ORIGINS: string;
  RATE_KV?: KVNamespace;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const UPSTREAM_TIMEOUT_MS = 40_000;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request, env);

    if (url.pathname === "/health") {
      return withCors(json({ ok: true, model: env.MODEL }), request, env);
    }

    if (url.pathname === "/v1/analyze" && request.method === "POST") {
      const res = await handleAnalyze(request, env, ctx);
      return withCors(res, request, env);
    }

    return withCors(fail("bad_request", "Not found", 404), request, env);
  },
} satisfies ExportedHandler<Env>;

async function handleAnalyze(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const started = Date.now();

  if (env.APP_TOKEN && request.headers.get("x-fieldlens-token") !== env.APP_TOKEN) {
    return fail("bad_request", "Unauthorised client", 401);
  }

  const device = request.headers.get("x-fieldlens-device") ?? "anon";
  const limited = await isRateLimited(env, device, ctx);
  if (limited) return fail("rate_limited", "Too many readings this hour. Try again later.", 429);

  let body: Partial<AnalyzeRequest>;
  try {
    body = (await request.json()) as Partial<AnalyzeRequest>;
  } catch {
    return fail("bad_request", "Body must be JSON", 400);
  }

  const mode = body.mode as ModeId;
  if (!MODE_IDS.includes(mode)) return fail("bad_request", "Unknown mode", 400);
  if (typeof body.image !== "string" || body.image.length < 1000) return fail("bad_request", "Missing image", 400);
  if (body.image.length > MAX_IMAGE_BASE64_BYTES) return fail("image_too_large", "Image exceeds size limit", 413);
  if (body.image.startsWith("data:")) return fail("bad_request", "Send raw base64 without a data: prefix", 400);

  const locale = sanitize(body.locale, 20) || "en-GB";
  const country = sanitize(body.country, 2)?.toUpperCase();
  const note = sanitize(body.note, 300);

  const userContent: unknown[] = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: body.image } },
    {
      type: "text",
      text: note ? `User's note: "${note}"\n\nRead this photo in ${mode.toUpperCase()} mode.` : `Read this photo in ${mode.toUpperCase()} mode.`,
    },
  ];

  const payload = {
    model: env.MODEL || "claude-sonnet-5-5",
    max_tokens: 1800,
    system: [{ type: "text", text: systemPrompt(mode, locale, country), cache_control: { type: "ephemeral" } }],
    tools: [READING_TOOL],
    tool_choice: { type: "tool", name: READING_TOOL.name },
    messages: [{ role: "user", content: userContent }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = (err as Error)?.name === "AbortError";
    return fail("upstream", aborted ? "The model took too long" : "Could not reach the model", 504);
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, text.slice(0, 500));
    if (upstream.status === 429) return fail("rate_limited", "The model is busy. Try again in a moment.", 429);
    if (upstream.status === 400 && /image/i.test(text)) return fail("unreadable_image", "The image could not be processed", 400);
    return fail("upstream", `Model error (${upstream.status})`, 502);
  }

  const data = (await upstream.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
    model?: string;
    stop_reason?: string;
  };

  const toolUse = data.content?.find((c) => c.type === "tool_use" && c.name === READING_TOOL.name);
  const analysis = toolUse?.input;
  if (!isAnalysis(analysis)) {
    console.error("bad analysis shape", JSON.stringify(data).slice(0, 800));
    return fail("server", "The model returned an incomplete reading", 502);
  }

  // Normalise lengths defensively; the schema caps most of this but clients deserve guarantees.
  analysis.findings = analysis.findings.slice(0, 6);
  analysis.facts = analysis.facts.slice(0, 8);
  analysis.actions = analysis.actions.slice(0, 5);
  analysis.caveats = analysis.caveats.slice(0, 3);

  const res: AnalyzeResponse = {
    ok: true,
    id: crypto.randomUUID(),
    analysis,
    model: data.model ?? payload.model,
    ms: Date.now() - started,
  };
  return json(res);
}

async function isRateLimited(env: Env, device: string, ctx: ExecutionContext): Promise<boolean> {
  if (!env.RATE_KV) return false;
  const limit = Number(env.RATE_LIMIT_PER_HOUR) || 40;
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${hour}:${device}`;
  const current = Number((await env.RATE_KV.get(key)) ?? "0");
  if (current >= limit) return true;
  ctx.waitUntil(env.RATE_KV.put(key, String(current + 1), { expirationTtl: 3700 }));
  return false;
}

function sanitize(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s ? s.slice(0, max) : undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function fail(code: ErrorResponse["error"]["code"], message: string, status: number): Response {
  const body: ErrorResponse = { ok: false, error: { code, message } };
  return json(body, status);
}

function withCors(res: Response, request: Request, env: Env): Response {
  const origin = request.headers.get("origin");
  if (!origin) return res;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin) && !allowed.includes("*")) return res;
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type, x-fieldlens-device, x-fieldlens-client, x-fieldlens-token");
  headers.set("access-control-max-age", "86400");
  return new Response(res.body, { status: res.status, headers });
}
