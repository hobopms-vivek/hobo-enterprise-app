import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { createTask } from "@/api/tickets";
import { listDepartments, listMembers, type Department, type Member } from "@/api/ops";
import { listRoomOptions, searchGuests, type GuestOption, type RoomOption } from "@/api/reference";
import { Button, Card, Screen, ScreenHeader, Sheet } from "@/components/kit";
import { priorityColor, radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const CATEGORIES = ["REQUEST", "COMPLAINT", "URGENT", "MAINTENANCE", "FNB", "LOST_FOUND"] as const;
const PRIORITIES = ["low", "normal", "high", "critical"] as const;
type Category = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];

type PickerKind = "dept" | "room" | "assignee" | null;

export function CreateTaskScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "CreateTask">>();
  const hotelId = useAuthStore((s) => s.activeHotelId);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("REQUEST");
  const [priority, setPriority] = useState<Priority>("normal");
  const [description, setDescription] = useState("");
  // Blank by default, exactly like the web drawer: a value here OVERRIDES the workflow step's
  // own timeout. The app used to pre-fill 30/15, so every app-created task silently carried a
  // 15-minute SLA the web would never have set.
  const [completionMins, setCompletionMins] = useState("");
  const [slaMins, setSlaMins] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState<string | undefined>(params?.roomId);
  const [staff, setStaff] = useState<Member[]>([]);
  const [assignedToId, setAssignedToId] = useState<string | undefined>();

  const [guestQ, setGuestQ] = useState("");
  const [guestResults, setGuestResults] = useState<GuestOption[]>([]);
  const [guest, setGuest] = useState<GuestOption | null>(null);
  const [searching, setSearching] = useState(false);

  const [picker, setPicker] = useState<PickerKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  useEffect(() => {
    if (!hotelId) return;
    listDepartments(hotelId).then(setDepartments).catch(() => setDepartments([]));
    listRoomOptions(hotelId).then(setRooms).catch(() => setRooms([]));
    listMembers(hotelId).then((m) => setStaff(m.filter((x) => x.isActive))).catch(() => setStaff([]));
  }, [hotelId]);

  // Debounced guest search — mirrors the web drawer (300ms, 8 results).
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runGuestSearch = useCallback((q: string) => {
    if (gTimer.current) clearTimeout(gTimer.current);
    if (!hotelId || !q.trim()) { setGuestResults([]); return; }
    gTimer.current = setTimeout(async () => {
      setSearching(true);
      try { setGuestResults(await searchGuests(hotelId, q)); }
      finally { setSearching(false); }
    }, 300);
  }, [hotelId]);
  useEffect(() => () => { if (gTimer.current) clearTimeout(gTimer.current); }, []);

  const selectedDept = useMemo(() => departments.find((d) => d.id === departmentId), [departments, departmentId]);
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
  const selectedStaff = useMemo(() => staff.find((s) => s.userId === assignedToId), [staff, assignedToId]);

  const onSubmit = useCallback(async () => {
    if (!hotelId || busy) return;
    if (!subject.trim()) { setError("Subject is required."); return; }
    setError(null); setBusy(true);
    try {
      const cm = parseInt(completionMins, 10);
      const sla = parseInt(slaMins, 10);
      await createTask(hotelId, {
        subject: subject.trim(), category, priority, departmentId,
        roomId, guestId: guest?.id, assignedToId,
        description: description.trim() || undefined,
        completionMinutes: Number.isFinite(cm) && cm > 0 ? cm : undefined,
        slaMinutes: Number.isFinite(sla) && sla > 0 ? sla : undefined,
      });
      nav.goBack();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to create task."); }
    finally { setBusy(false); }
  }, [hotelId, busy, subject, category, priority, departmentId, roomId, guest?.id, assignedToId, description, completionMins, slaMins, nav]);

  const Chip = ({ active, label, color, onPress }: { active: boolean; label: string; color?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? (color ?? t.primary) : t.surface, borderWidth: 1, borderColor: active ? (color ?? t.primary) : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
      <Text style={{ color: active ? "#fff" : t.muted, fontSize: 12.5, fontWeight: "600", textTransform: "capitalize" }}>{label.replace(/_/g, " ")}</Text>
    </Pressable>
  );
  const input = { borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: t.text, backgroundColor: t.surface } as const;

  const PickerRow = ({ label, value, placeholder, onPress }: { label: string; value?: string; placeholder: string; onPress: () => void }) => (
    <>
      <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>{label}</Text>
      <Pressable onPress={onPress} style={[input, { flexDirection: "row", alignItems: "center" }]}>
        <Text style={{ flex: 1, color: value ? t.text : t.faint, fontSize: 14.5 }} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={t.faint} style={{ flexShrink: 0 }} />
      </Pressable>
    </>
  );

  const SheetList = <T,>({ items, keyOf, labelOf, selected, onPick, noneLabel }: {
    items: T[]; keyOf: (x: T) => string; labelOf: (x: T) => string; selected?: string; onPick: (id?: string) => void; noneLabel: string;
  }) => (
    <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => { onPick(undefined); setPicker(null); }} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.divider }}>
        <Text style={[typo.bodyStrong, { color: t.muted }]}>{noneLabel}</Text>
      </Pressable>
      {items.map((x) => {
        const id = keyOf(x);
        return (
          <Pressable key={id} onPress={() => { onPick(id); setPicker(null); }} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.divider, flexDirection: "row", alignItems: "center" }}>
            <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={1}>{labelOf(x)}</Text>
            {selected === id ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
          </Pressable>
        );
      })}
      <View style={{ height: space.base }} />
    </ScrollView>
  );

  return (
    <Screen>
      <ScreenHeader title="New task" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        {params?.roomNumber ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tint(t.primary, "14"), borderRadius: radius.md, padding: 12 }}>
            <Ionicons name="bed-outline" size={16} color={t.primary} />
            <Text style={{ color: t.primary, fontWeight: "700", fontSize: 13.5 }}>For Room {params.roomNumber}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tint(t.red, "14"), borderRadius: radius.md, padding: 10 }}>
            <Ionicons name="alert-circle" size={16} color={t.red} /><Text style={{ color: t.red, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <Card style={{ gap: 6 }}>
          <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Subject *</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder="e.g. Extra towels needed" placeholderTextColor={t.faint} style={input} />

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 8 }]}>Category</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{CATEGORIES.map((c) => <Chip key={c} active={category === c} label={c} onPress={() => setCategory(c)} />)}</View>

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 8 }]}>Priority</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{PRIORITIES.map((p) => <Chip key={p} active={priority === p} label={p} color={priorityColor[p]} onPress={() => setPriority(p)} />)}</View>

          <PickerRow label="Department" value={selectedDept?.name} placeholder="Select department (optional)" onPress={() => setPicker("dept")} />

          {/* Hand the task straight to someone. Left blank, the routing engine picks whoever is
              on shift — either way the assignee gets a bell row + push. */}
          <PickerRow label="Assign to" value={selectedStaff?.fullName} placeholder="Auto-assign (on-shift ladder)" onPress={() => setPicker("assignee")} />

          <PickerRow label="Room" value={selectedRoom ? `Room ${selectedRoom.roomNumber}` : undefined} placeholder="No room" onPress={() => setPicker("room")} />
        </Card>

        {/* Guest */}
        <Card style={{ gap: 6 }}>
          <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Guest</Text>
          {guest ? (
            <View style={[input, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
              <Ionicons name="person" size={15} color={t.primary} style={{ flexShrink: 0 }} />
              <Text style={{ flex: 1, color: t.text, fontSize: 14.5 }} numberOfLines={1}>
                {[guest.title, guest.fullName].filter(Boolean).join(" ")}{guest.phone ? ` · ${guest.phone}` : ""}
              </Text>
              <Pressable onPress={() => { setGuest(null); setGuestQ(""); setGuestResults([]); }} hitSlop={8} style={{ flexShrink: 0 }}>
                <Ionicons name="close-circle" size={18} color={t.faint} />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[input, { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 0 }]}>
                <Ionicons name="search" size={15} color={t.faint} style={{ flexShrink: 0 }} />
                <TextInput
                  value={guestQ}
                  onChangeText={(v) => { setGuestQ(v); runGuestSearch(v); }}
                  placeholder="Search guest by name or phone…"
                  placeholderTextColor={t.faint}
                  style={{ flex: 1, color: t.text, fontSize: 14.5, paddingVertical: 11 }}
                  autoCorrect={false}
                />
                {searching ? <ActivityIndicator size="small" color={t.primary} /> : null}
              </View>
              {guestResults.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => { setGuest(g); setGuestResults([]); setGuestQ(""); }}
                  style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.divider }}
                >
                  <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{[g.title, g.fullName].filter(Boolean).join(" ") || "Guest"}</Text>
                  {g.phone ? <Text style={[typo.caption, { color: t.muted }]}>{g.phone}</Text> : null}
                </Pressable>
              ))}
            </>
          )}
        </Card>

        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Completion (min)</Text>
              <TextInput value={completionMins} onChangeText={(v) => setCompletionMins(v.replace(/[^0-9]/g, ""))} placeholder="Default" placeholderTextColor={t.faint} keyboardType="number-pad" style={input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>SLA / escalate (min)</Text>
              <TextInput value={slaMins} onChangeText={(v) => setSlaMins(v.replace(/[^0-9]/g, ""))} placeholder="Default" placeholderTextColor={t.faint} keyboardType="number-pad" style={input} />
            </View>
          </View>
          <Text style={[typo.caption, { color: t.faint, marginTop: 6 }]}>Leave blank to use the workflow&apos;s own timings. Escalates to a manager if not accepted in time.</Text>

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Add details…" placeholderTextColor={t.faint} multiline textAlignVertical="top" style={[input, { minHeight: 88 }]} />
        </Card>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.base, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
        <Button title="Create task" icon="add" loading={busy} onPress={onSubmit} />
      </View>

      <Sheet visible={picker === "dept"} onClose={() => setPicker(null)} title="Department">
        <SheetList items={departments} keyOf={(d) => d.id} labelOf={(d) => d.name} selected={departmentId} onPick={setDepartmentId} noneLabel="None" />
      </Sheet>

      <Sheet visible={picker === "assignee"} onClose={() => setPicker(null)} title="Assign to">
        <SheetList
          items={staff}
          keyOf={(s) => s.userId}
          labelOf={(s) => `${s.fullName}${s.role ? ` · ${s.role.name}` : ""}`}
          selected={assignedToId}
          onPick={setAssignedToId}
          noneLabel="Auto-assign (on-shift ladder)"
        />
      </Sheet>

      <Sheet visible={picker === "room"} onClose={() => setPicker(null)} title="Room">
        <SheetList items={rooms} keyOf={(r) => r.id} labelOf={(r) => `Room ${r.roomNumber}`} selected={roomId} onPick={setRoomId} noneLabel="No room" />
      </Sheet>
    </Screen>
  );
}
