import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listThreads, type ChatThread } from "@/api/chat";
import { listConversations, type Conversation } from "@/api/inbox";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { HeaderIcons } from "@/components/AppHeader";
import { Avatar, EmptyState, Screen, ScreenHeader, SegmentedTabs, Skeleton } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

function relative(ts: string | null | undefined): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export function InboxScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const [tab, setTab] = useState<"team" | "guests">("team");
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sourceColor = (s: string) => (s === "whatsapp" ? t.green : s === "direct" ? t.teal : t.blue);

  const load = useCallback(async () => {
    if (!activeHotelId) return;
    try { setThreads(await listThreads(activeHotelId)); } catch { setThreads([]); }
    try { setConvos(await listConversations(activeHotelId)); } catch { setConvos([]); }
  }, [activeHotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(activeHotelId, (e) => { if (e.type === "chat.message" || e.type === "notification") void load(); });

  return (
    <Screen>
      <ScreenHeader title="Inbox" right={<HeaderIcons />} />
      <View style={{ paddingHorizontal: space.base, paddingVertical: 12 }}>
        <SegmentedTabs value={tab} onChange={setTab} tabs={[{ key: "team", label: "Team" }, { key: "guests", label: "Guests" }]} />
      </View>

      {tab === "team" ? (
        threads === null ? (
          <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={60} radius={radius.md} />)}</View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(x) => x.userId}
            contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title="No conversations yet" height={280} />}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => nav.navigate("ChatRoom", { userId: item.userId, name: item.fullName })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Avatar name={item.fullName} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={[typo.caption, { color: t.faint }]}>{relative(item.lastMessageAt)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <Text style={[typo.caption, { color: item.unread > 0 ? t.text : t.muted, fontWeight: item.unread > 0 ? "700" : "400", flex: 1 }]} numberOfLines={1}>{item.lastMessage ?? "Start a conversation"}</Text>
                    {item.unread > 0 ? <Badge n={item.unread} color={t.primary} /> : null}
                  </View>
                </View>
              </Pressable>
            )}
          />
        )
      ) : (
        convos === null ? (
          <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={60} radius={radius.md} />)}</View>
        ) : (
          <FlatList
            data={convos}
            keyExtractor={(c) => c.wa}
            contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
            ListEmptyComponent={<EmptyState icon="logo-whatsapp" title="No guest messages" hint="WhatsApp & OTA conversations appear here." height={280} />}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
            renderItem={({ item: c }) => (
              <Pressable onPress={() => nav.navigate("GuestConversation", { wa: c.wa, name: c.name })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Avatar name={c.name} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={1}>{c.name}</Text>
                    {c.vip ? <Ionicons name="star" size={12} color={t.gold} /> : null}
                    <Text style={[typo.caption, { color: t.faint }]}>{relative(c.time)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, gap: 6 }}>
                    <View style={{ backgroundColor: tint(sourceColor(c.source), "22"), borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: sourceColor(c.source), fontSize: 10, fontWeight: "700" }}>{c.sourceLabel ?? c.source}</Text>
                    </View>
                    <Text style={[typo.caption, { color: c.unread > 0 ? t.text : t.muted, fontWeight: c.unread > 0 ? "700" : "400", flex: 1 }]} numberOfLines={1}>{c.preview ?? "—"}</Text>
                    {c.unread > 0 ? <Badge n={c.unread} color={t.green} /> : null}
                  </View>
                </View>
              </Pressable>
            )}
          />
        )
      )}
    </Screen>
  );
}

function Badge({ n, color }: { n: number; color: string }) {
  return (
    <View style={{ backgroundColor: color, borderRadius: radius.pill, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{n > 99 ? "99+" : n}</Text>
    </View>
  );
}
