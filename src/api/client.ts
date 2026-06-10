import { API_URL } from "@/config";

/**
 * Thin REST client for the hobo-enterprise API. Attaches the bearer token that
 * `POST /api/auth/login` returns (the web app uses an httpOnly cookie; native
 * clients use Authorization: Bearer, which the enterprise auth layer supports).
 */

let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  authToken = token;
}
export function getAuthToken(): string | null {
  return authToken;
}

// Registered by the auth store. Fires when ANY request gets 401 (token expired
// or revoked) so the app drops the session and returns to the login screen
// instead of silently showing empty data.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    // Skip the ngrok free-tier browser-warning interstitial so the API JSON
    // comes through unchanged (harmless when not behind ngrok).
    "ngrok-skip-browser-warning": "1",
    ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 401 && authToken) {
    // Session no longer valid → force logout (the store clears + routes to login).
    onUnauthorized?.();
  }
  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
      ? (data as { error: string }).error
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
