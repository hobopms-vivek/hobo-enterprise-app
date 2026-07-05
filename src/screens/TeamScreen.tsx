import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listMembers, type Member } from "@/api/ops";
import { getPresence, setPresence } from "@/api/presence";
import { useRealtime } from "@/realtime/useRealtime";
import { Avatar, EmptyState, Screen, ScreenHeader, Skeleton } from "@/components/kit";
import { space, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

export function TeamScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const hotels = useAuthStore((s) => s.hotels);
  const isManager = (hotels.find((h) => h.id === hotelId)?.role?.level ?? 5) <= 3;

  const [members, setMembers] = useState<Member[] | null>(null);
  const [shift, setShift] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    if (!hotelId) return;
    try {
      const ms = await listMembers(hotelId);
      setMembers(ms);
      if (isManager) {
        const entries = await Promise.all(ms.map(async (m) => [m.userId, (await getPresence(hotelId, m.userId).catch(() => ({ onShift: false }))).onShift] as const));
        setShift(Object.fromEntries(entries));
      }
    } catch { setMembers([]); }
  }, [hotelId, isManager]);
  useEffect(() => { void load(); }, [load]);
  useRealtime(hotelId, (e) => {
    if (e.type !== "presence.changed") return;
    const p = e.payload as { userId?: string; onShift?: boolean };
    if (p.userId) setShift((m) => ({ ...m, [p.userId as string]: !!p.onShift }));
  });

  async function toggle(m: Member, next: boolean) {
    if (!hotelId || busyId) return;
    setBusyId(m.userId);
    setShift((p) => ({ ...p, [m.userId]: next }));
    try {
      const r = await setPresence(hotelId, next, m.userId);
      if (!next && r.reassigned) Alert.alert("Staff deactivated", `${m.fullName} is now off shift. ${r.reassigned} open task(s) were reassigned.`);
    } catch { setShift((p) => ({ ...p, [m.userId]: !next })); Alert.alert("Failed", "Could not update status."); }
    finally { setBusyId(null); }
  }

  const onShiftCount = Object.values(shift).filter(Boolean).length;

  return (
    <Screen>
      <ScreenHeader title="Team" subtitle={members ? `${isManager ? `${onShiftCount} on shift · ` : ""}${members.length} total` : undefined} onBack={() => nav.goBack()} />
      {members === null ? (
        <View style={{ padding: space.base, gap: 8 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={58} radius={12} />)}</View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.userId}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.divider }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No team members" height={240} />}
          renderItem={({ item: m }) => {
            const on = shift[m.userId] ?? false;
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Avatar name={m.fullName || m.email} size={44} online={isManager ? on : m.isActive} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{m.fullName || m.email}</Text>
                  <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{[m.role?.name, m.department?.name].filter(Boolean).join(" · ") || "—"}</Text>
                </View>
                {isManager ? (
                  <View style={{ alignItems: "center", width: 58 }}>
                    <Switch value={on} onValueChange={(v) => toggle(m, v)} disabled={busyId === m.userId} trackColor={{ true: t.green, false: t.slate300 }} thumbColor="#fff" />
                    <Text style={{ fontSize: 10, color: t.muted, marginTop: 2, fontWeight: "600" }}>{on ? "On shift" : "Off"}</Text>
                  </View>
                ) : (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.isActive ? t.green : t.faint }} />
                )}
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
