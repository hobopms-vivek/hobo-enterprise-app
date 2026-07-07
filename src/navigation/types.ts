import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BookingItem } from "@/api/bookings";

/** Stack that wraps the bottom tabs + pushable detail/modal screens. */
export type AppStackParamList = {
  Tabs: undefined;
  TicketDetail: { ticketId: string };
  CreateTask: { roomId?: string; roomNumber?: string } | undefined;
  ChatRoom: { userId: string; name: string };
  QRScan: undefined;
  BlockedRooms: undefined;
  Inventory: undefined;
  Team: undefined;
  FrontDesk: undefined;
  Housekeeping: undefined;
  Profile: undefined;
  Notifications: undefined;
  Approvals: undefined;
  Guests: undefined;
  GuestProfile: { guestId: string };
  Reservations: undefined;
  BookingDetail: { booking?: BookingItem; bookingId?: string };
  Folio: { bookingId: string; code?: string };
  GroupDetail: { groupId: string; code?: string };
  Banquet: undefined;
  BanquetDetail: { eventId: string; code?: string };
  Settings: undefined;
  GuestConversation: { wa: string; name: string };
  AssignCleaning: { roomId?: string; roomNumber?: string } | undefined;
  Reports: undefined;
  NightAudit: undefined;
  Reviews: undefined;
  Leads: undefined;
  ActivityLog: undefined;
  Expenses: undefined;
  Search: undefined;
  BookingCalendar: undefined;
  Linen: undefined;
};

/** Bottom tabs — new IA: Home · Tasks · (+) · Ops · Inbox. */
export type MainTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Create: undefined; // center FAB — intercepted, never mounts a screen
  Ops: undefined;
  Inbox: undefined;
};

export type AppNav = NativeStackNavigationProp<AppStackParamList>;
