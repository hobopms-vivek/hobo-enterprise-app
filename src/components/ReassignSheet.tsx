import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { actOnTicket, listCandidates, type Candidate } from "@/api/tickets";
import { listDepartments, type Department } from "@/api/ops";
import { Avatar, Button, Loader, Sheet, SegmentedTabs } from "@/components/kit";
import { radius, tint, type as typo, useTheme } from "@/theme";

const DEPT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  housekeeping: "bed-outline", maintenance: "construct-outline", fnb: "restaurant-outline",
  front_desk: "people-outline", security: "shield-checkmark-outline",
};

/** Reassign (to a staff member) or Transfer (to a department) — reuses the ticket action route. */
export function ReassignSheet({ visible, onClose, hotelId, ticketId, onDone }: {
  visible: boolean; onClose: () => void; hotelId: string; ticketId: string; onDone: () => void;
}) {
  const t = useTheme();
  const [tab, setTab] = useState<"reassign" | "transfer">("reassign");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [depts, setDepts] = useState<Department[] | null>(null);
  const [pickUser, setPickUser] = useState<string | null>(null);
  const [pickDept, setPickDept] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // fresh selection each open (also when reopened for a different ticket)
    setPickUser(null); setPickDept(null); setTab("reassign");
    void listCandidates(hotelId, ticketId).then(setCandidates).catch(() => setCandidates([]));
    void listDepartments(hotelId).then(setDepts).catch(() => setDepts([]));
  }, [visible, hotelId, ticketId]);

  async function confirm() {
    setBusy(true);
    try {
      if (tab === "reassign" && pickUser) await actOnTicket(hotelId, ticketId, "reassign", { toUserId: pickUser });
      else if (tab === "transfer" && pickDept) await actOnTicket(hotelId, ticketId, "transfer", { toDeptId: pickDept });
      else { setBusy(false); return; }
      onDone();
      onClose();
    } catch (e) {
      Alert.alert("Couldn't update", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = tab === "reassign" ? !!pickUser : !!pickDept;

  return (
    <Sheet visible={visible} onClose={onClose} title="Reassign / Transfer">
      <View style={{ marginBottom: 14 }}>
        <SegmentedTabs tabs={[{ key: "reassign", label: "Reassign" }, { key: "transfer", label: "Transfer" }]} value={tab} onChange={setTab} />
      </View>

      <View style={{ maxHeight: 360 }}>
        {tab === "reassign" ? (
          candidates === null ? <Loader /> : candidates.length === 0 ? (
            <Text style={[typo.caption, { color: t.muted, paddingVertical: 20, textAlign: "center" }]}>No on-shift staff available.</Text>
          ) : (
            candidates.map((c) => {
              const active = c.userId === pickUser;
              return (
                <Pressable key={c.userId} onPress={() => setPickUser(c.userId)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                  <Avatar name={c.fullName} online={c.onShift} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typo.bodyStrong, { color: t.text }]}>{c.fullName}</Text>
                    <Text style={[typo.caption, { color: t.muted }]}>{c.role?.name ?? "Staff"}{c.department ? ` · ${c.department}` : ""}</Text>
                  </View>
                  <View style={{ backgroundColor: tint(t.muted, "1A"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: t.muted, fontSize: 11, fontWeight: "700" }}>{c.openCount} open</Text>
                  </View>
                  <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? t.primary : t.faint} />
                </Pressable>
              );
            })
          )
        ) : (
          depts === null ? <Loader /> : depts.map((d) => {
            const active = d.id === pickDept;
            return (
              <Pressable key={d.id} onPress={() => setPickDept(d.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={DEPT_ICON[d.key] ?? "grid-outline"} size={18} color={t.primary} />
                </View>
                <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]}>{d.name}</Text>
                <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? t.primary : t.faint} />
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Confirm" icon="checkmark" loading={busy} disabled={!canConfirm} onPress={confirm} />
      </View>
    </Sheet>
  );
}
