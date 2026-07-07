import { apiFetch } from "@/api/client";

export type Review = {
  id: string;
  source: string;         // IN_HOUSE | GOOGLE | BOOKING_COM | MAKEMYTRIP | GOIBIBO | AGODA | AIRBNB | TRIPADVISOR | EXPEDIA | OYO | OTHER
  rating: number;         // 1..5
  title?: string | null;
  comment?: string | null;
  reviewerName?: string | null;
  categories?: string | null; // JSON sub-ratings
  sentiment?: string | null;  // positive | neutral | negative
  status: string;         // PENDING | PUBLISHED | RESPONDED
  response?: string | null;
  respondedAt?: string | null;
  stayDate?: string | null;
  createdAt: string;
  guestId?: string | null;
  bookingId?: string | null;
  guest?: { id: string; fullName: string; title?: string | null } | null;
};

export type ReviewStats = {
  total: number;
  avgRating: number;
  satisfaction: number;    // % rating ≥ 4
  pendingResponse: number; // status !== RESPONDED && rating ≤ 3
  distribution: { star: number; count: number }[];
  bySource: { source: string; count: number; avgRating: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
};

/** GET /reviews — guest reviews (guest_management module + guest_feedback.read). */
export async function listReviews(hotelId: string, opts?: { source?: string; status?: string; rating?: number }): Promise<Review[]> {
  const p = new URLSearchParams();
  if (opts?.source) p.set("source", opts.source);
  if (opts?.status) p.set("status", opts.status);
  if (opts?.rating) p.set("rating", String(opts.rating));
  const qs = p.toString() ? `?${p.toString()}` : "";
  const r = await apiFetch<{ items?: Review[] }>(`/hotels/${hotelId}/reviews${qs}`);
  return r.items ?? [];
}

/** GET /reviews/stats — reputation dashboard. */
export async function getReviewStats(hotelId: string): Promise<ReviewStats | null> {
  return apiFetch<ReviewStats>(`/hotels/${hotelId}/reviews/stats`).catch(() => null);
}

/** PATCH /reviews/:id — reply to a review (sets status RESPONDED). Needs guest_feedback.update. */
export async function respondReview(hotelId: string, id: string, response: string): Promise<void> {
  await apiFetch(`/hotels/${hotelId}/reviews/${id}`, { method: "PATCH", body: { response } });
}
