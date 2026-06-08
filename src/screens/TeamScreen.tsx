import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/store/useAuthStore";
import { listMembers, type Member } from "@/api/ops";
import { colors } from "@/theme";

export function TeamScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setMembers(await listMembers(hotelId));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && members.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={members}
      keyExtractor={(m) => m.userId}
      contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
      ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>No team members.</Text></View>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.fullName || item.email || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.fullName || item.email}</Text>
            <Text style={styles.meta}>
              {item.role?.name ?? "—"}
              {item.department?.name ? ` · ${item.department.name}` : ""}
            </Text>
          </View>
          <View style={[styles.dot, { backgroundColor: item.isActive ? colors.green : colors.muted }]} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { padding: 40, alignItems: "center" },
  muted: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
