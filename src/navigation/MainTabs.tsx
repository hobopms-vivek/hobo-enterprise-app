import React, { useCallback, useState } from "react";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import { colors } from "@/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { listNotifications } from "@/api/notifications";
import type { MainTabParamList } from "@/navigation/types";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { TasksScreen } from "@/screens/TasksScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { AlertsScreen } from "@/screens/AlertsScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  Tasks: "clipboard",
  Chats: "chatbubbles",
  Alerts: "notifications",
  Profile: "person",
};

export function MainTabs() {
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const roleLevel = hotel?.role?.level ?? 5;
  const isManager = roleLevel <= 3; // SSA/SA/Admin/Manager
  const isStaff = roleLevel <= 4; // working staff (not read-only Visitor)
  // Respect the hotel's enabled modules (parity with web moduleOn). Service
  // tickets + alerts live under the WhatsApp module; hide them if it's off.
  const tasksOn = (hotel?.enabledModules?.includes("whatsapp") ?? true) && isStaff;

  // Unread notification badge (polled).
  const [unread, setUnread] = useState(0);
  const loadUnread = useCallback(async () => {
    if (!activeHotelId) return;
    try {
      const r = await listNotifications(activeHotelId, true);
      setUnread(r.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, [activeHotelId]);
  // Poll the unread badge only while the tabs are focused — pause on a pushed
  // screen so we don't keep hitting the API in the background.
  useFocusEffect(
    useCallback(() => {
      void loadUnread();
      const t = setInterval(loadUnread, 20000);
      return () => clearInterval(t);
    }, [loadUnread]),
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerTintColor: "#fff",
        headerLeftContainerStyle: { paddingLeft: 14 },
        headerLeft: () => <Image source={require("../assets/img/logo.png")} style={{ width: 28, height: 28, borderRadius: 7 }} resizeMode="contain" />,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {tasksOn ? <Tab.Screen name="Tasks" component={TasksScreen} /> : null}
      {isStaff ? <Tab.Screen name="Chats" component={ChatListScreen} /> : null}
      {isManager && tasksOn ? (
        <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarBadge: unread || undefined }} />
      ) : null}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
