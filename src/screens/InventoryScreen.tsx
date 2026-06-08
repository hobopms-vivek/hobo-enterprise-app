import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { listInventoryItems, type InventoryItem } from "@/api/ops";
import { colors } from "@/theme";

export function InventoryScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setItems(await listInventoryItems(hotelId));
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
        <Text style={styles.headerTitle}>Inventory</Text>
      </View>
      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No inventory items." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.nameTag}>
                  <Ionicons name="cube-outline" size={16} color={colors.navy} />
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                {item.category ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.category}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.metaRow}>
                {item.unit ? <Text style={styles.meta}>Unit: {item.unit}</Text> : null}
                {item.reorderLevel != null ? (
                  <Text style={styles.meta}>· Reorder at: {item.reorderLevel}</Text>
                ) : null}
              </View>
            </View>
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
  nameTag: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.blue + "22" },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.blue, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4, flexWrap: "wrap" },
  meta: { color: colors.muted, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
