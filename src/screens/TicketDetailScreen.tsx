import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { actOnTicket, getTicket, type TicketDetail } from "@/api/tickets";
import { captureAndUpload } from "@/services/photo";
import { fixMediaUrl } from "@/api/uploads";
import { useAuthStore } from "@/store/useAuthStore";
import { FinishTaskSheet } from "@/components/FinishTaskSheet";
import { ReassignSheet } from "@/components/ReassignSheet";
import { Avatar, Button, Card, IconChip, Loader, Screen, ScreenHeader, StatusBadge, type Ion } from "@/components/kit";
import { money } from "@/lib/format";
import { priorityColor, radius, space, statusColor, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

function fmt(ts?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const sdate = (ts?: string | null) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—");
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

/** Label → value row for the ticket's Details card (mirrors the web drawer's `Field`). */
function MetaRow({ icon, label, value, danger }: { icon: Ion; label: string; value: string; danger?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
      <Ionicons name={icon} size={15} color={t.faint} style={{ flexShrink: 0 }} />
      <Text style={[typo.caption, { color: t.muted, flexShrink: 0 }]}>{label}</Text>
      <Text style={[typo.caption, { color: danger ? t.red : t.text, fontWeight: "600", marginLeft: "auto", flexShrink: 1, textAlign: "right" }]} numberOfLines={2}>{value}</Text>
    </View>
  );
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
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Same fix as FinishTaskSheet: preview the local shot immediately, surface a real error
  // instead of dying as a swallowed unhandled rejection.
  //
  // NOTE these photos live only in `pending` until the task is finished — the ticket API has no
  // photo-only persist route, and the `done` action is what writes `photosJson`. `pending` is
  // handed to FinishTaskSheet via `initialPhotos`, so anything shot here is included when the
  // task is completed. Leaving the screen before finishing discards them, which is why the
  // button is only offered while the task is still active.
  async function takePhoto() {
    if (uploading) return;
    setUploading(true);
    try {
      const url = await captureAndUpload(activeHotelId, setLocalUri);
      if (url) setPending((p) => [...p, url]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploading(false);
      setLocalUri(null);
    }
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
            <Text style={[typo.label, { color: t.muted, marginBottom: 10 }]}>Guest</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={tk.guest.fullName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{[tk.guest.title, tk.guest.fullName].filter(Boolean).join(" ")}</Text>
                {tk.guest.phone ? <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{tk.guest.phone}</Text> : null}
                {tk.guest.email ? <Text style={[typo.caption, { color: t.faint }]} numberOfLines={1}>{tk.guest.email}</Text> : null}
              </View>
              {tk.guest.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${tk.guest?.phone}`)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ionicons name="call" size={18} color={t.primary} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Stay — the booking behind this ticket (or, for a room-scoped ticket, whoever is in
            that room right now). Tapping it opens the full booking. */}
        {tk.stay ? (
          <Card onPress={() => nav.navigate("BookingDetail", { bookingId: tk.stay!.id })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={[typo.label, { color: t.muted }]}>Stay</Text>
              <Text style={[typo.caption, { color: t.faint, flexShrink: 1 }, tabular]} numberOfLines={1}>{tk.stay.code}</Text>
              <View style={{ marginLeft: "auto", flexShrink: 0 }}>
                <StatusBadge label={tk.stay.status.replace(/_/g, " ")} color={tk.stay.status === "CHECKED_IN" ? t.green : t.muted} />
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="bed-outline" size={15} color={t.muted} style={{ flexShrink: 0 }} />
              <Text style={[typo.bodyStrong, { color: t.text, flexShrink: 1 }]} numberOfLines={1}>
                {tk.stay.room ? `Room ${tk.stay.room}` : "Room not assigned"}
                {tk.stay.roomType ? ` · ${tk.stay.roomType}` : ""}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={15} color={t.muted} style={{ flexShrink: 0 }} />
              <Text style={[typo.caption, { color: t.muted, flexShrink: 1 }, tabular]} numberOfLines={1}>
                {sdate(tk.stay.checkInDate)} → {sdate(tk.stay.checkOutDate)} · {tk.stay.nights}n · {(tk.stay.adults ?? 0)}A{tk.stay.children ? ` ${tk.stay.children}C` : ""}
              </Text>
            </View>

            {tk.stay.ratePlan || tk.stay.source ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="pricetag-outline" size={15} color={t.muted} style={{ flexShrink: 0 }} />
                <Text style={[typo.caption, { color: t.muted, flexShrink: 1 }]} numberOfLines={1}>
                  {[tk.stay.ratePlan, tk.stay.mealPlan, tk.stay.source].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}

            {/* Folio-accurate balance (room total + folio charges − paid) — never totalAmount−paid,
                which reads "Paid" while F&B/extras are still outstanding. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 8 }}>
              <Text style={[typo.caption, { color: t.muted, flexShrink: 1 }, tabular]} numberOfLines={1}>
                {money(tk.stay.total)} total · {money(tk.stay.paid)} paid
              </Text>
              <Text style={[{ color: tk.stay.balance > 0 ? t.red : t.green, fontWeight: "800", fontSize: 13, marginLeft: "auto", flexShrink: 0 }, tabular]} numberOfLines={1}>
                {tk.stay.balance > 0 ? `${money(tk.stay.balance)} due` : "Paid"}
              </Text>
            </View>
          </Card>
        ) : tk.room ? (
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>Room</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="bed-outline" size={15} color={t.muted} style={{ flexShrink: 0 }} />
              <Text style={[typo.bodyStrong, { color: t.text, flexShrink: 1 }]} numberOfLines={1}>
                Room {tk.room.roomNumber}{tk.room.roomType ? ` · ${tk.room.roomType}` : ""}
              </Text>
              <Text style={[typo.caption, { color: t.faint, marginLeft: "auto", flexShrink: 0 }]}>No active stay</Text>
            </View>
          </Card>
        ) : null}

        {/* Ticket meta */}
        <Card>
          <Text style={[typo.label, { color: t.muted, marginBottom: 10 }]}>Details</Text>
          <MetaRow icon="business-outline" label="Department" value={tk.assignedDeptName ?? "—"} />
          <MetaRow icon="person-outline" label="Assignee" value={tk.assignedToName ?? "Unassigned"} />
          <MetaRow icon="chatbubble-ellipses-outline" label="Channel" value={cap(tk.channel) || "—"} />
          <MetaRow icon="time-outline" label="Created" value={`${fmt(tk.createdAt)}${tk.createdByName ? ` · by ${tk.createdByName}` : ""}`} />
          {tk.botQuestionLabel ? <MetaRow icon="list-outline" label="From menu" value={tk.botQuestionLabel} /> : null}
          {tk.completionMinutes != null ? <MetaRow icon="stopwatch-outline" label="Completion timer" value={`${tk.completionMinutes} min${tk.isOverdue ? " · overdue" : ""}`} danger={tk.isOverdue} /> : null}
          {tk.deliveryStatus ? <MetaRow icon="flag-outline" label="Delivery" value={cap(tk.deliveryStatus)} /> : null}
          {tk.resolution ? <MetaRow icon="checkmark-circle-outline" label="Resolution" value={tk.resolution} /> : null}
        </Card>

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
            {isMine && active ? (
              <Pressable onPress={takePhoto} disabled={uploading} style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, opacity: uploading ? 0.5 : 1 }}>
                {uploading ? <ActivityIndicator size="small" color={t.primary} /> : <Ionicons name="camera-outline" size={16} color={t.primary} />}
                <Text style={{ color: t.primary, fontWeight: "700", fontSize: 12.5 }}>{uploading ? "Uploading…" : "Add photo"}</Text>
              </Pressable>
            ) : null}
          </View>
          {photos.length || localUri ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map((url, i) => <Image key={`${url}-${i}`} source={{ uri: fixMediaUrl(url) }} style={{ width: 88, height: 88, borderRadius: radius.md }} />)}
              {localUri ? (
                <View style={{ width: 88, height: 88, borderRadius: radius.md, overflow: "hidden" }}>
                  <Image source={{ uri: localUri }} style={{ width: 88, height: 88 }} />
                  <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#0006" }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                </View>
              ) : null}
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
