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
  slate100: "#F1F5F9",
};

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
