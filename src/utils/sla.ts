/** Format a ticket SLA deadline into a short countdown label. */
export function slaLabel(slaDueAt?: string | null, now: number = Date.now()): { text: string; overdue: boolean } | null {
  if (!slaDueAt) return null;
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return null;
  const diff = due - now;
  const mins = Math.round(Math.abs(diff) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? { text: `due in ${span}`, overdue: false } : { text: `overdue ${span}`, overdue: true };
}
