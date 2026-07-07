import type { InvoiceDetail } from "@/api/finance";

const inr = (n?: number | null) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const esc = (s?: string | null) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const DOC_LABEL: Record<string, string> = { TAX_INVOICE: "Tax Invoice", PROFORMA: "Proforma Invoice", CREDIT_NOTE: "Credit Note", DEBIT_NOTE: "Debit Note", BILL_OF_SUPPLY: "Bill of Supply" };
const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

/** A self-contained, print-ready GST invoice — rendered to PDF in-app via expo-print. Mirrors the web invoice layout. */
export function invoiceHtml(inv: InvoiceDetail): string {
  const rs = inv.lineItems?.roomStay ?? null;
  const charges = (inv.lineItems?.charges ?? []).filter((c) => !c.isGroup);
  const rooms = inv.booking?.room?.roomNumber ? ` · Room ${esc(inv.booking.room.roomNumber)}` : "";
  const stayLabel = inv.booking
    ? `${esc(inv.booking.roomType?.name ?? "Room")}${rooms} · ${fdate(inv.booking.checkInDate)} → ${fdate(inv.booking.checkOutDate)}`
    : "Room stay";

  const rows: string[] = [];
  if (rs) {
    const taxable = (rs.totalAmount ?? 0) - (rs.taxAmount ?? 0);
    rows.push(`<tr><td>Room charges<div class="sub">${stayLabel}</div></td><td>${esc(rs.sacCode ?? "996311")}</td><td class="r">1</td><td class="r">${inr(taxable)}</td><td class="r">${inr(taxable)}</td></tr>`);
  }
  for (const c of charges) {
    const qty = c.quantity ?? 1;
    const rate = c.unitPrice ?? c.amount;
    rows.push(`<tr><td>${esc(c.description || c.category || "Charge")}</td><td>${esc(c.sacCode ?? "")}</td><td class="r">${qty}</td><td class="r">${inr(rate)}</td><td class="r">${inr(c.amount)}</td></tr>`);
  }
  if (!rows.length) rows.push(`<tr><td colspan="5" class="muted">No billed items.</td></tr>`);

  const taxRows = (inv.taxBreakdown ?? []).map((t) => `<tr><td>${esc(t.name)} @ ${t.rate}%</td><td class="r">${inr(t.amount)}</td></tr>`).join("");
  const s = inv.seller;
  const bank = s?.bankName ? `${esc(s.bankName)}${s.bankAccountNo ? ` · A/C ${esc(s.bankAccountNo)}` : ""}${s.bankIfsc ? ` · IFSC ${esc(s.bankIfsc)}` : ""}${s.bankBranch ? ` · ${esc(s.bankBranch)}` : ""}` : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; padding: 28px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0B2A5B; padding-bottom: 14px; margin-bottom: 16px; }
  .seller h1 { margin: 0 0 4px; font-size: 18px; color: #0B2A5B; }
  .seller div { color: #444; line-height: 1.5; max-width: 320px; }
  .doc { text-align: right; }
  .doc .title { font-size: 20px; font-weight: 800; color: #0B2A5B; text-transform: uppercase; letter-spacing: .5px; }
  .doc .num { font-size: 13px; font-weight: 700; margin-top: 4px; }
  .doc .meta { color: #555; margin-top: 2px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .badge.issued { background: #E6F4EA; color: #137333; }
  .badge.cancelled { background: #FCE8E6; color: #C5221F; }
  .parties { display: flex; gap: 20px; margin-bottom: 14px; }
  .box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
  .box .label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 4px; }
  .box .name { font-weight: 700; font-size: 13px; }
  .box .line { color: #444; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  .items th { background: #0B2A5B; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
  .items td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  .items .r { text-align: right; white-space: nowrap; }
  .sub { color: #777; font-size: 10.5px; margin-top: 2px; }
  .muted { color: #999; text-align: center; padding: 14px; }
  .totals { width: 300px; margin-left: auto; margin-top: 12px; }
  .totals td { padding: 5px 10px; }
  .totals .r { text-align: right; white-space: nowrap; }
  .totals .grand td { border-top: 2px solid #0B2A5B; font-weight: 800; font-size: 14px; color: #0B2A5B; }
  .totals .bal td { font-weight: 700; }
  .taxbox { width: 300px; margin-left: auto; margin-top: 8px; border: 1px solid #eee; border-radius: 6px; overflow: hidden; }
  .taxbox td { padding: 5px 10px; border-bottom: 1px solid #f2f2f2; }
  .words { margin-top: 14px; padding: 8px 12px; background: #F6F8FB; border-radius: 6px; font-size: 11.5px; }
  .foot { margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
  .foot .bank { color: #444; font-size: 11px; max-width: 60%; line-height: 1.5; }
  .sign { text-align: center; color: #444; }
  .sign .line { border-top: 1px solid #999; padding-top: 4px; margin-top: 40px; min-width: 160px; }
  .notes { margin-top: 12px; color: #666; font-size: 11px; }
</style></head><body>
  <div class="head">
    <div class="seller">
      <h1>${esc(inv.sellerName)}</h1>
      <div>
        ${inv.sellerAddress ? esc(inv.sellerAddress) + "<br/>" : ""}
        ${inv.sellerGstin ? "GSTIN: " + esc(inv.sellerGstin) + "<br/>" : ""}
        ${s?.pan ? "PAN: " + esc(s.pan) + "&nbsp;&nbsp;" : ""}${s?.cin ? "CIN: " + esc(s.cin) : ""}
      </div>
    </div>
    <div class="doc">
      <div class="title">${esc(DOC_LABEL[inv.docType] ?? inv.docType)}</div>
      <div class="num">${esc(inv.number)}${inv.displayName ? ` · ${esc(inv.displayName)}` : ""}</div>
      <div class="meta">Date: ${fdate(inv.issuedAt)}</div>
      <div class="meta">${inv.booking?.code ? "Booking: " + esc(inv.booking.code) : ""}</div>
      <div style="margin-top:6px"><span class="badge ${inv.status === "CANCELLED" ? "cancelled" : "issued"}">${esc(inv.status)}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <div class="label">Bill to</div>
      <div class="name">${esc(inv.guestName)}</div>
      <div class="line">
        ${inv.billingAddress ? esc(inv.billingAddress) + "<br/>" : ""}
        ${inv.guestPhone ? esc(inv.guestPhone) + "<br/>" : ""}
        ${inv.guestGstin ? "GSTIN: " + esc(inv.guestGstin) : ""}
      </div>
    </div>
    <div class="box">
      <div class="label">Details</div>
      <div class="line">
        Recipient: ${esc(inv.recipientType ?? "B2C")}<br/>
        Supply: ${esc(inv.supplyType ?? "INTRA")}${inv.placeOfSupply ? " · POS " + esc(inv.placeOfSupply) : ""}<br/>
        Currency: ${esc(inv.currency ?? "INR")}
      </div>
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Description</th><th>SAC/HSN</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Taxable</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>

  ${taxRows ? `<table class="taxbox"><tbody>${taxRows}</tbody></table>` : ""}

  <table class="totals">
    <tr><td>Taxable value</td><td class="r">${inr(inv.subtotal)}</td></tr>
    ${(inv.discount ?? 0) > 0 ? `<tr><td>Discount</td><td class="r">− ${inr(inv.discount)}</td></tr>` : ""}
    ${(inv.taxAmount ?? 0) > 0 ? `<tr><td>Total tax</td><td class="r">${inr(inv.taxAmount)}</td></tr>` : ""}
    ${(inv.roundOff ?? 0) !== 0 ? `<tr><td>Round off</td><td class="r">${inr(inv.roundOff)}</td></tr>` : ""}
    <tr class="grand"><td>Grand total</td><td class="r">${inr(inv.total)}</td></tr>
    <tr><td>Amount paid</td><td class="r">− ${inr(inv.amountPaid)}</td></tr>
    <tr class="bal"><td>Balance due</td><td class="r">${inr(inv.balance)}</td></tr>
  </table>

  ${inv.amountInWords ? `<div class="words"><b>Amount in words:</b> ${esc(inv.amountInWords)}</div>` : ""}
  ${inv.notes ? `<div class="notes">${esc(inv.notes)}</div>` : ""}

  <div class="foot">
    <div class="bank">${bank ? `<b>Bank details:</b> ${bank}` : ""}</div>
    <div class="sign">
      <div>For ${esc(inv.sellerName)}</div>
      <div class="line">${esc(s?.signatoryName ?? "Authorised Signatory")}${s?.signatoryDesignation ? "<br/>" + esc(s.signatoryDesignation) : ""}</div>
    </div>
  </div>
</body></html>`;
}
