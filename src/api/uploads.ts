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
  const j = (await res.json()) as { url: string; path?: string };
  // Prefer base+path so the photo URL always uses the SAME reachable host the
  // app is configured with (e.g. the ngrok https domain), not whatever origin
  // the server computed behind the tunnel.
  return j.path ? `${API_BASE}${j.path}` : j.url;
}
