import React from "react";
import { ScrollView, Text, View } from "react-native";

import type { DashGuest } from "@/api/analytics";
import { EmptyState, ListRow, Sheet } from "@/components/kit";
import { tabular, type as typo, useTheme } from "@/theme";

const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

/** Bottom-sheet drill-down for a dashboard guest-row list (arrivals/departures/in-house/upcoming/balances). */
export function GuestListSheet({
  visible, onClose, title, rows, showBalance = true, onOpenBooking,
}: {
  visible: boolean; onClose: () => void; title: string; rows: DashGuest[]; showBalance?: boolean; onOpenBooking: (bookingId: string) => void;
}) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {rows.length ? rows.map((g) => (
          <ListRow
            key={g.id}
            title={g.guest}
            subtitle={`${g.code} · ${g.roomType}${g.room ? ` · Room ${g.room}` : ""} · ${g.nights}n`}
            onPress={() => onOpenBooking(g.id)}
            right={showBalance ? (
              <Text style={[{ color: g.balance > 0 ? t.red : t.green, fontWeight: "700", fontSize: 13 }, tabular]}>{g.balance > 0 ? money(g.balance) : "Paid"}</Text>
            ) : undefined}
          />
        )) : <EmptyState title="Nothing here" hint="No records for this view." height={140} />}
        <View style={{ height: 8 }} />
      </ScrollView>
    </Sheet>
  );
}
