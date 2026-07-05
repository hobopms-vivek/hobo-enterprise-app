import { apiFetch } from "@/api/client";

export type StockRow = {
  id: string;         // stock row id
  storeId: string;
  store: string;      // store name
  itemId: string;
  item: string;       // item name
  unit: string | null;
  category: string | null;
  quantity: number;
  avgCost: number;
  value: number;
  reorderLevel: number;
  low: boolean;
};

export type Movement = {
  id: string;
  type: string;       // RECEIPT | ISSUE | TRANSFER_IN | TRANSFER_OUT | ADJUSTMENT | CONSUMPTION
  quantity: number;   // signed
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  item?: { name: string; unit: string | null } | null;
  store?: { name: string } | null;
};

/** GET /inventory/stock — per-store on-hand (quantity, low flag, value). */
export async function listStock(hotelId: string, storeId?: string): Promise<StockRow[]> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const r = await apiFetch<{ items?: StockRow[] }>(`/hotels/${hotelId}/inventory/stock${qs}`).catch(() => ({ items: [] as StockRow[] }));
  return r.items ?? [];
}

/** GET /inventory/movements — the stock-movement ledger for an item (+store). */
export async function listMovements(hotelId: string, itemId: string, storeId?: string): Promise<Movement[]> {
  const p = new URLSearchParams({ itemId });
  if (storeId) p.set("storeId", storeId);
  const r = await apiFetch<{ items?: Movement[] }>(`/hotels/${hotelId}/inventory/movements?${p.toString()}`).catch(() => ({ items: [] as Movement[] }));
  return r.items ?? [];
}

/** POST /inventory/adjust — SET (new on-hand) or DELTA (signed change) with a reason. */
export async function adjustStock(hotelId: string, body: { storeId: string; itemId: string; mode: "SET" | "DELTA"; quantity: number; reason: string }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/inventory/adjust`, { method: "POST", body });
}

/** POST /inventory/issue — issue stock out of a store (records an ISSUE movement). */
export async function issueStock(hotelId: string, body: { storeId: string; itemId: string; quantity: number; issuedTo: string; note?: string }): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/inventory/issue`, {
    method: "POST",
    body: { storeId: body.storeId, issuedTo: body.issuedTo, note: body.note, items: [{ itemId: body.itemId, quantity: body.quantity }] },
  });
}
