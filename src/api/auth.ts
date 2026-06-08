import { apiFetch } from "@/api/client";

export type AuthUser = { id: string; email: string; fullName: string; isPlatformOwner: boolean };

/** POST /api/auth/login → { user, token }. The token is for native bearer auth. */
export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  return apiFetch<{ user: AuthUser; token: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/** POST /api/auth/logout (best-effort; native mainly just drops the token). */
export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
}
