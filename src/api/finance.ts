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

export type NightAuditReport = { report?: Record<string, unknown>; view?: unknown } & Record<string, unknown>;
/** GET /night-audit/:id/report — render-ready JSON preview of one close. */
export async function getNightAuditReport(hotelId: string, auditId: string): Promise<NightAuditReport> {
  return apiFetch<NightAuditReport>(`/hotels/${hotelId}/night-audit/${auditId}/report`);
}

/** Authenticated download paths (fed to the download service, which attaches the bearer token). */
export const nightAuditXlsxPath = (hotelId: string, auditId: string) => `/hotels/${hotelId}/night-audit/${auditId}/report?format=xlsx`;
export const nightAuditCformPath = (hotelId: string, auditId: string) => `/hotels/${hotelId}/night-audit/${auditId}/cform`;
