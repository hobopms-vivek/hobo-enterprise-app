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
  housekeepingStatus: string; // CLEAN | DIRTY | CLEANING | INSPECTED | OUT_OF_SERVICE
  dnd?: boolean;
  roomType: { name: string; shortCode: string } | null;
  floor: { name: string; number: number } | null;
};

/** Booking-authoritative room status (falls back to raw status). */
export const roomOcc = (r: HkRoom): string => r.displayStatus ?? r.status;
/** True for rooms hard-blocked out of service (can't be cleaned; can be restored). */
export const isHardBlocked = (r: { status: string; displayStatus?: string }): boolean =>
  ["OUT_OF_ORDER", "MAINTENANCE", "BLOCKED"].includes(r.displayStatus ?? r.status);

/** Housekeeping room state-machine actions (reuses the web PATCH route). */
export type HkAction = "start_cleaning" | "mark_done" | "approve" | "reject" | "restore" | "set_dnd" | "clear_dnd" | "out_of_service";

/** Housekeeping board — rooms with operational + clean/dirty status. */
export async function getHousekeeping(hotelId: string): Promise<{ rooms: HkRoom[]; summary?: Record<string, number> }> {
  return apiFetch<{ rooms: HkRoom[]; summary?: Record<string, number> }>(`/hotels/${hotelId}/housekeeping`);
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
