import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listTickets, type Ticket } from "@/api/tickets";
import { getDashboard, type DashAnalytics } from "@/api/analytics";
import { useRealtime } from "@/realtime/useRealtime";
import { Card, SectionHeader, StatTile, KpiCard, Loader } from "@/components/ui";
import type { AppNav } from "@/navigation/types";
import { colors, radius, shadow, tint } from "@/theme";

type QuickTo = "History" | "BlockedRooms" | "Inventory" | "QRScan" | "FrontDesk" | "Housekeeping" | "Team";
const QUICK: { label: string; icon: keyof typeof Ionicons.glyphMap; to: QuickTo; minLevel?: number }[] = [
  { label: "Front Desk", icon: "business-outline", to: "FrontDesk" },
  { label: "Housekeeping", icon: "sparkles-outline", to: "Housekeeping" },
  { label: "Team", icon: "people-outline", to: "Team", minLevel: 3 },
  { label: "Blocked Rooms", icon: "bed-outline", to: "BlockedRooms" },
  { label: "Inventory", icon: "cube-outline", to: "Inventory" },
  { label: "Scan Room", icon: "qr-code-outline", to: "QRScan" },
  { label: "History", icon: "time-outline", to: "History" },
];

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const moneyShort = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n || 0)}`;
};
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

export function DashboardScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const hotels = useAuthStore((s) => s.hotels);
  const user = useAuthStore((s) => s.user);
  const hotel = hotels.find((h) => h.id === hotelId) ?? null;
  const navigation = useNavigation<AppNav>();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [data, setData] = useState<DashAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [t, d] = await Promise.all([
      listTickets(hotelId).catch(() => [] as Ticket[]),
      getDashboard(hotelId).catch(() => null),
    ]);
    setTickets(t);
    setData(d);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);
  // Live refresh on any ticket/assignment change.
  useRealtime(hotelId, (e) => { if (["ticket.assigned", "ticket.updated", "ticket.escalated"].includes(e.type)) void load(); });

  const myOpen = tickets.filter((t) => ["OPEN", "ASSIGNED"].includes(t.status)).length;
  const myProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const myEscalated = tickets.filter((t) => t.status === "ESCALATED").length;

  const level = hotel?.role?.level ?? 5;
  const showKpis = level <= 3 && !!data; // manager and above
  const ops = data?.operations;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hello}>Hi, {user?.fullName?.split(" ")[0] ?? "there"} 👋</Text>
        <Text style={styles.hotelName}>{hotel?.name ?? "—"}</Text>
        <Text style={styles.hotelMeta}>{hotel?.role?.name ?? ""}{hotel?.city ? ` · ${hotel.city}` : ""}</Text>
      </View>

      {loading && !data && tickets.length === 0 ? <Loader /> : (
        <>
          {/* My work */}
          <SectionHeader title="My work" icon="briefcase" accent={colors.blue} />
          <View style={styles.row}>
            <StatTile label="New / assigned" value={myOpen} icon="document-text" accent={colors.blue} />
            <StatTile label="In progress" value={myProgress} icon="walk" accent={colors.amber} />
            <StatTile label="Escalated" value={myEscalated} icon="alarm" accent={colors.red} />
          </View>

          {/* Today at the hotel */}
          {ops ? (
            <>
              <SectionHeader title="Today at the hotel" icon="business" accent={colors.teal} />
              <View style={styles.row}>
                <StatTile label="Arrivals today" value={ops.counts.arrivals} icon="log-in" accent={colors.blue} />
                <StatTile label="Guests in-house" value={ops.counts.inHouse} icon="people" accent={colors.green} />
                <StatTile label="Departures" value={ops.counts.departures} icon="log-out" accent={colors.violet} />
              </View>
              <View style={[styles.row, { marginTop: 10 }]}>
                <StatTile label="Arriving · 7 days" value={ops.counts.upcoming} icon="calendar" accent={colors.amber} />
                <StatTile label="Open tickets" value={data!.tickets.activeCount} icon="construct" accent={colors.red} />
                {data!.role.isManagerial
                  ? <StatTile label="To collect" value={moneyShort(ops.payment.totalOutstanding)} icon="wallet" accent={colors.teal} />
                  : <View style={{ flex: 1, minWidth: 104 }} />}
              </View>
            </>
          ) : null}

          {/* KPIs (managers+) */}
          {showKpis ? (
            <>
              <SectionHeader title={`Performance · last ${data!.range.days} days`} icon="stats-chart" accent={colors.violet} />
              <View style={styles.row}>
                <KpiCard label="Occupancy" hint="Rooms sold ÷ available" value={pct(data!.kpis.occupancy.value)} delta={data!.kpis.occupancy.delta} icon="bed" accent={colors.blue} />
                <KpiCard label="ADR" hint="Avg daily rate" value={money(data!.kpis.adr.value)} delta={data!.kpis.adr.delta} icon="pricetag" accent={colors.green} />
              </View>
              <View style={[styles.row, { marginTop: 10 }]}>
                <KpiCard label="RevPAR" hint="Revenue per avail. room" value={money(data!.kpis.revpar.value)} delta={data!.kpis.revpar.delta} icon="trending-up" accent={colors.violet} />
                <KpiCard label="Total revenue" hint="Rooms + F&B + banquet" value={moneyShort(data!.kpis.totalRevenue.value)} delta={data!.kpis.totalRevenue.delta} icon="cash" accent={colors.amber} />
              </View>
            </>
          ) : null}

          {/* In-house quick peek (front-desk feel) */}
          {ops && ops.inHouse.length > 0 ? (
            <Card style={{ marginTop: 14 }}>
              <SectionHeader title="In-house now" icon="people" accent={colors.green} right={<Text style={styles.linkMeta}>{ops.counts.inHouse} total</Text>} />
              {ops.inHouse.slice(0, 4).map((g) => (
                <View key={g.id} style={styles.guestRow}>
                  <View style={styles.roomChip}><Text style={styles.roomChipText}>{g.room ?? "—"}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName} numberOfLines={1}>{g.guest}</Text>
                    <Text style={styles.guestMeta}>{g.roomType} · {g.nights} nt</Text>
                  </View>
                  {data!.role.isManagerial ? (
                    <Text style={[styles.guestBal, { color: g.balance > 0 ? colors.red : colors.green }]}>{g.balance > 0 ? money(g.balance) : "Paid"}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {/* Quick actions */}
          <SectionHeader title="Quick actions" icon="flash" accent={colors.amber} />
          <View style={styles.quickGrid}>
            {QUICK.filter((q) => !q.minLevel || level <= q.minLevel).map((q) => (
              <Pressable key={q.to} style={styles.quickBtn} onPress={() => navigation.navigate(q.to)}>
                <View style={[styles.quickIcon, { backgroundColor: tint(colors.blue, "14") }]}><Ionicons name={q.icon} size={20} color={colors.blue} /></View>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 18, marginBottom: 16, ...shadow.card },
  hello: { color: "#CFE0FF", fontSize: 14, fontWeight: "600" },
  hotelName: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 6, letterSpacing: -0.3 },
  hotelMeta: { color: "#9FB3D1", fontSize: 13, marginTop: 3 },
  row: { flexDirection: "row", gap: 10 },
  linkMeta: { fontSize: 11.5, color: colors.muted, fontWeight: "600" },
  guestRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.slate50 },
  roomChip: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" },
  roomChipText: { fontSize: 11, fontWeight: "800", color: colors.muted },
  guestName: { fontSize: 13.5, fontWeight: "600", color: colors.navy },
  guestMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  guestBal: { fontSize: 13, fontWeight: "800" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { width: "47.5%", backgroundColor: colors.white, borderRadius: radius.md, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  quickIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickText: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
