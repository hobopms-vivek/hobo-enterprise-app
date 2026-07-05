import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getDashboard, type DashAnalytics, type DashGuest } from "@/api/analytics";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { EmptyState, ListRow, Screen, ScreenHeader, Sheet, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, statusColor, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const moneyShort = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K` : money(n));
type Tab = "arrivals" | "inHouse" | "departures" | "upcoming" | "balances";

export function FrontDeskScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const managerial = (hotels.find((h) => h.id === hotelId)?.role?.level ?? 5) <= 3;

  const [data, setData] = useState<DashAnalytics | null>(null);
  const [tab, setTab] = useState<Tab>("arrivals");
  const [refreshing, setRefreshing] = useState(false);
  const [peek, setPeek] = useState<DashGuest | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    try { setData(await getDashboard(hotelId)); } catch { setData(null); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type.startsWith("ticket.") || e.type === "notification") void load(); });

  const ops = data?.operations;
  const isMoney = managerial && !!data?.role?.isManagerial;

  const allTabs: { key: Tab; label: string; count: number; managerial?: boolean }[] = [
    { key: "arrivals", label: "Arrivals", count: ops?.counts.arrivals ?? 0 },
    { key: "inHouse", label: "In-house", count: ops?.counts.inHouse ?? 0 },
    { key: "departures", label: "Departures", count: ops?.counts.departures ?? 0 },
    { key: "upcoming", label: "Upcoming", count: ops?.counts.upcoming ?? 0 },
    { key: "balances", label: "Balance", count: ops?.counts.withBalance ?? 0, managerial: true },
  ];
  const tabs = allTabs.filter((x) => !x.managerial || isMoney);

  const rows: DashGuest[] = useMemo(() => (ops ? (ops[tab] as DashGuest[]) ?? [] : []), [ops, tab]);

  return (
    <Screen>
      <ScreenHeader title="Front Desk" subtitle="View only" onBack={() => nav.goBack()} />

      {/* Summary strip */}
      <View style={{ flexDirection: "row", gap: 10, padding: space.base }}>
        <Summary label="In-house" value={ops?.counts.inHouse ?? 0} color={t.violet} />
        <Summary label="Arrivals" value={ops?.counts.arrivals ?? 0} color={t.green} />
        <Summary label="Departures" value={ops?.counts.departures ?? 0} color={t.amber} />
        {isMoney ? <Summary label="To collect" value={moneyShort(ops?.payment.totalOutstanding ?? 0)} color={t.teal} /> : null}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base, paddingBottom: 8 }}>
        {tabs.map((x) => {
          const active = tab === x.key;
          return (
            <Pressable key={x.key} onPress={() => setTab(x.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{x.label} {x.count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {data === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={62} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Nothing here" hint="No guests in this list." height={260} />}
          renderItem={({ item: g }) => (
            <ListRow
              onPress={() => setPeek(g)}
              chevron
              leading={
                <View style={{ minWidth: 46, height: 30, borderRadius: 8, backgroundColor: tint(g.room ? t.primary : t.muted, "18"), alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={[{ color: g.room ? t.primary : t.muted, fontWeight: "800", fontSize: 12 }, tabular]}>{g.room ?? "—"}</Text>
                </View>
              }
              title={g.guest}
              subtitle={`${g.roomType} · ${g.nights}n · ${g.code}`}
              right={
                isMoney && (tab === "balances" || tab === "departures")
                  ? <Text style={[{ color: g.balance > 0 ? t.text : t.green, fontWeight: "700", fontSize: 13 }, tabular]}>{g.balance > 0 ? money(g.balance) : "Paid"}</Text>
                  : <StatusBadge label={(g.status || "").replace(/_/g, " ")} color={statusColor[g.status] ?? t.muted} />
              }
            />
          )}
        />
      )}

      <Sheet visible={!!peek} onClose={() => setPeek(null)} title="Booking">
        {peek ? (
          <View style={{ paddingBottom: 8, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ minWidth: 52, height: 34, borderRadius: 9, backgroundColor: tint(peek.room ? t.primary : t.muted, "18"), alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}>
                <Text style={[{ color: peek.room ? t.primary : t.muted, fontWeight: "800", fontSize: 14 }, tabular]}>{peek.room ?? "—"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{peek.guest}</Text>
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{peek.roomType} · {peek.nights}n · {peek.code}</Text>
              </View>
              <StatusBadge label={(peek.status || "").replace(/_/g, " ")} color={statusColor[peek.status] ?? t.muted} />
            </View>
            {isMoney ? (
              <View style={{ backgroundColor: t.surfaceSunken, borderRadius: radius.md, padding: 12, gap: 6 }}>
                {[["Total", peek.total], ["Paid", peek.paid], ["Balance", peek.balance]].map(([lbl, val], i) => (
                  <View key={lbl as string} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[typo.body, { color: i === 2 ? t.text : t.muted, fontWeight: i === 2 ? "700" : "400" }]}>{lbl}</Text>
                    <Text style={[{ color: i === 2 ? (Number(val) > 0 ? t.text : t.green) : t.text, fontWeight: i === 2 ? "800" : "600" }, tabular]}>{i === 2 && Number(val) <= 0 ? "Paid" : money(Number(val))}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={[typo.caption, { color: t.faint, textAlign: "center" }]}>Check-in / check-out & payments are done on the web desk.</Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Summary({ label, value, color }: { label: string; value: string | number; color: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, alignItems: "center", gap: 1 }}>
      <Text style={[{ fontSize: 18, fontWeight: "800", color }, tabular]} numberOfLines={1}>{value}</Text>
      <Text style={[typo.caption, { color: t.muted }]}>{label}</Text>
    </View>
  );
}
