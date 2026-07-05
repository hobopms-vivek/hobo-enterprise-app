import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { Sheet } from "@/components/kit";
import { radius, tint, type as typo, useTheme } from "@/theme";

/** Bottom-sheet hotel switcher over the active-hotel list from the auth store. */
export function HotelSwitcherSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const setActiveHotel = useAuthStore((s) => s.setActiveHotel);
  const [q, setQ] = useState("");

  const rows = hotels.filter((h) => !q || h.name.toLowerCase().includes(q.toLowerCase()) || (h.city ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <Sheet visible={visible} onClose={onClose} title="Switch hotel">
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {rows.map((h) => {
          const active = h.id === activeHotelId;
          return (
            <Pressable
              key={h.id}
              onPress={async () => { await setActiveHotel(h.id); onClose(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: active ? tint(t.primary, "14") : "transparent" }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="business" size={18} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{h.name}</Text>
                <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{[h.city, h.role?.name].filter(Boolean).join(" · ")}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={t.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ height: 8 }} />
    </Sheet>
  );
}
