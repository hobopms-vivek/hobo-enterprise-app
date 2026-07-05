import React from "react";
import { ScrollView, View } from "react-native";

import { EmptyState, ListRow, Sheet, StatusBadge } from "@/components/kit";
import { priorityColor, statusColor, useTheme } from "@/theme";

type Row = { id: string; code: string; subject: string; priority?: string | null; status: string; room?: string | null; category?: string | null };

/** Bottom-sheet drill-down for a dashboard ticket-row list (my work / open tickets). */
export function TicketListSheet({ visible, onClose, title, rows, onOpenTicket }: { visible: boolean; onClose: () => void; title: string; rows: Row[]; onOpenTicket: (ticketId: string) => void }) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {rows.length ? rows.map((r) => (
          <ListRow
            key={r.id}
            title={r.subject}
            subtitle={[r.code, r.room ? `Room ${r.room}` : null, r.category].filter(Boolean).join(" · ")}
            onPress={() => onOpenTicket(r.id)}
            right={<StatusBadge label={r.priority ?? r.status.replace(/_/g, " ")} color={r.priority ? priorityColor[r.priority] ?? t.muted : statusColor[r.status] ?? t.muted} />}
          />
        )) : <EmptyState title="Nothing here" hint="No matching tasks." height={140} />}
        <View style={{ height: 8 }} />
      </ScrollView>
    </Sheet>
  );
}
