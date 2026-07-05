import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { shadow, useTheme } from "@/theme";
import { useAuthStore } from "@/store/useAuthStore";
import type { MainTabParamList } from "@/navigation/types";
import { HomeScreen } from "@/screens/HomeScreen";
import { TasksScreen } from "@/screens/TasksScreen";
import { OpsHubScreen } from "@/screens/OpsHubScreen";
import { InboxScreen } from "@/screens/InboxScreen";
import { QuickActionSheet } from "@/components/QuickActionSheet";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Noop = () => null;

const ICON: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ["home", "home-outline"],
  Tasks: ["clipboard", "clipboard-outline"],
  Ops: ["grid", "grid-outline"],
  Inbox: ["chatbubbles", "chatbubbles-outline"],
};

export function MainTabs() {
  const t = useTheme();
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const level = hotel?.role?.level ?? 5;
  const isStaff = level <= 4;
  const tasksOn = (hotel?.enabledModules?.includes("whatsapp") ?? true) && isStaff;
  const [quick, setQuick] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: t.primary,
          tabBarInactiveTintColor: t.muted,
          tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, paddingTop: 6, height: 64 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarIcon: ({ focused, color, size }) => {
            const pair = ICON[route.name];
            return pair ? <Ionicons name={focused ? pair[0] : pair[1]} color={color} size={size} /> : null;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        {tasksOn ? <Tab.Screen name="Tasks" component={TasksScreen} /> : null}
        <Tab.Screen
          name="Create"
          component={Noop}
          options={{ tabBarButton: () => <CenterButton onPress={() => setQuick(true)} /> }}
          listeners={{ tabPress: (e) => e.preventDefault() }}
        />
        <Tab.Screen name="Ops" component={OpsHubScreen} />
        {isStaff ? <Tab.Screen name="Inbox" component={InboxScreen} /> : null}
      </Tab.Navigator>
      <QuickActionSheet visible={quick} onClose={() => setQuick(false)} />
    </>
  );
}

function CenterButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={onPress}
        style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", marginTop: -20, borderWidth: 4, borderColor: t.surface, ...shadow.fab }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}
