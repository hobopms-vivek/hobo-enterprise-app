import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { startEscalationLoop, stopEscalationLoop } from "@/services/alert";
import { playEscalationFor } from "@/services/sound";
import { navigationRef } from "@/navigation/navRef";
import { radius, tint } from "@/theme";

type Active = { ticketId?: string; code?: string; subject?: string; priority?: string; level?: number } | null;
const RED = "#EF4444";
const NAVY = "#0B2A5B";

/** Global full-screen alarm overlay when a ticket escalates TO the current user. */
export function EscalationAlert() {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const myId = useAuthStore((s) => s.user?.id);
  const [active, setActive] = useState<Active>(null);
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useRealtime(status === "signedIn" ? hotelId : null, (e) => {
    if (e.type !== "ticket.escalated") return;
    const p = (e.payload ?? {}) as { ticketId?: string; code?: string; subject?: string; priority?: string; level?: number; userId?: string };
    if (p.userId && myId && p.userId !== myId) return;
    setActive({ ticketId: p.ticketId, code: p.code, subject: p.subject, priority: p.priority, level: p.level });
    setElapsed(0);
    playEscalationFor(p.level);
    startEscalationLoop();
  });

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { loop.stop(); clearInterval(id); };
  }, [active, pulse]);

  if (!active) return null;
  const isManagerTier = active.level === 3;
  const base = isManagerTier ? NAVY : RED;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  function dismiss() { stopEscalationLoop(); setActive(null); }
  function open() { const id = active?.ticketId; dismiss(); if (id && navigationRef.isReady()) navigationRef.navigate("TicketDetail", { ticketId: id }); }

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, backgroundColor: tint(base, "F2"), paddingTop: insets.top, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={isManagerTier ? "person" : "warning"} size={34} color={base} />
        </View>
      </Animated.View>

      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 22, letterSpacing: -0.4 }}>Escalated to you</Text>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13.5, marginTop: 4 }}>{isManagerTier ? "Manager intervention required" : "Priority intervention required"}</Text>

      <View style={{ backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.lg, padding: 16, marginTop: 24, width: "100%" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 }}>{active.code ?? "TICKET"}</Text>
          {active.priority ? <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{active.priority}</Text></View> : null}
        </View>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }} numberOfLines={2}>{active.subject ?? "Service ticket escalated"}</Text>
      </View>

      <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 24, letterSpacing: 1, fontVariant: ["tabular-nums"] }}>{mm}:{ss}</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 2 }}>SINCE ESCALATION</Text>

      <View style={{ width: "100%", gap: 10, marginTop: 28 }}>
        <Pressable onPress={open} style={{ backgroundColor: "#fff", borderRadius: 13, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="open-outline" size={18} color={base} />
          <Text style={{ color: base, fontWeight: "800", fontSize: 15 }}>Open task</Text>
        </Pressable>
        <Pressable onPress={dismiss} style={{ borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)", borderRadius: 13, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="notifications-off-outline" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14.5 }}>Stop alert</Text>
        </Pressable>
      </View>
    </View>
  );
}
