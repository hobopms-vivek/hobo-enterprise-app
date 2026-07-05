import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getLinenDashboard, saveLinenLine, type LinenDashboard, type LinenItem } from "@/api/linen";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Card, EmptyState, Screen, ScreenHeader, Sheet, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Flow = "issue" | "toLaundry" | "fromLaundry";
const FLOW: Record<Flow, { label: string; icon: keyof typeof Ionicons.glyphMap; from: "inStock" | "inUse" | "inLaundry" }> = {
  issue: { label: "Issue to rooms", icon: "arrow-forward", from: "inStock" },
  toLaundry: { label: "Send to laundry", icon: "water-outline", from: "inUse" },
  fromLaundry: { label: "Receive from laundry", icon: "checkmark-done-outline", from: "inLaundry" },
};

export function LinenScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const canMove = (hotels.find((h) => h.id === hotelId)?.role?.level ?? 5) <= 4;

  const [data, setData] = useState<LinenDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [move, setMove] = useState<{ item: LinenItem; flow: Flow } | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setData(await getLinenDashboard(hotelId)); } catch { setData({ kpis: { itemTypes: 0, totalItems: 0, inStock: 0, inUse: 0, inLaundry: 0, damagedLost: 0, lowStockCount: 0, inventoryValue: 0 }, items: [], locked: false, lockedAt: null, lockedByName: null }); }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openMove(item: LinenItem, flow: Flow) { setQty(1); setMove({ item, flow }); }

  async function submit() {
    if (!move) return;
    const { item, flow } = move;
    const cfg = FLOW[flow];
    if (qty <= 0 || item[cfg.from] < qty) { Alert.alert("Not enough", `Only ${item[cfg.from]} available to ${cfg.label.toLowerCase()}.`); return; }
    const line = { id: item.id, inStock: item.inStock, inUse: item.inUse, inLaundry: item.inLaundry, damagedLost: item.damagedLost };
    if (flow === "issue") { line.inStock -= qty; line.inUse += qty; }
    else if (flow === "toLaundry") { line.inUse -= qty; line.inLaundry += qty; }
    else { line.inLaundry -= qty; line.inStock += qty; }
    setBusy(true);
    try { await saveLinenLine(hotelId, line); setMove(null); await load(); }
    catch (e) { Alert.alert("Couldn't save", e instanceof Error ? e.message : "You may not have permission."); }
    finally { setBusy(false); }
  }

  const k = data?.kpis;
  const buckets: [string, keyof LinenItem, string][] = [["In stock", "inStock", t.green], ["In use", "inUse", t.blue], ["In laundry", "inLaundry", t.amber], ["Damaged", "damagedLost", t.red]];

  return (
    <Screen>
      <ScreenHeader title="Linen register" subtitle="Today" onBack={() => nav.goBack()} />

      {data === null ? (
        <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="shirt-outline" title="No linen items" hint="Set up linen items on the web." />}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 4 }}>
              {data.locked ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tint(t.amber, "18"), borderRadius: radius.md, padding: 12 }}>
                  <Ionicons name="lock-closed" size={16} color={t.amber} />
                  <Text style={[typo.caption, { color: t.amber, flex: 1 }]}>Register locked{data.lockedByName ? ` by ${data.lockedByName}` : ""}. Unlock on the web to edit.</Text>
                </View>
              ) : null}
              {k ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {[["In stock", k.inStock, t.green], ["In use", k.inUse, t.blue], ["In laundry", k.inLaundry, t.amber], ["Damaged", k.damagedLost, t.red]].map(([lbl, val, c]) => (
                    <View key={lbl as string} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", minWidth: 92 }}>
                      <Text style={[{ fontSize: 20, fontWeight: "800", color: c as string }, tabular]}>{val as number}</Text>
                      <Text style={[typo.caption, { color: t.muted }]}>{lbl as string}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Card accent={item.lowStock ? t.red : undefined}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Text style={[typo.h2, { color: t.text, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                {item.lowStock ? <StatusBadge label="Low" color={t.red} /> : null}
                {item.parLevel > 0 ? <Text style={[typo.caption, { color: t.muted, marginLeft: 8 }]}>PAR {item.parLevel}</Text> : null}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: canMove && !data.locked ? 12 : 0 }}>
                {buckets.map(([lbl, key, c]) => (
                  <View key={lbl} style={{ backgroundColor: tint(c, "18"), borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 76 }}>
                    <Text style={[{ fontSize: 17, fontWeight: "800", color: c }, tabular]}>{item[key] as number}</Text>
                    <Text style={[typo.caption, { color: t.muted }]}>{lbl}</Text>
                  </View>
                ))}
              </View>
              {canMove && !data.locked ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="Issue" icon="arrow-forward" size="sm" variant="outline" full={false} style={{ flex: 1 }} onPress={() => openMove(item, "issue")} />
                  <Button title="To laundry" icon="water-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} onPress={() => openMove(item, "toLaundry")} />
                  <Button title="From laundry" icon="checkmark-done-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} onPress={() => openMove(item, "fromLaundry")} />
                </View>
              ) : null}
            </Card>
          )}
        />
      )}

      <Sheet visible={!!move} onClose={() => setMove(null)} title={move ? FLOW[move.flow].label : ""}>
        {move ? (
          <View style={{ paddingBottom: 8 }}>
            <Text style={[typo.bodyStrong, { color: t.text, marginBottom: 2 }]}>{move.item.name}</Text>
            <Text style={[typo.caption, { color: t.muted, marginBottom: 16 }]}>Available: {move.item[FLOW[move.flow].from]} {move.item.unit}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, alignSelf: "center", marginBottom: 18 }}>
              <Pressable onPress={() => setQty((v) => Math.max(1, v - 1))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="remove" size={22} color={t.text} /></Pressable>
              <Text style={[{ fontSize: 32, fontWeight: "800", color: t.text, minWidth: 64, textAlign: "center" }, tabular]}>{qty}</Text>
              <Pressable onPress={() => setQty((v) => v + 1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color={t.text} /></Pressable>
            </View>
            <Button title={FLOW[move.flow].label} icon={FLOW[move.flow].icon} loading={busy} onPress={submit} />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
