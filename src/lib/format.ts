import type { Analysis } from "@shared/schema";
import type { Reading } from "./history";
import { getMode } from "@/modes";

export function formatDate(ts: number, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

/** Plain-text export of a reading, for share sheets and clipboard. */
export function readingToText(r: Reading): string {
  const m = getMode(r.mode);
  const a: Analysis = r.analysis;
  const lines: string[] = [];
  lines.push(`FIELDLENS · ${m.name.toUpperCase()} · ${formatDate(r.createdAt)}`);
  lines.push("");
  lines.push(a.subject);
  lines.push(`${a.verdict.label.toUpperCase()} — ${a.verdict.summary}`);
  lines.push(`Confidence: ${a.confidence}`);
  if (r.note) lines.push(`Note: ${r.note}`);
  if (a.findings.length) {
    lines.push("", "Findings");
    a.findings.forEach((f, i) => lines.push(`${String(i + 1).padStart(2, "0")}  ${f.heading} — ${f.body}`));
  }
  if (a.facts.length) {
    lines.push("", "Facts");
    a.facts.forEach((f) => lines.push(`${f.label}: ${f.value}`));
  }
  if (a.actions.length) {
    lines.push("", "Next");
    a.actions.forEach((s) => lines.push(`• ${s}`));
  }
  if (a.caveats.length) {
    lines.push("", "Limits");
    a.caveats.forEach((s) => lines.push(`– ${s}`));
  }
  lines.push("", m.disclaimer);
  return lines.join("\n");
}
