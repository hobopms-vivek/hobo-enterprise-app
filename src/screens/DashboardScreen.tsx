import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listTickets, type Ticket } from "@/api/tickets";
import type { AppNav } from "@/navigation/types";
import { colors } from "@/theme";

const QUICK: { label: string; icon: keyof typeof Ionicons.glyphMap; to: "History" | "BlockedRooms" | "Inventory" | "QRScan" }[] = [
  { label: "History", icon: "time-outline", to: "History" },
  { label: "Blocked Rooms", icon: "bed-outline", to: "BlockedRooms" },
  { label: "Inventory", icon: "cube-outline", to: "Inventory" },
  { label: "Scan Room", icon: "qr-code-outline", to: "QRScan" },
];

export function DashboardScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const hotels = useAuthStore((s) => s.hotels);
  const user = useAuthStore((s) => s.user);
  const hotel = hotels.find((h) => h.id === hotelId) ?? null;
  const navigation = useNavigation<AppNav>();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      setTickets(await listTickets(hotelId));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = tickets.filter((t) => ["OPEN", "ASSIGNED"].includes(t.status)).length;
  const inProgress = tickets.filter((t) => ["IN_PROGRESS", "ESCALATED"].includes(t.status)).length;
  const escalated = tickets.filter((t) => t.status === "ESCALATED").length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
    >
      <Text style={styles.hello}>Hi, {user?.fullName?.split(" ")[0] ?? "there"} 👋</Text>
      <View style={styles.hotelCard}>
        <Text style={styles.hotelName}>{hotel?.name ?? "—"}</Text>
        <Text style={styles.hotelMeta}>
          {hotel?.role?.name ?? ""}
          {hotel?.city ? ` · ${hotel.city}` : ""}
        </Text>
      </View>

      {loading && tickets.length === 0 ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.statsRow}>
          <Stat label="New" value={open} color={colors.blue} />
          <Stat label="In Progress" value={inProgress} color={colors.amber} />
          <Stat label="Escalated" value={escalated} color={colors.red} />
        </View>
      )}

      <Text style={styles.quickLabel}>Quick actions</Text>
      <View style={styles.quickGrid}>
        {QUICK.map((q) => (
          <Pressable key={q.to} style={styles.quickBtn} onPress={() => navigation.navigate(q.to)}>
            <Ionicons name={q.icon} size={22} color={colors.blue} />
            <Text style={styles.quickText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>Open the Tasks tab to accept and progress service requests.</Text>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hello: { fontSize: 20, fontWeight: "800", color: colors.text },
  hotelCard: { backgroundColor: colors.navy, borderRadius: 14, padding: 16, marginTop: 12 },
  hotelName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hotelMeta: { color: "#9FB3D1", fontSize: 13, marginTop: 3 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13, marginTop: 22, lineHeight: 19 },
  quickLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 22, marginBottom: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { width: "47%", backgroundColor: colors.white, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border },
  quickText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
