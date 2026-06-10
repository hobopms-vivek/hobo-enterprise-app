import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";

import { useAuthStore } from "@/store/useAuthStore";
import { listMembers, type Member } from "@/api/ops";
import { getPresence, setPresence } from "@/api/presence";
import { colors } from "@/theme";

export function TeamScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const hotels = useAuthStore((s) => s.hotels);
  const roleLevel = hotels.find((h) => h.id === hotelId)?.role?.level ?? 5;
  const isManager = roleLevel <= 3; // SSA/SA/Admin/Manager can activate/deactivate others

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShiftMap] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const ms = await listMembers(hotelId);
      setMembers(ms);
      if (isManager) {
        // Fetch each member's on-shift status (so the toggle reflects reality).
        const entries = await Promise.all(ms.map(async (m) => [m.userId, (await getPresence(hotelId, m.userId).catch(() => ({ onShift: false }))).onShift] as const));
        setShiftMap(Object.fromEntries(entries));
      }
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, isManager]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(m: Member, next: boolean) {
    if (!hotelId || busyId) return;
    setBusyId(m.userId);
    setShiftMap((p) => ({ ...p, [m.userId]: next }));
    try {
      const r = await setPresence(hotelId, next, m.userId);
      if (!next && r.reassigned) Alert.alert("Staff deactivated", `${m.fullName} is now off shift. ${r.reassigned} open task(s) were reassigned to other active staff.`);
    } catch {
      setShiftMap((p) => ({ ...p, [m.userId]: !next })); // revert
      Alert.alert("Failed", "Could not update status.");
    } finally {
      setBusyId(null);
    }
  }

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
          {isManager ? (
            <View style={{ alignItems: "center", width: 56 }}>
              <Switch value={shift[item.userId] ?? false} onValueChange={(v) => toggle(item, v)} disabled={busyId === item.userId} trackColor={{ true: colors.green }} />
              <Text style={styles.shiftLabel}>{(shift[item.userId] ?? false) ? "On shift" : "Off"}</Text>
            </View>
          ) : (
            <View style={[styles.dot, { backgroundColor: item.isActive ? colors.green : colors.muted }]} />
          )}
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
  shiftLabel: { fontSize: 10, color: colors.muted, marginTop: 2, fontWeight: "600" },
});
