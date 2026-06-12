import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, shadow, tint } from "@/theme";

/** Elevated white card — the base surface for every grouped block. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Small section heading with an optional accent icon + trailing slot. */
export function SectionHeader({ title, icon, accent = colors.blue, right }: { title: string; icon?: keyof typeof Ionicons.glyphMap; accent?: string; right?: React.ReactNode }) {
  return (
    <View style={s.sectionRow}>
      {icon ? <Ionicons name={icon} size={15} color={accent} style={{ marginRight: 6 }} /> : null}
      <Text style={s.sectionTitle}>{title}</Text>
      {right ? <View style={{ marginLeft: "auto" }}>{right}</View> : null}
    </View>
  );
}

/** Compact stat tile: icon chip + big value + label. Fixed height → no layout shift. */
export function StatTile({ label, value, icon, accent = colors.blue }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; accent?: string }) {
  return (
    <View style={[s.card, s.tile]}>
      <View style={[s.chip, { backgroundColor: tint(accent, "1F") }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={s.tileValue} numberOfLines={1}>{value}</Text>
      <Text style={s.tileLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

/** KPI card: big value + human-readable label/hint, optional delta. */
export function KpiCard({ label, hint, value, accent = colors.blue, icon, delta }: { label: string; hint?: string; value: string; accent?: string; icon: keyof typeof Ionicons.glyphMap; delta?: number }) {
  const up = (delta ?? 0) >= 0;
  return (
    <View style={[s.card, s.kpi]}>
      <View style={s.kpiTop}>
        <View style={[s.chip, { backgroundColor: tint(accent, "1F") }]}><Ionicons name={icon} size={16} color={accent} /></View>
        {delta !== undefined && Math.abs(delta) >= 0.05 ? (
          <View style={[s.deltaPill, { backgroundColor: tint(up ? colors.green : colors.red, "1A") }]}>
            <Ionicons name={up ? "trending-up" : "trending-down"} size={11} color={up ? colors.green : colors.red} />
            <Text style={[s.deltaText, { color: up ? colors.green : colors.red }]}>{Math.abs(delta).toFixed(1)}%</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.kpiValue} numberOfLines={1}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {hint ? <Text style={s.kpiHint} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

/** Coloured status / priority pill. */
export function Pill({ label, color = colors.muted, solid = false }: { label: string; color?: string; solid?: boolean }) {
  return (
    <View style={[s.pill, { backgroundColor: solid ? color : tint(color, "1A") }]}>
      <Text style={[s.pillText, { color: solid ? "#fff" : color }]}>{label}</Text>
    </View>
  );
}

/** Fixed-height empty state with icon — keeps lists from collapsing. */
export function EmptyState({ icon = "file-tray-outline", title, hint, height = 160 }: { icon?: keyof typeof Ionicons.glyphMap; title: string; hint?: string; height?: number }) {
  return (
    <View style={[s.empty, { height }]}>
      <View style={s.emptyIcon}><Ionicons name={icon} size={22} color={colors.slate300} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Text style={s.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function Loader() {
  return <View style={s.loader}><ActivityIndicator color={colors.blue} /></View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.card },
  sectionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 13.5, fontWeight: "800", color: colors.navy, letterSpacing: -0.2 },
  tile: { flex: 1, minWidth: 104, padding: 12, gap: 2 },
  chip: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  tileValue: { fontSize: 20, fontWeight: "800", color: colors.navy, lineHeight: 24 },
  tileLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  kpi: { flex: 1, minWidth: 150, padding: 14 },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: "800", color: colors.navy, letterSpacing: -0.4 },
  kpiLabel: { fontSize: 12.5, fontWeight: "700", color: colors.navy, marginTop: 3 },
  kpiHint: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
  deltaPill: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  deltaText: { fontSize: 11, fontWeight: "800" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  pillText: { fontSize: 10.5, fontWeight: "800", textTransform: "capitalize" },
  empty: { alignItems: "center", justifyContent: "center", gap: 7 },
  emptyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 13, fontWeight: "700", color: colors.muted },
  emptyHint: { fontSize: 11.5, color: colors.slate300, textAlign: "center", maxWidth: 240 },
  loader: { padding: 40, alignItems: "center" },
});
