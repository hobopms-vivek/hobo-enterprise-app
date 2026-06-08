import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { listRoomBlocks, type RoomBlock } from "@/api/ops";
import { colors } from "@/theme";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateRange(start?: string | null, end?: string | null): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} → ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return null;
}

export function BlockedRoomsScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [items, setItems] = useState<RoomBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setItems(await listRoomBlocks(hotelId));
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
        <Text style={styles.headerTitle}>Blocked Rooms</Text>
      </View>
      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No blocked rooms." />}
          renderItem={({ item }) => {
            const range = dateRange(item.startDate, item.endDate);
            return (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.roomTag}>
                    <Ionicons name="bed-outline" size={16} color={colors.navy} />
                    <Text style={styles.roomNumber}>{item.room?.roomNumber ?? "—"}</Text>
                  </View>
                  {item.blockType ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.blockType}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.reason}>{item.reason ?? "No reason provided"}</Text>
                {range ? <Text style={styles.meta}>{range}</Text> : null}
              </View>
            );
          }}
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
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  roomNumber: { color: colors.text, fontSize: 16, fontWeight: "700" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.amber + "22" },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.amber, textTransform: "capitalize" },
  reason: { color: colors.text, fontSize: 14, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
