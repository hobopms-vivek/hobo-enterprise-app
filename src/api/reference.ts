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

export async function listExpenses(hotelId: string): Promise<{ items: Expense[]; total: number }> {
  const r = await apiFetch<{ items?: Expense[]; total?: number }>(`/hotels/${hotelId}/expenses`);
  return { items: r.items ?? [], total: r.total ?? 0 };
}
