import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { HeaderIcons } from "@/components/AppHeader";
import { Screen, ScreenHeader, StatusBadge } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Mod = { key: string; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; color: string; module?: string; go?: (n: AppNav) => void; soon?: boolean; manager?: boolean };

export function OpsHubScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const level = hotel?.role?.level ?? 5;
  const isManager = level <= 3;
  const modules = hotel?.enabledModules ?? [];
  const on = (k?: string) => !k || modules.includes(k);

  const allMods: Mod[] = [
    { key: "fd", label: "Front Desk", sub: "Arrivals · departures · in-house", icon: "people-outline", color: t.teal, module: "front_desk", go: (n) => n.navigate("FrontDesk") },
    { key: "hk", label: "Housekeeping", sub: "Room status board", icon: "bed-outline", color: t.green, module: "housekeeping", go: (n) => n.navigate("Housekeeping") },
    { key: "res", label: "Reservations", sub: "Bookings list", icon: "calendar-outline", color: t.blue, module: "reservations", go: (n) => n.navigate("Reservations") },
    { key: "banq", label: "Banquet", sub: "Events", icon: "sparkles-outline", color: t.violet, module: "banquet", go: (n) => n.navigate("Banquet") },
    { key: "guests", label: "Guests", sub: "Lookup & ID scan", icon: "person-outline", color: t.blue, module: "guest_management", go: (n) => n.navigate("Guests") },
    { key: "inv", label: "Inventory & Linen", sub: "Stock & counts", icon: "cube-outline", color: t.amber, module: "inventory", go: (n) => n.navigate("Inventory") },
    { key: "blocked", label: "Blocked Rooms", sub: "Out of order / holds", icon: "lock-closed-outline", color: t.red, module: "housekeeping", go: (n) => n.navigate("BlockedRooms") },
    { key: "appr", label: "Approvals", sub: "Delete & cancel requests", icon: "shield-checkmark-outline", color: t.amber, manager: true, go: (n) => n.navigate("Approvals") },
    { key: "reports", label: "Reports", sub: "KPIs at a glance", icon: "stats-chart-outline", color: t.violet, module: "reports", manager: true, go: (n) => n.navigate("Reports") },
  ];
  const mods = allMods.filter((m) => on(m.module) && (!m.manager || isManager));

  return (
    <Screen>
      <ScreenHeader title="Operations" right={<HeaderIcons />} />
      <ScrollView contentContainerStyle={{ padding: space.base, paddingBottom: 28 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {mods.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => (m.soon || !m.go ? Alert.alert(m.label, "This module is coming to the app soon.") : m.go(nav))}
              style={{ width: "47%", flexGrow: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 16, gap: 10, minHeight: 128 }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: tint(m.color, "22"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={m.icon} size={21} color={m.color} />
                </View>
                {m.soon ? <View style={{ marginLeft: "auto" }}><StatusBadge label="Soon" color={t.muted} /></View> : null}
              </View>
              <View style={{ marginTop: "auto" }}>
                <Text style={[typo.title, { color: t.text }]}>{m.label}</Text>
                <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]} numberOfLines={1}>{m.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
