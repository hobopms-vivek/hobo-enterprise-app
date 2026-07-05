import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { actOnTicket, listTickets, type Ticket } from "@/api/tickets";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { buzzNewTask } from "@/services/alert";
import { slaLabel } from "@/utils/sla";
import { FinishTaskSheet } from "@/components/FinishTaskSheet";
import { Button, Card, EmptyState, FilterChips, Screen, ScreenHeader, SegmentedTabs, Skeleton, StatusBadge } from "@/components/kit";
import { priorityColor, radius, space, statusColor, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Bucket = "new" | "progress" | "done";
const BUCKET_STATUSES: Record<Bucket, string[]> = {
  new: ["OPEN", "ASSIGNED"],
  progress: ["IN_PROGRESS", "ESCALATED"],
  done: ["RESOLVED", "CLOSED"],
};
type PFilter = "all" | "critical" | "high" | "normal" | "low";

export function TasksScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const user = useAuthStore((s) => s.user);
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const level = hotel?.role?.level ?? 5;
  const isManager = level <= 3;
  const isAttendant = level >= 4;

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [bucket, setBucket] = useState<Bucket>("new");
  const [pf, setPf] = useState<PFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [finishId, setFinishId] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());
  const hotelRef = useRef(activeHotelId);
  hotelRef.current = activeHotelId;

  const load = useCallback(async () => {
    if (!activeHotelId) return;
    try {
      const list = await listTickets(activeHotelId, { mine: isAttendant });
      if (hotelRef.current === activeHotelId) setTickets(list);
    } catch {
      setTickets([]);
    }
  }, [activeHotelId, isAttendant]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  useRealtime(activeHotelId, (e) => {
    if (e.type === "ticket.assigned") { buzzNewTask(); void load(); }
    else if (e.type === "ticket.updated" || e.type === "ticket.escalated") void load();
  });

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { new: 0, progress: 0, done: 0 };
    (tickets ?? []).forEach((tk) => {
      (Object.keys(BUCKET_STATUSES) as Bucket[]).forEach((b) => { if (BUCKET_STATUSES[b].includes(tk.status)) c[b]++; });
    });
    return c;
  }, [tickets]);

  const rows = useMemo(() =>
    (tickets ?? [])
      .filter((tk) => BUCKET_STATUSES[bucket].includes(tk.status))
      .filter((tk) => pf === "all" || tk.priority === pf)
      .sort((a, b) => (a.slaDueAt ?? "9").localeCompare(b.slaDueAt ?? "9")),
  [tickets, bucket, pf]);

  async function act(tk: Ticket, action: Parameters<typeof actOnTicket>[2]) {
    try { await actOnTicket(activeHotelId!, tk.id, action); }
    catch (e) { Alert.alert("Action failed", e instanceof Error ? e.message : "Please try again."); }
    finally { void load(); }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Tasks"
        right={isManager ? (
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable onPress={() => nav.navigate("QRScan")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="qr-code-outline" size={22} color={t.text} /></Pressable>
            <Pressable onPress={() => nav.navigate("CreateTask")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="add" size={26} color={t.primary} /></Pressable>
          </View>
        ) : undefined}
      />
      <View style={{ paddingHorizontal: space.base, paddingTop: 12, paddingBottom: 10 }}>
        <SegmentedTabs
          value={bucket}
          onChange={setBucket}
          tabs={[{ key: "new", label: "New", count: counts.new }, { key: "progress", label: "In progress", count: counts.progress }, { key: "done", label: "Done", count: counts.done }]}
        />
      </View>
      <View style={{ paddingBottom: 8 }}>
        <FilterChips
          value={pf}
          onChange={setPf}
          chips={[{ key: "all", label: "All priorities" }, { key: "critical", label: "Critical" }, { key: "high", label: "High" }, { key: "normal", label: "Normal" }, { key: "low", label: "Low" }]}
        />
      </View>

      {tickets === null ? (
        <View style={{ paddingHorizontal: space.base, gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={120} radius={radius.lg} />)}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(tk) => tk.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon="checkmark-done-circle-outline" title="No tasks here" hint="You're all caught up." />}
          renderItem={({ item: tk }) => (
            <TicketCard
              tk={tk}
              isMine={tk.assignedToId === user?.id}
              isManager={isManager}
              onOpen={() => nav.navigate("TicketDetail", { ticketId: tk.id })}
              onStart={() => act(tk, "en_route")}
              onComplete={() => setFinishId(tk.id)}
              onApprove={() => act(tk, "approve")}
              onReject={() => act(tk, "reject_done")}
            />
          )}
        />
      )}

      <FinishTaskSheet visible={!!finishId} onClose={() => setFinishId(null)} hotelId={activeHotelId!} ticketId={finishId ?? ""} onFinished={load} />
    </Screen>
  );
}

function TicketCard({ tk, isMine, isManager, onOpen, onStart, onComplete, onApprove, onReject }: {
  tk: Ticket; isMine: boolean; isManager: boolean; onOpen: () => void;
  onStart: () => void; onComplete: () => void; onApprove: () => void; onReject: () => void;
}) {
  const t = useTheme();
  const escalated = tk.status === "ESCALATED";
  const sla = slaLabel(tk.slaDueAt);
  const step = tk.workflowStep;
  const done = step === "DONE";

  let action: React.ReactNode = null;
  if (tk.status !== "RESOLVED" && tk.status !== "CLOSED") {
    if (done && isManager) {
      action = (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Approve" variant="success" icon="checkmark" size="sm" full={false} style={{ flex: 1 }} onPress={onApprove} />
          <Button title="Reject" variant="outline" icon="close" size="sm" full={false} style={{ flex: 1 }} onPress={onReject} />
        </View>
      );
    } else if (done && isMine) {
      action = <Text style={[typo.caption, { color: t.amber, fontWeight: "700" }]}>⏳ Awaiting manager approval</Text>;
    } else if (isMine) {
      if (step === "EN_ROUTE" || step === "AT_LOCATION") action = <Button title="Complete task" icon="checkmark-circle" size="sm" variant="success" onPress={onComplete} />;
      else action = <Button title="Start task" icon="play" size="sm" onPress={onStart} />;
    }
  }

  return (
    <Card onPress={onOpen} accent={escalated ? t.red : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Text style={[typo.label, { color: t.muted }, tabular]}>{tk.code}</Text>
        <View style={{ marginLeft: "auto" }}><StatusBadge label={tk.status.replace("_", " ")} color={statusColor[tk.status] ?? t.muted} /></View>
      </View>
      <Text style={[typo.h2, { color: t.text, marginBottom: 8 }]} numberOfLines={2}>{tk.subject}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: action ? 12 : 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="flag" size={12} color={priorityColor[tk.priority] ?? t.muted} />
          <Text style={{ color: priorityColor[tk.priority] ?? t.muted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>{tk.priority}</Text>
        </View>
        {tk.category ? <Text style={[typo.caption, { color: t.muted }]}>· {tk.category.replace("_", " ")}</Text> : null}
        {tk.guest?.fullName ? <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>· {tk.guest.fullName}</Text> : null}
        {sla ? (
          <View style={{ marginLeft: "auto", backgroundColor: tint(sla.overdue ? t.red : t.amber, "22"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: sla.overdue ? t.red : t.amber, fontSize: 11, fontWeight: "700" }}>{sla.text}</Text>
          </View>
        ) : null}
      </View>
      {action}
    </Card>
  );
}
