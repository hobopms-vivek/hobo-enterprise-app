import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors } from "@/theme";
import type { AppStackParamList } from "@/navigation/types";
import { MainTabs } from "@/navigation/MainTabs";
import { TicketDetailScreen } from "@/screens/TicketDetailScreen";
import { CreateTaskScreen } from "@/screens/CreateTaskScreen";
import { ChatRoomScreen } from "@/screens/ChatRoomScreen";
import { QRScanScreen } from "@/screens/QRScanScreen";
import { BlockedRoomsScreen } from "@/screens/BlockedRoomsScreen";
import { InventoryScreen } from "@/screens/InventoryScreen";
import { TaskHistoryScreen } from "@/screens/TaskHistoryScreen";
import { TeamScreen } from "@/screens/TeamScreen";
import { FrontDeskScreen } from "@/screens/FrontDeskScreen";
import { HousekeepingScreen } from "@/screens/HousekeepingScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: "Ticket" }} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ title: "New Task" }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "Chat" }} />
      <Stack.Screen name="QRScan" component={QRScanScreen} options={{ title: "Scan Room" }} />
      <Stack.Screen name="BlockedRooms" component={BlockedRoomsScreen} options={{ title: "Blocked Rooms" }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: "Inventory" }} />
      <Stack.Screen name="History" component={TaskHistoryScreen} options={{ title: "Task History" }} />
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: "Team" }} />
      <Stack.Screen name="FrontDesk" component={FrontDeskScreen} options={{ title: "Front Desk" }} />
      <Stack.Screen name="Housekeeping" component={HousekeepingScreen} options={{ title: "Housekeeping" }} />
    </Stack.Navigator>
  );
}
