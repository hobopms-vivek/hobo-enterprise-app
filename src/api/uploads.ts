import { API_BASE, API_URL } from "@/config";
import { getAuthToken } from "@/api/client";

/** Upload a local image uri to the hotel's upload endpoint → absolute URL. */
// The web upload route accepts jpeg/png/webp/heic (NOT heif) — iOS sometimes reports
// HEIF for HEIC containers, so normalize heif→heic before sending.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadImage(hotelId: string, uri: string, mime = "image/jpeg"): Promise<string> {
  const type = mime === "image/heif" ? "image/heic" : mime;
  if (!ALLOWED_MIME.includes(type)) throw new Error("Unsupported image type — use JPEG, PNG, WebP or HEIC.");
  const token = getAuthToken();
  const name = uri.split("/").pop() || "photo.jpg";
  const form = new FormData();
  // React Native multipart file descriptor (not a web Blob).
  form.append("file", { uri, name, type } as unknown as Blob);

  const res = await fetch(`${API_URL}/hotels/${hotelId}/uploads`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "1",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const j = (await res.json()) as { url?: string; path?: string };
  const p = j.path ?? j.url;
  if (!p) throw new Error("Upload failed");
  // The server returns EITHER an absolute cloud URL (uploadthing: `path` == the CDN https
  // URL) OR a relative "/uploads/…" path (local dev). Only a RELATIVE path should be
  // prefixed with the API base — prefixing an already-absolute URL produced a broken
  // "https://api…https://cdn…" that never loaded (the ID-upload / preview bug).
  return /^https?:\/\//i.test(p) ? p : `${API_BASE}${p}`;
}

/**
 * Sanitise a stored media URL for display. Recovers URLs saved by the old bug (API base
 * wrongly prepended to an absolute CDN URL) by keeping everything from the LAST "http".
 * Correct absolute or base-prefixed-relative URLs pass through unchanged.
 */
export function fixMediaUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const i = u.lastIndexOf("http");
  return i > 0 ? u.slice(i) : u;
}
