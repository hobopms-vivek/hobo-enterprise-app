import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "@/navigation/RootNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import { registerForPush } from "@/services/notifications";
import { EscalationAlert } from "@/components/EscalationAlert";

export default function App() {
  // Register for push whenever a hotel becomes active (after sign-in / hydrate).
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (status === "signedIn" && activeHotelId) void registerForPush(activeHotelId);
  }, [status, activeHotelId]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <EscalationAlert />
    </SafeAreaProvider>
  );
}
