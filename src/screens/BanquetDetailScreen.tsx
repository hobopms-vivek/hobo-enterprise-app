import React, { useCallback, useLayoutEffect, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getBanquetEvent, type BanquetEventDetail } from "@/api/banquet";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const money = (n?: number | null) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const dstr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "2-digit" }) : "");
const tstr = (v?: string | null) => {
  if (!v) return "";
  if (/^\d{1,2}:\d{2}/.test(v)) return v; // "HH:MM" slot times
  return new Date(v).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const fdt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export function BanquetDetailScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "BanquetDetail">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [e, setE] = useState<BanquetEventDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    const d = await getBanquetEvent(hotelId, params.eventId);
    if (d) setE(d); else setNotFound(true);
  }, [hotelId, params.eventId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const statusColor: Record<string, string> = { CONFIRMED: t.green, CHECKED_IN: t.blue, CHECKED_OUT: t.muted, COMPLETED: t.muted, TENTATIVE: t.amber, ENQUIRY: t.muted, CANCELLED: t.red, LOST: t.red };

  const billablePax = e ? Math.max(e.guaranteedPax ?? 0, e.actualPax ?? 0) : 0;
  const balance = e ? Math.max(0, (e.total ?? 0) - (e.advancePaid ?? 0)) : 0;
  const planCharge = e ? (e.manualTotal ?? ((e.perPlateRate ?? 0) * billablePax + (e.hallRent ?? 0))) : 0;
  const menuUrl = e?.menuImageUrl || e?.package?.imageUrl || null;
  const isPdf = !!menuUrl && /\.pdf($|\?)/i.test(menuUrl);

  // by-tender split
  const byMethod = new Map<string, number>();
  for (const p of e?.payments ?? []) byMethod.set(cap(p.method) || "Other", (byMethod.get(cap(p.method) || "Other") ?? 0) + p.amount);

  const Info = ({ label, value }: { label: string; value?: string | null }) => (value ? (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, gap: 12 }}>
      <Text style={[typo.caption, { color: t.muted }]}>{label}</Text>
      <Text style={[typo.caption, { color: t.text, fontWeight: "600", flexShrink: 1, textAlign: "right" }]}>{value}</Text>
    </View>
  ) : null);
  const Row = ({ label, value, strong, muted, minus }: { label: string; value: string; strong?: boolean; muted?: boolean; minus?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={[typo.body, { color: strong ? t.text : t.muted, fontWeight: strong ? "700" : "500" }]}>{label}</Text>
      <Text style={[{ color: strong ? t.text : muted ? t.muted : t.text, fontWeight: strong ? "800" : "600", fontSize: strong ? 15 : 14 }, tabular]}>{minus ? "− " : ""}{value}</Text>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={params.code ?? e?.code ?? "Event"} subtitle="Banquet event" onBack={() => nav.goBack()} right={e ? <StatusBadge label={e.status.replace(/_/g, " ")} color={statusColor[e.status] ?? t.muted} /> : undefined} />
      {e === null ? (
        notFound ? <EmptyState icon="sparkles-outline" title="Event not found" hint="It may have been removed." /> : <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} radius={radius.lg} />)}</View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
        >
          <Text style={[typo.h1, { color: t.text }]}>{e.title || e.guest?.fullName || cap(e.eventType) || "Event"}</Text>
          <Text style={[typo.caption, { color: t.muted, marginTop: -6 }]}>{[cap(e.eventType), dstr(e.eventDate)].filter(Boolean).join(" · ")}</Text>

          {/* KPI strip */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[["Total", money(e.total)], ["Advance", money(e.advancePaid)], ["Balance", balance > 0 ? money(balance) : "Paid"], ["Pax", String(billablePax || e.guaranteedPax || "—")]].map(([lbl, val], i) => (
              <View key={lbl} style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 11, alignItems: "center" }}>
                <Text style={[{ fontSize: 15.5, fontWeight: "800", color: i === 2 ? (balance > 0 ? t.red : t.green) : t.text }, tabular]} numberOfLines={1}>{val}</Text>
                <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Schedule & venue */}
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>SCHEDULE & VENUE</Text>
            <Info label="Event date" value={dstr(e.eventDate)} />
            <Info label="Time" value={e.startTime ? `${tstr(e.startTime)}${e.endTime ? `–${tstr(e.endTime)}` : ""}` : null} />
            <Info label="Slots" value={e.slots?.length ? e.slots.map((s) => `${s.name}${s.startTime ? ` (${tstr(s.startTime)}–${tstr(s.endTime)})` : ""}`).join(", ") : null} />
            <Info label="Hall" value={e.hall ? `${e.hall.name}${e.hall.capacity ? ` · cap ${e.hall.capacity}` : ""}` : null} />
            <Info label="Setup style" value={cap(e.setupStyle)} />
          </Card>

          {/* Host & contact */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Text style={[typo.label, { color: t.muted, flex: 1 }]}>HOST & CONTACT</Text>
              {e.guest?.phone || e.contactPhone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${e.guest?.phone || e.contactPhone}`)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="call" size={16} color={t.primary} />
                </Pressable>
              ) : null}
            </View>
            <Info label="Guest" value={e.guest ? [e.guest.title, e.guest.fullName].filter(Boolean).join(" ") : null} />
            <Info label="Company" value={e.company?.name} />
            <Info label="Contact" value={e.contactName ? `${e.contactName}${e.contactPhone ? ` · ${e.contactPhone}` : ""}` : e.contactPhone} />
            <Info label="On-site" value={e.onSiteContactName ? `${e.onSiteContactName}${e.onSiteContactPhone ? ` · ${e.onSiteContactPhone}` : ""}` : null} />
            <Info label="Pax (exp / guar / actual)" value={[e.expectedPax, e.guaranteedPax, e.actualPax].some((x) => x != null) ? `${e.expectedPax ?? "—"} / ${e.guaranteedPax ?? "—"} / ${e.actualPax ?? "—"}` : null} />
            <Info label="Source" value={e.bookingSource?.name} />
            <Info label="Booked" value={fdt(e.createdAt)} />
          </Card>

          {/* Menu */}
          {(e.package || menuUrl) ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>MENU / PACKAGE</Text>
              <Info label="Package" value={e.package?.name} />
              <Info label="Rate / pax" value={e.package?.pricePerPax != null ? money(e.package.pricePerPax) : (e.perPlateRate ? money(e.perPlateRate) : null)} />
              {menuUrl ? (
                isPdf ? (
                  <Pressable onPress={() => Linking.openURL(menuUrl)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: tint(t.primary, "14"), borderRadius: radius.md, padding: 12 }}>
                    <Ionicons name="document-text-outline" size={18} color={t.primary} />
                    <Text style={{ color: t.primary, fontWeight: "700", fontSize: 13.5 }}>Open menu card (PDF)</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => Linking.openURL(menuUrl)}>
                    <Image source={{ uri: menuUrl }} style={{ width: "100%", height: 180, borderRadius: radius.md, marginTop: 10, backgroundColor: t.surfaceSunken }} resizeMode="cover" />
                  </Pressable>
                )
              ) : null}
            </Card>
          ) : null}

          {/* Add-on services */}
          {e.items?.length ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>ADD-ON SERVICES</Text>
              {e.items.map((it) => (
                <View key={it.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{it.description}</Text>
                    <Text style={[typo.caption, { color: t.muted }]}>{[cap(it.category), it.quantity && it.unitPrice ? `${it.quantity} × ${money(it.unitPrice)}` : null].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]}>{money(it.amount)}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Notes & lifecycle */}
          {(e.agenda || e.specialRequests || e.securityDeposit || e.damageCharges || e.checkedInAt || e.checkedOutAt || e.lostReason) ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>NOTES & LIFECYCLE</Text>
              {e.agenda ? <Text style={[typo.caption, { color: t.text, marginBottom: 6 }]}>Agenda: {e.agenda}</Text> : null}
              {e.specialRequests ? <Text style={[typo.caption, { color: t.text, marginBottom: 6 }]}>Requests: {e.specialRequests}</Text> : null}
              <Info label="Security deposit" value={e.securityDeposit ? money(e.securityDeposit) : null} />
              <Info label="Damage / overtime" value={e.damageCharges ? money(e.damageCharges) : null} />
              <Info label="Checked in" value={fdt(e.checkedInAt)} />
              <Info label="Checked out" value={fdt(e.checkedOutAt)} />
              <Info label="Lost reason" value={e.lostReason} />
            </Card>
          ) : null}

          {/* Billing summary */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 }}>
              <Text style={[typo.label, { color: t.muted, flex: 1 }]}>BILLING</Text>
              {e.gstMode ? <StatusBadge label={`GST ${cap(e.gstMode)}`} color={t.teal} /> : null}
            </View>
            {e.manualTotal != null ? (
              <Row label="Negotiated package" value={money(e.manualTotal)} />
            ) : (
              <>
                {(e.perPlateRate ?? 0) > 0 ? <Row label={`Catering (${billablePax} × ${money(e.perPlateRate)})`} value={money((e.perPlateRate ?? 0) * billablePax)} /> : null}
                {(e.hallRent ?? 0) > 0 ? <Row label="Hall rent" value={money(e.hallRent)} /> : null}
              </>
            )}
            {(e.items?.length ?? 0) > 0 ? <Row label="Add-on services" value={money((e.items ?? []).reduce((s, it) => s + it.amount, 0))} /> : null}
            {(e.damageCharges ?? 0) > 0 ? <Row label="Damage / overtime" value={money(e.damageCharges)} /> : null}
            {(e.discount ?? 0) > 0 ? <Row label="Discount" value={money(e.discount)} minus muted /> : null}
            <Row label="Subtotal" value={money(e.subtotal ?? (planCharge + (e.items ?? []).reduce((s, it) => s + it.amount, 0)))} muted />
            {(e.serviceCharge ?? 0) > 0 ? <Row label={`Service charge${e.serviceChargePct ? ` (${e.serviceChargePct}%)` : ""}`} value={money(e.serviceCharge)} muted /> : null}
            {(e.taxBreakdown ?? []).map((tl, i) => <Row key={`${tl.code}-${i}`} label={`${tl.name} @ ${tl.rate}%`} value={money(tl.amount)} muted />)}
            {!(e.taxBreakdown?.length) && (e.taxAmount ?? 0) > 0 ? <Row label="Tax" value={money(e.taxAmount)} muted /> : null}
            <View style={{ height: 1, backgroundColor: t.divider, marginVertical: 6 }} />
            <Row label="Grand total" value={money(e.total)} strong />
            <Row label="Paid" value={money(e.advancePaid)} minus muted />
            {byMethod.size ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {[...byMethod.entries()].map(([m, v]) => (
                  <View key={m} style={{ backgroundColor: t.surfaceSunken, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={[{ fontSize: 11.5, fontWeight: "700", color: t.text }, tabular]}>{m}: {money(v)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: t.divider }}>
              <Text style={[typo.bodyStrong, { color: t.text }]}>Balance due</Text>
              <Text style={[{ color: balance > 0 ? t.red : t.green, fontWeight: "800", fontSize: 17 }, tabular]}>{balance > 0 ? money(balance) : "Paid"}</Text>
            </View>
          </Card>

          {/* Payments ledger */}
          {e.payments?.length ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>PAYMENTS</Text>
              {e.payments.map((p) => (
                <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]}>{cap(p.method) || "Payment"}</Text>
                    <Text style={[typo.caption, { color: t.muted }]} numberOfLines={2}>{[fdt(p.createdAt), p.reference ? `Ref ${p.reference}` : null, p.note, p.editedAt ? "edited" : null].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <Text style={[{ color: t.green, fontWeight: "700", fontSize: 14 }, tabular]}>{money(p.amount)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
