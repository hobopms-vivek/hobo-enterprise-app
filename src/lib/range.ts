/**
 * Performance-window presets — mirror the web dashboard/reports range selector so
 * the same KPIs read identically. `to` is the EXCLUSIVE end the analytics endpoint
 * expects (it resolves to the hotel's night-audit business-day boundary).
 */
const DAY_MS = 86400000;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "90d" | "next7" | "next30";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "next7", label: "Next 7d" },
  { key: "next30", label: "Next 30d" },
];

/** Resolve a preset to the {from,to} (to = exclusive) the analytics endpoint expects, anchored at `now`. */
export function rangeToWindow(key: RangeKey, now: Date): { from: string; to: string } {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(+t0 + DAY_MS);
  switch (key) {
    case "today": return { from: ymd(t0), to: ymd(tomorrow) };
    case "yesterday": return { from: ymd(new Date(+t0 - DAY_MS)), to: ymd(t0) };
    case "7d": return { from: ymd(new Date(+tomorrow - 7 * DAY_MS)), to: ymd(tomorrow) };
    case "30d": return { from: ymd(new Date(+tomorrow - 30 * DAY_MS)), to: ymd(tomorrow) };
    case "90d": return { from: ymd(new Date(+tomorrow - 90 * DAY_MS)), to: ymd(tomorrow) };
    case "next7": return { from: ymd(tomorrow), to: ymd(new Date(+tomorrow + 7 * DAY_MS)) };
    case "next30": return { from: ymd(tomorrow), to: ymd(new Date(+tomorrow + 30 * DAY_MS)) };
  }
}
