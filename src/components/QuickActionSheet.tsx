import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { Sheet } from "@/components/kit";
import { radius, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Item = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; go: (nav: AppNav) => void; manager?: boolean; module?: string };

/** Center-FAB quick actions (interactive things only — creation stays app-side). */
export function QuickActionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const isManager = (hotel?.role?.level ?? 5) <= 3;
  const on = (k?: string) => !k || (hotel?.enabledModules?.includes(k) ?? true);

  const all: Item[] = [
    { key: "task", label: "New task", icon: "add-circle-outline", color: t.primary, manager: true, module: "whatsapp", go: (n) => n.navigate("CreateTask") },
    { key: "scan", label: "Scan room", icon: "qr-code-outline", color: t.violet, module: "whatsapp", go: (n) => n.navigate("QRScan") },
    { key: "hk", label: "Housekeeping", icon: "bed-outline", color: t.green, module: "housekeeping", go: (n) => n.navigate("Housekeeping") },
    { key: "fd", label: "Front desk", icon: "people-outline", color: t.teal, module: "front_desk", go: (n) => n.navigate("FrontDesk") },
  ];
  const items = all.filter((i) => (!i.manager || isManager) && on(i.module));

  return (
    <Sheet visible={visible} onClose={onClose} title="Quick actions">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 8 }}>
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={() => { onClose(); setTimeout(() => it.go(nav), 180); }}
            style={{ width: "47%", flexGrow: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 16, gap: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(it.color, "22"), alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={it.icon} size={20} color={it.color} />
            </View>
            <Text style={[typo.bodyStrong, { color: t.text }]}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
