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
import { TeamScreen } from "@/screens/TeamScreen";
import { FrontDeskScreen } from "@/screens/FrontDeskScreen";
import { HousekeepingScreen } from "@/screens/HousekeepingScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { ApprovalsScreen } from "@/screens/ApprovalsScreen";
import { GuestsScreen } from "@/screens/GuestsScreen";
import { GuestProfileScreen } from "@/screens/GuestProfileScreen";
import { ReservationsScreen } from "@/screens/ReservationsScreen";
import { BookingDetailScreen } from "@/screens/BookingDetailScreen";
import { FolioScreen } from "@/screens/FolioScreen";
import { GroupDetailScreen } from "@/screens/GroupDetailScreen";
import { BanquetScreen } from "@/screens/BanquetScreen";
import { BanquetDetailScreen } from "@/screens/BanquetDetailScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { GuestConversationScreen } from "@/screens/GuestConversationScreen";
import { AssignCleaningScreen } from "@/screens/AssignCleaningScreen";
import { ManagerReportsScreen } from "@/screens/ManagerReportsScreen";
import { NightAuditScreen } from "@/screens/NightAuditScreen";
import { ReviewsScreen } from "@/screens/ReviewsScreen";
import { LeadsScreen } from "@/screens/LeadsScreen";
import { ActivityLogScreen } from "@/screens/ActivityLogScreen";
import { ExpensesScreen } from "@/screens/ExpensesScreen";
import { GlobalSearchScreen } from "@/screens/GlobalSearchScreen";
import { BookingCalendarScreen } from "@/screens/BookingCalendarScreen";
import { LinenScreen } from "@/screens/LinenScreen";

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
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: "Team" }} />
      <Stack.Screen name="FrontDesk" component={FrontDeskScreen} options={{ title: "Front Desk" }} />
      <Stack.Screen name="Housekeeping" component={HousekeepingScreen} options={{ title: "Housekeeping" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Guests" component={GuestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GuestProfile" component={GuestProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Folio" component={FolioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Banquet" component={BanquetScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BanquetDetail" component={BanquetDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GuestConversation" component={GuestConversationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AssignCleaning" component={AssignCleaningScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Reports" component={ManagerReportsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NightAudit" component={NightAuditScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Leads" component={LeadsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Search" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingCalendar" component={BookingCalendarScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Linen" component={LinenScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
