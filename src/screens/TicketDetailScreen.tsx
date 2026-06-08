import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import {
  actOnTicket,
  getTicket,
  type TicketAction,
  type TicketDetail,
  type TicketLog,
} from "@/api/tickets";
import { listDepartments, listMembers, type Department, type Member } from "@/api/ops";
import { captureAndUpload } from "@/services/photo";
import type { AppNav, AppStackParamList } from "@/navigation/types";
import { colors, priorityColor, statusColor } from "@/theme";

type StepAction = { label: string; action: TicketAction; color: string; extra?: { delivered: boolean } };

// Mirror TasksScreen.actionsFor: step-driven primary action(s).
function stepActionsFor(t: TicketDetail): StepAction[] {
  const step = t.workflowStep ?? "PENDING";
  if (t.status === "RESOLVED" || t.status === "CLOSED") return [];
  if (step === "DONE") {
    return [
      { label: "Approve", action: "approve", color: colors.green },
      { label: "Reject", action: "reject_done", color: colors.red },
    ];
  }
  switch (step) {
    case "ACCEPTED":
      return [{ label: "On the way", action: "en_route", color: colors.blue }];
    case "EN_ROUTE":
      return [{ label: "Reached", action: "at_location", color: colors.blue }];
    case "AT_LOCATION":
      return [{ label: "Mark done", action: "done", color: colors.green, extra: { delivered: true } }];
    default:
      return [{ label: "Accept", action: "accept", color: colors.blue }];
  }
}

function isTerminal(t: TicketDetail): boolean {
  return t.status === "RESOLVED" || t.status === "CLOSED";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketDetailScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const route = useRoute<RouteProp<AppStackParamList, "TicketDetail">>();
  const ticketId = route.params.ticketId;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reattemptReason, setReattemptReason] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<{ step: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Ticket" });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      setTicket(await getTicket(hotelId, ticketId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [hotelId, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (action: TicketAction, extra?: Parameters<typeof actOnTicket>[3]) => {
      if (!hotelId || busy) return;
      setBusy(true);
      setError(null);
      try {
        await actOnTicket(hotelId, ticketId, action, extra);
        setPendingPhotos([]);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusy(false);
      }
    },
    [hotelId, ticketId, busy, load]
  );

  const onAddPhoto = useCallback(async () => {
    if (!hotelId || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const url = await captureAndUpload(hotelId);
      if (url) setPendingPhotos((p) => [...p, { step: ticket?.workflowStep ?? "DONE", url }]);
    } catch {
      setError("Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }, [hotelId, uploading, ticket?.workflowStep]);

  const onReattempt = useCallback(async () => {
    const reason = reattemptReason.trim();
    await runAction("done", { delivered: false, reason: reason || undefined, photos: pendingPhotos.length ? pendingPhotos : undefined });
    setReattemptReason("");
  }, [reattemptReason, pendingPhotos, runAction]);

  const openReassign = useCallback(async () => {
    if (!hotelId) return;
    setReassignOpen(true);
    setPickerLoading(true);
    try {
      setMembers(await listMembers(hotelId));
    } catch {
      setMembers([]);
    } finally {
      setPickerLoading(false);
    }
  }, [hotelId]);

  const openTransfer = useCallback(async () => {
    if (!hotelId) return;
    setTransferOpen(true);
    setPickerLoading(true);
    try {
      setDepartments(await listDepartments(hotelId));
    } catch {
      setDepartments([]);
    } finally {
      setPickerLoading(false);
    }
  }, [hotelId]);

  const onReassign = useCallback(
    async (toUserId: string) => {
      setReassignOpen(false);
      await runAction("reassign", { toUserId });
    },
    [runAction]
  );

  const onTransfer = useCallback(
    async (toDeptId: string) => {
      setTransferOpen(false);
      await runAction("transfer", { toDeptId });
    },
    [runAction]
  );

  if (!hotelId) return <Center text="No hotel selected." />;
  if (loading && !ticket) return <Center text="Loading…" spinner />;
  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Ticket not found."}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const stepActions = stepActionsFor(ticket);
  const terminal = isTerminal(ticket);
  const statusLabel =
    ticket.workflowStep && ticket.status !== "RESOLVED" ? ticket.workflowStep : ticket.status;
  const photos = ticket.photosJson ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Header card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.code}>{ticket.code}</Text>
          <View
            style={[styles.badge, { backgroundColor: (statusColor[statusLabel] ?? colors.muted) + "22" }]}
          >
            <Text style={[styles.badgeText, { color: statusColor[statusLabel] ?? colors.muted }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.subject}>{ticket.subject}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.pill, { color: priorityColor[ticket.priority] ?? colors.muted }]}>
            {ticket.priority}
          </Text>
          <Text style={styles.meta}>· {ticket.category}</Text>
          {typeof ticket.reattemptCount === "number" && ticket.reattemptCount > 0 ? (
            <Text style={styles.meta}>· {ticket.reattemptCount} re-attempt(s)</Text>
          ) : null}
        </View>
      </View>

      {/* Guest */}
      {ticket.guest ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Guest</Text>
          <Text style={styles.bodyText}>{ticket.guest.fullName}</Text>
          {ticket.guest.phone ? <Text style={styles.meta}>{ticket.guest.phone}</Text> : null}
        </View>
      ) : null}

      {/* Description */}
      {ticket.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.bodyText}>{ticket.description}</Text>
        </View>
      ) : null}

      {/* Photos */}
      {photos.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <Image key={`${p.url}-${i}`} source={{ uri: p.url }} style={styles.photo} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Action buttons */}
      {!terminal ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actions}>
            {stepActions.map((a) => (
              <Pressable
                key={a.action}
                onPress={() => void runAction(a.action, a.action === "done" ? { ...a.extra, photos: pendingPhotos.length ? pendingPhotos : undefined } : a.extra)}
                disabled={busy}
                style={[styles.actionBtn, { backgroundColor: a.color, opacity: busy ? 0.6 : 1 }]}
              >
                <Text style={styles.actionText}>{a.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => void onAddPhoto()}
              disabled={busy || uploading}
              style={[styles.actionBtn, styles.outlineBtn, { opacity: busy || uploading ? 0.6 : 1 }]}
            >
              <Text style={styles.outlineText}>{uploading ? "Uploading…" : `Take photo${pendingPhotos.length ? ` (${pendingPhotos.length})` : ""}`}</Text>
            </Pressable>
            <Pressable
              onPress={() => void openReassign()}
              disabled={busy}
              style={[styles.actionBtn, styles.outlineBtn, { opacity: busy ? 0.6 : 1 }]}
            >
              <Text style={styles.outlineText}>Reassign</Text>
            </Pressable>
            <Pressable
              onPress={() => void openTransfer()}
              disabled={busy}
              style={[styles.actionBtn, styles.outlineBtn, { opacity: busy ? 0.6 : 1 }]}
            >
              <Text style={styles.outlineText}>Transfer</Text>
            </Pressable>
          </View>

          {pendingPhotos.length > 0 ? (
            <View style={[styles.photoRow, { marginTop: 10 }]}>
              {pendingPhotos.map((p, i) => (
                <Image key={`${p.url}-${i}`} source={{ uri: p.url }} style={styles.photo} />
              ))}
            </View>
          ) : null}

          {/* Re-attempt with reason */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Re-attempt</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.muted}
            value={reattemptReason}
            onChangeText={setReattemptReason}
          />
          <Pressable
            onPress={() => void onReattempt()}
            disabled={busy}
            style={[styles.actionBtn, { backgroundColor: colors.amber, marginTop: 8, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={styles.actionText}>Re-attempt</Text>
          </Pressable>

          {busy ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.blue} /> : null}
        </View>
      ) : null}

      {/* Log timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Assignment Log</Text>
        {ticket.logs.length === 0 ? (
          <Text style={styles.meta}>No activity yet.</Text>
        ) : (
          ticket.logs.map((log: TicketLog) => (
            <View key={log.id} style={styles.logRow}>
              <View style={styles.logDot} />
              <View style={styles.logBody}>
                <Text style={styles.logAction}>{log.action}</Text>
                {log.reason ? <Text style={styles.logReason}>{log.reason}</Text> : null}
                <Text style={styles.logTime}>{formatTime(log.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Reassign modal */}
      <PickerModal
        visible={reassignOpen}
        title="Reassign to member"
        loading={pickerLoading}
        onClose={() => setReassignOpen(false)}
        rows={members.map((m) => ({
          id: m.userId,
          title: m.fullName || m.email,
          subtitle: m.department?.name ?? m.role?.name ?? undefined,
        }))}
        onSelect={(id) => void onReassign(id)}
      />

      {/* Transfer modal */}
      <PickerModal
        visible={transferOpen}
        title="Transfer to department"
        loading={pickerLoading}
        onClose={() => setTransferOpen(false)}
        rows={departments.map((d) => ({ id: d.id, title: d.name }))}
        onSelect={(id) => void onTransfer(id)}
      />
    </ScrollView>
  );
}

type PickerRow = { id: string; title: string; subtitle?: string };

function PickerModal({
  visible,
  title,
  loading,
  rows,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  loading: boolean;
  rows: PickerRow[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          {loading ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
          ) : rows.length === 0 ? (
            <Text style={styles.meta}>Nothing available.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {rows.map((row) => (
                <Pressable key={row.id} style={styles.modalRow} onPress={() => onSelect(row.id)}>
                  <Text style={styles.modalRowTitle}>{row.title}</Text>
                  {row.subtitle ? <Text style={styles.meta}>{row.subtitle}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Center({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <View style={styles.center}>
      {spinner ? <ActivityIndicator color={colors.blue} /> : null}
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 28 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  subject: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4, flexWrap: "wrap" },
  pill: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  meta: { color: colors.muted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  bodyText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 84, height: 84, borderRadius: 10, backgroundColor: colors.slate100 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  outlineBtn: { backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.border },
  outlineText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  logRow: { flexDirection: "row", gap: 10, paddingVertical: 6 },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginTop: 5 },
  logBody: { flex: 1 },
  logAction: { color: colors.text, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  logReason: { color: colors.muted, fontSize: 12, marginTop: 2 },
  logTime: { color: colors.muted, fontSize: 11, marginTop: 2 },
  errorBanner: {
    backgroundColor: colors.red + "18",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.red + "44",
  },
  errorBannerText: { color: colors.red, fontSize: 13, fontWeight: "600" },
  errorText: { color: colors.red, fontSize: 14, fontWeight: "600", marginBottom: 12 },
  retryBtn: { backgroundColor: colors.blue, borderRadius: 9, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: "#fff", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8, backgroundColor: colors.bg },
  centerText: { color: colors.muted, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 28,
  },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  modalClose: {
    marginTop: 14,
    backgroundColor: colors.slate100,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: { color: colors.text, fontWeight: "700" },
});
