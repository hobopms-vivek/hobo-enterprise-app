import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  listBookingsTable, listGroups, getBookingTabCounts, getBookingFacets,
  type BookingItem, type GroupSummary, type BookingSort, type BookingTabCounts, type Facet,
} from "@/api/bookings";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { bookingBadges } from "@/lib/bookingBadges";
import { ReservationFilterSheet, buildResFilters, activeFilterCount, EMPTY_FILTERS, DEFAULT_SORT, type ResFilters } from "@/components/ReservationFilterSheet";
import { Card, EmptyState, Screen, ScreenHeader, SearchBar, SegmentedTabs, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
type ViewMode = "rooms" | "groups";
const PAGE_SIZE = 25;

// Status chips → the web `preset` keys (single-status). Counts from /bookings/tab-counts.
const PRESETS: { key: string; label: string; countKey: keyof BookingTabCounts }[] = [
  { key: "all", label: "All", countKey: "all" },
  { key: "confirmed", label: "Confirmed", countKey: "confirmed" },
  { key: "checked_in", label: "In-house", countKey: "checkedIn" },
  { key: "checked_out", label: "Departed", countKey: "checkedOut" },
  { key: "cancelled", label: "Cancelled", countKey: "cancelled" },
  { key: "no_show", label: "No-show", countKey: "noShow" },
];

export function ReservationsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [view, setView] = useState<ViewMode>("rooms");
  const [preset, setPreset] = useState("all");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [sort, setSort] = useState<BookingSort>(DEFAULT_SORT);
  const [filters, setFilters] = useState<ResFilters>(EMPTY_FILTERS);

  const [rows, setRows] = useState<BookingItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [counts, setCounts] = useState<BookingTabCounts | null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sourceOpts, setSourceOpts] = useState<Facet[]>([]);

  const statusColor: Record<string, string> = { CONFIRMED: t.blue, CHECKED_IN: t.violet, CHECKED_OUT: t.muted, CANCELLED: t.red, NO_SHOW: t.amber, PENDING: t.muted, COMPLETED: t.muted };

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  // Debounce the search box → whole-dataset server search.
  useEffect(() => { const id = setTimeout(() => setQApplied(q.trim()), 350); return () => clearTimeout(id); }, [q]);

  const fetchPage = useCallback(async (nextPage: number, replace: boolean) => {
    const res = await listBookingsTable(hotelId, {
      preset, q: qApplied, sort: [sort], filters: buildResFilters(filters), page: nextPage, pageSize: PAGE_SIZE,
    }).catch(() => null);
    if (!res) { if (replace) { setRows([]); setTotal(0); } return; }
    setTotal(res.total); setPage(res.page);
    setRows((prev) => (replace || !prev ? res.rows : [...prev, ...res.rows]));
  }, [hotelId, preset, qApplied, sort, filters]);

  // Any query-input change → reset to page 1.
  useEffect(() => { if (view === "rooms") { setRows(null); void fetchPage(1, true); } }, [fetchPage, view]);

  const loadAux = useCallback(async () => {
    getBookingTabCounts(hotelId).then(setCounts).catch(() => {});
    listGroups(hotelId).then(setGroups).catch(() => setGroups([]));
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void loadAux(); }, [loadAux]));
  useRealtime(hotelId, (e) => { if (e.type === "notification") { void loadAux(); if (view === "rooms") { setRows(null); void fetchPage(1, true); } } });

  // Cascading source options — fetched when the filter sheet opens (respects current preset + filters).
  useEffect(() => {
    if (!filterOpen) return;
    getBookingFacets(hotelId, ["source"], preset, buildResFilters(filters)).then((f) => setSourceOpts(f.source ?? [])).catch(() => setSourceOpts([]));
  }, [filterOpen, hotelId, preset, filters]);

  const onEndReached = () => {
    if (loadingMore || !rows || rows.length >= total) return;
    setLoadingMore(true);
    fetchPage(page + 1, false).finally(() => setLoadingMore(false));
  };
  const refresh = async () => { setRefreshing(true); await Promise.all([fetchPage(1, true), loadAux()]); setRefreshing(false); };

  const nActive = activeFilterCount(filters);

  // Fixed controls (do NOT put the SearchBar in ListHeaderComponent — the list re-renders
  // on every keystroke and the input would lose focus / scroll away).
  const controls = (
    <View style={{ paddingBottom: 6, gap: 10 }}>
      {/* Status chips — horizontally scrollable so labels never truncate/clip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base }}>
        {PRESETS.map((p) => {
          const active = preset === p.key;
          const c = counts?.[p.countKey];
          return (
            <Pressable key={p.key} onPress={() => setPreset(p.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{p.label}{c != null ? ` ${c}` : ""}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Search + filter */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.base }}>
        <View style={{ flex: 1 }}><SearchBar value={q} onChangeText={setQ} placeholder="Search guest, room, code, phone…" /></View>
        <Pressable onPress={() => setFilterOpen(true)} style={{ width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: nActive ? t.primary : t.border, backgroundColor: nActive ? tint(t.primary, "14") : t.surface, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="options-outline" size={20} color={nActive ? t.primary : t.muted} />
          {nActive ? <View style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{nActive}</Text></View> : null}
        </Pressable>
      </View>
      <Text style={[typo.caption, { color: t.muted, paddingHorizontal: space.base }]}>{total} reservation{total === 1 ? "" : "s"}{qApplied ? ` · “${qApplied}”` : ""}</Text>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Reservations" subtitle="View only" onBack={() => nav.goBack()} right={<Pressable onPress={() => nav.navigate("BookingCalendar")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="calendar-outline" size={22} color={t.text} /></Pressable>} />

      <View style={{ paddingHorizontal: space.base, paddingTop: space.base, paddingBottom: 8 }}>
        <SegmentedTabs value={view} onChange={setView} tabs={[{ key: "rooms", label: "Rooms", count: counts?.all }, { key: "groups", label: "Groups", count: groups?.length ?? counts?.groups }]} />
      </View>

      {view === "groups" ? (
        groups === null ? (
          <View style={{ paddingHorizontal: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={radius.lg} />)}</View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.primary} />}
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
        )
      ) : (
        <View style={{ flex: 1 }}>
          {controls}
          {rows === null ? (
            <View style={{ paddingHorizontal: space.base, gap: 12, paddingTop: 4 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} radius={radius.lg} />)}</View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(b) => b.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 4, gap: 12, flexGrow: 1 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No reservations" hint="Nothing matches your filters." />}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: 18 }}><ActivityIndicator color={t.primary} /></View> : (rows && rows.length > 0 && rows.length >= total ? <Text style={[typo.caption, { color: t.faint, textAlign: "center", paddingVertical: 16 }]}>All {total} shown</Text> : null)}
          renderItem={({ item: b }) => {
            const bal = b.folioBalance ?? Math.max(0, b.totalAmount - b.amountPaid);
            const badges = bookingBadges(t, b);
            return (
              <View style={{ paddingHorizontal: space.base }}>
                <Card onPress={() => nav.navigate("BookingDetail", { booking: b, bookingId: b.id })}>
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
              </View>
            );
          }}
            />
          )}
        </View>
      )}

      <ReservationFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        filters={filters}
        sourceOptions={sourceOpts}
        onApply={(s, f) => { setSort(s); setFilters(f); }}
      />
    </Screen>
  );
}
