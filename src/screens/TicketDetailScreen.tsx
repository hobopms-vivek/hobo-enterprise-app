import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { actOnTicket, getTicket, type TicketDetail } from "@/api/tickets";
import { captureAndUpload } from "@/services/photo";
import { useAuthStore } from "@/store/useAuthStore";
import { FinishTaskSheet } from "@/components/FinishTaskSheet";
import { ReassignSheet } from "@/components/ReassignSheet";
import { Avatar, Button, Card, IconChip, Loader, Screen, ScreenHeader, StatusBadge } from "@/components/kit";
import { priorityColor, radius, space, statusColor, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

function fmt(ts?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function TicketDetailScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "TicketDetail">>();
  const user = useAuthStore((s) => s.user);
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const level = hotels.find((h) => h.id === activeHotelId)?.role?.level ?? 5;
  const isManager = level <= 3;

  const [tk, setTk] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    try { setTk(await getTicket(activeHotelId, params.ticketId)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't load ticket."); }
  }, [activeHotelId, params.ticketId]);
  useEffect(() => { void load(); }, [load]);

  async function act(action: Parameters<typeof actOnTicket>[2]) {
    setBusy(true);
    try { await actOnTicket(activeHotelId, params.ticketId, action); await load(); }
    catch (e) { Alert.alert("Action failed", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function takePhoto() {
    const url = await captureAndUpload(activeHotelId);
    if (url) setPending((p) => [...p, url]);
  }

  if (!tk) return <Screen><ScreenHeader title="Ticket" onBack={() => nav.goBack()} />{error ? <ErrorState msg={error} onRetry={load} /> : <Loader />}</Screen>;

  const isMine = tk.assignedToId === user?.id;
  const step = tk.workflowStep;
  const active = tk.status !== "RESOLVED" && tk.status !== "CLOSED";
  const photos = [...(tk.photosJson ?? []).map((p) => p.url), ...pending];

  return (
    <Screen>
      <ScreenHeader title={tk.code} onBack={() => nav.goBack()} right={<StatusBadge label={tk.status.replace("_", " ")} color={statusColor[tk.status] ?? t.muted} />} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}>
        {/* Header card */}
        <Card accent={tk.status === "ESCALATED" ? t.red : undefined}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="flag" size={13} color={priorityColor[tk.priority] ?? t.muted} />
              <Text style={{ color: priorityColor[tk.priority] ?? t.muted, fontWeight: "800", fontSize: 12.5, textTransform: "capitalize" }}>{tk.priority}</Text>
            </View>
            {tk.category ? <StatusBadge label={tk.category.replace("_", " ")} color={t.muted} /> : null}
            {tk.reattemptCount ? <Text style={[typo.caption, { color: t.amber, marginLeft: "auto" }]}>re-attempt ×{tk.reattemptCount}</Text> : null}
          </View>
          <Text style={[typo.h1, { color: t.text }]}>{tk.subject}</Text>
        </Card>

        {/* Guest */}
        {tk.guest?.fullName ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={tk.guest.fullName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>{tk.guest.fullName}</Text>
                {tk.guest.phone ? <Text style={[typo.caption, { color: t.muted }]}>{tk.guest.phone}</Text> : null}
              </View>
              {tk.guest.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${tk.guest?.phone}`)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="call" size={18} color={t.primary} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Description */}
        {tk.description ? (
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Description</Text>
            <Text style={[typo.body, { color: t.text, lineHeight: 21 }]}>{tk.description}</Text>
          </Card>
        ) : null}

        {/* Photos */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={[typo.label, { color: t.muted }]}>Photos {photos.length ? `(${photos.length})` : ""}</Text>
            {isMine && active ? <Pressable onPress={takePhoto} style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="camera-outline" size={16} color={t.primary} /><Text style={{ color: t.primary, fontWeight: "700", fontSize: 12.5 }}>Add photo</Text></Pressable> : null}
          </View>
          {photos.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map((url, i) => <Image key={`${url}-${i}`} source={{ uri: url }} style={{ width: 88, height: 88, borderRadius: radius.md }} />)}
            </View>
          ) : <Text style={[typo.caption, { color: t.faint }]}>No photos yet.</Text>}
        </Card>

        {/* Actions */}
        {active ? (
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 10 }]}>Actions</Text>
            <View style={{ gap: 10 }}>
              {step === "DONE" ? (
                isManager ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button title="Approve" variant="success" icon="checkmark" full={false} style={{ flex: 1 }} loading={busy} onPress={() => act("approve")} />
                    <Button title="Reject" variant="outline" icon="close" full={false} style={{ flex: 1 }} loading={busy} onPress={() => act("reject_done")} />
                  </View>
                ) : <Text style={[typo.caption, { color: t.amber, fontWeight: "700" }]}>⏳ Awaiting manager approval</Text>
              ) : isMine ? (
                (step === "PENDING" || step === "ACCEPTED" || !step) ? <Button title="Start task" icon="play" loading={busy} onPress={() => act("en_route")} />
                : step === "EN_ROUTE" ? (
                  <View style={{ gap: 10 }}>
                    <Button title="Arrived" icon="location" variant="outline" loading={busy} onPress={() => act("at_location")} />
                    <Button title="Complete task" icon="checkmark-circle" variant="success" onPress={() => setFinishOpen(true)} />
                  </View>
                ) : <Button title="Complete task" icon="checkmark-circle" variant="success" onPress={() => setFinishOpen(true)} />
              ) : null}
              {isManager ? <Button title="Reassign / Transfer" icon="swap-horizontal" variant="outline" onPress={() => setReassignOpen(true)} /> : null}
            </View>
          </Card>
        ) : null}

        {/* Timeline */}
        {tk.logs?.length ? (
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 12 }]}>Activity timeline</Text>
            {[...tk.logs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((log, i, arr) => (
              <View key={log.id} style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary, marginTop: 3 }} />
                  {i < arr.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: t.divider, marginVertical: 2 }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={[typo.bodyStrong, { color: t.text, textTransform: "capitalize" }]}>{log.action.replace(/_/g, " ")}</Text>
                  {log.reason ? <Text style={[typo.caption, { color: t.muted }]}>{log.reason}</Text> : null}
                  <Text style={[typo.caption, { color: t.faint, marginTop: 1 }, tabular]}>{fmt(log.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <FinishTaskSheet visible={finishOpen} onClose={() => setFinishOpen(false)} hotelId={activeHotelId} ticketId={tk.id} initialPhotos={pending} onFinished={() => { setPending([]); void load(); }} />
      <ReassignSheet visible={reassignOpen} onClose={() => setReassignOpen(false)} hotelId={activeHotelId} ticketId={tk.id} onDone={load} />
    </Screen>
  );
}

function ErrorState({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
      <IconChip icon="alert-circle-outline" color={t.red} size={52} />
      <Text style={[typo.title, { color: t.text }]}>Something went wrong</Text>
      <Text style={[typo.caption, { color: t.muted, textAlign: "center" }]}>{msg}</Text>
      <Button title="Try again" variant="outline" icon="refresh" full={false} onPress={onRetry} />
    </View>
  );
}
