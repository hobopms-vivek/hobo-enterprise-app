import { apiFetch } from "@/api/client";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  refType: string | null;
  refId: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function listNotifications(hotelId: string, unreadOnly = false): Promise<{ items: AppNotification[]; unread: number }> {
  return apiFetch<{ items: AppNotification[]; unread: number }>(`/hotels/${hotelId}/whatsapp/notifications${unreadOnly ? "?unread=1" : ""}`);
}

export async function markNotification(hotelId: string, opts: { id?: string; all?: boolean }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/whatsapp/notifications`, { method: "PATCH", body: opts });
}
