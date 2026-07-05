import { apiFetch } from "@/api/client";

export type ApprovalKind = "deletion" | "cancellation";

export type ApprovalItem = {
  id: string;
  entity: "booking" | "banquet";
  reqType: ApprovalKind;
  bookingId?: string | null;
  eventId?: string | null;
  requesterName: string | null;
  reason: string | null;
  createdAt: string;
  code: string | null;
  guest?: string | null;
  title?: string | null;
  status?: string | null;
  room?: string | null;
  roomType?: string | null;
  hall?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  eventDate?: string | null;
  total?: number;
  paid?: number;
};

type ReqBase = Omit<ApprovalItem, "entity" | "reqType">;

async function getList(url: string): Promise<ReqBase[]> {
  try { const r = await apiFetch<{ items?: ReqBase[] }>(url); return r.items ?? []; }
  catch { return []; }
}

/** Pending booking + banquet requests of a kind (reuses the web approval-queue routes). */
export async function listApprovals(hotelId: string, kind: ApprovalKind): Promise<ApprovalItem[]> {
  const seg = kind === "deletion" ? "deletion-requests" : "cancellation-requests";
  const [bk, bq] = await Promise.all([
    getList(`/hotels/${hotelId}/${seg}`),
    getList(`/hotels/${hotelId}/banquet/${seg}`),
  ]);
  const bookings: ApprovalItem[] = bk.map((r) => ({ ...r, entity: "booking", reqType: kind }));
  const banquets: ApprovalItem[] = bq.map((r) => ({ ...r, entity: "banquet", reqType: kind }));
  return [...bookings, ...banquets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Approve / reject a request — PATCHes the matching web resolve route. */
export async function resolveApproval(hotelId: string, item: ApprovalItem, action: "approve" | "reject", note?: string): Promise<void> {
  const seg = item.reqType === "deletion" ? "deletion-request" : "cancellation-request";
  const url = item.entity === "booking"
    ? `/hotels/${hotelId}/bookings/${item.bookingId}/${seg}/${item.id}`
    : `/hotels/${hotelId}/banquet/events/${item.eventId}/${seg}/${item.id}`;
  await apiFetch(url, { method: "PATCH", body: { action, ...(note ? { note } : {}) } });
}
