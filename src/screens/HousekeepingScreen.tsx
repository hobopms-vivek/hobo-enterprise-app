import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { getHousekeeping, setRoomHkStatus, type HkRoom } from "@/api/housekeeping";
import { Pill, EmptyState, Loader } from "@/components/ui";
import { colors, radius, shadow, tint } from "@/theme";

const HK_COLOR: Record<string, string> = { CLEAN: colors.green, DIRTY: colors.amber, INSPECTED: colors.blue, OUT_OF_SERVICE: colors.red };
const OCC_COLOR: Record<string, string> = { OCCUPIED: colors.violet, AVAILABLE: colors.green, RESERVED: colors.blue, MAINTENANCE: colors.amber, OUT_OF_ORDER: colors.red, BLOCKED: colors.muted };
const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" }, { key: "DIRTY", label: "Dirty" }, { key: "CLEAN", label: "Clean" }, { key: "INSPECTED", label: "Inspected" }, { key: "OUT_OF_SERVICE", label: "Out of service" },
];
// Next status when tapping the action button (clean → inspected → dirty cycle).
const NEXT: Record<string, string> = { DIRTY: "CLEAN", CLEAN: "INSPECTED", INSPECTED: "DIRTY", OUT_OF_SERVICE: "DIRTY" };
const nice = (s: string) => s.replace(/_/g, " ").toLowerCase();

export function HousekeepingScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [rooms, setRooms] = useState<HkRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try { setRooms((await getHousekeeping(hotelId)).rooms ?? []); } catch { setRooms([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rooms.length, CLEAN: 0, DIRTY: 0, INSPECTED: 0, OUT_OF_SERVICE: 0 };
    for (const r of rooms) c[r.housekeepingStatus] = (c[r.housekeepingStatus] ?? 0) + 1;
    return c;
  }, [rooms]);

  const shown = filter === "ALL" ? rooms : rooms.filter((r) => r.housekeepingStatus === filter);

  async function cycle(room: HkRoom) {
    if (!hotelId || busyId) return;
    const next = NEXT[room.housekeepingStatus] ?? "CLEAN";
    setBusyId(room.id);
    setRooms((rs) => rs.map((r) => (r.id === room.id ? { ...r, housekeepingStatus: next } : r)));
    try {
      await setRoomHkStatus(hotelId, room.id, next);
    } catch {
      setRooms((rs) => rs.map((r) => (r.id === room.id ? { ...r, housekeepingStatus: room.housekeepingStatus } : r)));
      Alert.alert("Couldn't update", "You may not have permission to change room status.");
    } finally { setBusyId(null); }
  }

  if (loading && rooms.length === 0) return <Loader />;

  return (
    <View style={styles.screen}>
      <View style={styles.filterWrap}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(f) => f.key}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable onPress={() => setFilter(item.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: "#fff" }]}>{item.label}</Text>
                <View style={[styles.chipBadge, active && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Text style={[styles.chipBadgeText, active && { color: "#fff" }]}>{counts[item.key] ?? 0}</Text>
                </View>
              </Pressable>
            );
          }} />
      </View>

      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
        contentContainerStyle={{ paddingVertical: 12, gap: 10, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="No rooms" hint="No rooms match this filter." height={220} />}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.roomNo}>{r.roomNumber}</Text>
              <View style={[styles.statusDot, { backgroundColor: HK_COLOR[r.housekeepingStatus] ?? colors.muted }]} />
            </View>
            <Text style={styles.roomType} numberOfLines={1}>{r.roomType?.name ?? "Room"}</Text>
            <Text style={styles.roomFloor}>{r.floor?.name ?? (r.floor ? `Floor ${r.floor.number}` : "")}</Text>
            <View style={styles.badges}>
              <Pill label={nice(r.housekeepingStatus)} color={HK_COLOR[r.housekeepingStatus] ?? colors.muted} />
              <Pill label={nice(r.status)} color={OCC_COLOR[r.status] ?? colors.muted} />
            </View>
            <Pressable onPress={() => cycle(r)} disabled={busyId === r.id} style={[styles.action, { backgroundColor: tint(HK_COLOR[NEXT[r.housekeepingStatus]] ?? colors.blue, "14") }]}>
              <Ionicons name="checkmark-circle" size={14} color={HK_COLOR[NEXT[r.housekeepingStatus]] ?? colors.blue} />
              <Text style={[styles.actionText, { color: HK_COLOR[NEXT[r.housekeepingStatus]] ?? colors.blue }]}>Mark {nice(NEXT[r.housekeepingStatus] ?? "clean")}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filterWrap: { paddingTop: 12, paddingBottom: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 12.5, fontWeight: "700", color: colors.muted },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  chipBadgeText: { fontSize: 10.5, fontWeight: "800", color: colors.muted },
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 3, ...shadow.card },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomNo: { fontSize: 18, fontWeight: "800", color: colors.navy },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  roomType: { fontSize: 12.5, fontWeight: "600", color: colors.text },
  roomFloor: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 6 },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: radius.sm, paddingVertical: 8, marginTop: "auto" },
  actionText: { fontSize: 12, fontWeight: "800" },
});
