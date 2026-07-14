/**
 * CA-report period presets — a byte-faithful port of the web CA Reports page
 * (hobo-enterprise/src/app/platform/[hotelId]/ca-reports/page.tsx:19-27, 91-98).
 *
 * Kept deliberately identical so the app and the web resolve the SAME [from, to]
 * for the same preset. Two things look like bugs but are faithful:
 *   • the quarter ranges are hard-coded to FY 2025-26 on the web — mirrored here;
 *   • `iso()` uses the DEVICE's local calendar (not the hotel timezone), same as web.
 * Fixing either one here alone would make the app disagree with the web.
 */

export type PeriodKey = "month" | "lastmonth" | "q1" | "q2" | "q3" | "q4" | "fy" | "custom";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "q1", label: "Q1 (Apr–Jun 2025)" },
  { key: "q2", label: "Q2 (Jul–Sep 2025)" },
  { key: "q3", label: "Q3 (Oct–Dec 2025)" },
  { key: "q4", label: "Q4 (Jan–Mar 2026)" },
  { key: "fy", label: "FY 2025-26" },
  { key: "custom", label: "Custom Range…" },
];

/** Local-calendar YYYY-MM-DD (NOT toISOString(), which would shift the day in +TZ). */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** First → last day of the month `offset` months from now. */
export function monthRange(offset: number, now: Date = new Date()): [string, string] {
  const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const e = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return [iso(s), iso(e)];
}

/** Indian financial year containing `now` (Apr 1 → Mar 31). */
export function fy(now: Date = new Date()): [string, string] {
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${y}-04-01`, `${y + 1}-03-31`];
}

/** Resolve a preset to [from, to] (both INCLUSIVE dates). `custom` returns null — caller keeps its range. */
export function periodToRange(p: PeriodKey, now: Date = new Date()): [string, string] | null {
  switch (p) {
    case "month": return monthRange(0, now);
    case "lastmonth": return monthRange(-1, now);
    case "q1": return ["2025-04-01", "2025-06-30"];
    case "q2": return ["2025-07-01", "2025-09-30"];
    case "q3": return ["2025-10-01", "2025-12-31"];
    case "q4": return ["2026-01-01", "2026-03-31"];
    case "fy": return fy(now);
    case "custom": return null;
  }
}
