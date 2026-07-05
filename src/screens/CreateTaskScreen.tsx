import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { createTask } from "@/api/tickets";
import { listDepartments, type Department } from "@/api/ops";
import { Button, Card, Screen, ScreenHeader, Sheet } from "@/components/kit";
import { priorityColor, radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const CATEGORIES = ["REQUEST", "COMPLAINT", "URGENT", "MAINTENANCE", "FNB", "LOST_FOUND"] as const;
const PRIORITIES = ["low", "normal", "high", "critical"] as const;
type Category = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];

export function CreateTaskScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "CreateTask">>();
  const hotelId = useAuthStore((s) => s.activeHotelId);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("REQUEST");
  const [priority, setPriority] = useState<Priority>("normal");
  const [description, setDescription] = useState("");
  const [completionMins, setCompletionMins] = useState("30");
  const [slaMins, setSlaMins] = useState("15");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [deptOpen, setDeptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => { if (hotelId) listDepartments(hotelId).then(setDepartments).catch(() => setDepartments([])); }, [hotelId]);
  const selectedDept = departments.find((d) => d.id === departmentId);

  const onSubmit = useCallback(async () => {
    if (!hotelId || busy) return;
    if (!subject.trim()) { setError("Subject is required."); return; }
    setError(null); setBusy(true);
    try {
      const cm = parseInt(completionMins, 10); const sla = parseInt(slaMins, 10);
      await createTask(hotelId, {
        subject: subject.trim(), category, priority, departmentId, roomId: params?.roomId,
        description: description.trim() || undefined,
        completionMinutes: Number.isFinite(cm) && cm > 0 ? cm : undefined,
        slaMinutes: Number.isFinite(sla) && sla > 0 ? sla : undefined,
      });
      nav.goBack();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to create task."); }
    finally { setBusy(false); }
  }, [hotelId, busy, subject, category, priority, departmentId, params?.roomId, description, completionMins, slaMins, nav]);

  const Chip = ({ active, label, color, onPress }: { active: boolean; label: string; color?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? (color ?? t.primary) : t.surface, borderWidth: 1, borderColor: active ? (color ?? t.primary) : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
      <Text style={{ color: active ? "#fff" : t.muted, fontSize: 12.5, fontWeight: "600", textTransform: "capitalize" }}>{label.replace(/_/g, " ")}</Text>
    </Pressable>
  );
  const input = { borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: t.text, backgroundColor: t.surface } as const;

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

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>Department</Text>
          <Pressable onPress={() => setDeptOpen(true)} style={[input, { flexDirection: "row", alignItems: "center" }]}>
            <Text style={{ flex: 1, color: selectedDept ? t.text : t.faint, fontSize: 14.5 }}>{selectedDept ? selectedDept.name : "Select department (optional)"}</Text>
            <Ionicons name="chevron-down" size={16} color={t.faint} />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Completion (min)</Text>
              <TextInput value={completionMins} onChangeText={(v) => setCompletionMins(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>SLA / escalate (min)</Text>
              <TextInput value={slaMins} onChangeText={(v) => setSlaMins(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={input} />
            </View>
          </View>
          <Text style={[typo.caption, { color: t.faint, marginTop: 6 }]}>Escalates to a manager if not accepted in time.</Text>

          <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Add details…" placeholderTextColor={t.faint} multiline textAlignVertical="top" style={[input, { minHeight: 88 }]} />
        </Card>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.base, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
        <Button title="Create task" icon="add" loading={busy} onPress={onSubmit} />
      </View>

      <Sheet visible={deptOpen} onClose={() => setDeptOpen(false)} title="Department">
        <ScrollView style={{ maxHeight: 360 }}>
          <Pressable onPress={() => { setDepartmentId(undefined); setDeptOpen(false); }} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.divider }}><Text style={[typo.bodyStrong, { color: t.muted }]}>None</Text></Pressable>
          {departments.map((d) => (
            <Pressable key={d.id} onPress={() => { setDepartmentId(d.id); setDeptOpen(false); }} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.divider, flexDirection: "row", alignItems: "center" }}>
              <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]}>{d.name}</Text>
              {departmentId === d.id ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ height: space.base }} />
      </Sheet>
    </Screen>
  );
}
