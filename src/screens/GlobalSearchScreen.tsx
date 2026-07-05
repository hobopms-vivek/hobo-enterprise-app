import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { listGuests, type GuestListItem } from "@/api/guests";
import { listBookings, type BookingItem } from "@/api/bookings";
import { listTickets, type Ticket } from "@/api/tickets";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, EmptyState, IconChip, Screen, ScreenHeader, SearchBar } from "@/components/kit";
import { space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Result =
  | { kind: "guest"; id: string; title: string; sub: string; g: GuestListItem }
  | { kind: "booking"; id: string; title: string; sub: string; b: BookingItem }
  | { kind: "task"; id: string; title: string; sub: string };

export function GlobalSearchScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [q, setQ] = useState("");
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => { listBookings(hotelId).then(setBookings).catch(() => {}); listTickets(hotelId).then(setTickets).catch(() => {}); }, [hotelId]);
  useEffect(() => {
    const id = setTimeout(() => { if (q.trim().length >= 2) listGuests(hotelId, { q }).then(setGuests).catch(() => setGuests([])); else setGuests([]); }, 300);
    return () => clearTimeout(id);
  }, [q, hotelId]);

  const sections = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const gRes: Result[] = guests.slice(0, 8).map((g) => ({ kind: "guest", id: g.id, title: g.fullName, sub: g.phone ?? g.email ?? "Guest", g }));
    const bRes: Result[] = bookings.filter((b) => b.code.toLowerCase().includes(s) || (b.guest?.fullName ?? "").toLowerCase().includes(s) || (b.room?.roomNumber ?? "").includes(s)).slice(0, 8)
      .map((b) => ({ kind: "booking", id: b.id, title: `${b.code} · ${b.guest?.fullName ?? "Guest"}`, sub: `${b.roomType?.name ?? "Room"} · ${b.status.replace(/_/g, " ")}`, b }));
    const tRes: Result[] = tickets.filter((tk) => tk.code.toLowerCase().includes(s) || tk.subject.toLowerCase().includes(s)).slice(0, 8)
      .map((tk) => ({ kind: "task", id: tk.id, title: tk.subject, sub: `${tk.code} · ${tk.status.replace(/_/g, " ")}` }));
    return [
      ...(gRes.length ? [{ title: "Guests", data: gRes }] : []),
      ...(bRes.length ? [{ title: "Bookings", data: bRes }] : []),
      ...(tRes.length ? [{ title: "Tasks", data: tRes }] : []),
    ];
  }, [q, guests, bookings, tickets]);

  function open(r: Result) {
    if (r.kind === "guest") nav.navigate("GuestProfile", { guestId: r.id });
    else if (r.kind === "booking") nav.navigate("BookingDetail", { booking: r.b });
    else nav.navigate("TicketDetail", { ticketId: r.id });
  }

  return (
    <Screen>
      <ScreenHeader title="Search" onBack={() => nav.goBack()} />
      <View style={{ padding: space.base, paddingBottom: 8 }}><SearchBar value={q} onChangeText={setQ} placeholder="Guests, bookings, rooms, tasks" /></View>
      {q.trim().length < 2 ? (
        <EmptyState icon="search-outline" title="Search everything" hint="Find guests, bookings, rooms and tasks." height={300} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="file-tray-outline" title="No results" hint={`Nothing matches “${q}”.`} height={260} />}
          renderSectionHeader={({ section }) => <Text style={[typo.overline, { color: t.muted, marginTop: 16, marginBottom: 6 }]}>{section.title}</Text>}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => open(r)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}>
              {r.kind === "guest" ? <Avatar name={r.title} size={38} /> : <IconChip icon={r.kind === "booking" ? "calendar-outline" : "clipboard-outline"} color={r.kind === "booking" ? t.blue : t.primary} size={38} />}
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }, tabular]} numberOfLines={1}>{r.title}</Text>
                <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{r.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
