import React, { useCallback, useLayoutEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getGroup, type GroupDetail } from "@/api/bookings";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export function GroupDetailScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "GroupDetail">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [g, setG] = useState<GroupDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    const d = await getGroup(hotelId, params.groupId);
    if (d) setG(d); else setNotFound(true);
  }, [hotelId, params.groupId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const statusColor: Record<string, string> = { CONFIRMED: t.blue, CHECKED_IN: t.violet, CHECKED_OUT: t.muted, COMPLETED: t.muted, CANCELLED: t.red, NO_SHOW: t.amber, PENDING: t.muted };
  const tot = g?.totals;

  const Row = ({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={[typo.body, { color: strong ? t.text : t.muted, fontWeight: strong ? "700" : "500" }]}>{label}</Text>
      <Text style={[{ color: strong ? t.text : muted ? t.muted : t.text, fontWeight: strong ? "800" : "600", fontSize: strong ? 15 : 14 }, tabular]}>{value}</Text>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={params.code ?? g?.code ?? "Group"} subtitle="Group booking" onBack={() => nav.goBack()} right={g ? <StatusBadge label={g.status.replace(/_/g, " ")} color={statusColor[g.status] ?? t.muted} /> : undefined} />
      {g === null ? (
        notFound ? <EmptyState icon="people-outline" title="Group not found" hint="It may have been cancelled." /> : <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} radius={radius.lg} />)}</View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
        >
          {/* Overview */}
          <Card>
            <Text style={[typo.h2, { color: t.text }]}>{g.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <StatusBadge label={cap(g.type)} color={t.teal} />
              <Text style={[typo.caption, { color: t.muted }, tabular]}>{fmt(g.checkInDate)} → {fmt(g.checkOutDate)}</Text>
            </View>
            {(g.lead || g.leadPhone) ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typo.caption, { color: t.faint }]}>Lead contact</Text>
                  <Text style={[typo.bodyStrong, { color: t.text }]}>{g.lead ?? "—"}</Text>
                </View>
                {g.leadPhone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${g.leadPhone}`)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="call" size={18} color={t.primary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {g.company ? <Row label="Bill to" value={g.company.name} /> : null}
            {g.balanceDueTiming ? <Row label="Balance due" value={cap(g.balanceDueTiming)} muted /> : null}
            {g.notes ? <Text style={[typo.caption, { color: t.muted, marginTop: 8 }]}>{g.notes}</Text> : null}
          </Card>

          {/* Totals */}
          {tot ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>GROUP FOLIO</Text>
              {(tot.roomsPreTax ?? 0) > 0 ? <Row label="Rooms (pre-tax)" value={money(tot.roomsPreTax)} /> : null}
              {(tot.roomsTax ?? 0) > 0 ? <Row label="Rooms tax" value={money(tot.roomsTax)} muted /> : null}
              {(tot.miscTotal ?? 0) > 0 ? <Row label="Additional charges" value={money(tot.miscTotal)} /> : null}
              <View style={{ height: 1, backgroundColor: t.divider, marginVertical: 6 }} />
              <Row label="Grand total" value={money(tot.grandTotal)} strong />
              <Row label="Paid" value={money(tot.paid)} muted />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: t.divider }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>Balance</Text>
                <Text style={[{ color: (tot.balance ?? 0) > 0 ? t.red : t.green, fontWeight: "800", fontSize: 17 }, tabular]}>{(tot.balance ?? 0) > 0 ? money(tot.balance) : "Paid"}</Text>
              </View>
            </Card>
          ) : null}

          {/* Room roster */}
          <View>
            <Text style={[typo.label, { color: t.muted, marginBottom: 8, marginLeft: 2 }]}>ROOMS · {g.rooms.length}</Text>
            <View style={{ gap: 10 }}>
              {g.rooms.map((r) => {
                const rbal = r.balance ?? 0;
                const pax = (r.adults ?? 0) + (r.children ?? 0);
                const sub = [r.roomType, r.ratePlan, pax ? `${pax}p` : null, r.source].filter(Boolean).join(" · ");
                return (
                  <Card key={r.id} onPress={() => nav.navigate("BookingDetail", { bookingId: r.id })}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ minWidth: 46, height: 34, borderRadius: 9, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                        <Text style={[{ color: t.primary, fontWeight: "800", fontSize: 13 }, tabular]}>{r.room ?? "—"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{r.guestName || "Guest"}{r.code ? ` · ${r.code}` : ""}</Text>
                        <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{sub || "Room"}</Text>
                        <Text style={[typo.caption, { color: t.faint }, tabular]} numberOfLines={1}>{fmt(r.checkInDate)}–{fmt(r.checkOutDate)}{(r.roomTotal ?? 0) > 0 ? ` · ${money(r.roomTotal)}` : ""}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <StatusBadge label={r.status.replace(/_/g, " ")} color={statusColor[r.status] ?? t.muted} />
                        <Text style={[{ color: rbal > 0 ? t.red : t.green, fontWeight: "700", fontSize: 12.5 }, tabular]}>{rbal > 0 ? money(rbal) : "Paid"}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>

          {/* Additional (misc) charges across the group */}
          {g.charges?.length ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>ADDITIONAL CHARGES</Text>
              {g.charges.map((c) => (
                <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[typo.body, { color: t.text }]} numberOfLines={1}>{c.description}</Text>
                    <Text style={[typo.caption, { color: t.muted }]}>{[c.bookingCode, cap(c.category)].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]}>{money(c.total)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
