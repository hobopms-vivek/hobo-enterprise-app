import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getFrontDeskOverview, type FrontDeskOverview, type OpsRow } from "@/api/frontdesk";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { Button, EmptyState, ListRow, Screen, ScreenHeader, Sheet, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const DAY = 86400000;
const nightsOf = (r: OpsRow) => (r.checkInDate && r.checkOutDate ? Math.max(1, Math.round((+new Date(r.checkOutDate) - +new Date(r.checkInDate)) / DAY)) : 0);
const timeLabel = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const dateLabel = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");
type Tab = "arrivals" | "inHouse" | "departures" | "upcoming" | "dayUse" | "balances";
/** Web front-desk sub-line per section: arrivals=ETA, departures=out-by, in-house=until, upcoming=date. */
function subFor(tab: Tab, g: OpsRow): string {
  const rt = g.roomType ?? g.roomTypeName ?? "Room";
  if (tab === "arrivals") return g.checkInDate ? `${rt} · ETA ${timeLabel(g.checkInDate)}` : `${rt} · ${g.code}`;
  if (tab === "departures") return g.checkOutDate ? `${rt} · Out by ${timeLabel(g.checkOutDate)}` : `${rt} · ${g.code}`;
  if (tab === "inHouse") return g.checkOutDate ? `${rt} · Until ${dateLabel(g.checkOutDate)}` : `${rt} · ${g.code}`;
  if (tab === "upcoming") return g.checkInDate ? `${rt} · ${dateLabel(g.checkInDate)}${nightsOf(g) ? ` · ${nightsOf(g)}n` : ""}` : `${rt} · ${g.code}`;
  return [rt, nightsOf(g) ? `${nightsOf(g)}n` : null, g.code].filter(Boolean).join(" · ");
}

export function FrontDeskScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId);

  const [fd, setFd] = useState<FrontDeskOverview | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [tab, setTab] = useState<Tab>("arrivals");
  const [refreshing, setRefreshing] = useState(false);
  const [peek, setPeek] = useState<OpsRow | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    if (!hotelId) return;
    try { setErr(null); setFd(await getFrontDeskOverview(hotelId)); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view the front desk." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setFd(null);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type.startsWith("ticket.") || e.type === "notification") void load(); });

  // Folio-accurate, uncapped lists (same source the web front desk uses).
  const lists = useMemo(() => {
    if (!fd) return null;
    const dayUse: OpsRow[] = [...fd.dayUsePending, ...fd.dayUseActive.map((d): OpsRow => ({ id: d.id, code: d.code, guest: d.guest ?? "Guest", room: d.room, roomType: d.minutesLeft != null ? `${d.minutesLeft}m left` : "in-house", balance: 0 }))];
    const balances = fd.inHouse.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
    return { arrivals: fd.arrivalsToday, inHouse: fd.inHouse, departures: fd.departures, upcoming: fd.upcoming, dayUse, balances };
  }, [fd]);

  const allTabs: { key: Tab; label: string; count: number }[] = [
    { key: "arrivals", label: "Arrivals", count: fd?.counts.arrivalsToday ?? 0 },
    { key: "inHouse", label: "In-house", count: fd?.counts.inHouse ?? 0 },
    { key: "departures", label: "Departures", count: fd?.counts.departures ?? 0 },
    { key: "upcoming", label: "Upcoming", count: fd?.counts.upcoming ?? 0 },
    { key: "dayUse", label: "Day-use", count: (fd?.dayUsePending.length ?? 0) + (fd?.dayUseActive.length ?? 0) },
    { key: "balances", label: "Balance", count: lists?.balances.length ?? 0 },
  ];

  const rows = lists ? lists[tab] : [];

  return (
    <Screen>
      <ScreenHeader title="Front Desk" subtitle="View only" onBack={() => nav.goBack()} />

      {/* Summary strip */}
      <View style={{ flexDirection: "row", gap: 10, padding: space.base }}>
        <Summary label="In-house" value={fd?.counts.inHouse ?? 0} color={t.violet} />
        <Summary label="Arrivals" value={fd?.counts.arrivalsToday ?? 0} color={t.green} />
        <Summary label="Departures" value={fd?.counts.departures ?? 0} color={t.amber} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base, paddingBottom: 10, alignItems: "center" }}>
        {allTabs.map((x) => {
          const active = tab === x.key;
          return (
            <Pressable key={x.key} onPress={() => setTab(x.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{x.label} {x.count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {fd === null ? (
        err ? <EmptyState icon="lock-closed-outline" title={err.title} hint={err.hint} /> : <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={62} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(g) => g.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Nothing here" hint="No guests in this list." height={240} />}
          renderItem={({ item: g }) => {
            const due = g.balance > 0;
            const showMoney = tab === "balances" || tab === "departures" || tab === "inHouse";
            return (
              <ListRow
                onPress={() => setPeek(g)}
                chevron
                leading={
                  <View style={{ minWidth: 46, height: 30, borderRadius: 8, backgroundColor: tint(g.room ? t.primary : t.muted, "18"), alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={[{ color: g.room ? t.primary : t.muted, fontWeight: "800", fontSize: 12 }, tabular]}>{g.room ?? "—"}</Text>
                  </View>
                }
                title={g.guest}
                subtitle={subFor(tab, g)}
                right={
                  showMoney
                    ? <Text style={[{ color: due ? t.red : t.green, fontWeight: "700", fontSize: 13 }, tabular]}>{due ? `${money(g.balance)} due` : "Paid"}</Text>
                    : g.paymentStatus ? <StatusBadge label={g.paymentStatus} color={g.paymentStatus === "PAID" ? t.green : g.paymentStatus === "PARTIAL" ? t.amber : t.muted} /> : null
                }
              />
            );
          }}
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
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{[peek.roomType ?? peek.roomTypeName, nightsOf(peek) ? `${nightsOf(peek)}n` : null, peek.code].filter(Boolean).join(" · ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[{ color: peek.balance > 0 ? t.red : t.green, fontWeight: "800", fontSize: 15 }, tabular]}>{peek.balance > 0 ? money(peek.balance) : "Paid"}</Text>
                {peek.balance > 0 ? <Text style={[typo.caption, { color: t.muted }]}>Balance due</Text> : null}
              </View>
            </View>
            <Button title="Open full booking" icon="open-outline" variant="outline" onPress={() => { const id = peek.id; setPeek(null); nav.navigate("BookingDetail", { bookingId: id }); }} />
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
      <Text style={[{ fontSize: 18, fontWeight: "800", color }, tabular]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={[typo.caption, { color: t.muted }]}>{label}</Text>
    </View>
  );
}
