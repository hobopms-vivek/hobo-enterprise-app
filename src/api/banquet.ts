import { apiFetch } from "@/api/client";

export type BanquetEvent = {
  id: string;
  code: string;
  title?: string | null;
  eventType?: string | null;
  status: string; // ENQUIRY | TENTATIVE | CONFIRMED | CHECKED_IN | CHECKED_OUT | COMPLETED | CANCELLED | LOST
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  guaranteedPax?: number;
  total?: number;
  advancePaid?: number;
  hall?: { name: string } | null;
  slots?: { name: string }[];
  guest?: { fullName: string; title?: string | null } | null;
  company?: { name: string } | null;
};

export type BanquetTaxLine = { code: string; name: string; rate: number; amount: number };
export type BanquetItem = { id: string; category: string; description: string; quantity: number; unitPrice: number; amount: number; priceUnit?: string | null };
export type BanquetPayment = { id: string; amount: number; method?: string | null; reference?: string | null; note?: string | null; createdAt: string; editedAt?: string | null };

export type BanquetEventDetail = {
  id: string; code: string; title?: string | null;
  eventType?: string | null; status: string;
  eventDate: string; startTime?: string | null; endTime?: string | null;
  actualStartTime?: string | null; actualEndTime?: string | null;
  checkedInAt?: string | null; checkedOutAt?: string | null; paymentEditedAt?: string | null;
  expectedPax?: number; guaranteedPax?: number; actualPax?: number | null;
  contactName?: string | null; contactPhone?: string | null;
  onSiteContactName?: string | null; onSiteContactPhone?: string | null;
  setupStyle?: string | null; agenda?: string | null; specialRequests?: string | null; menuImageUrl?: string | null;
  // money
  perPlateRate?: number; hallRent?: number; serviceChargePct?: number; discount?: number;
  subtotal?: number; serviceCharge?: number; gstMode?: string; taxAmount?: number;
  taxBreakdown?: BanquetTaxLine[]; total?: number; manualTotal?: number | null;
  advancePaid?: number; securityDeposit?: number; damageCharges?: number;
  lostReason?: string | null; deletedAt?: string | null; deletedReason?: string | null;
  createdAt?: string | null;
  hall?: { name: string; capacity?: number } | null;
  package?: { name: string; pricePerPax?: number; imageUrl?: string | null } | null;
  slots?: { id: string; name: string; startTime?: string | null; endTime?: string | null }[];
  guest?: { id: string; fullName: string; phone?: string | null; title?: string | null } | null;
  company?: { id: string; name: string } | null;
  bookingSource?: { name: string } | null;
  items?: BanquetItem[];
  payments?: BanquetPayment[];
};

/** GET /banquet/events — event list (read-only glance). */
export async function listBanquetEvents(hotelId: string): Promise<BanquetEvent[]> {
  const r = await apiFetch<{ items?: BanquetEvent[] }>(`/hotels/${hotelId}/banquet/events`).catch(() => ({ items: [] as BanquetEvent[] }));
  return r.items ?? [];
}

/** GET /banquet/events/:id — full event detail (venue, host, menu, items, billing, payments). */
export async function getBanquetEvent(hotelId: string, id: string): Promise<BanquetEventDetail | null> {
  const r = await apiFetch<{ item?: BanquetEventDetail }>(`/hotels/${hotelId}/banquet/events/${id}`).catch(() => ({ item: undefined }));
  return r.item ?? null;
}

/** GET /banquet/events/:id/payments — the payment ledger (has editedAt). */
export async function getBanquetPayments(hotelId: string, id: string): Promise<BanquetPayment[]> {
  const r = await apiFetch<{ items?: BanquetPayment[] }>(`/hotels/${hotelId}/banquet/events/${id}/payments`).catch(() => ({ items: [] as BanquetPayment[] }));
  return r.items ?? [];
}
