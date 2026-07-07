import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { LEAD_STATUSES, listLeads, updateLead, type Lead } from "@/api/leads";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Card, EmptyState, Screen, ScreenHeader, Sheet, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number | null) => (n != null ? `₹${Math.round(n).toLocaleString("en-IN")}` : "");
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export function LeadsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const level = useAuthStore((s) => s.hotels.find((h) => h.id === hotelId))?.role?.level ?? 5;
  const canLeads = level <= 3; // web gates leads on manager+ (no fine permission)

  const statusColor: Record<string, string> = {
    NEW: t.blue, CONTACTED: t.teal, QUALIFIED: t.violet, FOLLOW_UP: t.amber, CONVERTED: t.green, LOST: t.red, NO_ANSWER: t.muted,
  };

  const [items, setItems] = useState<Lead[] | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [sel, setSel] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setErr(null); setItems(await listLeads(hotelId)); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "Only managers and above can view leads." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (items ?? []).forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1; });
    return c;
  }, [items]);
  const rows = useMemo(() => (items ?? []).filter((l) => filter === "ALL" || l.status === filter), [items, filter]);

  async function setStatus(l: Lead, status: string) {
    setBusy(true);
    try { await updateLead(hotelId, l.id, { status }); setSel(null); await load(); }
    catch (e) { Alert.alert("Couldn't update", e instanceof Error ? e.message : "Try again."); }
    finally { setBusy(false); }
  }
  async function saveNotes() {
    if (!sel) return;
    setBusy(true);
    try { await updateLead(hotelId, sel.id, { notes: notes.trim() }); setSel(null); await load(); }
    catch (e) { Alert.alert("Couldn't save", e instanceof Error ? e.message : "Try again."); }
    finally { setBusy(false); }
  }

  if (!canLeads) {
    return (
      <Screen>
        <ScreenHeader title="Leads" onBack={() => nav.goBack()} />
        <EmptyState icon="lock-closed-outline" title="No access" hint="Only managers and above can view the enquiry pipeline." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Leads" subtitle="Enquiry pipeline" onBack={() => nav.goBack()} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base, paddingVertical: 10, alignItems: "center" }}>
        {(["ALL", ...LEAD_STATUSES] as string[]).map((f) => {
          const active = filter === f;
          const n = f === "ALL" ? items?.length ?? 0 : counts[f] ?? 0;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{f === "ALL" ? "All" : cap(f)}{n ? ` ${n}` : ""}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {items === null ? (
        <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={100} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "person-add-outline"} title={err?.title ?? "No leads"} hint={err?.hint ?? "Enquiries appear here."} />}
          renderItem={({ item: l }) => (
            <Card onPress={() => { setSel(l); setNotes(l.notes ?? ""); }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={[typo.h2, { color: t.text, flex: 1 }]} numberOfLines={1}>{l.name}</Text>
                <StatusBadge label={cap(l.status)} color={statusColor[l.status] ?? t.muted} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <View style={{ backgroundColor: tint(t.teal, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: t.teal, fontSize: 10.5, fontWeight: "700" }}>{cap(l.source)}</Text></View>
                {l.checkIn ? <Text style={[typo.caption, { color: t.muted }, tabular]}>{fmt(l.checkIn)}{l.checkOut ? `–${fmt(l.checkOut)}` : ""}</Text> : null}
                {l.guestCount ? <Text style={[typo.caption, { color: t.muted }, tabular]}>· {l.guestCount}p</Text> : null}
                {l.budget ? <Text style={[typo.caption, { color: t.muted }, tabular]}>· {money(l.budget)}</Text> : null}
                {l.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${l.phone}`)} style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: tint(t.primary, "18"), borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Ionicons name="call" size={13} color={t.primary} /><Text style={{ color: t.primary, fontSize: 12, fontWeight: "700" }}>Call</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          )}
        />
      )}

      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel ? (
          <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <StatusBadge label={cap(sel.status)} color={statusColor[sel.status] ?? t.muted} />
              <Text style={[typo.caption, { color: t.muted }]}>{cap(sel.source)}{sel.checkIn ? ` · ${fmt(sel.checkIn)}${sel.checkOut ? `–${fmt(sel.checkOut)}` : ""}` : ""}{sel.budget ? ` · ${money(sel.budget)}` : ""}</Text>
              {sel.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${sel.phone}`)} style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="call" size={18} color={t.primary} />
                </Pressable>
              ) : null}
            </View>

            <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>Move to</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {LEAD_STATUSES.filter((s) => s !== sel.status).map((s) => (
                <Pressable key={s} onPress={() => setStatus(sel, s)} disabled={busy} style={{ backgroundColor: tint(statusColor[s] ?? t.muted, "18"), borderWidth: 1, borderColor: tint(statusColor[s] ?? t.muted, "44"), borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 }}>
                  <Text style={{ color: statusColor[s] ?? t.muted, fontSize: 12.5, fontWeight: "700" }}>{cap(s)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Follow-up notes…" placeholderTextColor={t.faint} multiline textAlignVertical="top" style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, minHeight: 90, fontSize: 14.5 }} />
            <View style={{ marginTop: 14, marginBottom: 8 }}><Button title="Save notes" icon="save-outline" variant="outline" loading={busy} onPress={saveNotes} /></View>
          </ScrollView>
        ) : null}
      </Sheet>
    </Screen>
  );
}
