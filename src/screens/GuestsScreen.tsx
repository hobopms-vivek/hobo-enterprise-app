import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { listGuests, type GuestListItem } from "@/api/guests";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, EmptyState, FilterChips, Screen, ScreenHeader, SearchBar, Skeleton } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type F = "all" | "vip" | "blacklist";

export function GuestsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<F>("all");
  const [items, setItems] = useState<GuestListItem[] | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async (query: string, f: F) => {
    try { setItems(await listGuests(hotelId, { q: query || undefined, filter: f })); } catch { setItems([]); }
  }, [hotelId]);

  useEffect(() => {
    const id = setTimeout(() => { setItems(null); void load(q, filter); }, q ? 300 : 0);
    return () => clearTimeout(id);
  }, [q, filter, load]);

  return (
    <Screen>
      <ScreenHeader title="Guests" subtitle="View only" onBack={() => nav.goBack()} />
      <View style={{ padding: space.base, paddingBottom: 8 }}><SearchBar value={q} onChangeText={setQ} placeholder="Search name, phone or booking" /></View>
      <View style={{ paddingBottom: 8 }}>
        <FilterChips value={filter} onChange={setFilter} chips={[{ key: "all", label: "All" }, { key: "vip", label: "VIP" }, { key: "blacklist", label: "Blacklisted" }]} />
      </View>

      {items === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 8 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={58} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No guests found" hint="Try a different search." height={260} />}
          renderItem={({ item: g }) => (
            <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }} onPress={() => nav.navigate("GuestProfile", { guestId: g.id })}>
              <Avatar name={g.fullName} size={44} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{g.fullName}</Text>
                  {g.vipStatus && g.vipStatus !== "NONE" ? <Ionicons name="star" size={13} color={t.gold} /> : null}
                  {g.isBlacklisted ? <Ionicons name="ban" size={13} color={t.red} /> : null}
                </View>
                <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{g.phone ?? g.email ?? g.city ?? "—"}</Text>
              </View>
              {g.tier ? <View style={{ backgroundColor: tint(t.violet, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: t.violet, fontSize: 11, fontWeight: "700" }}>{g.tier}</Text></View> : null}
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
