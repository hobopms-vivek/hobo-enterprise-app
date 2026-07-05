import { apiFetch } from "@/api/client";

export type LinenCategory = { id: string; name: string; icon: string | null; color: string | null };
export type LinenItem = {
  id: string;
  name: string;
  category: LinenCategory | null;
  unit: string;
  parLevel: number;
  reorderLevel: number;
  inStock: number;
  inUse: number;
  inLaundry: number;
  damagedLost: number;
  totalQty: number;
  lowStock: boolean;
};
export type LinenDashboard = {
  kpis: { itemTypes: number; totalItems: number; inStock: number; inUse: number; inLaundry: number; damagedLost: number; lowStockCount: number; inventoryValue: number };
  items: LinenItem[];
  locked: boolean;
  lockedAt: string | null;
  lockedByName: string | null;
};

/** GET /linen/dashboard — the daily linen register (buckets per item, KPIs, lock state). */
export async function getLinenDashboard(hotelId: string, date?: string): Promise<LinenDashboard> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<LinenDashboard>(`/hotels/${hotelId}/linen/dashboard${qs}`);
}

export type LinenLine = { id: string; inStock: number; inUse: number; inLaundry: number; damagedLost: number; received?: number; sent?: number };

/** POST /linen/save — write updated bucket counts for one/more items (records the movement). */
export async function saveLinenLine(hotelId: string, line: LinenLine, date?: string): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/linen/save`, { method: "POST", body: { lines: [line], ...(date ? { date } : {}) } });
}
