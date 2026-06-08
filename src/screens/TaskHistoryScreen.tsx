import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/store/useAuthStore";
import { listTickets, type Ticket } from "@/api/tickets";
import { useNavigation } from "@react-navigation/native";
import { type AppNav } from "@/navigation/types";
import { colors, statusColor } from "@/theme";

const DONE_STATUSES = ["RESOLVED", "CLOSED"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskHistoryScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setItems(await listTickets(hotelId));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const history = useMemo(() => {
    return items
      .filter((t) => DONE_STATUSES.includes(t.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  if (!hotelId) return <Center text="No hotel selected." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>
      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No completed work yet." />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.code}>{item.code}</Text>
                <View style={[styles.badge, { backgroundColor: (statusColor[item.status] ?? colors.muted) + "22" }]}>
                  <Text style={[styles.badgeText, { color: statusColor[item.status] ?? colors.muted }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.subject}>{item.subject}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{item.category}</Text>
                <Text style={styles.meta}>· {formatDate(item.createdAt)}</Text>
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
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  subject: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4, flexWrap: "wrap" },
  meta: { color: colors.muted, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
