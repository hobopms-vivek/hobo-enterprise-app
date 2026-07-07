import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listBanquetEvents, type BanquetEvent } from "@/api/banquet";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { Card, EmptyState, Screen, ScreenHeader, SegmentedTabs, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const dateStr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "");
const timeStr = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const isSameDay = (iso: string, ref: Date) => new Date(iso).toDateString() === ref.toDateString();
type Tab = "today" | "upcoming" | "all";

export function BanquetScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [events, setEvents] = useState<BanquetEvent[] | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [refreshing, setRefreshing] = useState(false);

  const color: Record<string, string> = { CONFIRMED: t.green, CHECKED_IN: t.blue, CHECKED_OUT: t.muted, COMPLETED: t.muted, TENTATIVE: t.amber, ENQUIRY: t.muted, CANCELLED: t.red, LOST: t.red };

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try {
      setErr(null);
      setEvents(await listBanquetEvents(hotelId));
    } catch (e) {
      // Distinguish WHY it's empty: module off vs no permission vs load failure —
      // otherwise a 403 looks identical to "no events" and hides the real cause.
      if (e instanceof ApiError && e.status === 403) {
        setErr(/module/i.test(e.message)
          ? { title: "Banquet module is off", hint: "Ask an admin to enable the Banquet module for this hotel." }
          : { title: "No access to banquet", hint: e.message || "Your role can't view banquet events." });
      } else {
        setErr({ title: "Couldn't load events", hint: e instanceof Error ? e.message : "Check your connection and pull to refresh." });
      }
      setEvents([]);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "notification" || e.type.startsWith("banquet")) void load(); });

  const rows = useMemo(() => {
    const now = new Date();
    const all = events ?? [];
    if (tab === "today") return all.filter((e) => isSameDay(e.eventDate, now));
    if (tab === "upcoming") return all.filter((e) => new Date(e.eventDate).getTime() >= new Date(now.toDateString()).getTime()).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    return all;
  }, [events, tab]);

  return (
    <Screen>
      <ScreenHeader title="Banquet" subtitle="View only" onBack={() => nav.goBack()} />
      <View style={{ padding: space.base, paddingBottom: 10 }}>
        <SegmentedTabs value={tab} onChange={setTab} tabs={[{ key: "today", label: "Today" }, { key: "upcoming", label: "Upcoming" }, { key: "all", label: "All" }]} />
      </View>

      {events === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "sparkles-outline"} title={err?.title ?? "No events"} hint={err?.hint ?? "Nothing in this view."} />}
          renderItem={({ item: e }) => {
            const bal = Math.max(0, (e.total ?? 0) - (e.advancePaid ?? 0));
            return (
              <Card onPress={() => nav.navigate("BanquetDetail", { eventId: e.id, code: e.code })}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={[typo.label, { color: t.muted }, tabular]}>{e.code}</Text>
                  <View style={{ marginLeft: "auto" }}><StatusBadge label={e.status.replace(/_/g, " ")} color={color[e.status] ?? t.muted} /></View>
                </View>
                <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{e.title || e.guest?.fullName || e.eventType || "Event"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <Ionicons name="business-outline" size={14} color={t.muted} />
                  <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>
                    {[e.hall?.name, e.slots?.map((s) => s.name).join(", ")].filter(Boolean).join(" · ") || "Hall TBD"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={14} color={t.muted} />
                  <Text style={[typo.caption, { color: t.muted }, tabular]}>{dateStr(e.eventDate)}{e.startTime ? ` · ${timeStr(e.startTime)}${e.endTime ? `–${timeStr(e.endTime)}` : ""}` : ""}</Text>
                  {e.guaranteedPax ? <Text style={[typo.caption, { color: t.muted }, tabular]}>· {e.guaranteedPax} pax</Text> : null}
                  {bal > 0 ? (
                    <View style={{ marginLeft: "auto", backgroundColor: tint(t.amber, "22"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={[{ color: t.amber, fontSize: 11, fontWeight: "700" }, tabular]}>{money(bal)} due</Text>
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
