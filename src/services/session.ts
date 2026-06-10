import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/** Persisted auth/session storage. The bearer token lives in the OS keychain
 * (SecureStore); the chosen hotel + non-secret user profile stay in AsyncStorage. */
const TOKEN_KEY = "hobo_token"; // SecureStore key: alphanumeric / . - _ only
const HOTEL_KEY = "hobo.activeHotelId";
const USER_KEY = "hobo.user";

export type StoredUser = { id: string; email: string; fullName: string; isPlatformOwner: boolean };

export const Session = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async setToken(token: string | null): Promise<void> {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.multiRemove([HOTEL_KEY, USER_KEY]);
  },
};
