import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { createTask } from "@/api/tickets";
import { listDepartments, type Department } from "@/api/ops";
import type { AppNav, AppStackParamList } from "@/navigation/types";
import { colors, priorityColor } from "@/theme";

const CATEGORIES = ["REQUEST", "COMPLAINT", "URGENT", "MAINTENANCE", "FNB", "LOST_FOUND"] as const;
const PRIORITIES = ["low", "normal", "high", "critical"] as const;

type Category = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];

export function CreateTaskScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const route = useRoute<RouteProp<AppStackParamList, "CreateTask">>();
  const roomId = route.params?.roomId;
  const roomNumber = route.params?.roomNumber;

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("REQUEST");
  const [priority, setPriority] = useState<Priority>("normal");
  const [description, setDescription] = useState("");
  const [completionMins, setCompletionMins] = useState("");
  const [slaMins, setSlaMins] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "New Task" });
  }, [navigation]);

  useEffect(() => {
    let active = true;
    if (!hotelId) return;
    setDeptLoading(true);
    listDepartments(hotelId)
      .then((d) => {
        if (active) setDepartments(d);
      })
      .catch(() => {
        if (active) setDepartments([]);
      })
      .finally(() => {
        if (active) setDeptLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hotelId]);

  const selectedDept = departments.find((d) => d.id === departmentId);

  const onSubmit = useCallback(async () => {
    if (!hotelId || submitting) return;
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const cm = parseInt(completionMins, 10);
      const sla = parseInt(slaMins, 10);
      await createTask(hotelId, {
        subject: subject.trim(),
        category,
        priority,
        departmentId,
        roomId,
        description: description.trim() || undefined,
        completionMinutes: Number.isFinite(cm) && cm > 0 ? cm : undefined,
        slaMinutes: Number.isFinite(sla) && sla > 0 ? sla : undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }, [hotelId, submitting, subject, category, priority, departmentId, roomId, description, completionMins, slaMins, navigation]);

  if (!hotelId) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>No hotel selected.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {roomNumber ? (
        <View style={styles.roomBanner}>
          <Text style={styles.roomBannerText}>Room {roomNumber}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="What needs doing?"
          placeholderTextColor={colors.muted}
          value={subject}
          onChangeText={setSubject}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.chip,
                  active && { backgroundColor: priorityColor[p], borderColor: priorityColor[p] },
                ]}
              >
                <Text style={[styles.chipText, styles.chipTextCap, active && styles.chipTextActive]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Department</Text>
        <Pressable style={styles.select} onPress={() => setDeptModalOpen(true)}>
          <Text style={[styles.selectText, !selectedDept && styles.selectPlaceholder]}>
            {selectedDept ? selectedDept.name : "Select department (optional)"}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Completion timer (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="optional"
              placeholderTextColor={colors.muted}
              value={completionMins}
              onChangeText={(t) => setCompletionMins(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>SLA (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="optional"
              placeholderTextColor={colors.muted}
              value={slaMins}
              onChangeText={(t) => setSlaMins(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text style={styles.hint}>If the work runs past the completion timer, the manager is notified — the task stays with you.</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Add details…"
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Pressable
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Create Task</Text>
        )}
      </Pressable>

      <Modal
        visible={deptModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDeptModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select department</Text>
            {deptLoading ? (
              <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                <Pressable
                  style={styles.modalRow}
                  onPress={() => {
                    setDepartmentId(undefined);
                    setDeptModalOpen(false);
                  }}
                >
                  <Text style={styles.modalRowTitle}>None</Text>
                </Pressable>
                {departments.map((d) => (
                  <Pressable
                    key={d.id}
                    style={styles.modalRow}
                    onPress={() => {
                      setDepartmentId(d.id);
                      setDeptModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalRowTitle}>{d.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable style={styles.modalClose} onPress={() => setDeptModalOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 6, marginTop: 14 },
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
  multiline: { minHeight: 90 },
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  chipTextCap: { textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  selectText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  selectPlaceholder: { color: colors.muted, fontWeight: "400" },
  submitBtn: {
    marginTop: 16,
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  roomBanner: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  roomBannerText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  errorBanner: {
    backgroundColor: colors.red + "18",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.red + "44",
  },
  errorBannerText: { color: colors.red, fontSize: 13, fontWeight: "600" },
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
