import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listNotifications } from "@/api/notifications";
import { Avatar } from "@/components/kit";
import { radius, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

/** Hotel-name pill (opens the switcher). `light` for use on the navy hero. */
export function HotelPill({ onPress, light }: { onPress: () => void; light?: boolean }) {
  const t = useTheme();
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const name = hotels.find((h) => h.id === activeHotelId)?.name ?? "Select hotel";
  const fg = light ? "#fff" : t.text;
  const bg = light ? "rgba(255,255,255,0.14)" : t.surfaceSunken;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: bg, borderRadius: radius.pill, paddingLeft: 12, paddingRight: 10, paddingVertical: 7, maxWidth: 220 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{name}</Text>
      <Ionicons name="chevron-down" size={15} color={fg} />
    </Pressable>
  );
}

/** search · bell(with unread dot) · avatar. Self-fetches unread count. */
export function HeaderIcons({ light, onSearch }: { light?: boolean; onSearch?: () => void }) {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const user = useAuthStore((s) => s.user);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const [unread, setUnread] = useState(0);
  const fg = light ? "#fff" : t.text;

  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = () => { if (activeHotelId) listNotifications(activeHotelId, { unreadOnly: true, take: 1 }).then((r) => alive && setUnread(r.unread ?? 0)).catch(() => {}); };
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [activeHotelId]));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Pressable onPress={onSearch ?? (() => nav.navigate("Search"))} hitSlop={8} style={{ padding: 6 }}><Ionicons name="search" size={21} color={fg} /></Pressable>
      <Pressable onPress={() => nav.navigate("Notifications")} hitSlop={8} style={{ padding: 6 }}>
        <Ionicons name="notifications-outline" size={22} color={fg} />
        {unread > 0 ? <View style={{ position: "absolute", top: 4, right: 4, minWidth: 8, height: 8, borderRadius: 4, backgroundColor: t.red }} /> : null}
      </Pressable>
      <Pressable onPress={() => nav.navigate("Profile")} hitSlop={6} style={{ marginLeft: 2 }}>
        <Avatar name={user?.fullName} size={32} />
      </Pressable>
    </View>
  );
}
