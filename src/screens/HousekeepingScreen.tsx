import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getHousekeeping, roomOcc, type HkRoom } from "@/api/housekeeping";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { HousekeepingRoomSheet } from "@/components/HousekeepingRoomSheet";
import { EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { hkStatusColor, radius, roomStatusColor, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const nice = (s: string) => s.replace(/_/g, " ").toLowerCase();
type Filter = "ALL" | "DIRTY" | "CLEANING" | "INSPECTED" | "CLEAN" | "OUT_OF_SERVICE";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" }, { key: "DIRTY", label: "Dirty" }, { key: "CLEANING", label: "Cleaning" },
  { key: "INSPECTED", label: "Inspected" }, { key: "CLEAN", label: "Clean" }, { key: "OUT_OF_SERVICE", label: "Out of service" },
];

export function HousekeepingScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const level = hotels.find((h) => h.id === hotelId)?.role?.level ?? 5;
  const isManager = level <= 3;

  const [rooms, setRooms] = useState<HkRoom[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [sel, setSel] = useState<HkRoom | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    try { setRooms((await getHousekeeping(hotelId)).rooms ?? []); } catch { setRooms([]); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "housekeeping.approval" || e.type === "notification") void load(); });

  const stats = useMemo(() => {
    const r = rooms ?? [];
    const cnt = (fn: (x: HkRoom) => boolean) => r.filter(fn).length;
    return [
      { label: "Vacant clean", value: cnt((x) => x.housekeepingStatus === "CLEAN" && roomOcc(x) === "AVAILABLE"), color: t.green },
      { label: "Occupied", value: cnt((x) => roomOcc(x) === "OCCUPIED"), color: t.violet },
      { label: "Dirty", value: cnt((x) => x.housekeepingStatus === "DIRTY"), color: t.amber },
      { label: "Cleaning", value: cnt((x) => x.housekeepingStatus === "CLEANING"), color: t.blue },
      { label: "Awaiting", value: cnt((x) => x.housekeepingStatus === "INSPECTED"), color: t.violet },
      { label: "Back-to-back", value: cnt((x) => !!x.backToBack), color: t.amber },
      { label: "Out of service", value: cnt((x) => x.housekeepingStatus === "OUT_OF_SERVICE"), color: t.red },
    ];
  }, [rooms, t]);

  const shown = useMemo(() => (rooms ?? []).filter((r) => filter === "ALL" || r.housekeepingStatus === filter), [rooms, filter]);

  return (
    <Screen>
      <ScreenHeader title="Housekeeping" onBack={() => nav.goBack()} right={isManager ? <Pressable onPress={() => nav.navigate("AssignCleaning")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="add" size={26} color={t.primary} /></Pressable> : undefined} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 96 }} contentContainerStyle={{ gap: 10, padding: space.base }}>
        {stats.map((s) => (
          <View key={s.label} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, minWidth: 96, alignItems: "center", gap: 2 }}>
            <Text style={[{ fontSize: 22, fontWeight: "800", color: s.color }, tabular]}>{s.value}</Text>
            <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base, paddingBottom: 8 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {rooms === null ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, padding: space.base }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} width="47%" radius={radius.lg} />)}
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(r) => r.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: space.base }}
          contentContainerStyle={{ paddingVertical: 4, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="bed-outline" title="No rooms" hint="No rooms match this filter." height={220} />}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => setSel(r)} style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 14, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[{ fontSize: 18, fontWeight: "800", color: t.text }, tabular]}>{r.roomNumber}</Text>
                <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {r.dnd ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.red }} /> : null}
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: hkStatusColor[r.housekeepingStatus] ?? t.muted }} />
                </View>
              </View>
              <Text style={[typo.caption, { color: t.text, fontWeight: "600" }]} numberOfLines={1}>{r.roomType?.name ?? "Room"}</Text>
              <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{r.floor?.name ?? (r.floor ? `Floor ${r.floor.number}` : "")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                <StatusBadge label={nice(r.housekeepingStatus)} color={hkStatusColor[r.housekeepingStatus] ?? t.muted} />
                <StatusBadge label={nice(roomOcc(r))} color={roomStatusColor[roomOcc(r)] ?? t.muted} />
              </View>
            </Pressable>
          )}
        />
      )}

      <HousekeepingRoomSheet visible={!!sel} onClose={() => setSel(null)} hotelId={hotelId!} room={sel} isManager={isManager} onDone={load} />
    </Screen>
  );
}
