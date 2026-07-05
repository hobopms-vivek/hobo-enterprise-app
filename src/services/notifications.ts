import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerExpoPush } from "@/api/presence";

// Foreground display behaviour.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask for permission, get the Expo push token, and register it against the
 * active hotel (POST /push/devices kind=expo). The enterprise push sender
 * (src/lib/push/send.ts) delivers to Expo tokens via the Expo push API.
 * Best-effort — never throws.
 */
// Android channel sound/importance are immutable once created on a device — a
// version bump on the channel id (not just its settings) is required to make
// already-installed devices pick up the new sound. "escalation" here refers
// to the bundled ./src/assets/sounds/escalation.mp3 (registered via the
// expo-notifications config plugin's `sounds` array in app.json), so this only
// takes effect in a rebuilt binary, not an OTA update.
export const PUSH_CHANNEL_ID = "tasks_v2";

export async function registerForPush(hotelId: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        name: "Tasks & alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "escalation",
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (tokenResp.data) await registerExpoPush(hotelId, tokenResp.data);
  } catch {
    /* push is optional in dev / Expo Go */
  }
}
