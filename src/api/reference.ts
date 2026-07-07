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

export async function listAuditLogs(hotelId: string, opts?: { limit?: number }): Promise<{ items: AuditLog[]; total?: number; summary?: AuditSummary }> {
  const qs = opts?.limit ? `?limit=${opts.limit}` : "?limit=100";
  return apiFetch<{ items: AuditLog[]; total?: number; summary?: AuditSummary; nextCursor?: string | null }>(`/hotels/${hotelId}/audit-logs${qs}`);
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
