import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { getDashboard, type DashAnalytics, type DashGuest } from "@/api/analytics";
import { useRealtime } from "@/realtime/useRealtime";
import { Pill, EmptyState, Loader } from "@/components/ui";
import { colors, radius, shadow, statusColor } from "@/theme";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const moneyShort = (n: number) => { const v = Math.abs(n || 0); if (v >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`; if (v >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`; return `₹${Math.round(n || 0)}`; };

type TabKey = "arrivals" | "inHouse" | "departures" | "upcoming" | "balances";
const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "arrivals", label: "Arrivals", icon: "log-in" },
  { key: "inHouse", label: "In-house", icon: "people" },
  { key: "departures", label: "Departures", icon: "log-out" },
  { key: "upcoming", label: "Upcoming", icon: "calendar" },
  { key: "balances", label: "Balance due", icon: "wallet" },
];

export function FrontDeskScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [data, setData] = useState<DashAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("arrivals");

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setData(await getDashboard(hotelId).catch(() => null));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);
  useRealtime(hotelId, (e) => { if (e.type.startsWith("ticket.")) void load(); });

  const ops = data?.operations;
  const managerial = data?.role.isManagerial ?? false;
  const tabs = useMemo(() => TABS.filter((t) => t.key !== "balances" || managerial), [managerial]);
  const rows: DashGuest[] = ops ? ops[tab] : [];
  const count = (k: TabKey) => ops?.counts[k === "inHouse" ? "inHouse" : k === "balances" ? "withBalance" : k] ?? 0;

  if (loading && !data) return <Loader />;

  return (
    <View style={styles.screen}>
      {/* Summary strip */}
      {ops ? (
        <View style={styles.summary}>
          <Sum label="In-house" value={ops.counts.inHouse} color={colors.green} />
          <Sum label="Arrivals" value={ops.counts.arrivals} color={colors.blue} />
          <Sum label="Departures" value={ops.counts.departures} color={colors.violet} />
          {managerial ? <Sum label="To collect" value={moneyShort(ops.payment.totalOutstanding)} color={colors.teal} /> : null}
        </View>
      ) : null}

      {/* Segmented tabs */}
      <View style={styles.tabsWrap}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={tabs} keyExtractor={(t) => t.key}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          renderItem={({ item }) => {
            const active = tab === item.key;
            return (
              <Pressable onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}>
                <Ionicons name={item.icon} size={14} color={active ? "#fff" : colors.muted} />
                <Text style={[styles.tabText, active && { color: "#fff" }]}>{item.label}</Text>
                <View style={[styles.tabBadge, active && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Text style={[styles.tabBadgeText, active && { color: "#fff" }]}>{count(item.key)}</Text>
                </View>
              </Pressable>
            );
          }} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 28, gap: 8 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="Nothing here" hint="No guests in this list right now." height={200} />}
        renderItem={({ item: g }) => (
          <View style={styles.card}>
            <View style={styles.roomChip}><Text style={styles.roomChipText}>{g.room ?? g.code.slice(-3)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{g.guest}</Text>
              <Text style={styles.meta}>{g.roomType} · {g.nights} nt{g.room ? ` · Rm ${g.room}` : ""}</Text>
            </View>
            {tab === "balances" || (managerial && g.balance > 0) ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.bal, { color: g.balance > 0 ? colors.red : colors.green }]}>{g.balance > 0 ? money(g.balance) : "Paid"}</Text>
                <Text style={styles.balMeta}>of {moneyShort(g.total)}</Text>
              </View>
            ) : (
              <Pill label={g.status.replace(/_/g, " ").toLowerCase()} color={statusColor[g.status] ?? colors.muted} />
            )}
          </View>
        )}
      />
    </View>
  );
}

function Sum({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.sum}>
      <Text style={[styles.sumValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  summary: { flexDirection: "row", gap: 8, padding: 12 },
  sum: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: colors.border, ...shadow.card },
  sumValue: { fontSize: 18, fontWeight: "800" },
  sumLabel: { fontSize: 10.5, color: colors.muted, marginTop: 2, fontWeight: "600" },
  tabsWrap: { paddingBottom: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { fontSize: 12.5, fontWeight: "700", color: colors.muted },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10.5, fontWeight: "800", color: colors.muted },
  card: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  roomChip: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" },
  roomChipText: { fontSize: 12, fontWeight: "800", color: colors.muted },
  name: { fontSize: 14, fontWeight: "700", color: colors.navy },
  meta: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  bal: { fontSize: 14, fontWeight: "800" },
  balMeta: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
});
