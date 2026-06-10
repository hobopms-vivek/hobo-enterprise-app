import { create } from "zustand";

import { setAuthToken, setOnUnauthorized } from "@/api/client";
import { login as apiLogin, logout as apiLogout, type AuthUser } from "@/api/auth";
import { myHotels, type MyHotel } from "@/api/hotels";
import { Session } from "@/services/session";

type Status = "loading" | "signedOut" | "signedIn";

type AuthState = {
  status: Status;
  user: AuthUser | null;
  hotels: MyHotel[];
  activeHotelId: string | null;
  error: string | null;

  /** Re-hydrate token from storage on launch and verify by loading hotels. */
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveHotel: (id: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  hotels: [],
  activeHotelId: null,
  error: null,

  init: async () => {
    // Any 401 from the API (expired/revoked token) drops the session → Login.
    setOnUnauthorized(() => {
      void Session.clear();
      setAuthToken(null);
      set({ status: "signedOut", user: null, hotels: [], activeHotelId: null, error: "Session expired — please sign in again." });
    });
    const token = await Session.getToken();
    if (!token) {
      set({ status: "signedOut" });
      return;
    }
    setAuthToken(token);
    try {
      const { hotels } = await myHotels();
      const stored = await Session.getActiveHotelId();
      const activeHotelId = stored && hotels.some((h) => h.id === stored) ? stored : hotels[0]?.id ?? null;
      const user = await Session.getUser();
      set({ status: "signedIn", hotels, activeHotelId, user });
      if (activeHotelId) await Session.setActiveHotelId(activeHotelId);
    } catch {
      // token invalid/expired
      await Session.clear();
      setAuthToken(null);
      set({ status: "signedOut", user: null, hotels: [], activeHotelId: null });
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      const { user, token } = await apiLogin(email.trim().toLowerCase(), password);
      setAuthToken(token);
      await Session.setToken(token);
      await Session.setUser(user);
      const { hotels } = await myHotels();
      const activeHotelId = hotels[0]?.id ?? null;
      if (activeHotelId) await Session.setActiveHotelId(activeHotelId);
      set({ status: "signedIn", user, hotels, activeHotelId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      set({ error: message });
      throw e;
    }
  },

  signOut: async () => {
    await apiLogout();
    await Session.clear();
    setAuthToken(null);
    set({ status: "signedOut", user: null, hotels: [], activeHotelId: null, error: null });
  },

  setActiveHotel: async (id) => {
    if (!get().hotels.some((h) => h.id === id)) return;
    await Session.setActiveHotelId(id);
    set({ activeHotelId: id });
  },
}));
