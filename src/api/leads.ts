import { apiFetch } from "@/api/client";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST", "NO_ANSWER"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  source: string;     // WHATSAPP | DIRECT | REFERRAL | WALK_IN | OTA | WEBSITE | OTHER
  status: string;     // NEW | CONTACTED | QUALIFIED | FOLLOW_UP | CONVERTED | LOST | NO_ANSWER
  name: string;
  phone?: string | null;
  email?: string | null;
  roomTypeId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guestCount?: number | null;
  budget?: number | null;
  notes?: string | null;
  assignedToId?: string | null;
  convertedBookingId?: string | null;
  createdAt: string;
};

/** GET /leads — enquiry pipeline (managers+ only, level ≤ 3). Filter by status. */
export async function listLeads(hotelId: string, opts?: { status?: string }): Promise<Lead[]> {
  const qs = opts?.status ? `?status=${encodeURIComponent(opts.status)}` : "";
  const r = await apiFetch<{ items?: Lead[] }>(`/hotels/${hotelId}/leads${qs}`);
  return r.items ?? [];
}

/** PATCH /leads/:id — advance status / edit notes / (re)assign. A status change logs a lead activity. */
export async function updateLead(hotelId: string, id: string, body: { status?: string; notes?: string; assignedToId?: string | null }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/leads/${id}`, { method: "PATCH", body });
}
