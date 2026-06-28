import type { SiteMeta } from "./scraper";

const NEUTRAL_HEX = new Set([
  "#000",
  "#000000",
  "#111",
  "#111111",
  "#222",
  "#333",
  "#333333",
  "#444",
  "#555",
  "#666",
  "#777",
  "#888",
  "#999",
  "#aaa",
  "#bbb",
  "#ccc",
  "#ddd",
  "#eee",
  "#fff",
  "#ffffff",
  "#f5f5f5",
  "#fafafa",
  "#f9f9f9",
  "#f9f8f7",
  "#e5e7eb",
  "#ececec",
]);

function normalizeHex(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value.startsWith("#")) return null;

  if (value.length === 4) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (value.length === 7) return value;
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function recordColor(counts: Map<string, number>, raw: string, weight = 1) {
  const hex = normalizeHex(raw);
  if (!hex || NEUTRAL_HEX.has(hex)) return;
  counts.set(hex, (counts.get(hex) ?? 0) + weight);
}

function hexFrequency(html: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const match of html.matchAll(/#(?:[0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g)) {
    recordColor(counts, match[0]);
  }

  for (const match of html.matchAll(
    /\b(?:rgb|hsl)a?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi,
  )) {
    recordColor(
      counts,
      rgbToHex(Number(match[1]), Number(match[2]), Number(match[3])),
    );
  }

  return counts;
}

function pickTopColors(counts: Map<string, number>, limit = 4): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hex]) => hex.toUpperCase());
}

function normalizeGptColor(color: string): string | null {
  const trimmed = color.trim();
  const hex = normalizeHex(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
  if (hex) return hex.toUpperCase();

  return null;
}

/** Pull dominant non-neutral hex colors from rendered HTML/CSS. */
export function extractBrandColorsFromHtml(
  html: string,
  meta?: Pick<SiteMeta, "themeColor">,
): string[] {
  const counts = hexFrequency(html);

  if (meta?.themeColor) {
    const theme = normalizeHex(meta.themeColor);
    if (theme && !NEUTRAL_HEX.has(theme)) {
      counts.set(theme, (counts.get(theme) ?? 0) + 100);
    }
  }

  return pickTopColors(counts);
}

/** Prefer CSS-derived colors; only use GPT when the page has too few usable hex values. */
export function mergeBrandColors(
  extracted: string[],
  gptColors: string[],
): string[] {
  if (extracted.length >= 3) {
    return extracted.slice(0, 5);
  }

  const merged: string[] = [];
  const seen = new Set<string>();

  for (const color of extracted) {
    const key = color.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(color);
  }

  for (const color of gptColors) {
    const normalized = normalizeGptColor(color);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged.slice(0, 5);
}

export function brandColorsLookGeneric(colors: string[]): boolean {
  if (colors.length === 0) return true;

  const generic = new Set([
    "#00a3e0",
    "#007bff",
    "#0066cc",
    "#2563eb",
    "#3b82f6",
    "#1d4ed8",
    "#0ea5e9",
    "#38bdf8",
  ]);

  const normalized = colors.map((c) => c.toLowerCase());
  const genericHits = normalized.filter((c) => generic.has(c)).length;
  return genericHits >= Math.ceil(colors.length / 2);
}
