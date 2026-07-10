import { apiFetch } from "@/api/client";

/**
 * A guest row for the operational drill-downs. `balance` here is FOLIO-ACCURATE
 * (totalAmount + folio charges − amountPaid) — the same figure the web front-desk
 * and the booking detail/folio use — so "Paid/Partial/Due" matches the detail page
 * (the dashboard/analytics endpoint uses a raw totalAmount−amountPaid that ignores
 * F&B/misc charges, which is why counts were off).
 */
export type OpsRow = {
  id: string;
  code: string;
  guest: string;
  room?: string | null;
  // opRow rows expose `roomType`; the inHouse rows expose `roomTypeName` — carry both.
  roomType?: string | null;
  roomTypeName?: string | null;
  nights?: number;
  checkInDate?: string;
  checkOutDate?: string;
  bookingType?: string | null;
  paymentStatus?: string | null; // PENDING | PARTIAL | PAID | REFUNDED
  balance: number;               // folio-accurate
  source?: string | null;
};
export type DayUseActive = { id: string; code: string; guest?: string | null; room?: string | null; minutesLeft?: number | null };

export type FrontDeskOverview = {
  inHouse: OpsRow[];
  arrivalsToday: OpsRow[];
  departures: OpsRow[];
  upcoming: OpsRow[];
  dayUsePending: OpsRow[];   // day-use / hourly arrivals still to check in (separate section)
  dayUseActive: DayUseActive[]; // day-use / hourly currently in-house (with countdown)
  counts: { confirmed: number; arrivalsToday: number; departures: number; inHouse: number; upcoming: number };
};

/**
 * GET /front-desk/overview — the FULL (uncapped) operational worklists with
 * folio-accurate balances + a separate day-use section. Needs the front_desk
 * module + front_desk.booking.read. The response has more (grid/byType/alerts);
 * we only type what the home operations need.
 */
export async function getFrontDeskOverview(hotelId: string): Promise<FrontDeskOverview> {
  return apiFetch<FrontDeskOverview>(`/hotels/${hotelId}/front-desk/overview`);
}
