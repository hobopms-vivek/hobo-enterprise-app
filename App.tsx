import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

import { RootNavigator } from "@/navigation/RootNavigator";
import { navigationRef } from "@/navigation/navRef";
import { useAuthStore } from "@/store/useAuthStore";
import { registerForPush } from "@/services/notifications";
import { registerExpoPush } from "@/api/presence";
import { EscalationAlert } from "@/components/EscalationAlert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";

/** Navigate to the ticket a push notification refers to, when one is tapped. */
function openFromNotification(data: { ticketId?: string } | undefined) {
  if (data?.ticketId && navigationRef.isReady()) {
    navigationRef.navigate("TicketDetail", { ticketId: data.ticketId });
  }
}

export default function App() {
  // Register for push whenever a hotel becomes active (after sign-in / hydrate).
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (status === "signedIn" && activeHotelId) void registerForPush(activeHotelId);
  }, [status, activeHotelId]);

  // Handle notification taps (foreground tap + cold-start) → deep-link to the ticket.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      openFromNotification(resp.notification.request.content.data as { ticketId?: string });
    });
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) openFromNotification(resp.notification.request.content.data as { ticketId?: string });
    });
    return () => sub.remove();
  }, []);

  // Re-register when Expo rotates the push token so the server never holds a stale one.
  useEffect(() => {
    const sub = Notifications.addPushTokenListener((t) => {
      if (status === "signedIn" && activeHotelId && t.data) void registerExpoPush(activeHotelId, t.data);
    });
    return () => sub.remove();
  }, [status, activeHotelId]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        <EscalationAlert />
        <OfflineBanner />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
