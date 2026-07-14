import { apiFetch } from "@/api/client";

export type HkRoom = {
  id: string;
  roomNumber: string;
  status: string;            // raw room.status (can be stale) — prefer displayStatus
  displayStatus?: string;    // booking-authoritative room status the web board uses
  occupancy?: string;        // vacant | arrival | departure | stayover | turnover
  guestName?: string | null;
  backToBack?: boolean;      // ⚡ same-day turnover
  dueOut?: boolean;
  dayUse?: boolean;
  housekeepingStatus: string; // CLEAN | DIRTY | CLEANING | INSPECTED | OUT_OF_SERVICE
  dnd?: boolean;
  roomType: { id?: string; name: string; shortCode: string } | null;
  floor: { name: string; number: number } | null;
};

// ─── Floor plan (by room-type) — the SAME shape the web front-desk/housekeeping board uses ───
// One computed displayStatus per room (8 states): occupied | confirmed | out_of_order |
// out_of_service | dirty_vacant | cleaning | inspected | vacant_clean.
export type HkTypeRoom = {
  id: string;
  roomNumber: string;
  floorId?: string | null;
  status: string;            // the display status (drives the cell colour)
  displayStatus?: string;
  occupied?: boolean;
  blocked?: boolean;
  confirmed?: boolean;
  dueOut?: boolean;
  dayUse?: boolean;
  backToBack?: boolean;
  roomTypeId: string;
  roomTypeName: string;
};
export type HkByType = { typeId: string; typeName: string; total: number; occupied: number; blocked: number; reserved: number; available: number; rooms: HkTypeRoom[] };
export type HkSummary = Record<string, number>;

/** Booking-authoritative room status (falls back to raw status). displayStatus is
 *  LOWERCASE (occupied | vacant_clean | out_of_order | …); raw status is UPPERCASE. */
export const roomOcc = (r: HkRoom): string => r.displayStatus ?? r.status;
/** True when the booking-authoritative display status reads "occupied" (a guest is in). */
export const isOccupied = (r: { status: string; displayStatus?: string }): boolean =>
  (r.displayStatus ?? r.status).toLowerCase() === "occupied";
/** True for rooms hard-blocked out of service (maintenance/OOO — can't be cleaned; can be
 *  restored). Handles BOTH the lowercase displayStatus ("out_of_order") and the raw status. */
export const isHardBlocked = (r: { status: string; displayStatus?: string }): boolean => {
  const ds = (r.displayStatus ?? r.status ?? "").toLowerCase();
  return ds === "out_of_order" || ds === "maintenance" || ds === "blocked";
};

/** Housekeeping room state-machine actions (reuses the web PATCH route). */
export type HkAction = "start_cleaning" | "mark_done" | "approve" | "reject" | "restore" | "set_dnd" | "clear_dnd" | "out_of_service";

/** Housekeeping board — rooms + per-type floor plan (byType) + summary counts. Optional day. */
export async function getHousekeeping(hotelId: string, date?: string): Promise<{ rooms: HkRoom[]; summary?: HkSummary; byType?: HkByType[] }> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<{ rooms: HkRoom[]; summary?: HkSummary; byType?: HkByType[] }>(`/hotels/${hotelId}/housekeeping${qs}`);
}

/** Drive the room state machine (start_cleaning → mark_done → approve/reject, DND, out-of-service, restore). */
export async function roomAction(hotelId: string, roomId: string, action: HkAction, reason?: string): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/housekeeping/rooms/${roomId}`, { method: "PATCH", body: { action, ...(reason ? { reason } : {}) } });
}

// ─── Housekeeping task assignment (supervisor → attendant) ───
export type HkTaskType = { id: string; name: string; code?: string; estimatedMins?: number };
export async function listHkTaskTypes(hotelId: string): Promise<HkTaskType[]> {
  const r = await apiFetch<{ items?: HkTaskType[] }>(`/hotels/${hotelId}/config/housekeeping-types`).catch(() => ({ items: [] as HkTaskType[] }));
  return r.items ?? [];
}

/** POST /housekeeping/tasks — assign a cleaning task to a room/attendant. */
export async function createHkTask(hotelId: string, body: { roomId: string; taskTypeId?: string; assignedToId?: string; priority: "low" | "normal" | "high"; notes?: string }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/housekeeping/tasks`, { method: "POST", body });
}
