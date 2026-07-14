import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listBanquetEvents, type BanquetEvent } from "@/api/banquet";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { Card, EmptyState, Screen, ScreenHeader, SearchBar, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const dateStr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "");
const timeStr = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const PAGE = 20;

// Status chips mirror the web banquet list (`?status=` / `?deleted=1`).
const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "ENQUIRY", label: "Enquiry" },
  { key: "TENTATIVE", label: "Tentative" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CHECKED_IN", label: "Checked-in" },
  { key: "CHECKED_OUT", label: "Checked-out" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "LOST", label: "Lost" },
  { key: "DELETED", label: "🗑 Deleted" },
];

export function BanquetScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [events, setEvents] = useState<BanquetEvent[] | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [count, setCount] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);

  const color: Record<string, string> = { CONFIRMED: t.green, CHECKED_IN: t.blue, CHECKED_OUT: t.muted, COMPLETED: t.muted, TENTATIVE: t.amber, ENQUIRY: t.muted, CANCELLED: t.red, LOST: t.red };

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => { const id = setTimeout(() => setQApplied(q.trim().toLowerCase()), 300); return () => clearTimeout(id); }, [q]);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const opts = status === "DELETED" ? { deleted: true } : status ? { status } : {};
      setEvents(await listBanquetEvents(hotelId, opts));
    } catch (e) {
      // Distinguish WHY it's empty: module off vs no permission vs load failure.
      if (e instanceof ApiError && e.status === 403) {
        setErr(/module/i.test(e.message)
          ? { title: "Banquet module is off", hint: "Ask an admin to enable the Banquet module for this hotel." }
          : { title: "No access to banquet", hint: e.message || "Your role can't view banquet events." });
      } else {
        setErr({ title: "Couldn't load events", hint: e instanceof Error ? e.message : "Check your connection and pull to refresh." });
      }
      setEvents([]);
    }
  }, [hotelId, status]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "notification" || e.type.startsWith("banquet")) void load(); });

  // Reset the visible window when the filter or search changes.
  useEffect(() => { setCount(PAGE); }, [status, qApplied]);

  const filtered = useMemo(() => {
    const all = events ?? [];
    if (!qApplied) return all;
    return all.filter((e) => [e.title, e.code, e.guest?.fullName, e.company?.name, e.hall?.name, e.eventType].some((s) => s && String(s).toLowerCase().includes(qApplied)));
  }, [events, qApplied]);
  const visible = filtered.slice(0, count);

  return (
    <Screen>
      <ScreenHeader title="Banquet" subtitle="View only" onBack={() => nav.goBack()} />

      <View style={{ paddingTop: space.base, gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base }}>
          {STATUS_FILTERS.map((s) => {
            const active = status === s.key;
            return (
              <Pressable key={s.key || "all"} onPress={() => setStatus(s.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: space.base }}><SearchBar value={q} onChangeText={setQ} placeholder="Search title, code, host, company…" /></View>
        {events !== null ? <Text style={[typo.caption, { color: t.muted, paddingHorizontal: space.base }]}>{filtered.length} event{filtered.length === 1 ? "" : "s"}{qApplied ? ` · “${qApplied}”` : ""}</Text> : null}
      </View>

      {events === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 12, paddingTop: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(e) => e.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.base, paddingTop: 8, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          onEndReached={() => { if (count < filtered.length) setCount((c) => c + PAGE); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={filtered.length > 0 && count >= filtered.length ? <Text style={[typo.caption, { color: t.faint, textAlign: "center", paddingVertical: 14 }]}>All {filtered.length} shown</Text> : null}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "sparkles-outline"} title={err?.title ?? "No events"} hint={err?.hint ?? "Nothing matches this filter."} />}
          renderItem={({ item: e }) => {
            const bal = Math.max(0, (e.total ?? 0) - (e.advancePaid ?? 0));
            return (
              <Card onPress={() => nav.navigate("BanquetDetail", { eventId: e.id, code: e.code })}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Text style={[typo.label, { color: t.muted, flexShrink: 1 }, tabular]} numberOfLines={1}>{e.code}</Text>
                  <View style={{ marginLeft: "auto", flexShrink: 0 }}><StatusBadge label={e.status.replace(/_/g, " ")} color={color[e.status] ?? t.muted} /></View>
                </View>
                <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{e.title || e.guest?.fullName || e.eventType || "Event"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <Ionicons name="business-outline" size={14} color={t.muted} />
                  <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>
                    {[e.hall?.name, e.slots?.map((s) => s.name).join(", ")].filter(Boolean).join(" · ") || "Hall TBD"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={14} color={t.muted} style={{ flexShrink: 0 }} />
                  {/* The date is the only elastic part: it truncates so the pax count and the
                      "due" pill keep their full width instead of being pushed off the card. */}
                  <Text style={[typo.caption, { color: t.muted, flexShrink: 1 }, tabular]} numberOfLines={1}>{dateStr(e.eventDate)}{e.startTime ? ` · ${timeStr(e.startTime)}${e.endTime ? `–${timeStr(e.endTime)}` : ""}` : ""}</Text>
                  {e.guaranteedPax ? <Text style={[typo.caption, { color: t.muted, flexShrink: 0 }, tabular]} numberOfLines={1}>· {e.guaranteedPax} pax</Text> : null}
                  {bal > 0 ? (
                    <View style={{ marginLeft: "auto", flexShrink: 0, backgroundColor: tint(t.amber, "22"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={[{ color: t.amber, fontSize: 11, fontWeight: "700" }, tabular]} numberOfLines={1}>{money(bal)} due</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
