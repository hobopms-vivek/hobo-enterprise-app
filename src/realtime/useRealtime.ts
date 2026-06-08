import { useEffect, useRef } from "react";
import EventSource from "react-native-sse";

import { API_URL } from "@/config";
import { getAuthToken } from "@/api/client";

// Event names the enterprise SSE bus emits (src/lib/realtime/bus.ts).
export type RealtimeType =
  | "ready"
  | "ticket.assigned"
  | "ticket.escalated"
  | "ticket.updated"
  | "notification"
  | "chat.message"
  | "presence.changed"
  | "feedback.created";

export type RealtimeEvent = { type: RealtimeType; hotelId: string; payload: unknown; at: string };

const TYPES: RealtimeType[] = ["ticket.assigned", "ticket.escalated", "ticket.updated", "notification", "chat.message", "presence.changed", "feedback.created"];

/**
 * Subscribe to the hotel's live SSE stream. EventSource can't set headers in a
 * portable way, so we pass the JWT as ?token= (the realtime route accepts it).
 * `onEvent` fires for every event; re-subscribes when hotelId changes.
 */
export function useRealtime(hotelId: string | null, onEvent: (e: RealtimeEvent) => void): void {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!hotelId) return;
    const token = getAuthToken();
    if (!token) return;

    const url = `${API_URL}/hotels/${hotelId}/realtime?token=${encodeURIComponent(token)}`;
    const es = new EventSource<RealtimeType>(url, { pollingInterval: 0, lineEndingCharacter: "\n" });

    const handlers = TYPES.map((t) => {
      const h = (event: { type: string; data?: string | null }) => {
        try {
          const parsed = event.data ? (JSON.parse(event.data) as RealtimeEvent) : null;
          if (parsed) cb.current(parsed);
        } catch {
          /* ignore malformed frame */
        }
      };
      es.addEventListener(t, h as never);
      return { t, h };
    });

    return () => {
      handlers.forEach(({ t, h }) => es.removeEventListener(t, h as never));
      es.close();
    };
  }, [hotelId]);
}
