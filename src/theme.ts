import { useColorScheme, type TextStyle } from "react-native";

/**
 * Design system — "Hospitality Operations" (mirrors the Stitch design system).
 * Brand navy/blue, Inter-like type, 16px cards, 22%-opacity status pills, light + dark.
 *
 * Usage in new screens: `const t = useTheme()` → mode-aware colours.
 * Legacy screens keep importing the static `colors` (light palette) unchanged.
 */

// ── Brand + semantic colours (constant across light/dark) ──
const brand = {
  navy: "#0B2A5B",
  navy2: "#12356E",
  primary: "#2A68D3",
  primaryDark: "#004FB4",
  blue: "#2A68D3",
  blueLight: "#3B82F6",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  violet: "#8B5CF6",
  teal: "#06B6D4",
  pink: "#EC4899",
  gold: "#E0A106",
  white: "#FFFFFF",
  onBrand: "#FFFFFF",
} as const;

const lightMode = {
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EFF4FF",
  surfaceSunken: "#F1F5F9",
  border: "#E2E8F0",
  divider: "#EEF2F7",
  text: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  slate300: "#CBD5E1",
  overlay: "rgba(11,28,48,0.45)",
};

const darkMode = {
  bg: "#0B1220",
  surface: "#131C2E",
  surfaceAlt: "#1B2740",
  surfaceSunken: "#0E1728",
  border: "#22304A",
  divider: "#1B2740",
  text: "#E7ECF5",
  muted: "#94A3B8",
  faint: "#64748B",
  slate100: "#1B2740",
  slate50: "#152036",
  slate300: "#3A4A66",
  overlay: "rgba(0,0,0,0.6)",
};

export type Theme = typeof brand & typeof lightMode & { scheme: "light" | "dark" };

/** Mode-aware palette. Respects the device light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { ...brand, ...(scheme === "dark" ? darkMode : lightMode), scheme };
}

// ── Legacy static palette (light) — keeps existing screens compiling ──
export const colors = { ...brand, ...lightMode };

// ── Spacing / radius / shadow ──
export const space = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const shadow = {
  card: { shadowColor: "#0B2A5B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  sheet: { shadowColor: "#0B2A5B", shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
  fab: { shadowColor: "#2A68D3", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
} as const;

/** Soft tinted background for an accent colour: `tint(t.primary)` → 10% alpha. */
export function tint(hex: string, alpha = "1A"): string {
  return `${hex}${alpha}`;
}

// ── Typography scale (Inter-like; system font falls back to SF Pro / Roboto) ──
export const type: Record<string, TextStyle> = {
  display: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  title: { fontSize: 15.5, fontWeight: "700", letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: "400" },
  bodyStrong: { fontSize: 14, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  caption: { fontSize: 11.5, fontWeight: "500" },
  overline: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
};
/** Apply to numbers/room-codes for column-aligned digits. */
export const tabular = { fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] };

// ── Domain colour maps ──
export const priorityColor: Record<string, string> = {
  low: colors.muted,
  normal: colors.blue,
  high: colors.amber,
  critical: colors.red,
};

export const statusColor: Record<string, string> = {
  OPEN: colors.muted,
  ASSIGNED: colors.blue,
  IN_PROGRESS: colors.amber,
  ESCALATED: colors.red,
  RESOLVED: colors.green,
  CLOSED: colors.muted,
};

/** Housekeeping status → colour (CLEAN/DIRTY/CLEANING/INSPECTED/OUT_OF_SERVICE). */
export const hkStatusColor: Record<string, string> = {
  CLEAN: colors.green,
  DIRTY: colors.amber,
  CLEANING: colors.blue,
  INSPECTED: colors.violet,
  OUT_OF_SERVICE: colors.red,
};

/** Occupancy / room status → colour. */
export const roomStatusColor: Record<string, string> = {
  AVAILABLE: colors.green,
  OCCUPIED: colors.violet,
  RESERVED: colors.blue,
  MAINTENANCE: colors.amber,
  OUT_OF_ORDER: colors.red,
  BLOCKED: colors.muted,
};

/**
 * Floor-plan display status → colour + label (the SAME 8 states the web board
 * computes via roomDisplayStatus / ROOM_STATUS_META). Cells use the room number
 * in the theme text colour with a tinted colour fill, so it reads in light + dark.
 */
export const roomDisplayColor: Record<string, string> = {
  occupied: colors.blue,
  confirmed: colors.gold,
  out_of_order: "#94A3B8",
  out_of_service: "#EA580C",
  dirty_vacant: "#475569",
  cleaning: colors.amber,
  inspected: colors.red,
  vacant_clean: colors.green,
};
export const roomDisplayLabel: Record<string, string> = {
  occupied: "Occupied", confirmed: "Confirmed", out_of_order: "Out of order", out_of_service: "Out of service",
  dirty_vacant: "Dirty vacant", cleaning: "Cleaning", inspected: "Inspected", vacant_clean: "Vacant clean",
};
/** Legend / worklist priority order (matches web ROOM_DISPLAY_ORDER). */
export const ROOM_DISPLAY_ORDER = ["dirty_vacant", "cleaning", "inspected", "vacant_clean", "confirmed", "occupied", "out_of_service", "out_of_order"];

/** Notification category → accent colour (matches web notifications/links.ts intent). */
export const notifAccent: Record<string, string> = {
  ticket: colors.blue,
  escalation: colors.red,
  housekeeping: colors.green,
  booking: colors.violet,
  banquet: colors.violet,
  payment: colors.teal,
  invoice: colors.teal,
  chat: colors.blue,
  inbox: colors.blue,
  approval: colors.amber,
  lead: colors.pink,
  review: colors.gold,
  channel: colors.amber,
  inventory: colors.amber,
  fnb: colors.teal,
  audit: colors.muted,
  staff: colors.muted,
  system: colors.muted,
};
