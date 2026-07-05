import { apiFetch } from "@/api/client";

export type DashKpi = { value: number; delta: number };
export type DashGuest = { id: string; code: string; guest: string; room: string | null; roomType: string; nights: number; total: number; paid: number; balance: number; status: string };
export type DashTicket = { id: string; code: string; subject: string; room?: string | null; category?: string | null; priority?: string | null; status: string; createdAt?: string | null };

export type DashAnalytics = {
  range: { from: string; to: string; days: number };
  kpis: { occupancy: DashKpi; adr: DashKpi; revpar: DashKpi; trevpar: DashKpi; totalRevenue: DashKpi; roomRevenue: DashKpi; alos: DashKpi; roomsSold: DashKpi; cancellations: DashKpi };
  role: { key: string; level: number; isManagerial: boolean };
  operations: {
    refDate: string;
    counts: { arrivals: number; departures: number; inHouse: number; upcoming: number; withBalance: number };
    arrivals: DashGuest[]; departures: DashGuest[]; inHouse: DashGuest[]; upcoming: DashGuest[]; balances: DashGuest[];
    payment: { totalOutstanding: number; totalCollectedInHouse: number };
  };
  tickets: { activeCount: number; resolvedCount: number; active?: DashTicket[] };
};

/** Role-aware dashboard payload — same engine the web dashboard uses. */
export async function getDashboard(hotelId: string, opts?: { from?: string; to?: string; ref?: string }): Promise<DashAnalytics> {
  const qs = new URLSearchParams();
  if (opts?.from) qs.set("from", opts.from);
  if (opts?.to) qs.set("to", opts.to);
  if (opts?.ref) qs.set("ref", opts.ref);
  const q = qs.toString();
  return apiFetch<DashAnalytics>(`/hotels/${hotelId}/dashboard/analytics${q ? `?${q}` : ""}`);
}
