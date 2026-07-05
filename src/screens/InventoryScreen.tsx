import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listStock, type StockRow } from "@/api/inventory";
import { useAuthStore } from "@/store/useAuthStore";
import { StockMovementSheet } from "@/components/StockMovementSheet";
import { Card, EmptyState, IconChip, Screen, ScreenHeader, SearchBar, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

export function InventoryScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const level = hotels.find((h) => h.id === hotelId)?.role?.level ?? 5;
  const canMove = level <= 4; // read-only visitors can't record movements

  const [stock, setStock] = useState<StockRow[] | null>(null);
  const [q, setQ] = useState("");
  const [store, setStore] = useState<string>("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sel, setSel] = useState<StockRow | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setStock(await listStock(hotelId)); } catch { setStock([]); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stores = useMemo(() => Array.from(new Map((stock ?? []).map((s) => [s.storeId, s.store])).entries()).map(([id, name]) => ({ id, name })), [stock]);
  const rows = useMemo(() => (stock ?? [])
    .filter((s) => store === "all" || s.storeId === store)
    .filter((s) => !lowOnly || s.low)
    .filter((s) => !q || s.item.toLowerCase().includes(q.toLowerCase())), [stock, store, lowOnly, q]);

  const chips = [{ id: "all", name: "All stores" }, ...stores];

  return (
    <Screen>
      <ScreenHeader
        title="Inventory"
        onBack={() => nav.goBack()}
        right={<Pressable onPress={() => nav.navigate("Linen")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6 }}><Ionicons name="shirt-outline" size={18} color={t.primary} /><Text style={{ color: t.primary, fontWeight: "700", fontSize: 13 }}>Linen</Text></Pressable>}
      />
      <View style={{ padding: space.base, paddingBottom: 8 }}><SearchBar value={q} onChangeText={setQ} placeholder="Search items" /></View>
      {stores.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.base, paddingBottom: 8 }}>
          {chips.map((c) => {
            const active = store === c.id;
            return <Pressable key={c.id} onPress={() => setStore(c.id)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 }}><Text style={{ color: active ? "#fff" : t.muted, fontSize: 12.5, fontWeight: "600" }}>{c.name}</Text></Pressable>;
          })}
        </View>
      ) : null}
      <View style={{ paddingHorizontal: space.base, paddingBottom: 8 }}>
        <Pressable onPress={() => setLowOnly((x) => !x)} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: lowOnly ? tint(t.red, "18") : t.surface, borderWidth: 1, borderColor: lowOnly ? t.red : t.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Ionicons name="alert-circle-outline" size={14} color={lowOnly ? t.red : t.muted} /><Text style={{ color: lowOnly ? t.red : t.muted, fontSize: 12.5, fontWeight: "600" }}>Low stock only</Text>
        </Pressable>
      </View>

      {stock === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={66} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="cube-outline" title="No stock" hint="No items match this filter." height={240} />}
          renderItem={({ item: s }) => (
            <Card onPress={canMove ? () => setSel(s) : undefined}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconChip icon="cube-outline" color={s.low ? t.red : t.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{s.item}</Text>
                  <Text style={[typo.caption, { color: t.muted }]}>{stores.length > 1 ? `${s.store} · ` : ""}{s.reorderLevel > 0 ? `Reorder at ${s.reorderLevel}` : s.category ?? ""}</Text>
                </View>
                {s.low ? <StatusBadge label="Low" color={t.red} /> : null}
                <Text style={[{ fontSize: 18, fontWeight: "800", color: t.text }, tabular]}>{s.quantity}<Text style={[typo.caption, { color: t.muted }]}> {s.unit ?? ""}</Text></Text>
                {canMove ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
              </View>
            </Card>
          )}
        />
      )}

      <StockMovementSheet visible={!!sel} onClose={() => setSel(null)} hotelId={hotelId} row={sel} onDone={load} />
    </Screen>
  );
}
