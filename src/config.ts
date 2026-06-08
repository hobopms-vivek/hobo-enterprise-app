import Constants from "expo-constants";

/**
 * Resolve the hobo-enterprise API base URL.
 * Priority:
 *  1. app.json → expo.extra.apiBaseUrl (set this for staging/prod, e.g. https://pms.example.com)
 *  2. EXPO_PUBLIC_API_BASE_URL env
 *  3. Auto-derive from the Metro dev host (the machine running `next dev` on :3000)
 *  4. http://localhost:3000  (web / simulator fallback)
 *
 * The base URL must NOT include a trailing slash. We append "/api" ourselves.
 */
function resolveBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
  if (extra.apiBaseUrl) return extra.apiBaseUrl.replace(/\/$/, "");

  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // hostUri looks like "192.168.1.5:8081" (Metro). Reuse the host on port 3000.
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;

  return "http://localhost:3000";
}

export const API_BASE = resolveBaseUrl();
export const API_URL = `${API_BASE}/api`;
