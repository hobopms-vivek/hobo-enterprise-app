import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persisted auth/session storage (token + chosen hotel). */
const TOKEN_KEY = "hobo.token";
const HOTEL_KEY = "hobo.activeHotelId";
const USER_KEY = "hobo.user";

export type StoredUser = { id: string; email: string; fullName: string; isPlatformOwner: boolean };

export const Session = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string | null): Promise<void> {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getActiveHotelId(): Promise<string | null> {
    return AsyncStorage.getItem(HOTEL_KEY);
  },
  async setActiveHotelId(id: string | null): Promise<void> {
    if (id) await AsyncStorage.setItem(HOTEL_KEY, id);
    else await AsyncStorage.removeItem(HOTEL_KEY);
  },
  async getUser(): Promise<StoredUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  async setUser(user: StoredUser | null): Promise<void> {
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_KEY);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, HOTEL_KEY, USER_KEY]);
  },
};
