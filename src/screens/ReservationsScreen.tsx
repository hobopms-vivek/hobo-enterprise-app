import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listBookings, listGroups, type BookingItem, type GroupSummary } from "@/api/bookings";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { bookingBadges } from "@/lib/bookingBadges";
import { Card, EmptyState, Screen, ScreenHeader, SegmentedTabs, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
type ViewMode = "rooms" | "groups";
type Tab = "all" | "confirmed" | "inhouse" | "departed" | "cancelled";
const TAB_STATUS: Record<Tab, string[] | null> = {
  all: null, confirmed: ["CONFIRMED", "PENDING"], inhouse: ["CHECKED_IN"], departed: ["CHECKED_OUT"], cancelled: ["CANCELLED", "NO_SHOW"],
};

export function ReservationsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [items, setItems] = useState<BookingItem[] | null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [view, setView] = useState<ViewMode>("rooms");
  const [tab, setTab] = useState<Tab>("all");
  const [refreshing, setRefreshing] = useState(false);

  const statusColor: Record<string, string> = { CONFIRMED: t.blue, CHECKED_IN: t.violet, CHECKED_OUT: t.muted, CANCELLED: t.red, NO_SHOW: t.amber, PENDING: t.muted, COMPLETED: t.muted };

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    const [bk, gr] = await Promise.all([listBookings(hotelId).catch(() => [] as BookingItem[]), listGroups(hotelId).catch(() => [] as GroupSummary[])]);
    setItems(bk); setGroups(gr);
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "notification") void load(); });

  // Singles = bookings NOT belonging to a group (group rooms live under the Groups tab).
  const singles = useMemo(() => (items ?? []).filter((b) => !b.groupBookingId), [items]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: singles.length, confirmed: 0, inhouse: 0, departed: 0, cancelled: 0 };
    singles.forEach((b) => (Object.keys(TAB_STATUS) as Tab[]).forEach((k) => { const s = TAB_STATUS[k]; if (s && s.includes(b.status)) c[k]++; }));
    return c;
  }, [singles]);
  const rows = useMemo(() => { const s = TAB_STATUS[tab]; return singles.filter((b) => !s || s.includes(b.status)); }, [singles, tab]);

  const loading = items === null || groups === null;

  return (
    <Screen>
      <ScreenHeader title="Reservations" subtitle="View only" onBack={() => nav.goBack()} right={<Pressable onPress={() => nav.navigate("BookingCalendar")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="calendar-outline" size={22} color={t.text} /></Pressable>} />
      <View style={{ padding: space.base, paddingBottom: 8, gap: 10 }}>
        <SegmentedTabs value={view} onChange={setView} tabs={[{ key: "rooms", label: "Rooms", count: singles.length }, { key: "groups", label: "Groups", count: groups?.length ?? 0 }]} />
        {view === "rooms" ? (
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[{ key: "all", label: "All", count: counts.all }, { key: "confirmed", label: "Confirmed", count: counts.confirmed }, { key: "inhouse", label: "In-house", count: counts.inhouse }, { key: "departed", label: "Departed" }, { key: "cancelled", label: "Cancelled" }]}
          />
        ) : null}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: space.base, gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} radius={radius.lg} />)}</View>
      ) : view === "groups" ? (
        <FlatList
          data={groups ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No group bookings" hint="Bulk / group reservations appear here." />}
          renderItem={({ item: g }) => (
            <Card onPress={() => nav.navigate("GroupDetail", { groupId: g.id, code: g.code })}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Text style={[typo.label, { color: t.muted }, tabular]}>{g.code}</Text>
                <View style={{ marginLeft: "auto" }}><StatusBadge label={g.status.replace(/_/g, " ")} color={statusColor[g.status] ?? t.muted} /></View>
              </View>
              <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{g.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{fmt(g.checkInDate)}–{fmt(g.checkOutDate)}</Text>
                {g.lead ? <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>· {g.lead}</Text> : null}
                {g.company ? <View style={{ backgroundColor: tint(t.violet, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: t.violet, fontSize: 10.5, fontWeight: "700" }}>{g.company}</Text></View> : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                <View style={{ backgroundColor: t.surfaceSunken, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", gap: 4 }}>
                  <Ionicons name="bed-outline" size={13} color={t.muted} />
                  <Text style={[{ fontSize: 12, fontWeight: "700", color: t.text }, tabular]}>{g.rooms} rooms</Text>
                </View>
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{g.checkedIn} in · {g.checkedOut} out</Text>
                <Text style={[{ marginLeft: "auto", fontWeight: "700", fontSize: 13, color: g.balance > 0 ? t.red : t.green }, tabular]}>{g.balance > 0 ? `${money(g.balance)} due` : "Paid"}</Text>
              </View>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No reservations" hint="Nothing in this tab." />}
          renderItem={({ item: b }) => {
            const bal = b.folioBalance ?? Math.max(0, b.totalAmount - b.amountPaid);
            const badges = bookingBadges(t, b);
            return (
              <Card onPress={() => nav.navigate("BookingDetail", { booking: b })}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 }}>
                  <Text style={[typo.label, { color: t.muted }, tabular]}>{b.code}</Text>
                  {b.room?.roomNumber ? <View style={{ backgroundColor: tint(t.primary, "18"), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={[{ color: t.primary, fontWeight: "800", fontSize: 10.5 }, tabular]}>#{b.room.roomNumber}</Text></View> : null}
                  <View style={{ marginLeft: "auto" }}><StatusBadge label={b.status.replace(/_/g, " ")} color={statusColor[b.status] ?? t.muted} /></View>
                </View>
                <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{b.guest?.fullName ?? "Guest"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={[typo.caption, { color: t.muted }, tabular]} numberOfLines={1}>{b.roomType?.name ?? "Room"} · {fmt(b.checkInDate)}–{fmt(b.checkOutDate)}{b.nights ? ` · ${b.nights}n` : ""}{b.adults ? ` · ${(b.adults ?? 1) + (b.children ?? 0)}p` : ""}</Text>
                  <Text style={[{ marginLeft: "auto", fontWeight: "700", fontSize: 13, color: bal > 0 ? t.red : t.green }, tabular]}>{bal > 0 ? money(bal) : "Paid"}</Text>
                </View>
                {(badges.length || b.bookingSource?.name) ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {badges.map((bd, i) => <StatusBadge key={i} label={bd.label} color={bd.color} />)}
                    {b.bookingSource?.name ? <View style={{ backgroundColor: tint(t.teal, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: t.teal, fontSize: 10.5, fontWeight: "700" }}>{b.bookingSource.name}</Text></View> : null}
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
