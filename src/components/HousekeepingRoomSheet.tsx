import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import { isHardBlocked, roomAction, roomOcc, type HkAction, type HkRoom } from "@/api/housekeeping";
import { Button, Sheet, StatusBadge } from "@/components/kit";
import { hkStatusColor, roomStatusColor, tabular, type as typo, useTheme } from "@/theme";

const nice = (s: string) => s.replace(/_/g, " ").toLowerCase();

/** Room state-machine sheet: start/clean/inspect/approve + DND + out-of-service. */
export function HousekeepingRoomSheet({ visible, onClose, hotelId, room, isManager, onDone }: {
  visible: boolean; onClose: () => void; hotelId: string; room: HkRoom | null; isManager: boolean; onDone: () => void;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  if (!room) return null;

  const hk = room.housekeepingStatus;
  const occ = roomOcc(room);
  const occupied = occ === "OCCUPIED";
  const hardBlocked = isHardBlocked(room);
  const outOfService = hk === "OUT_OF_SERVICE" || hardBlocked;

  async function run(action: HkAction) {
    setBusy(true);
    try { await roomAction(hotelId, room!.id, action); onDone(); onClose(); }
    catch (e) { Alert.alert("Couldn't update room", e instanceof Error ? e.message : "You may not have permission."); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 30, fontWeight: "800", color: t.text }, tabular]}>{room.roomNumber}</Text>
          <Text style={[typo.caption, { color: t.muted }]}>{room.roomType?.name ?? "Room"}{room.floor ? ` · ${room.floor.name ?? `Floor ${room.floor.number}`}` : ""}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          <StatusBadge label={nice(hk)} color={hkStatusColor[hk] ?? t.muted} solid />
          <StatusBadge label={nice(occ)} color={roomStatusColor[occ] ?? t.muted} />
        </View>
      </View>

      <View style={{ gap: 10, paddingBottom: 8 }}>
        {hardBlocked ? <Text style={[typo.caption, { color: t.red, fontWeight: "700", paddingVertical: 4 }]}>This room is {nice(occ)} — not sellable.</Text> : null}

        {hk === "DIRTY" && !hardBlocked ? <Button title="Start cleaning" icon="brush" loading={busy} onPress={() => run("start_cleaning")} /> : null}
        {hk === "CLEANING" ? <Button title="Mark done — send for inspection" icon="checkmark-circle" variant="success" loading={busy} onPress={() => run("mark_done")} /> : null}
        {hk === "INSPECTED" ? (
          isManager ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Approve" icon="checkmark-done" variant="success" full={false} style={{ flex: 1 }} loading={busy} onPress={() => run("approve")} />
              <Button title="Reject" icon="close" variant="outline" full={false} style={{ flex: 1 }} loading={busy} onPress={() => run("reject")} />
            </View>
          ) : <Text style={[typo.caption, { color: t.amber, fontWeight: "700", paddingVertical: 6 }]}>⏳ Awaiting supervisor approval</Text>
        ) : null}
        {hk === "CLEAN" && !occupied && !hardBlocked ? <Text style={[typo.caption, { color: t.green, fontWeight: "700", paddingVertical: 6 }]}>✓ Vacant &amp; clean</Text> : null}

        {occupied ? (
          <Button title={room.dnd ? "Clear Do Not Disturb" : "Set Do Not Disturb"} icon="moon-outline" variant="outline" loading={busy} onPress={() => run(room.dnd ? "clear_dnd" : "set_dnd")} />
        ) : null}

        {/* out-of-service / restore are manager-only; can't OOS an occupied room */}
        {outOfService
          ? (isManager ? <Button title="Restore to service" icon="refresh" variant="outline" loading={busy} onPress={() => run("restore")} /> : null)
          : (isManager && !occupied ? <Button title="Mark out of service" icon="construct-outline" variant="ghost" loading={busy} onPress={() => run("out_of_service")} /> : null)}
      </View>
    </Sheet>
  );
}
