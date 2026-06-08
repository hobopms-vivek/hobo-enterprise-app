import { apiFetch } from "@/api/client";

export type Profile = { id: string; email: string; fullName: string; phone: string | null; avatarUrl: string | null };

export async function getProfile(): Promise<Profile> {
  const r = await apiFetch<{ user: Profile }>("/me/profile");
  return r.user;
}

export async function updateProfile(patch: Partial<Pick<Profile, "fullName" | "phone" | "avatarUrl">>): Promise<Profile> {
  const r = await apiFetch<{ user: Profile }>("/me/profile", { method: "PATCH", body: patch });
  return r.user;
}
