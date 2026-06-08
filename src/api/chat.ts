import { apiFetch } from "@/api/client";

export type ChatThread = {
  userId: string;
  fullName: string;
  departmentId: string | null;
  unread: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export async function listThreads(hotelId: string): Promise<ChatThread[]> {
  const r = await apiFetch<{ items: ChatThread[] }>(`/hotels/${hotelId}/chat/threads`);
  return r.items ?? [];
}

export async function listMessages(hotelId: string, withUserId: string): Promise<ChatMessage[]> {
  const r = await apiFetch<{ items: ChatMessage[] }>(`/hotels/${hotelId}/chat/messages?withUserId=${encodeURIComponent(withUserId)}`);
  return r.items ?? [];
}

export async function sendMessage(hotelId: string, toUserId: string, body: string): Promise<ChatMessage> {
  const r = await apiFetch<{ item: ChatMessage }>(`/hotels/${hotelId}/chat/messages`, {
    method: "POST",
    body: { toUserId, body },
  });
  return r.item;
}
