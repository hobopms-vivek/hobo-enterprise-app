import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getHousekeeping, roomOcc, type HkByType, type HkRoom, type HkSummary } from "@/api/housekeeping";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { HousekeepingRoomSheet } from "@/components/HousekeepingRoomSheet";
import { EmptyState, Screen, ScreenHeader, SegmentedTabs, Skeleton, StatusBadge } from "@/components/kit";
import { radius, ROOM_DISPLAY_ORDER, roomDisplayColor, roomDisplayLabel, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type ViewMode = "plan" | "list";
const orderIdx = (s?: string) => { const i = ROOM_DISPLAY_ORDER.indexOf(s ?? ""); return i < 0 ? 99 : i; };

export function HousekeepingScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === hotelId);
  const level = hotel?.role?.level ?? 5;
  const isManager = level <= 3;
  const perms = hotel?.permissions ?? [];
  // Department-wise: permissions[] from /me/hotels already folds in dept-scoped grants,
  // so a housekeeping-dept attendant with the perm gets write access — exactly like web.
  const canRoom = perms.includes("housekeeping.room_status.update");
  const canTask = perms.includes("housekeeping.task.create");

  const [rooms, setRooms] = useState<HkRoom[] | null>(null);
  const [byType, setByType] = useState<HkByType[]>([]);
  const [summary, setSummary] = useState<HkSummary | null>(null);
  const [view, setView] = useState<ViewMode>("plan");
  const [filter, setFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [sel, setSel] = useState<HkRoom | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    try {
      const r = await getHousekeeping(hotelId);
      setRooms(r.rooms ?? []); setByType(r.byType ?? []); setSummary(r.summary ?? null);
    } catch { setRooms([]); setByType([]); setSummary(null); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type === "housekeeping.approval" || e.type === "notification") void load(); });

  const roomById = useMemo(() => new Map((rooms ?? []).map((r) => [r.id, r])), [rooms]);
  const dndById = useMemo(() => new Map((rooms ?? []).map((r) => [r.id, !!r.dnd])), [rooms]);
  const openRoom = (id: string) => { const full = roomById.get(id); if (full) setSel(full); };

  // Stat cards straight from the server summary (booking-authoritative), matching the web board.
  const stats = useMemo(() => {
    const sm = summary ?? {};
    const rows: { key: string; label: string; value: number }[] = [
      { key: "vacant_clean", label: "Vacant clean", value: sm.cleanReady ?? 0 },
      { key: "occupied", label: "Occupied", value: sm.occupied ?? 0 },
      { key: "dirty_vacant", label: "Dirty vacant", value: sm.dirtyVacant ?? 0 },
      { key: "cleaning", label: "Cleaning", value: sm.cleaning ?? 0 },
      { key: "inspected", label: "Awaiting", value: sm.inspectionPending ?? 0 },
      { key: "out_of_service", label: "Out of service", value: sm.outOfService ?? 0 },
      { key: "out_of_order", label: "Out of order", value: sm.outOfOrder ?? 0 },
      { key: "confirmed", label: "Back-to-back", value: sm.backToBack ?? 0 },
    ];
    return rows;
  }, [summary]);

  // List worklist: all rooms, sorted by display-status priority, filterable by status.
  const listRooms = useMemo(() => {
    const all = (rooms ?? []);
    const f = all.filter((r) => filter === "ALL" || (r.displayStatus ?? "") === filter);
    return [...f].sort((a, b) => orderIdx(a.displayStatus) - orderIdx(b.displayStatus) || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  }, [rooms, filter]);

  const Legend = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12, paddingHorizontal: space.base, paddingBottom: 10, alignItems: "center" }}>
      {ROOM_DISPLAY_ORDER.map((s) => (
        <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: roomDisplayColor[s] }} />
          <Text style={[typo.caption, { color: t.muted }]}>{roomDisplayLabel[s]}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const Cell = ({ id, roomNumber, status, backToBack }: { id: string; roomNumber: string; status: string; backToBack?: boolean }) => {
    const c = roomDisplayColor[status] ?? t.muted;
    const dnd = dndById.get(id);
    return (
      <Pressable onPress={() => openRoom(id)} style={{ width: 74, backgroundColor: tint(c, "1A"), borderWidth: 1, borderColor: tint(c, "44"), borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center", gap: 3 }}>
        <View style={{ position: "absolute", top: 4, left: 5, flexDirection: "row", gap: 3 }}>
          {backToBack ? <Text style={{ fontSize: 9, fontWeight: "800", color: t.red }}>⚡</Text> : null}
          {dnd ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.amber }} /> : null}
        </View>
        <Text style={[{ fontSize: 16, fontWeight: "800", color: t.text, marginTop: 4 }, tabular]} numberOfLines={1}>{roomNumber}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
          <Text style={{ fontSize: 9, fontWeight: "700", color: c }} numberOfLines={1}>{(roomDisplayLabel[status] ?? status).split(" ")[0]}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Housekeeping" onBack={() => nav.goBack()} right={canTask ? <Pressable onPress={() => nav.navigate("AssignCleaning")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="add" size={26} color={t.primary} /></Pressable> : undefined} />

      {/* Summary stat cards (from server) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, padding: space.base, alignItems: "center" }}>
        {stats.map((s) => (
          <View key={s.key} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, minWidth: 96, alignItems: "center", gap: 2 }}>
            <Text style={[{ fontSize: 22, fontWeight: "800", color: roomDisplayColor[s.key] ?? t.text }, tabular]}>{s.value}</Text>
            <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: space.base, paddingBottom: 10 }}>
        <SegmentedTabs value={view} onChange={setView} tabs={[{ key: "plan", label: "Floor plan" }, { key: "list", label: "List" }]} />
      </View>

      {rooms === null ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, padding: space.base }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} width="47%" radius={radius.lg} />)}
        </View>
      ) : view === "plan" ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
        >
          <Legend />
          {byType.length === 0 ? (
            <EmptyState icon="bed-outline" title="No rooms" hint="No room types configured." height={220} />
          ) : byType.map((grp) => (
            <View key={grp.typeId} style={{ paddingHorizontal: space.base, marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <Text style={[typo.title, { color: t.text, flex: 1 }]} numberOfLines={1}>{grp.typeName}</Text>
                <Text style={[typo.caption, { color: grp.available > 0 ? t.green : t.red, fontWeight: "700" }, tabular]}>{grp.available}/{grp.total} avail</Text>
                {grp.occupied > 0 ? <Text style={[typo.caption, { color: t.muted }, tabular]}>· {grp.occupied} occ</Text> : null}
                {grp.reserved > 0 ? <Text style={[typo.caption, { color: t.amber }, tabular]}>· {grp.reserved} resv</Text> : null}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {grp.rooms.map((r) => <Cell key={r.id} id={r.id} roomNumber={r.roomNumber} status={r.displayStatus ?? r.status} backToBack={r.backToBack} />)}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base, paddingBottom: 8, alignItems: "center" }}>
            {(["ALL", ...ROOM_DISPLAY_ORDER] as string[]).map((f) => {
              const active = filter === f;
              const label = f === "ALL" ? "All" : roomDisplayLabel[f];
              return (
                <Pressable key={f} onPress={() => setFilter(f)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <FlatList
            data={listRooms}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 10, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
            ListEmptyComponent={<EmptyState icon="bed-outline" title="No rooms" hint="No rooms match this filter." height={200} />}
            renderItem={({ item: r }) => {
              const ds = r.displayStatus ?? r.status;
              const c = roomDisplayColor[ds] ?? t.muted;
              return (
                <Pressable onPress={() => setSel(r)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: c, borderRadius: radius.lg, padding: 14 }}>
                  <View style={{ minWidth: 46, alignItems: "center" }}>
                    <Text style={[{ fontSize: 18, fontWeight: "800", color: t.text }, tabular]}>{r.roomNumber}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{r.roomType?.name ?? "Room"}{r.guestName ? ` · ${r.guestName}` : ""}</Text>
                    <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{r.floor?.name ?? (r.floor ? `Floor ${r.floor.number}` : "")}{roomOcc(r) ? ` · ${roomOcc(r).replace(/_/g, " ").toLowerCase()}` : ""}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge label={roomDisplayLabel[ds] ?? ds} color={c} />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {r.backToBack ? <Text style={{ fontSize: 11, fontWeight: "800", color: t.red }}>⚡B2B</Text> : null}
                      {r.dnd ? <Text style={{ fontSize: 11, fontWeight: "700", color: t.amber }}>DND</Text> : null}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}

      <HousekeepingRoomSheet visible={!!sel} onClose={() => setSel(null)} hotelId={hotelId!} room={sel} isManager={isManager} canRoom={canRoom} onDone={load} />
    </Screen>
  );
}
