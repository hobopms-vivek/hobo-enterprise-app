import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BookingFilter, BookingSort, Facet } from "@/api/bookings";
import { Button, Sheet } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";

export type CreatedRange = "all" | "today" | "7d" | "30d" | "month";
export type ResFilters = { bookingType: string[]; paymentStatus: string[]; origin: string[]; source: string[]; createdRange: CreatedRange };
export const EMPTY_FILTERS: ResFilters = { bookingType: [], paymentStatus: [], origin: [], source: [], createdRange: "all" };
export const DEFAULT_SORT: BookingSort = { id: "createdAt", dir: "desc" };

const TYPE_OPTS: [string, string][] = [["NORMAL", "Normal"], ["DAY_USE", "Day use"], ["HOURLY", "Hourly"], ["CORPORATE", "Corporate"]];
const PAY_OPTS: [string, string][] = [["PENDING", "Pending"], ["PARTIAL", "Partial"], ["PAID", "Paid"], ["REFUNDED", "Refunded"]];
const ORIGIN_OPTS: [string, string][] = [["RESERVATION", "Reservation"], ["WALK_IN", "Walk-in"], ["OTA", "OTA"]];
const SORT_OPTS: [string, string][] = [["createdAt", "Created"], ["checkInDate", "Check-in"], ["checkOutDate", "Check-out"], ["totalAmount", "Amount"], ["amountPaid", "Paid"], ["guest", "Guest"], ["code", "Booking ID"], ["nights", "Nights"]];
const DATE_OPTS: [CreatedRange, string][] = [["all", "All time"], ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"]];

/** How many filters are active (for the toolbar badge). */
export function activeFilterCount(f: ResFilters): number {
  return f.bookingType.length + f.paymentStatus.length + f.origin.length + f.source.length + (f.createdRange !== "all" ? 1 : 0);
}

/** Convert the UI filter draft → the backend DataTable `filters` array (createdAt on the created-at column). */
export function buildResFilters(f: ResFilters): BookingFilter[] {
  const out: BookingFilter[] = [];
  if (f.bookingType.length) out.push({ id: "bookingType", op: "in", value: f.bookingType });
  if (f.paymentStatus.length) out.push({ id: "paymentStatus", op: "in", value: f.paymentStatus });
  if (f.origin.length) out.push({ id: "origin", op: "in", value: f.origin });
  if (f.source.length) out.push({ id: "source", op: "in", value: f.source });
  if (f.createdRange !== "all") {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (f.createdRange === "7d") start = new Date(+start - 6 * 86400000);
    else if (f.createdRange === "30d") start = new Date(+start - 29 * 86400000);
    else if (f.createdRange === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    out.push({ id: "createdAt", op: "between", value: [start.toISOString(), end.toISOString()] });
  }
  return out;
}

export function ReservationFilterSheet({
  visible, onClose, sort, filters, sourceOptions, onApply,
}: {
  visible: boolean; onClose: () => void;
  sort: BookingSort; filters: ResFilters; sourceOptions: Facet[];
  onApply: (sort: BookingSort, filters: ResFilters) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<ResFilters>(filters);
  const [sf, setSf] = useState<BookingSort>(sort);
  // Re-seed the draft each time the sheet is opened so it reflects the applied state.
  useEffect(() => { if (visible) { setDraft(filters); setSf(sort); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: keyof Omit<ResFilters, "createdRange">, v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));

  const Chip = ({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 7 }}>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{label}{count != null ? ` ${count}` : ""}</Text>
    </Pressable>
  );

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 8 }}>
      <Text style={[typo.label, { color: t.muted }]}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Filter & sort">
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 6 }}>
        <View style={{ gap: 8 }}>
          <Text style={[typo.label, { color: t.muted }]}>Sort by</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SORT_OPTS.map(([id, label]) => (
              <Chip key={id} label={label} active={sf.id === id} onPress={() => setSf((s) => ({ ...s, id }))} />
            ))}
          </View>
          <Pressable onPress={() => setSf((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: tint(t.primary, "14"), borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 2 }}>
            <Ionicons name={sf.dir === "asc" ? "arrow-up" : "arrow-down"} size={14} color={t.primary} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.primary }}>{sf.dir === "asc" ? "Ascending" : "Descending"}</Text>
          </Pressable>
        </View>

        <Group title="Booking type">{TYPE_OPTS.map(([v, l]) => <Chip key={v} label={l} active={draft.bookingType.includes(v)} onPress={() => toggle("bookingType", v)} />)}</Group>
        <Group title="Payment">{PAY_OPTS.map(([v, l]) => <Chip key={v} label={l} active={draft.paymentStatus.includes(v)} onPress={() => toggle("paymentStatus", v)} />)}</Group>
        <Group title="Origin">{ORIGIN_OPTS.map(([v, l]) => <Chip key={v} label={l} active={draft.origin.includes(v)} onPress={() => toggle("origin", v)} />)}</Group>
        {sourceOptions.length ? (
          <Group title="Source">{sourceOptions.map((o) => <Chip key={o.value} label={o.label} count={o.count} active={draft.source.includes(o.value)} onPress={() => toggle("source", o.value)} />)}</Group>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={[typo.label, { color: t.muted }]}>Created date</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DATE_OPTS.map(([v, l]) => <Chip key={v} label={l} active={draft.createdRange === v} onPress={() => setDraft((d) => ({ ...d, createdRange: v }))} />)}
          </View>
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.divider, marginTop: 4 }}>
        <Button title="Clear all" variant="outline" full={false} style={{ flex: 1 }} onPress={() => { setDraft(EMPTY_FILTERS); setSf(DEFAULT_SORT); }} />
        <Button title="Apply" full={false} style={{ flex: 1.4 }} onPress={() => { onApply(sf, draft); onClose(); }} />
      </View>
    </Sheet>
  );
}
