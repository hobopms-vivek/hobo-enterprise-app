import React, { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getBooking, getBookingGuests, listBookings, saveBookingGuests, type BookingGuest, type BookingItem } from "@/api/bookings";
import { useAuthStore } from "@/store/useAuthStore";
import { bookingBadges } from "@/lib/bookingBadges";
import { GuestEditSheet } from "@/components/GuestEditSheet";
import { Avatar, Button, Card, Loader, Screen, ScreenHeader, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");
const fdt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export function BookingDetailScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "BookingDetail">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const hotels = useAuthStore((s) => s.hotels);
  const canEdit = (hotels.find((h) => h.id === hotelId)?.role?.level ?? 5) <= 4;

  const [b, setB] = useState<BookingItem | null>(params.booking ?? null);
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [edit, setEdit] = useState<{ guest: Partial<BookingGuest> | null; index: number; isNew: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const bookingId = params.booking?.id ?? params.bookingId;

  // Resolve the booking (deep-linked by id, e.g. from a notification).
  useEffect(() => {
    if (b || !params.bookingId) return;
    getBooking(hotelId, params.bookingId).then((x) => {
      if (x) setB(x);
      else listBookings(hotelId).then((all) => setB(all.find((y) => y.id === params.bookingId) ?? null)).catch(() => {});
    }).catch(() => {});
  }, [b, params.bookingId, hotelId]);

  const loadGuests = useCallback(async () => {
    if (!bookingId) return;
    setGuests(await getBookingGuests(hotelId, bookingId));
  }, [hotelId, bookingId]);
  useEffect(() => { void loadGuests(); }, [loadGuests]);

  if (!b) return <Screen><ScreenHeader title="Booking" onBack={() => nav.goBack()} /><Loader /></Screen>;

  const statusColor: Record<string, string> = { CONFIRMED: t.blue, CHECKED_IN: t.violet, CHECKED_OUT: t.muted, CANCELLED: t.red, NO_SHOW: t.amber, PENDING: t.muted };
  const bal = b.folioBalance ?? Math.max(0, b.totalAmount - b.amountPaid);
  const badges = bookingBadges(t, b);

  const companions = guests.filter((g) => !g.isPrimary);
  const primaryRow = guests.find((g) => g.isPrimary);
  const pax = (b.adults ?? 1) + (b.children ?? 0);
  const expectedCompanions = Math.max(0, pax - 1);
  const remaining = Math.max(0, expectedCompanions - companions.length);

  async function persistCompanion(updated: Partial<BookingGuest>, index: number, isNew: boolean) {
    if (!bookingId) return;
    setSaving(true);
    try {
      const next: Partial<BookingGuest>[] = companions.map((c) => ({ ...c }));
      if (isNew) next.push(updated);
      else next[index] = { ...next[index], ...updated };
      await saveBookingGuests(hotelId, bookingId, next);
      await loadGuests();
    } finally { setSaving(false); }
  }

  const GuestRow = ({ g, label, onPress }: { g?: Partial<BookingGuest>; label: string; onPress?: () => void }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: t.divider, opacity: pressed && onPress ? 0.7 : 1 })}>
      {g?.idPhotoUrl ? (
        <Image source={{ uri: g.idPhotoUrl }} style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: t.surfaceSunken }} />
      ) : (
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: t.primary, fontWeight: "800", fontSize: 16 }}>{(g?.fullName ?? "+").trim().charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[typo.bodyStrong, { color: g?.fullName ? t.text : t.faint }]} numberOfLines={1}>{g?.fullName || label}</Text>
        <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>
          {[g?.age ? `${g.age}y` : null, g?.gender, g?.idType ? `${g.idType}${g.idNumber ? ` · ${g.idNumber}` : ""}` : (g?.fullName ? "No ID" : "Tap to add")].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {g?.idPhotoUrl ? <StatusBadge label="ID" color={t.green} /> : g?.fullName ? <StatusBadge label="No ID" color={t.amber} /> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
    </Pressable>
  );

  return (
    <Screen>
      <ScreenHeader title={b.code} onBack={() => nav.goBack()} right={<StatusBadge label={b.status.replace(/_/g, " ")} color={statusColor[b.status] ?? t.muted} />} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}>
        {/* Classification badges */}
        {badges.length || b.groupBookingId ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {badges.map((bd, i) => <StatusBadge key={i} label={bd.label} color={bd.color} />)}
            {b.groupBookingId ? (
              <Pressable onPress={() => nav.navigate("GroupDetail", { groupId: b.groupBookingId! })}><StatusBadge label="Part of group ›" color={t.teal} /></Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Stay */}
        <Card>
          <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>STAY</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Text style={[typo.h2, { color: t.text }, tabular]}>{fmt(b.checkInDate)}</Text>
            <Ionicons name="arrow-forward" size={16} color={t.faint} />
            <Text style={[typo.h2, { color: t.text }, tabular]}>{fmt(b.checkOutDate)}</Text>
            {b.nights ? <View style={{ backgroundColor: tint(t.primary, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginLeft: "auto" }}><Text style={{ color: t.primary, fontSize: 11, fontWeight: "700" }}>{b.nights}n</Text></View> : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={[typo.bodyStrong, { color: t.text }]}>{b.roomType?.name ?? "Room"}</Text>
            {b.room?.roomNumber ? <View style={{ backgroundColor: tint(t.primary, "18"), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={[{ color: t.primary, fontWeight: "800", fontSize: 12 }, tabular]}>Room {b.room.roomNumber}</Text></View> : null}
            {b.ratePlan?.name ? <Text style={[typo.caption, { color: t.muted }]}>· {b.ratePlan.name}</Text> : null}
            {b.ratePlan?.mealPlan ? <Text style={[typo.caption, { color: t.muted }]}>· {b.ratePlan.mealPlan}</Text> : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="people-outline" size={14} color={t.muted} />
              <Text style={[typo.caption, { color: t.muted }]}>{b.adults ?? 1} adult{(b.adults ?? 1) > 1 ? "s" : ""}{b.children ? ` · ${b.children} child${b.children > 1 ? "ren" : ""}` : ""}</Text>
            </View>
            <Text style={[typo.caption, { color: t.muted }]}>· Source: {b.bookingSource?.name ?? "Direct"}</Text>
          </View>
          {b.dayUseExpiresAt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: tint(t.amber, "14"), borderRadius: radius.md, padding: 8 }}>
              <Ionicons name="hourglass-outline" size={14} color={t.amber} />
              <Text style={[typo.caption, { color: t.amber }]}>Day-use expires {fdt(b.dayUseExpiresAt)}{b.ratePerHour ? ` · ${money(b.ratePerHour)}/hr` : ""}</Text>
            </View>
          ) : null}
        </Card>

        {/* Primary guest */}
        {b.guest ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={b.guest.fullName} uri={primaryRow?.idPhotoUrl ?? undefined} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>{[b.guest.title, b.guest.fullName].filter(Boolean).join(" ")}</Text>
                {b.guest.phone ? <Text style={[typo.caption, { color: t.muted }]}>{b.guest.phone}</Text> : null}
              </View>
              {b.guest.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${b.guest?.phone}`)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="call" size={18} color={t.primary} />
                </Pressable>
              ) : null}
            </View>
            {canEdit && b.guestId ? (
              <View style={{ marginTop: 12 }}><Button title="Scan / update primary ID" icon="camera-outline" size="sm" variant="outline" onPress={() => nav.navigate("GuestProfile", { guestId: b.guestId! })} /></View>
            ) : null}
          </Card>
        ) : null}

        {/* Party / guests */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
            <Text style={[typo.label, { color: t.muted, flex: 1 }]}>GUESTS · {pax}</Text>
            {expectedCompanions > 0 ? <Text style={[typo.caption, { color: t.faint }]}>{companions.length}/{expectedCompanions} added</Text> : null}
          </View>
          <GuestRow g={primaryRow ?? (b.guest ? { fullName: b.guest.fullName, isPrimary: true } : undefined)} label="Primary guest" onPress={canEdit && b.guestId ? () => nav.navigate("GuestProfile", { guestId: b.guestId! }) : undefined} />
          {companions.map((g, i) => (
            <GuestRow key={g.id} g={g} label={`Guest ${i + 2}`} onPress={() => setEdit({ guest: g, index: i, isNew: false })} />
          ))}
          {canEdit && remaining > 0 ? (
            <GuestRow label={`Add guest — ${remaining} more`} onPress={() => setEdit({ guest: { isPrimary: false }, index: companions.length, isNew: true })} />
          ) : null}
          {!canEdit && expectedCompanions > companions.length ? (
            <Text style={[typo.caption, { color: t.faint, paddingTop: 8 }]}>{expectedCompanions - companions.length} companion(s) not yet captured.</Text>
          ) : null}
        </Card>

        {/* Folio summary → full folio screen */}
        <Card onPress={() => nav.navigate("Folio", { bookingId: b.id, code: b.code })}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Text style={[typo.label, { color: t.muted, flex: 1 }]}>FOLIO</Text>
            {b.paymentStatus ? <StatusBadge label={b.paymentStatus} color={b.paymentStatus === "PAID" ? t.green : b.paymentStatus === "PARTIAL" ? t.amber : t.muted} /> : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
            <Text style={[typo.body, { color: t.muted }]}>Charges</Text>
            <Text style={[{ color: t.text, fontWeight: "600" }, tabular]}>{money(b.folioTotal ?? b.totalAmount)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
            <Text style={[typo.body, { color: t.muted }]}>Paid</Text>
            <Text style={[{ color: t.green, fontWeight: "600" }, tabular]}>{money(b.amountPaid)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: t.divider, marginVertical: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[typo.bodyStrong, { color: t.text }]}>Balance</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[{ color: bal > 0 ? t.red : t.green, fontWeight: "800", fontSize: 16 }, tabular]}>{bal > 0 ? money(bal) : "Paid"}</Text>
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </View>
          </View>
          <Text style={[typo.caption, { color: t.primary, marginTop: 8, fontWeight: "700" }]}>View full breakdown ›</Text>
        </Card>
      </ScrollView>

      <GuestEditSheet
        visible={!!edit}
        guest={edit?.guest ?? null}
        index={edit?.index ?? 0}
        hotelId={hotelId}
        canEdit={canEdit && !saving}
        onClose={() => setEdit(null)}
        onSave={async (g) => { if (edit) await persistCompanion(g, edit.index, edit.isNew); }}
      />
    </Screen>
  );
}
