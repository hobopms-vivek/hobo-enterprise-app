import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { createHkTask, getHousekeeping, listHkTaskTypes, type HkRoom, type HkTaskType } from "@/api/housekeeping";
import { listMembers, type Member } from "@/api/ops";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, Button, Card, Screen, ScreenHeader, Sheet } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

type Priority = "low" | "normal" | "high";

export function AssignCleaningScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "AssignCleaning">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [rooms, setRooms] = useState<HkRoom[]>([]);
  const [types, setTypes] = useState<HkTaskType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roomId, setRoomId] = useState<string | undefined>(params?.roomId);
  const [roomLabel, setRoomLabel] = useState<string | undefined>(params?.roomNumber ? `Room ${params.roomNumber}` : undefined);
  const [typeId, setTypeId] = useState<string | undefined>();
  const [assignee, setAssignee] = useState<string | undefined>();
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => {
    getHousekeeping(hotelId).then((r) => setRooms(r.rooms ?? [])).catch(() => setRooms([]));
    listHkTaskTypes(hotelId).then(setTypes).catch(() => setTypes([]));
    listMembers(hotelId).then((m) => setMembers(m.filter((x) => x.isActive))).catch(() => setMembers([]));
  }, [hotelId]);

  const submit = useCallback(async () => {
    if (!roomId) { Alert.alert("Pick a room", "Select which room to clean."); return; }
    setBusy(true);
    try { await createHkTask(hotelId, { roomId, taskTypeId: typeId, assignedToId: assignee, priority, notes: notes.trim() || undefined }); nav.goBack(); }
    catch (e) { Alert.alert("Couldn't assign", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }, [hotelId, roomId, typeId, assignee, priority, notes, nav]);

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
      <Text style={{ color: active ? "#fff" : t.muted, fontSize: 12.5, fontWeight: "600", textTransform: "capitalize" }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <ScreenHeader title="Assign cleaning" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 6 }}>
          <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Room</Text>
          <Pressable onPress={() => setRoomOpen(true)} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, backgroundColor: t.surface }}>
            <Text style={{ flex: 1, color: roomLabel ? t.text : t.faint, fontSize: 14.5, fontWeight: roomLabel ? "600" : "400" }}>{roomLabel ?? "Select a room"}</Text>
            <Ionicons name="chevron-down" size={16} color={t.faint} />
          </Pressable>

          {types.length ? (
            <>
              <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 8 }]}>Task type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{types.map((ty) => <Chip key={ty.id} active={typeId === ty.id} label={ty.name} onPress={() => setTypeId(typeId === ty.id ? undefined : ty.id)} />)}</View>
            </>
          ) : null}

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 8 }]}>Priority</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>{(["low", "normal", "high"] as Priority[]).map((p) => <Chip key={p} active={priority === p} label={p} onPress={() => setPriority(p)} />)}</View>

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Extra towels, hypoallergenic detergent…" placeholderTextColor={t.faint} multiline textAlignVertical="top" style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, minHeight: 72 }} />
        </Card>

        <Card>
          <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>Assign to</Text>
          {members.length ? members.map((m) => {
            const active = assignee === m.userId;
            return (
              <Pressable key={m.userId} onPress={() => setAssignee(active ? undefined : m.userId)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                <Avatar name={m.fullName} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: t.text }]}>{m.fullName}</Text>
                  <Text style={[typo.caption, { color: t.muted }]}>{[m.role?.name, m.department?.name].filter(Boolean).join(" · ") || "Staff"}</Text>
                </View>
                <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? t.primary : t.faint} />
              </Pressable>
            );
          }) : <Text style={[typo.caption, { color: t.faint }]}>No staff found. The task can be left unassigned.</Text>}
        </Card>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.base, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
        <Button title="Assign task" icon="clipboard-outline" loading={busy} onPress={submit} />
      </View>

      <Sheet visible={roomOpen} onClose={() => setRoomOpen(false)} title="Select room">
        <ScrollView style={{ maxHeight: 400 }}>
          {rooms.map((r) => (
            <Pressable key={r.id} onPress={() => { setRoomId(r.id); setRoomLabel(`Room ${r.roomNumber}${r.roomType?.name ? ` · ${r.roomType.name}` : ""}`); setRoomOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.divider }}>
              <View style={{ minWidth: 44, height: 28, borderRadius: 8, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Text style={{ color: t.primary, fontWeight: "800", fontSize: 12 }}>{r.roomNumber}</Text></View>
              <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]}>{r.roomType?.name ?? "Room"}</Text>
              {roomId === r.id ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ height: space.base }} />
      </Sheet>
    </Screen>
  );
}
