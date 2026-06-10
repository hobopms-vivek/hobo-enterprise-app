import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { actOnTicket, listTickets, type Ticket, type TicketAction } from "@/api/tickets";
import { useRealtime } from "@/realtime/useRealtime";
import { buzzNewTask } from "@/services/alert";
import { slaLabel } from "@/utils/sla";
import type { AppNav } from "@/navigation/types";
import { colors, priorityColor, statusColor } from "@/theme";

type Bucket = "new" | "in_progress" | "done";
const BUCKETS: { key: Bucket; label: string; statuses: string[] }[] = [
  { key: "new", label: "New", statuses: ["OPEN", "ASSIGNED"] },
  { key: "in_progress", label: "In Progress", statuses: ["IN_PROGRESS", "ESCALATED"] },
  { key: "done", label: "Done", statuses: ["RESOLVED", "CLOSED"] },
];

// Hobo-exp parity: a task is AUTO-ACCEPTED on assignment, so the assignee never
// taps "Accept" — their first button is "Start" (→ en route), then "Complete".
// A manager (level ≤ 3) is the one who Approves/Rejects a completed task.
function fieldActions(t: Ticket, me: string | undefined, isManager: boolean): { label: string; action: TicketAction; color: string }[] {
  if (t.status === "RESOLVED" || t.status === "CLOSED") return [];
  const step = t.workflowStep ?? "ACCEPTED";
  if (step === "DONE") {
    if (isManager) {
      return [
        { label: "Approve", action: "approve", color: colors.green },
        { label: "Reject", action: "reject_done", color: colors.red },
      ];
    }
    return []; // assignee just waits for the manager to approve
  }
  if (t.assignedToId && t.assignedToId === me) {
    if (step === "EN_ROUTE" || step === "AT_LOCATION") return [{ label: "Complete Task", action: "done", color: colors.green }];
    return [{ label: "Start", action: "en_route", color: colors.blue }]; // PENDING / ACCEPTED
  }
  return [];
}

export function TasksScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const me = useAuthStore((s) => s.user?.id);
  const hotels = useAuthStore((s) => s.hotels);
  const roleLevel = hotels.find((h) => h.id === hotelId)?.role?.level ?? 5;
  const isManager = roleLevel <= 3; // SSA/SA/Admin/Manager
  const isAttendant = roleLevel >= 4; // attendants see only their own tasks
  const navigation = useNavigation<AppNav>();
  const [bucket, setBucket] = useState<Bucket>("new");
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  // Tracks the hotel a fetch was started for, so a response that lands after the
  // user switched hotels can be discarded instead of overwriting the new list.
  const hotelIdRef = useRef(hotelId);
  useEffect(() => { hotelIdRef.current = hotelId; }, [hotelId]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const forHotel = hotelId;
    try {
      const data = await listTickets(forHotel, { mine: isAttendant });
      if (forHotel !== hotelIdRef.current) return; // hotel switched mid-flight — drop stale data
      setItems(data);
    } catch {
      if (forHotel === hotelIdRef.current) setItems([]);
    } finally {
      if (forHotel === hotelIdRef.current) setLoading(false);
    }
  }, [hotelId, isAttendant]);

  useEffect(() => {
    void load();
  }, [load]);

  // Header actions: New Task + QR scan — only managers create/assign tasks
  // (attendants receive them; read-only roles get nothing).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isManager
        ? () => (
            <View style={{ flexDirection: "row", gap: 18, paddingRight: 4 }}>
              <Pressable onPress={() => navigation.navigate("QRScan")} hitSlop={8}>
                <Ionicons name="qr-code-outline" size={22} color="#fff" />
              </Pressable>
              <Pressable onPress={() => navigation.navigate("CreateTask")} hitSlop={8}>
                <Ionicons name="add" size={26} color="#fff" />
              </Pressable>
            </View>
          )
        : undefined,
    });
  }, [navigation, isManager]);

  // Live refresh + buzz when a ticket is assigned/updated on this hotel.
  useRealtime(hotelId, (e) => {
    if (e.type === "ticket.assigned") buzzNewTask();
    if (e.type === "ticket.assigned" || e.type === "ticket.updated") void load();
  });

  const filtered = useMemo(() => {
    const statuses = BUCKETS.find((b) => b.key === bucket)!.statuses;
    return items.filter((t) => statuses.includes(t.status));
  }, [items, bucket]);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { new: 0, in_progress: 0, done: 0 };
    for (const t of items) for (const b of BUCKETS) if (b.statuses.includes(t.status)) c[b.key]++;
    return c;
  }, [items]);

  async function act(t: Ticket, action: TicketAction) {
    if (!hotelId) return;
    setBusyId(t.id);
    try {
      await actOnTicket(hotelId, t.id, action, action === "done" ? { delivered: true } : undefined);
      await load();
    } catch (e) {
      Alert.alert("Action failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!hotelId) return <Center text="No hotel selected." />;

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {BUCKETS.map((b) => (
          <Pressable key={b.key} onPress={() => setBucket(b.key)} style={[styles.tab, bucket === b.key && styles.tabActive]}>
            <Text style={[styles.tabText, bucket === b.key && styles.tabTextActive]}>
              {b.label} {counts[b.key] ? `(${counts[b.key]})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && items.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
          ListEmptyComponent={<Center text="No tasks here." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}>
                <View style={styles.rowBetween}>
                  <Text style={styles.code}>{item.code}</Text>
                  <View style={[styles.badge, { backgroundColor: (statusColor[item.status] ?? colors.muted) + "22" }]}>
                    <Text style={[styles.badgeText, { color: statusColor[item.status] ?? colors.muted }]}>
                      {item.workflowStep && item.status !== "RESOLVED" ? item.workflowStep : item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subject}>{item.subject}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.pill, { color: priorityColor[item.priority] ?? colors.muted }]}>{item.priority}</Text>
                  <Text style={styles.meta}>· {item.category}</Text>
                  {item.guest?.fullName ? <Text style={styles.meta}>· {item.guest.fullName}</Text> : null}
                  {(() => {
                    const s = slaLabel(item.slaDueAt, now);
                    if (!s || item.status === "RESOLVED" || item.status === "CLOSED") return null;
                    return <Text style={[styles.meta, { color: s.overdue ? colors.red : colors.muted, fontWeight: s.overdue ? "700" : "400" }]}>· {s.text}</Text>;
                  })()}
                </View>
              </Pressable>
              <View style={styles.actions}>
                {fieldActions(item, me, isManager).map((a) => (
                  <Pressable
                    key={a.action}
                    onPress={() => act(item, a.action)}
                    disabled={busyId === item.id}
                    style={[styles.actionBtn, { backgroundColor: a.color, opacity: busyId === item.id ? 0.6 : 1 }]}
                  >
                    <Text style={styles.actionText}>{a.label}</Text>
                  </Pressable>
                ))}
                {item.workflowStep === "DONE" && item.assignedToId === me && !isManager ? (
                  <Text style={styles.awaiting}>⏳ Awaiting manager approval</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
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
  tabs: { flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.blue },
  tabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.blue },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  subject: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  pill: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  meta: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  actionBtn: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  awaiting: { color: colors.amber, fontSize: 12, fontWeight: "700", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
