import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { listBookings, type BookingItem } from "@/api/bookings";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, Screen, ScreenHeader, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const WD = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayKey = (iso?: string | null) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export function BookingCalendarScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [selected, setSelected] = useState<number | null>(now.getDate());

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => { listBookings(hotelId).then(setBookings).catch(() => setBookings([])); }, [hotelId]);

  const { cells, arr, dep } = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const lead = first.getDay();
    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    const arr: Record<number, BookingItem[]> = {}; const dep: Record<number, BookingItem[]> = {};
    bookings.forEach((b) => {
      const ci = b.checkInDate ? new Date(b.checkInDate) : null;
      const co = b.checkOutDate ? new Date(b.checkOutDate) : null;
      if (ci && ci.getFullYear() === ym.y && ci.getMonth() === ym.m && b.status !== "CANCELLED") (arr[ci.getDate()] ??= []).push(b);
      if (co && co.getFullYear() === ym.y && co.getMonth() === ym.m && b.status !== "CANCELLED") (dep[co.getDate()] ??= []).push(b);
    });
    return { cells, arr, dep };
  }, [ym, bookings]);

  const move = (d: number) => setYm(({ y, m }) => { const nm = m + d; return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });
  const isToday = (day: number) => now.getFullYear() === ym.y && now.getMonth() === ym.m && now.getDate() === day;
  const selArr = selected ? arr[selected] ?? [] : [];
  const selDep = selected ? dep[selected] ?? [] : [];

  return (
    <Screen>
      <ScreenHeader title="Calendar" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 14, paddingBottom: 32 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Pressable onPress={() => move(-1)} hitSlop={8} style={{ padding: 4 }}><Ionicons name="chevron-back" size={22} color={t.text} /></Pressable>
            <Text style={[typo.h2, { color: t.text, flex: 1, textAlign: "center" }]}>{MONTHS[ym.m]} {ym.y}</Text>
            <Pressable onPress={() => move(1)} hitSlop={8} style={{ padding: 4 }}><Ionicons name="chevron-forward" size={22} color={t.text} /></Pressable>
          </View>
          <View style={{ flexDirection: "row" }}>{WD.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: "center", color: t.faint, fontSize: 11, fontWeight: "700" }}>{d}</Text>)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {cells.map((day, i) => (
              <Pressable key={i} disabled={!day} onPress={() => day && setSelected(day)} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" }}>
                {day ? (
                  <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: selected === day ? t.primary : isToday(day) ? tint(t.primary, "18") : "transparent" }}>
                    <Text style={[{ fontSize: 14, fontWeight: selected === day || isToday(day) ? "800" : "500", color: selected === day ? "#fff" : t.text }, tabular]}>{day}</Text>
                    <View style={{ flexDirection: "row", gap: 2, position: "absolute", bottom: 4 }}>
                      {arr[day]?.length ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: selected === day ? "#fff" : t.green }} /> : null}
                      {dep[day]?.length ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: selected === day ? "#fff" : t.violet }} /> : null}
                    </View>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 8 }}>
            <Legend color={t.green} label="Arrivals" /><Legend color={t.violet} label="Departures" />
          </View>
        </Card>

        {selected ? (
          <View>
            <Text style={[typo.overline, { color: t.muted, marginBottom: 8, marginLeft: 4 }]}>{MONTHS[ym.m]} {selected} · {selArr.length} arrivals · {selDep.length} departures</Text>
            {[...selArr.map((b) => ({ b, kind: "in" as const })), ...selDep.map((b) => ({ b, kind: "out" as const }))].map(({ b, kind }, i) => (
              <Card key={`${kind}-${b.id}-${i}`} onPress={() => nav.navigate("BookingDetail", { booking: b })} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name={kind === "in" ? "log-in-outline" : "log-out-outline"} size={18} color={kind === "in" ? t.green : t.violet} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{b.guest?.fullName ?? "Guest"}</Text>
                    <Text style={[typo.caption, { color: t.muted }, tabular]}>{b.code} · {b.roomType?.name ?? "Room"}{b.room?.roomNumber ? ` · ${b.room.roomNumber}` : ""}</Text>
                  </View>
                  <StatusBadge label={kind === "in" ? "Arrival" : "Departure"} color={kind === "in" ? t.green : t.violet} />
                </View>
              </Card>
            ))}
            {!selArr.length && !selDep.length ? <Text style={[typo.caption, { color: t.faint, textAlign: "center", paddingVertical: 16 }]}>Nothing scheduled.</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const t = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /><Text style={[typo.caption, { color: t.muted }]}>{label}</Text></View>;
}
