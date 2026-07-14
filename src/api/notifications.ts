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

/**
 * GET /notifications — the canonical Notification Center endpoint (same one the web bell uses),
 * with CURSOR pagination: `?filter=unread&take=N&cursor=<lastId>` → { items, unread, nextCursor }.
 */
export async function listNotifications(hotelId: string, opts?: { unreadOnly?: boolean; cursor?: string; take?: number }): Promise<{ items: AppNotification[]; unread: number; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (opts?.unreadOnly) qs.set("filter", "unread");
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.take) qs.set("take", String(opts.take));
  const q = qs.toString();
  const r = await apiFetch<{ items?: AppNotification[]; unread?: number; nextCursor?: string | null }>(`/hotels/${hotelId}/notifications${q ? `?${q}` : ""}`);
  return { items: r.items ?? [], unread: r.unread ?? 0, nextCursor: r.nextCursor ?? null };
}

export async function markNotification(hotelId: string, opts: { id?: string; all?: boolean }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/notifications`, { method: "PATCH", body: opts });
}
