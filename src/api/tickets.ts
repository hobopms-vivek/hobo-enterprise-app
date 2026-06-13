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

export type TicketDetail = Ticket & {
  description?: string | null;
  roomId?: string | null;
  reattemptCount?: number;
  deliveryStatus?: string | null;
  resolution?: string | null;
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
