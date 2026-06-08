import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { listNotifications, markNotification, type AppNotification } from "@/api/notifications";
import { useNavigation } from "@react-navigation/native";
import type { AppNav } from "@/navigation/types";
import { colors } from "@/theme";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AlertsScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const r = await listNotifications(hotelId);
      setItems(r.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    if (!hotelId || marking) return;
    setMarking(true);
    try {
      await markNotification(hotelId, { all: true });
      await load();
    } catch {
      /* ignore */
    } finally {
      setMarking(false);
    }
  }

  async function onPressItem(n: AppNotification) {
    if (!hotelId) return;
    if (!n.isRead) {
      try {
        await markNotification(hotelId, { id: n.id });
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        /* ignore */
      }
    }
    if (n.refType === "service_ticket" && n.refId) {
      navigation.navigate("TicketDetail", { ticketId: n.refId });
    }
  }

  const unreadCount = items.filter((x) => !x.isRead).length;

  if (!hotelId) return <Center text="No hotel selected." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Pressable onPress={markAll} disabled={marking || unreadCount === 0} style={styles.markAllBtn}>
          <Ionicons name="checkmark-done" size={16} color={unreadCount === 0 ? colors.muted : "#fff"} />
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all read</Text>
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No notifications yet." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => void onPressItem(item)} style={[styles.card, !item.isRead && styles.cardUnread]}>
              <View style={styles.iconWrap}>
                <Ionicons name="notifications" size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.isRead ? <View style={styles.dot} /> : null}
                </View>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.blue, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  markAllText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  markAllTextDisabled: { color: colors.muted },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: { borderColor: colors.blue, backgroundColor: "#F5F9FF" },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blue + "1A", alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  body: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  time: { color: colors.muted, fontSize: 11, marginTop: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
