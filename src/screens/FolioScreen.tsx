import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getFolio, type Folio, type FolioCharge, type FolioChargeNode } from "@/api/bookings";
import { getInvoice } from "@/api/finance";
import { invoiceHtml } from "@/services/invoiceHtml";
import { previewHtml, shareHtmlAsPdf } from "@/services/documents";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Card, EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const money = (n?: number | null) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

const payStatusColor = (s?: string) => ({ PAID: "green", PARTIAL: "amber", PENDING: "muted", REFUNDED: "violet" } as Record<string, string>)[s ?? ""] ?? "muted";

/** Build the top-level → children tree from a flat charge list (fallback when chargeTree absent). */
function buildTree(charges: FolioCharge[]): FolioChargeNode[] {
  const top = charges.filter((c) => !c.parentId && !c.voided);
  return top.map((c) => ({ ...c, children: charges.filter((k) => k.parentId === c.id && !k.voided) }));
}

export function FolioScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "Folio">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const hotel = useAuthStore((s) => s.hotels.find((h) => h.id === hotelId));
  // Invoices can be viewed/downloaded by anyone the server lets read them.
  const canInvoice = !!hotel && hotel.enabledModules.includes("finance") &&
    (hotel.permissions.includes("finance.invoice.read") || hotel.permissions.includes("front_desk.booking.read"));
  const [folio, setFolio] = useState<Folio | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyInv, setBusyInv] = useState<string | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setFolio(await getFolio(hotelId, params.bookingId)); } catch { setFolio({ charges: [], payments: [], totals: { balance: 0 } }); }
  }, [hotelId, params.bookingId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function openInvoice(id: string, mode: "preview" | "pdf") {
    setBusyInv(id + mode);
    try {
      const html = invoiceHtml(await getInvoice(hotelId, id));
      if (mode === "preview") await previewHtml(html);
      else await shareHtmlAsPdf(html, "invoice.pdf");
    } catch (e) { Alert.alert("Couldn't open invoice", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusyInv(null); }
  }

  const rs = folio?.roomStay;
  const tot = folio?.totals;
  const tree = folio?.chargeTree?.length ? folio.chargeTree : folio ? buildTree(folio.charges) : [];
  const pays = folio?.payments ?? [];

  // by-method chips (REFUND subtracts) + advance total
  const byMethod = new Map<string, number>();
  let advance = 0;
  for (const p of pays) {
    const sign = p.type === "REFUND" ? -1 : 1;
    const key = cap(p.method) || cap(p.type);
    byMethod.set(key, (byMethod.get(key) ?? 0) + sign * p.amount);
    if (p.type === "ADVANCE") advance += p.amount;
  }

  const b = folio?.booking;
  const taxable = rs ? rs.totalAmount - rs.taxAmount : 0;

  const Row = ({ label, value, hint, strong, muted, minus, danger }: { label: string; value: string; hint?: string; strong?: boolean; muted?: boolean; minus?: boolean; danger?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 5 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[typo.body, { color: strong ? t.text : muted ? t.muted : t.text, fontWeight: strong ? "700" : "500" }]}>{label}</Text>
        {hint ? <Text style={[typo.caption, { color: t.faint }]} numberOfLines={2}>{hint}</Text> : null}
      </View>
      <Text style={[{ color: danger ? t.red : strong ? t.text : muted ? t.muted : t.text, fontWeight: strong ? "800" : "600", fontSize: strong ? 15 : 14 }, tabular]}>{minus ? "− " : ""}{value}</Text>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={`Folio · ${params.code ?? b?.code ?? ""}`} subtitle="Full billing breakdown" onBack={() => nav.goBack()} right={b?.paymentStatus ? <StatusBadge label={cap(b.paymentStatus)} color={(t as Record<string, string>)[payStatusColor(b.paymentStatus)]} /> : undefined} />

      {folio === null ? (
        <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={130} radius={radius.lg} />)}</View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
        >
          {/* Hero KPI strip */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[["Grand total", money(tot?.grandTotal)], ["Paid", money(tot?.amountPaid)], ["Balance", (tot?.balance ?? 0) > 0 ? money(tot?.balance) : "Paid"]].map(([lbl, val], i) => (
              <View key={lbl} style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 12, alignItems: "center" }}>
                <Text style={[{ fontSize: 17, fontWeight: "800", color: i === 2 ? ((tot?.balance ?? 0) > 0 ? t.red : t.green) : t.text }, tabular]} numberOfLines={1}>{val}</Text>
                <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Room stay breakdown */}
          {rs ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
                <Text style={[typo.label, { color: t.muted, flex: 1 }]}>ROOM STAY</Text>
                {rs.gstMode ? <StatusBadge label={`GST ${cap(rs.gstMode)}`} color={t.teal} /> : null}
                {rs.invoiced ? <StatusBadge label="Invoiced" color={t.violet} /> : null}
              </View>
              <Row label="Room charge (pre-tax)" value={money(rs.roomCharge)} />
              {rs.extraCharge > 0 ? <Row label="Extra charge" value={money(rs.extraCharge)} /> : null}
              {rs.discount > 0 ? <Row label="Discount" value={money(rs.discount)} minus muted /> : null}
              {rs.promotions?.length && rs.promotions.some((p) => (p.amount ?? 0) > 0) ? (
                <Row label="Rate-plan promotions" hint={rs.promotions.map((p) => p.name || p.code).filter(Boolean).join(", ")} value={money(rs.promotions.reduce((s, p) => s + (p.amount ?? 0), 0))} minus muted />
              ) : null}
              {rs.taxAmount > 0 ? <Row label="Taxable value" value={money(taxable)} muted /> : null}
              {(rs.taxBreakdown ?? []).map((tl, i) => (
                <Row key={`${tl.code}-${i}`} label={`${tl.name} @ ${tl.rate}%`} value={money(tl.amount)} muted />
              ))}
              <View style={{ height: 1, backgroundColor: t.divider, marginVertical: 6 }} />
              <Row label="Room stay total" value={money(rs.totalAmount)} strong />
            </Card>
          ) : null}

          {/* Additional charges (itemized tree) */}
          {tree.length ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>ADDITIONAL CHARGES</Text>
              {tree.map((c) => {
                const sub = [cap(c.category), c.source ? cap(c.source) : null, c.sacCode ? `SAC ${c.sacCode}` : null, (c.quantity && c.unitPrice) ? `${c.quantity} × ${money(c.unitPrice)}` : null].filter(Boolean).join(" · ");
                return (
                  <View key={c.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.divider }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{c.description || cap(c.category)}</Text>
                          {c.invoiced ? <StatusBadge label="Invoiced" color={t.violet} /> : null}
                        </View>
                        {sub ? <Text style={[typo.caption, { color: t.muted }]} numberOfLines={2}>{sub}</Text> : null}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]}>{money(c.amount + (c.taxAmount ?? 0))}</Text>
                        {(c.taxAmount ?? 0) > 0 ? <Text style={[typo.caption, { color: t.faint }]}>incl. {money(c.taxAmount)} tax</Text> : null}
                      </View>
                    </View>
                    {(c.children ?? []).map((ch) => (
                      <View key={ch.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 14, paddingTop: 4 }}>
                        <Text style={[typo.caption, { color: t.muted, flex: 1 }]} numberOfLines={1}>{ch.description}{ch.quantity && ch.unitPrice ? ` · ${ch.quantity} × ${money(ch.unitPrice)}` : ""}</Text>
                        <Text style={[{ color: t.muted, fontSize: 12.5, fontWeight: "600" }, tabular]}>{money(ch.amount + (ch.taxAmount ?? 0))}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </Card>
          ) : null}

          {/* Payments */}
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>PAYMENTS & ADVANCES</Text>
            {byMethod.size ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {[...byMethod.entries()].map(([m, v]) => (
                  <View key={m} style={{ backgroundColor: t.surfaceSunken, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={[{ fontSize: 12, fontWeight: "700", color: t.text }, tabular]}>{m}: {money(v)}</Text>
                  </View>
                ))}
                {advance > 0 ? (
                  <View style={{ backgroundColor: tint(t.teal, "18"), borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={[{ fontSize: 12, fontWeight: "700", color: t.teal }, tabular]}>Advance: {money(advance)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {pays.length ? pays.map((p) => {
              const refund = p.type === "REFUND";
              return (
                <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <StatusBadge label={cap(p.type)} color={refund ? t.red : p.type === "ADVANCE" ? t.teal : t.blue} />
                      <Text style={[typo.bodyStrong, { color: t.text }]}>{cap(p.method) || "—"}</Text>
                    </View>
                    <Text style={[typo.caption, { color: t.muted }]} numberOfLines={2}>{[fdate(p.createdAt), p.reference ? `Ref ${p.reference}` : null, p.note].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <Text style={[{ color: refund ? t.red : t.green, fontWeight: "700", fontSize: 14 }, tabular]}>{refund ? "− " : ""}{money(p.amount)}</Text>
                </View>
              );
            }) : <Text style={[typo.caption, { color: t.faint, paddingVertical: 6 }]}>No payments recorded yet.</Text>}
          </Card>

          {/* Totals ladder */}
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>SUMMARY</Text>
            <Row label="Room stay total" value={money(tot?.roomStayTotal)} />
            <Row label="Additional charges" value={money(tot?.chargesSubtotal)} />
            {(tot?.chargesTax ?? 0) > 0 ? <Row label="Charges tax" value={money(tot?.chargesTax)} muted /> : null}
            <View style={{ height: 1, backgroundColor: t.divider, marginVertical: 6 }} />
            <Row label="Grand total" value={money(tot?.grandTotal)} strong />
            <Row label="Amount paid" value={money(tot?.amountPaid)} minus muted />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: t.divider }}>
              <Text style={[typo.bodyStrong, { color: t.text }]}>Balance due</Text>
              <Text style={[{ color: (tot?.balance ?? 0) > 0 ? t.red : t.green, fontWeight: "800", fontSize: 17 }, tabular]}>{(tot?.balance ?? 0) > 0 ? money(tot?.balance) : "Paid"}</Text>
            </View>
          </Card>

          {/* Invoices */}
          {folio?.invoices?.length ? (
            <Card>
              <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>INVOICES</Text>
              {folio.invoices.map((inv) => (
                <View key={inv.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{inv.number || inv.displayName || cap(inv.docType)}</Text>
                      <Text style={[typo.caption, { color: t.muted }]}>{cap(inv.docType)} · {cap(inv.status)}{inv.issuedAt ? ` · ${fdate(inv.issuedAt)}` : ""}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]}>{money(inv.total)}</Text>
                      {inv.balance > 0 ? <Text style={[typo.caption, { color: t.red }]}>Bal {money(inv.balance)}</Text> : null}
                    </View>
                  </View>
                  {canInvoice ? (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <Button title="View" icon="eye-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} loading={busyInv === inv.id + "preview"} onPress={() => openInvoice(inv.id, "preview")} />
                      <Button title="Download PDF" icon="download-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} loading={busyInv === inv.id + "pdf"} onPress={() => openInvoice(inv.id, "pdf")} />
                    </View>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {!rs && !tree.length && !pays.length ? <EmptyState icon="receipt-outline" title="No folio activity" hint="No charges or payments yet." /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}
