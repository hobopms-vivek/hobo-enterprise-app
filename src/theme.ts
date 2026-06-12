// Shared palette (navy/blue enterprise look, matching the web app).
export const colors = {
  navy: "#0B2A5B",
  navy2: "#12356E",
  blue: "#2A68D3",
  blueLight: "#3B82F6",
  bg: "#F4F6FB",
  white: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  violet: "#8B5CF6",
  teal: "#06B6D4",
  pink: "#EC4899",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  slate300: "#CBD5E1",
};

// Design tokens — consistent spacing/radius + a soft card shadow.
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const shadow = {
  card: { shadowColor: "#0B2A5B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
} as const;

/** Soft tinted background for an accent colour (e.g. icon chips): `tint(colors.blue)`. */
export function tint(hex: string, alpha = "1A"): string { return `${hex}${alpha}`; }

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
