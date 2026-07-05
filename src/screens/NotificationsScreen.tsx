import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listNotifications, markNotification, type AppNotification } from "@/api/notifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { EmptyState, IconChip, Screen, ScreenHeader, Skeleton } from "@/components/kit";
import { notifAccent, radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Cat = "ticket" | "escalation" | "housekeeping" | "booking" | "banquet" | "approval" | "payment" | "chat" | "lead" | "review" | "system";
const ICON: Record<Cat, keyof typeof Ionicons.glyphMap> = {
  ticket: "clipboard-outline", escalation: "alert-circle", housekeeping: "bed-outline", booking: "calendar-outline",
  banquet: "sparkles-outline", approval: "shield-checkmark-outline", payment: "cash-outline", chat: "chatbubble-ellipses-outline",
  lead: "person-add-outline", review: "star-outline", system: "notifications-outline",
};
function catOf(type: string): Cat {
  if (type.includes("escalat")) return "escalation";
  if (type.startsWith("ticket") || type.startsWith("fnb_order")) return "ticket";
  if (type.startsWith("housekeeping")) return "housekeeping";
  if (type.includes("deletion_request") || type.includes("cancellation_request") || type.includes("approval")) return "approval";
  if (type.startsWith("banquet")) return "banquet";
  if (type.startsWith("booking") || type.startsWith("dayuse") || type.startsWith("ota")) return "booking";
  if (type.startsWith("payment") || type.startsWith("invoice")) return "payment";
  if (type.includes("message")) return "chat";
  if (type.startsWith("lead")) return "lead";
  if (type.includes("review") || type.includes("feedback")) return "review";
  return "system";
}
const FILTERS: { key: string; label: string; cats: Cat[] }[] = [
  { key: "all", label: "All", cats: [] },
  { key: "tickets", label: "Tickets", cats: ["ticket", "escalation"] },
  { key: "rooms", label: "Rooms", cats: ["housekeeping"] },
  { key: "bookings", label: "Bookings", cats: ["booking", "banquet", "approval"] },
  { key: "payments", label: "Payments", cats: ["payment"] },
  { key: "messages", label: "Messages", cats: ["chat"] },
];
const rel = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function NotificationsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [filter, setFilter] = useState("all");

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setItems((await listNotifications(hotelId)).items ?? []); } catch { setItems([]); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "notification") void load(); });

  async function markAll() {
    setItems((xs) => xs?.map((x) => ({ ...x, isRead: true })) ?? xs);
    try { await markNotification(hotelId, { all: true }); } catch { void load(); }
  }

  function open(n: AppNotification) {
    if (!n.isRead) { setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? xs); markNotification(hotelId, { id: n.id }).catch(() => {}); }
    const cat = catOf(n.type);
    if ((n.refType === "service_ticket" || cat === "ticket" || cat === "escalation") && n.refId) nav.navigate("TicketDetail", { ticketId: n.refId });
    else if (cat === "approval") nav.navigate("Approvals");
    else if (cat === "housekeeping") nav.navigate("Housekeeping");
    else if (cat === "booking" && n.refId) nav.navigate("BookingDetail", { bookingId: n.refId });
    else if (cat === "booking" || cat === "payment") nav.navigate("FrontDesk");
    else if (cat === "banquet") nav.navigate("Banquet");
  }

  const sections = useMemo(() => {
    const cats = FILTERS.find((f) => f.key === filter)?.cats ?? [];
    const rows = (items ?? []).filter((n) => cats.length === 0 || cats.includes(catOf(n.type)));
    const today = rows.filter((n) => isToday(n.createdAt));
    const earlier = rows.filter((n) => !isToday(n.createdAt));
    return [
      ...(today.length ? [{ title: "Today", data: today }] : []),
      ...(earlier.length ? [{ title: "Earlier", data: earlier }] : []),
    ];
  }, [items, filter]);

  const anyUnread = (items ?? []).some((n) => !n.isRead);

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        onBack={() => nav.goBack()}
        right={anyUnread ? <Pressable onPress={markAll} hitSlop={8} style={{ padding: 6 }}><Text style={{ color: t.primary, fontWeight: "700", fontSize: 13 }}>Mark all read</Text></Pressable> : undefined}
      />
      <View style={{ paddingVertical: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.base }}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {items === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={68} radius={radius.md} />)}</View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<EmptyState icon="checkmark-done-circle-outline" title="You're all caught up 🎉" hint="New alerts about tasks, rooms and bookings show up here." />}
          renderSectionHeader={({ section }) => <Text style={[typo.overline, { color: t.muted, marginTop: 16, marginBottom: 6 }]}>{section.title}</Text>}
          renderItem={({ item: n }) => {
            const cat = catOf(n.type);
            const accent = notifAccent[cat] ?? t.muted;
            return (
              <Pressable onPress={() => open(n)} style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: radius.md, marginBottom: 8, backgroundColor: n.isRead ? "transparent" : tint(t.primary, "0F"), borderLeftWidth: n.isRead ? 0 : 3, borderLeftColor: t.primary }}>
                <IconChip icon={ICON[cat]} color={accent} size={38} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={1}>{n.title}</Text>
                    <Text style={[typo.caption, { color: t.faint }]}>{rel(n.createdAt)}</Text>
                    {!n.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary }} /> : null}
                  </View>
                  {n.body ? <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]} numberOfLines={2}>{n.body}</Text> : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
