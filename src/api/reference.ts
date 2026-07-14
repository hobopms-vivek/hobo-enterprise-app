import { apiFetch } from "@/api/client";

// ─── Activity log / audit (reports module + reports.audit_log.read) ───
export type AuditLog = {
  id: string;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  category?: string | null;
  severity?: string | null;   // INFO | WARNING | CRITICAL
  source?: string | null;
  outcome?: string | null;    // SUCCESS | FAILURE
  entity?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  createdAt: string;
};
export type AuditSummary = { failed: number; critical: number; actors: number };

/** GET /audit-logs — CURSOR paginated: `?limit=N&cursor=<lastId>` → { items, nextCursor, total, summary }.
 *  total + summary are only returned on the first page (no cursor). */
export async function listAuditLogs(hotelId: string, opts?: { limit?: number; cursor?: string }): Promise<{ items: AuditLog[]; total?: number; summary?: AuditSummary; nextCursor: string | null }> {
  const qs = new URLSearchParams({ limit: String(opts?.limit ?? 50) });
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  const r = await apiFetch<{ items?: AuditLog[]; total?: number; summary?: AuditSummary; nextCursor?: string | null }>(`/hotels/${hotelId}/audit-logs?${qs.toString()}`);
  return { items: r.items ?? [], total: r.total, summary: r.summary, nextCursor: r.nextCursor ?? null };
}

// ─── Expenses (finance module + finance.expense.read) ───
export type Expense = {
  id: string;
  date: string;
  particulars?: string | null;
  amount: number;
  gstAmount?: number | null;
  mop?: string | null;        // mode of payment
  expHead?: string | null;    // expense head/category
  vendor?: string | null;
  reference?: string | null;
  note?: string | null;
  source?: string | null;
  createdAt: string;
};

export type ExpenseQuery = { from?: string; to?: string; head?: string; mop?: string };

/**
 * GET /expenses — the same call the web CA-Reports expense ledger makes.
 *
 * `to` is INCLUSIVE here (the route ends the window at `${to}T23:59:59.999Z`), unlike
 * `rangeToWindow()` in src/lib/range.ts whose `to` is exclusive — don't cross the wires.
 * `total` is the server's sum over the FILTERED set, so it always matches the rows shown.
 */
export async function listExpenses(hotelId: string, q: ExpenseQuery = {}): Promise<{ items: Expense[]; total: number }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) qs.set(k, v);
  const suffix = qs.toString() ? `?${qs}` : "";
  const r = await apiFetch<{ items?: Expense[]; total?: number }>(`/hotels/${hotelId}/expenses${suffix}`);
  return { items: r.items ?? [], total: r.total ?? 0 };
}

// ─── Rooms + guest lookup (for the task-create pickers; mirrors the web drawer's sources) ───

export type RoomOption = { id: string; roomNumber: string };

/** GET /config/rooms — the room list the web create-task drawer picks from. */
export async function listRoomOptions(hotelId: string): Promise<RoomOption[]> {
  const r = await apiFetch<{ items?: RoomOption[] }>(`/hotels/${hotelId}/config/rooms`).catch(() => ({ items: [] as RoomOption[] }));
  return r.items ?? [];
}

export type GuestOption = { id: string; fullName: string | null; title?: string | null; phone: string | null };

/** GET /guests?q= — same debounced search the web create-task drawer uses. */
export async function searchGuests(hotelId: string, q: string): Promise<GuestOption[]> {
  const term = q.trim();
  if (!term) return [];
  const qs = new URLSearchParams({ q: term, pageSize: "8" });
  const r = await apiFetch<{ items?: GuestOption[] }>(`/hotels/${hotelId}/guests?${qs}`).catch(() => ({ items: [] as GuestOption[] }));
  return (r.items ?? []).slice(0, 8);
}
