import React from "react";
import { ScrollView, Text, View } from "react-native";

import type { OpsRow } from "@/api/frontdesk";
import { EmptyState, ListRow, Sheet } from "@/components/kit";
import { money, moneyShort } from "@/lib/format";
import { tabular, type as typo, useTheme } from "@/theme";

/** Bottom-sheet drill-down for an operational guest-row list (arrivals/departures/in-house/upcoming/balances/day-use). */
export function GuestListSheet({
  visible, onClose, title, rows, showBalance = true, totalDue, onOpenBooking,
}: {
  visible: boolean; onClose: () => void; title: string; rows: OpsRow[]; showBalance?: boolean;
  /** Authoritative total to display in the header (e.g. the raw payment.totalOutstanding
   *  behind the "To collect" card) so the header matches the card even if the row list is
   *  capped. Falls back to summing the visible rows. */
  totalDue?: number; onOpenBooking: (bookingId: string) => void;
}) {
  const t = useTheme();
  const dueRows = rows.filter((g) => g.balance > 0);
  const headerTotal = totalDue ?? dueRows.reduce((s, g) => s + Math.max(0, g.balance), 0);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {showBalance && headerTotal > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 10, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: t.divider }}>
          <Text style={[typo.caption, { color: t.muted }]}>{dueRows.length} guest{dueRows.length === 1 ? "" : "s"} to collect from</Text>
          <Text style={[{ color: t.red, fontWeight: "800", fontSize: 16 }, tabular]}>{moneyShort(headerTotal)}</Text>
        </View>
      ) : null}
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {rows.length ? rows.map((g) => {
          const due = g.balance > 0;
          // Folio-accurate: any balance > 0 => there IS money owed, so never say "Paid".
          const partial = due && (g.paymentStatus === "PARTIAL" || g.paymentStatus === "PENDING");
          return (
            <ListRow
              key={g.id}
              title={g.guest}
              subtitle={[g.code, g.roomType ?? g.roomTypeName, g.room ? `Room ${g.room}` : null, g.nights ? `${g.nights}n` : null].filter(Boolean).join(" · ")}
              onPress={() => onOpenBooking(g.id)}
              right={showBalance ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[{ color: due ? t.red : t.green, fontWeight: "700", fontSize: 13 }, tabular]}>{due ? money(g.balance) : "Paid"}</Text>
                  {due ? <Text style={[typo.caption, { color: t.muted }]}>{partial ? "Partial · due" : "Due"}</Text> : null}
                </View>
              ) : undefined}
            />
          );
        }) : <EmptyState title="Nothing here" hint="No records for this view." height={140} />}
        <View style={{ height: 8 }} />
      </ScrollView>
    </Sheet>
  );
}
