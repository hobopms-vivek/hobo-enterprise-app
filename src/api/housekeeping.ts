import { apiFetch } from "@/api/client";

export type HkRoom = {
  id: string;
  roomNumber: string;
  status: string;            // AVAILABLE | OCCUPIED | RESERVED | MAINTENANCE | OUT_OF_ORDER | BLOCKED
  housekeepingStatus: string; // CLEAN | DIRTY | INSPECTED | OUT_OF_SERVICE
  roomType: { name: string; shortCode: string } | null;
  floor: { name: string; number: number } | null;
};

/** Housekeeping board — rooms with operational + clean/dirty status. */
export async function getHousekeeping(hotelId: string): Promise<{ rooms: HkRoom[]; summary?: Record<string, number> }> {
  return apiFetch<{ rooms: HkRoom[]; summary?: Record<string, number> }>(`/hotels/${hotelId}/housekeeping`);
}

/** Update a single room's housekeeping status (CLEAN | DIRTY | INSPECTED | OUT_OF_SERVICE). */
export async function setRoomHkStatus(hotelId: string, roomId: string, housekeepingStatus: string): Promise<HkRoom> {
  return apiFetch<HkRoom>(`/hotels/${hotelId}/housekeeping/rooms/${roomId}`, { method: "PATCH", body: { housekeepingStatus } });
}
