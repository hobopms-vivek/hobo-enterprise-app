import { apiFetch } from "@/api/client";

export type Ticket = {
  id: string;
  code: string;
  category: string;
  priority: string;
  subject: string;
  status: string; // OPEN | ASSIGNED | IN_PROGRESS | ESCALATED | RESOLVED | CLOSED
  workflowStep?: string; // PENDING | ACCEPTED | EN_ROUTE | AT_LOCATION | DONE | APPROVED
  assignedToId?: string | null;
  assignedDeptId?: string | null;
  slaDueAt?: string | null;
  createdAt: string;
  guest?: { fullName: string; phone: string | null } | null;
};

export type TicketLog = {
  id: string;
  action: string; // assigned | accepted | en_route | at_location | done | approved | rejected | reassigned | transferred | escalated | timed_out | resolved | reattempt
  staffId: string | null;
  level: number;
  stepOrder: number | null;
  reason: string | null;
  createdAt: string;
};

/** The booking behind a ticket — resolved server-side from the ticket's bookingId, or (for
 *  staff-raised tickets, which carry no bookingId) from whoever is checked into its room.
 *  `balance` is folio-accurate: room total + non-voided folio charges − paid. */
export type TicketStay = {
  id: string;
  code: string;
  status: string;
  bookingType?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults?: number | null;
  children?: number | null;
  room?: string | null;
  roomType?: string | null;
  ratePlan?: string | null;
  mealPlan?: string | null;
  source?: string | null;
  paymentStatus?: string | null;
  total: number;
  paid: number;
  balance: number;
};

export type TicketDetail = Ticket & {
  description?: string | null;
  roomId?: string | null;
  channel?: string | null;
  reattemptCount?: number;
  deliveryStatus?: string | null;
  resolution?: string | null;
  completionMinutes?: number | null;
  isOverdue?: boolean;
  assignedToName?: string | null;
  assignedDeptName?: string | null;
  createdByName?: string | null;
  resolvedByName?: string | null;
  botQuestionLabel?: string | null;
  guest?: { id?: string; fullName: string; title?: string | null; phone: string | null; email?: string | null } | null;
  room?: { id: string; roomNumber: string; roomType?: string | null } | null;
  stay?: TicketStay | null;
  photosJson?: { step: string; url: string; at?: string }[] | null;
  logs: TicketLog[];
};

export type TicketAction =
  | "accept"
  | "en_route"
  | "at_location"
  | "done"
  | "approve"
  | "reject_done"
  | "reassign"
  | "transfer"
  | "reject"
  | "resolve";

export async function listTickets(hotelId: string, opts?: { status?: string; mine?: boolean }): Promise<Ticket[]> {
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.mine) p.set("mine", "1"); // attendants see only their own assigned tasks
  const qs = p.toString() ? `?${p.toString()}` : "";
  const r = await apiFetch<{ items: Ticket[] }>(`/hotels/${hotelId}/whatsapp/tickets${qs}`);
  return r.items ?? [];
}

export async function getTicket(hotelId: string, ticketId: string): Promise<TicketDetail> {
  const r = await apiFetch<{ item: TicketDetail }>(`/hotels/${hotelId}/whatsapp/tickets/${ticketId}`);
  return r.item;
}

export async function actOnTicket(
  hotelId: string,
  ticketId: string,
  action: TicketAction,
  extra?: { reason?: string; delivered?: boolean; toUserId?: string; toDeptId?: string; photos?: { step: string; url: string }[] }
): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/whatsapp/tickets/${ticketId}/action`, {
    method: "POST",
    body: { action, ...extra },
  });
}

export type CreateTaskInput = {
  subject: string;
  category?: string;
  priority?: string;
  departmentId?: string;
  roomId?: string;
  guestId?: string;
  assignedToId?: string;      // hand it straight to this person; omit to let the routing ladder pick
  description?: string;
  completionMinutes?: number; // D11 — per-task completion timer (manager pinged if overrun)
  slaMinutes?: number;        // escalation SLA override
};

export async function createTask(hotelId: string, input: CreateTaskInput): Promise<{ id: string; code: string }> {
  const r = await apiFetch<{ item: { id: string; code: string } }>(`/hotels/${hotelId}/whatsapp/tickets`, {
    method: "POST",
    body: input,
  });
  return r.item;
}

/** Reassign candidates for a ticket — on-shift staff sorted least-busy (reuses the web candidates route). */
export type Candidate = { userId: string; fullName: string; onShift: boolean; openCount: number; role?: { name: string; level: number } | null; department?: string | null };
const ROLE_NAME: Record<number, string> = { 0: "Owner", 1: "Super Admin", 2: "Admin", 3: "Manager", 4: "Attendant", 5: "Visitor" };
export async function listCandidates(hotelId: string, ticketId: string): Promise<Candidate[]> {
  // Web returns { staff: [{ userId, name, departmentId, departmentName, level, onShift, openCount }], departments, me }.
  type Staff = { userId: string; name: string; departmentName: string | null; level: number; onShift: boolean; openCount: number };
  const r = await apiFetch<{ staff?: Staff[] }>(`/hotels/${hotelId}/whatsapp/tickets/${ticketId}/candidates`).catch(() => ({} as { staff?: Staff[] }));
  return (r.staff ?? []).map((s) => ({
    userId: s.userId, fullName: s.name, onShift: s.onShift, openCount: s.openCount,
    department: s.departmentName, role: { name: ROLE_NAME[s.level] ?? `Level ${s.level}`, level: s.level },
  }));
}
