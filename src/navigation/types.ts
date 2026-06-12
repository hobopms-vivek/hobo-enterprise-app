import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

/** Stack that wraps the bottom tabs + pushable detail/modal screens. */
export type AppStackParamList = {
  Tabs: undefined;
  TicketDetail: { ticketId: string };
  CreateTask: { roomId?: string; roomNumber?: string } | undefined;
  ChatRoom: { userId: string; name: string };
  QRScan: undefined;
  BlockedRooms: undefined;
  Inventory: undefined;
  History: undefined;
  Team: undefined;
  FrontDesk: undefined;
  Housekeeping: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Chats: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type AppNav = NativeStackNavigationProp<AppStackParamList>;
