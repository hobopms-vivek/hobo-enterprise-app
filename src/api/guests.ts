import { apiFetch } from "@/api/client";

export type GuestListItem = {
  id: string;
  fullName: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  vipStatus?: "NONE" | "VIP" | "VVIP";
  isBlacklisted?: boolean;
  tags?: string[];
  tier?: string;
  points?: number;
  totalSpend?: number;
  totalStays?: number;
};

export type GuestStay = { id: string; code: string; status: string; checkInDate: string; checkOutDate: string; totalAmount: number; amountPaid: number; roomType?: { name: string } | null };

export type GuestDetail = {
  id: string;
  fullName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  nationality?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  documentImageUrl?: string | null;
  vipStatus?: "NONE" | "VIP" | "VVIP";
  isBlacklisted?: boolean;
  tags?: string[];
  preferences?: Record<string, unknown>;
  company?: { id: string; name: string } | null;
};

/** GET /guests?q=&filter= — searchable guest directory. */
export async function listGuests(hotelId: string, opts?: { q?: string; filter?: "vip" | "blacklist" | "all" }): Promise<GuestListItem[]> {
  const p = new URLSearchParams();
  if (opts?.q) p.set("q", opts.q);
  if (opts?.filter && opts.filter !== "all") p.set("filter", opts.filter);
  const qs = p.toString() ? `?${p.toString()}` : "";
  const r = await apiFetch<{ items?: GuestListItem[] }>(`/hotels/${hotelId}/guests${qs}`).catch(() => ({ items: [] as GuestListItem[] }));
  return r.items ?? [];
}

/** GET /guests/:id → profile + recent stays. */
export async function getGuest(hotelId: string, id: string): Promise<{ guest: GuestDetail; stays: GuestStay[] }> {
  const r = await apiFetch<{ item: GuestDetail; stays?: GuestStay[]; bookings?: GuestStay[] }>(`/hotels/${hotelId}/guests/${id}`);
  return { guest: r.item, stays: r.stays ?? r.bookings ?? [] };
}

/** Attach an uploaded ID scan to a guest (POST /guests/:id/documents, sets it primary). */
export async function addGuestDocument(hotelId: string, id: string, body: { fileUrl: string; docType?: string; fileName?: string; setPrimary?: boolean }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/guests/${id}/documents`, { method: "POST", body });
}

/** Save the ID type/number onto the guest (PATCH /guests/:id). */
export async function updateGuest(hotelId: string, id: string, body: { documentType?: string; documentNumber?: string; vipStatus?: "NONE" | "VIP" | "VVIP" }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/guests/${id}`, { method: "PATCH", body });
}
