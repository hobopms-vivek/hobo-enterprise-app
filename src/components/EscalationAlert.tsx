import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { startEscalationLoop, stopEscalationLoop } from "@/services/alert";
import { playEscalationFor } from "@/services/sound";
import { colors } from "@/theme";

type Active = { code?: string; subject?: string; level?: number } | null;

/**
 * Global overlay: when a ticket ESCALATES on the active hotel (server emits
 * "ticket.escalated"), the matching sound plays (manager tier → talk-to-manager,
 * admin/super → escalation), a looping vibration starts, and this banner shows
 * until the user taps Stop. Mounted above navigation so it appears on any screen.
 */
export function EscalationAlert() {
  const status = useAuthStore((s) => s.status);
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const myId = useAuthStore((s) => s.user?.id);
  const [active, setActive] = useState<Active>(null);

  useRealtime(status === "signedIn" ? hotelId : null, (e) => {
    if (e.type === "ticket.escalated") {
      const p = (e.payload ?? {}) as { code?: string; subject?: string; level?: number; userId?: string };
      // Only alarm the staffer the ticket actually escalated TO.
      if (p.userId && myId && p.userId !== myId) return;
      setActive({ code: p.code, subject: p.subject, level: p.level });
      playEscalationFor(p.level);
      startEscalationLoop();
    }
  });

  if (!active) return null;

  const isManager = active.level === 3;

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.banner, isManager && { backgroundColor: colors.navy }]}>
        <Ionicons name={isManager ? "person" : "alarm"} size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isManager ? "Manager needed" : "Escalated"} {active.code ? `· ${active.code}` : ""}</Text>
          {active.subject ? <Text style={styles.sub} numberOfLines={1}>{active.subject}</Text> : null}
        </View>
        <Pressable
          style={styles.stop}
          onPress={() => {
            stopEscalationLoop();
            setActive(null);
          }}
        >
          <Text style={styles.stopText}>Stop</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000, alignItems: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.red, marginHorizontal: 10, marginTop: 6, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, width: "94%", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  title: { color: "#fff", fontWeight: "800", fontSize: 14 },
  sub: { color: "#FFE4E4", fontSize: 12, marginTop: 1 },
  stop: { backgroundColor: "#fff", borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  stopText: { color: colors.red, fontWeight: "800", fontSize: 13 },
});
