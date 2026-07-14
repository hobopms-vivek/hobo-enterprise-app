import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getDashboard, type DashAnalytics } from "@/api/analytics";
import { useAuthStore } from "@/store/useAuthStore";
import { KpiCard, Screen, ScreenHeader, SectionHeader, Skeleton } from "@/components/kit";
import { money, moneyShort as short, pct } from "@/lib/format";
import { RANGES, rangeToWindow, type RangeKey } from "@/lib/range";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

export function ManagerReportsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [data, setData] = useState<DashAnalytics | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    const win = range === "30d" ? undefined : rangeToWindow(range, new Date());
    try { setData(await getDashboard(hotelId, win)); } catch { setData(null); }
  }, [hotelId, range]);
  useEffect(() => { void load(); }, [load]);

  const k = data?.kpis;
  const rev = data?.operations;

  return (
    <Screen>
      <ScreenHeader title="Reports" subtitle={data ? `Last ${data.range.days} days` : undefined} onBack={() => nav.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: space.base, gap: 18, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -space.base, marginTop: -6 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base }}>
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <Pressable key={r.key} onPress={() => setRange(r.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {!k ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={110} width="47%" radius={radius.lg} />)}</View>
        ) : (
          <>
            <View>
              <SectionHeader title="Performance" icon="stats-chart-outline" accent={t.violet} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <KpiCard label="Occupancy" value={pct(k.occupancy.value)} delta={k.occupancy.delta} icon="pie-chart-outline" accent={t.blue} />
                <KpiCard label="ADR" value={money(k.adr.value)} delta={k.adr.delta} icon="pricetag-outline" accent={t.green} />
                <KpiCard label="RevPAR" value={money(k.revpar.value)} delta={k.revpar.delta} icon="trending-up-outline" accent={t.violet} />
                <KpiCard label="Total revenue" value={short(k.totalRevenue.value)} delta={k.totalRevenue.delta} icon="wallet-outline" accent={t.green} />
                <KpiCard label="Room revenue" value={short(k.roomRevenue.value)} delta={k.roomRevenue.delta} icon="bed-outline" accent={t.blue} />
                <KpiCard label="ALOS" value={`${k.alos.value.toFixed(1)}n`} delta={k.alos.delta} icon="moon-outline" accent={t.amber} />
                <KpiCard label="Rooms sold" value={String(Math.round(k.roomsSold.value))} delta={k.roomsSold.delta} icon="cube-outline" accent={t.teal} />
                <KpiCard label="Cancellations" value={String(Math.round(k.cancellations.value))} delta={k.cancellations.delta} icon="close-circle-outline" accent={t.red} />
              </View>
            </View>

            {rev ? (
              <View>
                <SectionHeader title="Today" icon="today-outline" accent={t.teal} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {[
                    { label: "Arrivals", v: rev.counts.arrivals, c: t.green },
                    { label: "In-house", v: rev.counts.inHouse, c: t.violet },
                    { label: "Departures", v: rev.counts.departures, c: t.amber },
                    { label: "To collect", v: short(rev.payment.totalOutstanding), c: t.teal },
                  ].map((s) => (
                    <View key={s.label} style={{ flex: 1, minWidth: "45%", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 14 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: tint(s.c, "22"), marginBottom: 8 }} />
                      <Text style={[{ fontSize: 20, fontWeight: "800", color: t.text }, tabular]}>{s.v}</Text>
                      <Text style={[typo.caption, { color: t.muted }]}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={[typo.caption, { color: t.faint, textAlign: "center" }]}>Full reports & exports live on the web dashboard.</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
