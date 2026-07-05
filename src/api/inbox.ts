import { apiFetch } from "@/api/client";

export type Conversation = {
  wa: string;
  name: string;
  guestId?: string | null;
  vip?: string | null;
  preview?: string | null;
  unread: number;
  source: string;        // whatsapp | direct | airbnb | booking | mmt | agoda | ...
  sourceLabel?: string;
  room?: string | null;
  time?: string | null;
};

export type InboxMessage = { id: string; direction: "in" | "out"; kind: string; body?: string | null; status?: string | null; createdAt: string };
export type InboxGuest = { id: string; fullName: string; phone?: string | null; email?: string | null; vipStatus?: string; tags?: string[] };
export type InboxContext = { windowOpen?: boolean; guest?: InboxGuest | null; tags?: string[]; booking?: { code?: string; room?: string | null; status?: string } | null; [k: string]: unknown };

/** GET /inbox/conversations → guest WhatsApp/OTA threads. */
export async function listConversations(hotelId: string): Promise<Conversation[]> {
  type Res = { conversations?: Conversation[]; items?: Conversation[] };
  const r = await apiFetch<Res>(`/hotels/${hotelId}/inbox/conversations`).catch(() => ({} as Res));
  return r.conversations ?? r.items ?? [];
}

/** GET /inbox/messages?wa= → message history + context (24h window, guest). */
export async function getInbox(hotelId: string, wa: string): Promise<{ messages: InboxMessage[]; context: InboxContext }> {
  const r = await apiFetch<{ messages?: InboxMessage[]; context?: InboxContext }>(`/hotels/${hotelId}/inbox/messages?wa=${encodeURIComponent(wa)}`);
  return { messages: r.messages ?? [], context: r.context ?? {} };
}

/** POST /inbox/messages — free-text reply (fails if the 24h window is closed). */
export async function sendInboxMessage(hotelId: string, wa: string, text: string): Promise<InboxMessage> {
  const r = await apiFetch<{ message: InboxMessage }>(`/hotels/${hotelId}/inbox/messages`, { method: "POST", body: { wa, text } });
  return r.message;
}
