/**
 * Display formatters that MATCH THE WEB DASHBOARD EXACTLY
 * (src/components/platform/dashboard-kit.tsx). Keep these byte-for-byte in sync
 * with the web so a KPI/amount shown in the app reads identically to the same
 * figure on the web — no app-side re-rounding (that was showing 44% for the
 * web's 43.5%, 20.8L for 20.76L, etc.).
 */

/** Whole-rupee, grouped: 22600 → "₹22,600". */
export const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

/** Compact money — web-exact breakpoints & precision: Cr/L = 2dp, K = 1dp. */
export const moneyShort = (n: number) => {
  const x = n || 0;
  const v = Math.abs(x);
  if (v >= 1e7) return `₹${(x / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(x / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(x / 1e3).toFixed(1)}K`;
  return `₹${Math.round(x)}`;
};

/** Percentage — web shows ONE decimal (43.5%, not 44%). */
export const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

/** Plain grouped integer: 1234 → "1,234". */
export const num = (n: number) => Math.round(n || 0).toLocaleString("en-IN");
