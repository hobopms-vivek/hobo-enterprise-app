import type { Theme } from "@/theme";
import type { BookingItem } from "@/api/bookings";

export type Badge = { label: string; color: string };

const TYPE_LABEL: Record<string, string> = { DAY_USE: "Day use", HOURLY: "Hourly", CORPORATE: "Corporate" };
const ORIGIN_LABEL: Record<string, string> = { WALK_IN: "Walk-in", OTA: "OTA", RESERVATION: "Reservation" };

/**
 * The classification badges shown on a reservation row/header — matches the web
 * `<BookingBadges>`: booking kind (Day use / Hourly / Corporate; NORMAL is
 * unlabelled), origin (Walk-in / OTA), and a corporate bill-to company.
 */
export function bookingBadges(t: Theme, b: Pick<BookingItem, "bookingType" | "createdVia" | "company">): Badge[] {
  const out: Badge[] = [];
  const type = b.bookingType && b.bookingType !== "NORMAL" ? TYPE_LABEL[b.bookingType] : null;
  if (type) out.push({ label: type, color: b.bookingType === "CORPORATE" ? t.violet : t.amber });
  if (b.createdVia === "WALK_IN") out.push({ label: ORIGIN_LABEL.WALK_IN, color: t.blue });
  else if (b.createdVia === "OTA") out.push({ label: ORIGIN_LABEL.OTA, color: t.teal });
  if (b.company?.name && b.bookingType !== "CORPORATE") out.push({ label: b.company.name, color: t.violet });
  return out;
}
