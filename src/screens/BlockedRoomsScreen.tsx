import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listRoomBlocks, type RoomBlock } from "@/api/ops";
import { Card, EmptyState, IconChip, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const range = (s?: string | null, e?: string | null) => {
  const a = fmt(s); const b = fmt(e);
  return a && b ? `${a} → ${b}` : a ? `From ${a}` : b ? `Until ${b}` : null;
};

export function BlockedRoomsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const [items, setItems] = useState<RoomBlock[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    if (!hotelId) return;
    try { setItems(await listRoomBlocks(hotelId)); } catch { setItems([]); }
  }, [hotelId]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Screen>
      <ScreenHeader title="Blocked rooms" subtitle="View only" onBack={() => nav.goBack()} />
      {items === null ? (
        <View style={{ padding: space.base, gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={92} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: space.base, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="lock-closed-outline" title="No blocked rooms" hint="All rooms are available." height={240} />}
          renderItem={({ item }) => (
            <Card accent={t.amber}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <IconChip icon="bed-outline" color={t.amber} />
                <Text style={[{ fontSize: 18, fontWeight: "800", color: t.text }, tabular]}>{item.room?.roomNumber ?? "—"}</Text>
                {item.blockType ? <View style={{ marginLeft: "auto" }}><StatusBadge label={item.blockType.replace(/_/g, " ")} color={t.amber} /></View> : null}
              </View>
              <Text style={[typo.body, { color: t.text }]}>{item.reason ?? "No reason provided"}</Text>
              {range(item.startDate, item.endDate) ? <Text style={[typo.caption, { color: t.muted, marginTop: 6 }, tabular]}>{range(item.startDate, item.endDate)}</Text> : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
