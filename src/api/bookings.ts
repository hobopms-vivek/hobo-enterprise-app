import { apiFetch } from "@/api/client";

export type BookingItem = {
  id: string;
  code: string;
  status: string;        // PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | NO_SHOW
  paymentStatus?: string;
  bookingType?: string;  // NORMAL | DAY_USE | HOURLY | CORPORATE
  createdVia?: string | null; // WALK_IN | RESERVATION | OTA | null
  guestId?: string | null;
  roomId?: string | null;
  groupBookingId?: string | null;
  corporateBookingId?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights?: number;
  adults?: number;
  children?: number;
  ratePerHour?: number | null;
  dayUseExpiresAt?: string | null;
  selfCheckIn?: boolean;
  gstMode?: string | null;
  totalAmount: number;
  amountPaid: number;
  folioTotal?: number;
  folioBalance?: number;
  extrasTotal?: number;
  paymentEditedAt?: string | null;
  guest?: { fullName: string; title?: string | null; phone?: string | null; email?: string | null } | null;
  roomType?: { name: string; shortCode?: string } | null;
  room?: { roomNumber: string } | null;
  ratePlan?: { name: string; code?: string; mealPlan?: string | null } | null;
  bookingSource?: { name: string } | null;
  company?: { name: string } | null;
};

// ─── Multi-guest party (BookingGuest rows) ───
export type BookingGuest = {
  id: string;
  fullName: string;
  title?: string | null;
  isPrimary?: boolean;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idPhotoUrl?: string | null;
  arrivalTime?: string | null;
  notes?: string | null;
};

// ─── Folio (full server shape — mirrors assembleFolio on web) ───
export type FolioTaxLine = { code: string; name: string; rate: number; amount: number };
export type FolioRoomStay = {
  roomCharge: number;
  extraCharge: number;
  discount: number;
  taxAmount: number;
  taxBreakdown: FolioTaxLine[];
  gstMode: string;
  promotions: { code?: string; name?: string; amount?: number }[];
  totalAmount: number;
  invoiced: boolean;
};
export type FolioCharge = {
  id: string;
  parentId?: string | null;
  source?: string;
  category: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  taxable?: boolean;
  taxAmount?: number;
  taxBreakdown?: FolioTaxLine[];
  gstMode?: string;
  sacCode?: string | null;
  isGroup?: boolean;
  invoiced?: boolean;
  voided?: boolean;
};
export type FolioChargeNode = FolioCharge & { children?: FolioCharge[] };
export type FolioPayment = {
  id: string;
  amount: number;
  type: string;          // ADVANCE | BALANCE | REFUND
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  invoiceId?: string | null;
  createdAt: string;
  editedAt?: string | null;
};
export type FolioInvoice = { id: string; number?: string | null; displayName?: string | null; docType: string; status: string; total: number; balance: number; issuedAt?: string | null };
export type FolioBookingHeader = {
  id: string; code: string; status: string; paymentStatus?: string;
  checkInDate: string; checkOutDate: string; currency?: string;
  adults?: number; children?: number;
  guest?: { fullName: string; title?: string | null; email?: string | null; phone?: string | null } | null;
  roomType?: { name: string; shortCode?: string } | null;
  room?: { roomNumber: string } | null;
};
export type Folio = {
  booking?: FolioBookingHeader;
  roomStay?: FolioRoomStay;
  charges: FolioCharge[];
  chargeTree?: FolioChargeNode[];
  payments: FolioPayment[];
  totals: { roomStayTotal?: number; chargesSubtotal?: number; chargesTax?: number; grandTotal?: number; amountPaid?: number; balance: number };
  invoices?: FolioInvoice[];
};

// ─── Group / bulk bookings ───
export type GroupSummary = {
  id: string; code: string; name: string; type: string; status: string;
  checkInDate: string; checkOutDate: string;
  lead?: string | null; company?: string | null;
  rooms: number; confirmed: number; checkedIn: number; checkedOut: number; balance: number;
};
export type GroupRoom = {
  id: string; code: string; status: string;
  guestName?: string | null; phone?: string | null;
  room?: string | null; roomType?: string | null; roomReady?: boolean;
  adults?: number; children?: number; checkInDate: string; checkOutDate: string;
  bookingType?: string; source?: string | null; ratePlan?: string | null;
  roomCharge?: number; roomTax?: number; roomTotal?: number; paid?: number; balance?: number; gstMode?: string;
};
export type GroupCharge = { id: string; bookingCode: string; description: string; amount?: number; taxAmount?: number; total: number; category?: string; source?: string };
export type GroupDetail = {
  id: string; code: string; name: string; type: string; status: string;
  checkInDate: string; checkOutDate: string;
  lead?: string | null; leadPhone?: string | null;
  company?: { id: string; name: string } | null;
  notes?: string | null; balanceDueTiming?: string | null; balanceDueDate?: string | null;
  rooms: GroupRoom[];
  charges?: GroupCharge[];
  totals?: { roomsPreTax?: number; roomsTax?: number; roomsTotal?: number; miscTotal?: number; grandTotal?: number; paid?: number; balance?: number };
};

/** GET /bookings — full reservation list (folio-inclusive totals). Filtered by tab client-side. */
export async function listBookings(hotelId: string): Promise<BookingItem[]> {
  const r = await apiFetch<{ items?: BookingItem[] }>(`/hotels/${hotelId}/bookings`).catch(() => ({ items: [] as BookingItem[] }));
  return r.items ?? [];
}

/** GET /bookings/:id — single booking detail (includes bookingGuests). */
export async function getBooking(hotelId: string, bookingId: string): Promise<(BookingItem & { bookingGuests?: BookingGuest[] }) | null> {
  const r = await apiFetch<{ item?: BookingItem & { bookingGuests?: BookingGuest[] } }>(`/hotels/${hotelId}/bookings/${bookingId}`).catch(() => ({ item: undefined }));
  return r.item ?? null;
}

/** GET /bookings/:id/folio — full charges + payments + totals + roomStay + invoices (read-only). */
export async function getFolio(hotelId: string, bookingId: string): Promise<Folio> {
  return apiFetch<Folio>(`/hotels/${hotelId}/bookings/${bookingId}/folio`);
}

/** GET /bookings/:id/guests — the full party (primary + companions). */
export async function getBookingGuests(hotelId: string, bookingId: string): Promise<BookingGuest[]> {
  const r = await apiFetch<{ items?: BookingGuest[] }>(`/hotels/${hotelId}/bookings/${bookingId}/guests`).catch(() => ({ items: [] as BookingGuest[] }));
  return r.items ?? [];
}

/**
 * PUT /bookings/:id/guests — replace the whole non-primary companion set.
 * The primary guest (guest #1) is derived from the booking and is NOT included.
 * Used to attach a companion's uploaded ID photo (idPhotoUrl) + details.
 */
export async function saveBookingGuests(hotelId: string, bookingId: string, guests: Partial<BookingGuest>[]): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/bookings/${bookingId}/guests`, { method: "PUT", body: { guests } });
}

/** GET /bookings/groups — group/bulk booking summary cards. */
export async function listGroups(hotelId: string): Promise<GroupSummary[]> {
  const r = await apiFetch<{ items?: GroupSummary[] }>(`/hotels/${hotelId}/bookings/groups`).catch(() => ({ items: [] as GroupSummary[] }));
  return r.items ?? [];
}

/** GET /bookings/groups/:groupId — one group with its nested room roster. */
export async function getGroup(hotelId: string, groupId: string): Promise<GroupDetail | null> {
  const r = await apiFetch<{ item?: GroupDetail }>(`/hotels/${hotelId}/bookings/groups/${groupId}`).catch(() => ({ item: undefined }));
  return r.item ?? null;
}
