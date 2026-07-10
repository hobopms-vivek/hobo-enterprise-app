import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { isHardBlocked, isOccupied, roomOcc, roomAction, type HkAction, type HkRoom } from "@/api/housekeeping";
import type { BookingItem } from "@/api/bookings";
import { Button, Sheet, StatusBadge } from "@/components/kit";
import { hkStatusColor, roomDisplayColor, roomDisplayLabel, tint, tabular, type as typo, useTheme } from "@/theme";

const nice = (s: string) => s.replace(/_/g, " ").toLowerCase();

/** Room state-machine sheet: start/clean/inspect/approve + DND + out-of-service.
 * `canRoom` = holds housekeeping.room_status.update (base writes). Approve/reject/
 * out-of-service/restore additionally require isManager (level ≤ 3) — mirrors web.
 * `booking` (when resolved) lets the guest chip deep-link to the full BookingDetail. */
export function HousekeepingRoomSheet({ visible, onClose, hotelId, room, booking, onOpenBooking, isManager, canRoom, onDone }: {
  visible: boolean; onClose: () => void; hotelId: string; room: HkRoom | null;
  booking?: BookingItem | null; onOpenBooking?: (b: BookingItem) => void;
  isManager: boolean; canRoom: boolean; onDone: () => void;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  if (!room) return null;
  const canManage = canRoom && isManager;

  const hk = room.housekeepingStatus;
  const occ = roomOcc(room);            // booking-authoritative displayStatus (lowercase)
  const occupied = isOccupied(room);    // a guest is physically in the room
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
          <StatusBadge label={roomDisplayLabel[occ] ?? nice(occ)} color={roomDisplayColor[occ] ?? t.muted} />
        </View>
      </View>

      {/* Who's staying — tap to open the full booking (when we resolved one for this room). */}
      {room.guestName ? (
        <Pressable
          onPress={booking && onOpenBooking ? () => onOpenBooking(booking) : undefined}
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tint(t.violet, "14"), borderRadius: 12, padding: 12, marginBottom: 12 }, pressed && booking ? { opacity: 0.7 } : null]}
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tint(t.violet, "26"), alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={17} color={t.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{room.guestName}</Text>
            <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>
              {occupied ? "In-house" : "Guest"}{room.dueOut ? " · due out today" : ""}{room.dayUse ? " · day-use" : ""}
              {booking?.code ? ` · ${booking.code}` : ""}{booking ? " · tap for details" : ""}
            </Text>
          </View>
          {booking && onOpenBooking ? <Ionicons name="chevron-forward" size={18} color={t.violet} /> : null}
        </Pressable>
      ) : null}

      <View style={{ gap: 10, paddingBottom: 8 }}>
        {hardBlocked ? <Text style={[typo.caption, { color: t.red, fontWeight: "700", paddingVertical: 4 }]}>This room is {nice(occ)} — not sellable.</Text> : null}

        {!canRoom ? (
          <Text style={[typo.caption, { color: t.muted, paddingVertical: 6 }]}>You have view-only access to housekeeping.</Text>
        ) : (
          <>
            {hk === "DIRTY" && !hardBlocked ? <Button title="Start cleaning" icon="brush" loading={busy} onPress={() => run("start_cleaning")} /> : null}
            {hk === "CLEANING" ? <Button title="Mark done — send for inspection" icon="checkmark-circle" variant="success" loading={busy} onPress={() => run("mark_done")} /> : null}
            {hk === "INSPECTED" ? (
              canManage ? (
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
              ? (canManage ? <Button title="Restore to service" icon="refresh" variant="outline" loading={busy} onPress={() => run("restore")} /> : null)
              : (canManage && !occupied ? <Button title="Mark out of service" icon="construct-outline" variant="ghost" loading={busy} onPress={() => run("out_of_service")} /> : null)}
          </>
        )}
      </View>
    </Sheet>
  );
}
