import { apiFetch } from "@/api/client";

// ─── Invoices ───
export type InvoiceTaxLine = { code: string; name: string; rate: number; amount: number };
export type InvoiceLineCharge = { id: string; description?: string | null; category?: string | null; sacCode?: string | null; quantity?: number; unitPrice?: number; amount: number; taxAmount?: number; isGroup?: boolean; parentId?: string | null };
export type InvoiceRoomStay = { roomCharge?: number; extraCharge?: number; discount?: number; taxAmount?: number; totalAmount?: number; sacCode?: string | null } | null;

export type InvoiceDetail = {
  id: string;
  number: string;
  displayName?: string | null;
  docType: string;   // TAX_INVOICE | PROFORMA | CREDIT_NOTE | DEBIT_NOTE | BILL_OF_SUPPLY
  status: string;    // ISSUED | CANCELLED
  issuedAt: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestGstin?: string | null;
  billingAddress?: string | null;
  recipientType?: string;
  recipientStateCode?: string | null;
  sellerName: string;
  sellerGstin?: string | null;
  sellerAddress?: string | null;
  sellerStateCode?: string | null;
  placeOfSupply?: string | null;
  supplyType?: string;
  currency?: string;
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  roundOff?: number;
  total?: number;
  amountPaid?: number;
  balance?: number;
  amountInWords?: string | null;
  notes?: string | null;
  taxBreakdown: InvoiceTaxLine[];
  lineItems: { roomStay?: InvoiceRoomStay; charges?: InvoiceLineCharge[]; taxSummary?: unknown };
  booking?: { code: string; checkInDate: string; checkOutDate: string; roomType?: { name: string } | null; room?: { roomNumber: string } | null } | null;
  seller?: { logoUrl?: string | null; pan?: string | null; cin?: string | null; bankName?: string | null; bankAccountNo?: string | null; bankIfsc?: string | null; bankBranch?: string | null; signatoryName?: string | null; signatoryDesignation?: string | null } | null;
};

/** GET /invoices/:id — full invoice snapshot (for view/print). Needs finance.invoice.read (or front_desk.booking.read). */
export async function getInvoice(hotelId: string, invoiceId: string): Promise<InvoiceDetail> {
  const r = await apiFetch<{ item: InvoiceDetail }>(`/hotels/${hotelId}/invoices/${invoiceId}`);
  return r.item;
}

// ─── Night audit ───
export type NightAudit = {
  id: string;
  businessDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  runType: string;   // AUTO | MANUAL
  status: string;
  noShowsProcessed?: number;
  trialBalanceOk?: boolean;
  notes?: string | null;
  createdAt: string;
  runByName?: string | null;
  summary?: Record<string, unknown> | null;
};

/** GET /night-audit — past closes (last 90) + a pre-audit preview. Needs finance module + finance.ledger.read|invoice.read. */
export async function listNightAudits(hotelId: string): Promise<{ items: NightAudit[]; preview?: unknown }> {
  const r = await apiFetch<{ items?: NightAudit[]; preview?: unknown }>(`/hotels/${hotelId}/night-audit`).catch(() => ({ items: [] as NightAudit[] }));
  return { items: r.items ?? [], preview: (r as { preview?: unknown }).preview };
}

// Render-ready report layout — the SAME `view` the web night-audit modal + Excel builder use.
// Cells are PRE-FORMATTED server-side (money/percent already strings), so the app renders them
// verbatim — no client recomputation, so the numbers can never diverge from the web.
export type ReportCell = string | number;
export type ReportRow = { cells: ReportCell[]; bold?: boolean; merge?: [number, number] };
export type ReportColumn = { id: string; header: string; type: string; align: "left" | "right" | "center"; width?: number };
export type ReportSection = { id: string; title: string; kind: "kv" | "table"; theme?: { headerColor?: string; totalRowColor?: string }; header?: string[] | null; columns: ReportColumn[]; rows: ReportRow[] };
export type ReportView = { sections: ReportSection[] };
export type NightAuditReport = { view?: ReportView; fileDay?: string; businessDate?: string } & Record<string, unknown>;

/** GET /night-audit/:id/report — render-ready JSON preview of one close (top-level fields + `view`). */
export async function getNightAuditReport(hotelId: string, auditId: string): Promise<NightAuditReport> {
  return apiFetch<NightAuditReport>(`/hotels/${hotelId}/night-audit/${auditId}/report`);
}

/** Authenticated download paths (fed to the download service, which attaches the bearer token). */
export const nightAuditXlsxPath = (hotelId: string, auditId: string) => `/hotels/${hotelId}/night-audit/${auditId}/report?format=xlsx`;
export const nightAuditCformPath = (hotelId: string, auditId: string) => `/hotels/${hotelId}/night-audit/${auditId}/cform`;

// ─── CA report ───

export type CaFormula = "EFFECTIVE" | "STANDARD";
/** The business-day boundary the report is anchored to (hotel timezone, night-audit start hour). */
export type CaWindow = { startHour: number; timezone: string; fromTime: string; toTime: string };
export type CaSummary = { window?: CaWindow; formula?: CaFormula };

/**
 * GET /ca/summary — the web CA-Reports page's data source.
 *
 * The app calls it for ONE reason: to learn the hotel's defaults. Send no time and no
 * formula and the server answers with its own — `window.fromTime`/`toTime` (the hotel's
 * night-audit `businessDayStartHour`, which falls back to 06:00, hence the "6 to 6" the
 * web shows) and the hotel's revenue formula. The 6 is a SERVER-side setting, never
 * hard-coded client-side: a hotel whose day starts at 04:00 must not see 06:00 here.
 */
export async function getCaSummary(
  hotelId: string,
  q: { from: string; to: string; fromTime?: string; toTime?: string; formula?: string },
): Promise<CaSummary> {
  const qs = new URLSearchParams({ from: q.from, to: q.to });
  if (q.fromTime) qs.set("fromTime", q.fromTime);
  if (q.toTime) qs.set("toTime", q.toTime);
  if (q.formula) qs.set("formula", q.formula);
  return apiFetch<CaSummary>(`/hotels/${hotelId}/ca/summary?${qs}`);
}
