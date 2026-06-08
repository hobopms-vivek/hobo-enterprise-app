import { apiFetch } from "@/api/client";

export type HotelRole = { key: string; name: string; level: number };
export type MyHotel = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  role: HotelRole;
  isParent: boolean;
  enabledModules: string[];
  permissions: string[];
  departments: { id: string; key: string; name: string; role: string }[];
};

/** GET /api/me/hotels → the hotels this user can act in. */
export async function myHotels(): Promise<{ isPlatformOwner: boolean; hotels: MyHotel[] }> {
  return apiFetch<{ isPlatformOwner: boolean; hotels: MyHotel[] }>("/me/hotels");
}
