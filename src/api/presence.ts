import { apiFetch } from "@/api/client";

/** GET/POST /api/hotels/:hotelId/presence — on/off-shift availability. */
export async function getPresence(hotelId: string): Promise<{ onShift: boolean; onShiftUntil: string | null }> {
  return apiFetch<{ onShift: boolean; onShiftUntil: string | null }>(`/hotels/${hotelId}/presence`);
}

export async function setPresence(hotelId: string, onShift: boolean): Promise<{ onShift: boolean }> {
  return apiFetch<{ onShift: boolean }>(`/hotels/${hotelId}/presence`, { method: "POST", body: { onShift } });
}

/** POST /api/hotels/:hotelId/push/devices — register this device's Expo push token. */
export async function registerExpoPush(hotelId: string, token: string): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/push/devices`, {
    method: "POST",
    body: { kind: "expo", token, label: "mobile" },
  }).catch(() => undefined);
}
