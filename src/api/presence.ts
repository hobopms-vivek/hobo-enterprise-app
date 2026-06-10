import { apiFetch } from "@/api/client";

/** GET /api/hotels/:hotelId/presence — own status, or another user's (manager+). */
export async function getPresence(hotelId: string, userId?: string): Promise<{ userId?: string; onShift: boolean; onShiftUntil: string | null }> {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiFetch<{ userId?: string; onShift: boolean; onShiftUntil: string | null }>(`/hotels/${hotelId}/presence${q}`);
}

/** POST presence. Pass `userId` (manager+ only) to activate/deactivate ANOTHER
 *  staffer — deactivating them releases + reassigns their open tasks. */
export async function setPresence(hotelId: string, onShift: boolean, userId?: string): Promise<{ onShift: boolean; reassigned?: number }> {
  return apiFetch<{ onShift: boolean; reassigned?: number }>(`/hotels/${hotelId}/presence`, { method: "POST", body: { onShift, ...(userId ? { userId } : {}) } });
}

/** POST /api/hotels/:hotelId/push/devices — register this device's Expo push token. */
export async function registerExpoPush(hotelId: string, token: string): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/push/devices`, {
    method: "POST",
    body: { kind: "expo", token, label: "mobile" },
  }).catch(() => undefined);
}
