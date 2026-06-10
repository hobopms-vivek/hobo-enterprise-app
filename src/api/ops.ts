import { apiFetch } from "@/api/client";

// ─── Departments (for Create Task + transfer pickers) ───
export type Department = { id: string; key: string; name: string };
export async function listDepartments(hotelId: string): Promise<Department[]> {
  const r = await apiFetch<{ items: Department[] }>(`/hotels/${hotelId}/config/departments`);
  return r.items ?? [];
}

// ─── Team members (for reassign picker + team view) ───
export type Member = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  department: { id: string; key: string; name: string } | null;
  role: { key: string; name: string; level: number } | null;
};
// Matches GET /api/hotels/:id/users → { users: [...] }, grouped by user with
// per-membership roles/department. (Excludes the caller + higher-level roles.)
type RawUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  memberships?: {
    departmentId: string | null;
    departmentName: string | null;
    roles: { key: string; name: string; level: number }[];
  }[];
};

export async function listMembers(hotelId: string): Promise<Member[]> {
  const r = await apiFetch<{ users?: RawUser[] }>(`/hotels/${hotelId}/users`);
  return (r.users ?? []).map((u) => {
    const m0 = u.memberships?.[0];
    return {
      userId: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? null,
      isActive: u.isActive,
      department: m0?.departmentName ? { id: m0.departmentId ?? "", key: "", name: m0.departmentName } : null,
      role: m0?.roles?.[0] ?? null,
    };
  });
}

// ─── Blocked / maintenance rooms ───
export type RoomBlock = {
  id: string;
  reason: string | null;
  blockType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  room?: { roomNumber: string } | null;
  createdAt: string;
};
type RawRoomBlock = { id: string; reason: string | null; blockType?: string | null; fromDate?: string | null; toDate?: string | null; room?: { roomNumber: string } | null; createdAt: string };
export async function listRoomBlocks(hotelId: string): Promise<RoomBlock[]> {
  const r = await apiFetch<{ items: RawRoomBlock[] }>(`/hotels/${hotelId}/rooms/blocks`);
  // The API uses fromDate/toDate; expose them as startDate/endDate for the UI.
  return (r.items ?? []).map((b) => ({
    id: b.id, reason: b.reason, blockType: b.blockType ?? null,
    startDate: b.fromDate ?? null, endDate: b.toDate ?? null,
    room: b.room ?? null, createdAt: b.createdAt,
  }));
}

// ─── Inventory items (read-only stock view) ───
export type InventoryItem = { id: string; name: string; unit?: string | null; category?: string | null; reorderLevel?: number | null };
export async function listInventoryItems(hotelId: string): Promise<InventoryItem[]> {
  const r = await apiFetch<{ items: InventoryItem[] }>(`/hotels/${hotelId}/inventory/items`).catch(() => ({ items: [] as InventoryItem[] }));
  return r.items ?? [];
}
