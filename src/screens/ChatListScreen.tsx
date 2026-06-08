import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/store/useAuthStore";
import { listThreads, type ChatThread } from "@/api/chat";
import { useNavigation } from "@react-navigation/native";
import type { AppNav } from "@/navigation/types";
import { colors } from "@/theme";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function initial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

export function ChatListScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const [items, setItems] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setItems(await listThreads(hotelId));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hotelId) return <Center text="No hotel selected." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.userId}
          contentContainerStyle={{ paddingVertical: 6 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No conversations yet." />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("ChatRoom", { userId: item.userId, name: item.fullName })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial(item.fullName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  <Text style={styles.time}>{relativeTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                    {item.lastMessage ?? "No messages yet"}
                  </Text>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Center({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <View style={styles.center}>
      {spinner ? <ActivityIndicator color={colors.blue} /> : null}
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 3 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  time: { color: colors.muted, fontSize: 11 },
  preview: { flex: 1, color: colors.muted, fontSize: 13 },
  previewUnread: { color: colors.text, fontWeight: "600" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
