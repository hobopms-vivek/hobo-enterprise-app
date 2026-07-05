import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listApprovals, resolveApproval, type ApprovalItem, type ApprovalKind } from "@/api/approvals";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { Button, Card, EmptyState, IconChip, Screen, ScreenHeader, SegmentedTabs, Sheet, Skeleton } from "@/components/kit";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
const rel = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

export function ApprovalsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [kind, setKind] = useState<ApprovalKind>("deletion");
  const [items, setItems] = useState<ApprovalItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reject, setReject] = useState<ApprovalItem | null>(null);
  const [note, setNote] = useState("");

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setItems(await listApprovals(hotelId, kind)); } catch { setItems([]); }
  }, [hotelId, kind]);
  useFocusEffect(useCallback(() => { setItems(null); void load(); }, [load]));
  useRealtime(hotelId, (e) => { if (e.type.includes("request")) void load(); });

  async function resolve(item: ApprovalItem, action: "approve" | "reject", n?: string) {
    setBusyId(item.id);
    try { await resolveApproval(hotelId, item, action, n); await load(); }
    catch (e) { Alert.alert("Couldn't process", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusyId(null); }
  }

  const count = items?.length ?? 0;

  return (
    <Screen>
      <ScreenHeader title="Approvals" count={count || undefined} onBack={() => nav.goBack()} />
      <View style={{ padding: space.base, paddingBottom: 8 }}>
        <SegmentedTabs value={kind} onChange={setKind} tabs={[{ key: "deletion", label: "Deletions" }, { key: "cancellation", label: "Cancellations" }]} />
      </View>

      {items === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 12 }}>{[0, 1].map((i) => <Skeleton key={i} height={150} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => `${x.entity}-${x.id}`}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12 }}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="Nothing to approve" hint="All pending requests have been processed." />}
          renderItem={({ item }) => {
            const target = item.entity === "booking"
              ? [item.code, item.guest, item.roomType, `${fmt(item.checkInDate)}–${fmt(item.checkOutDate)}`].filter(Boolean).join(" · ")
              : [item.code ?? item.title, item.hall, fmt(item.eventDate)].filter(Boolean).join(" · ");
            return (
              <Card accent={t.amber}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <IconChip icon={item.entity === "banquet" ? "sparkles-outline" : "trash-outline"} color={t.amber} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]}>{item.entity === "banquet" ? "Banquet" : "Booking"} {item.reqType} request</Text>
                    <Text style={[typo.caption, { color: t.muted }, tabular]} numberOfLines={2}>{target || "—"}</Text>
                  </View>
                </View>
                {item.reason ? <Text style={[typo.caption, { color: t.muted, fontStyle: "italic", marginBottom: 6 }]}>“{item.reason}”</Text> : null}
                <Text style={[typo.caption, { color: t.faint, marginBottom: 12 }]}>Requested by {item.requesterName ?? "staff"} · {rel(item.createdAt)}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="Approve" variant="success" icon="checkmark" full={false} style={{ flex: 1 }} loading={busyId === item.id} onPress={() => resolve(item, "approve")} />
                  <Button title="Reject" variant="outline" icon="close" full={false} style={{ flex: 1 }} onPress={() => { setNote(""); setReject(item); }} />
                </View>
              </Card>
            );
          }}
        />
      )}

      <Sheet visible={!!reject} onClose={() => setReject(null)} title="Reject request">
        <Text style={[typo.caption, { color: t.muted, marginBottom: 8 }]}>Add an optional note for the requester.</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Reason for rejection…" placeholderTextColor={t.faint} multiline style={{ minHeight: 72, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, textAlignVertical: "top", backgroundColor: t.surface, marginBottom: 12 }} />
        <Button title="Reject request" variant="danger" icon="close" loading={busyId === reject?.id} onPress={async () => { const it = reject; setReject(null); if (it) await resolve(it, "reject", note || undefined); }} />
        <View style={{ height: space.base }} />
      </Sheet>
    </Screen>
  );
}
