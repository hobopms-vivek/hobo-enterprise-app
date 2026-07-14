import { API_BASE, API_URL } from "@/config";
import { getAuthToken } from "@/api/client";

// The web upload route keys off the exact MIME string (jpeg/png/webp/heic). Image pickers are
// not that disciplined: Android commonly reports "image/jpg" (not a real MIME) or nothing at
// all, and iOS reports HEIF for HEIC containers. The old code hard-THREW on anything outside
// its whitelist, and the ticket-photo caller had no catch — so the upload died silently and the
// photo simply never appeared. Normalise instead of throwing, falling back to the file
// extension and finally to JPEG (what the camera actually produces at quality 0.5).
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MIME_ALIAS: Record<string, string> = { "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg", "image/heif": "image/heic" };
const EXT_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heic" };
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

function resolveMime(uri: string, mime?: string | null): string {
  const raw = (mime ?? "").toLowerCase().trim();
  const aliased = MIME_ALIAS[raw] ?? raw;
  if (ALLOWED_MIME.has(aliased)) return aliased;
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "image/jpeg";
}

/** Upload a local image uri to the hotel's upload endpoint → absolute URL. */
export async function uploadImage(hotelId: string, uri: string, mime = "image/jpeg"): Promise<string> {
  const type = resolveMime(uri, mime);
  const token = getAuthToken();
  // Keep the filename's extension consistent with the type we declare, or the server's
  // extension lookup and the CDN's content-type can disagree.
  const base = (uri.split("/").pop() || "photo").replace(/\.[^.]+$/, "");
  const name = `${base}.${MIME_EXT[type]}`;
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
  if (!res.ok) {
    // Surface the server's reason ("File too large", "Unsupported file type", "Read-only role…")
    // instead of a blank "Upload failed" the user can do nothing with.
    const reason = await res.text().then((txt) => { try { return (JSON.parse(txt) as { error?: string }).error; } catch { return undefined; } }).catch(() => undefined);
    throw new Error(reason || `Upload failed (${res.status})`);
  }
  const j = (await res.json()) as { url?: string; path?: string };
  const p = j.path ?? j.url;
  if (!p) throw new Error("Upload failed — server returned no file URL.");
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
