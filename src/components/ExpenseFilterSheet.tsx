import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button, Sheet } from "@/components/kit";
import { DateField, SelectField, TimeField } from "@/components/fields";
import { PERIODS, periodToRange, type PeriodKey } from "@/lib/ca-period";
import type { CaFormula } from "@/api/finance";
import { space, type as typo, useTheme } from "@/theme";

/**
 * The four filters from the web CA Reports header row
 * (hobo-enterprise/src/app/platform/[hotelId]/ca-reports/page.tsx:139-153), in the same order.
 *
 * `fromTime`/`toTime`/`formula` start EMPTY on purpose: the first /ca/summary response fills
 * them with the hotel's own night-audit defaults (see getCaSummary). Same as the web, where
 * the formula select isn't even rendered until that response lands.
 */
export type ExpFilters = {
  period: PeriodKey;
  from: string;      // YYYY-MM-DD, inclusive
  to: string;        // YYYY-MM-DD, inclusive
  fromTime: string;  // "HH:mm"
  toTime: string;    // "HH:mm"
  formula: CaFormula | "";
};

const FORMULAS: { key: CaFormula; label: string }[] = [
  { key: "EFFECTIVE", label: "All stays (Effective)" },
  { key: "STANDARD", label: "Overnight only (Standard)" },
];

export function ExpenseFilterSheet({
  visible, onClose, filters, onApply,
}: {
  visible: boolean; onClose: () => void; filters: ExpFilters; onApply: (f: ExpFilters) => void;
}) {
  const t = useTheme();
  const [d, setD] = useState<ExpFilters>(filters);

  // Re-seed the draft from the applied filters every time the sheet opens.
  useEffect(() => { if (visible) setD(filters); }, [visible, filters]);

  const setPeriod = (p: PeriodKey) => {
    const r = periodToRange(p);
    setD((f) => (r ? { ...f, period: p, from: r[0], to: r[1] } : { ...f, period: p }));
  };
  // Editing either date drops the preset to "Custom" — exactly what the web does.
  const setFrom = (from: string) => setD((f) => ({ ...f, period: "custom", from }));
  const setTo = (to: string) => setD((f) => ({ ...f, period: "custom", to }));

  return (
    <Sheet visible={visible} onClose={onClose} title="Filters">
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: space.md }}>
          {d.formula ? (
            <SelectField
              label="Revenue formula"
              icon="calculator-outline"
              value={d.formula}
              options={FORMULAS}
              onChange={(k) => setD((f) => ({ ...f, formula: k }))}
            />
          ) : null}

          <SelectField
            label="Period"
            icon="albums-outline"
            value={d.period}
            options={PERIODS}
            onChange={setPeriod}
          />

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <DateField label="From" value={d.from} onChange={setFrom} flex={1.5} />
            <TimeField label="Day starts" value={d.fromTime} onChange={(v) => setD((f) => ({ ...f, fromTime: v }))} flex={1} />
          </View>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <DateField label="To" value={d.to} onChange={setTo} flex={1.5} />
            <TimeField label="Day ends" value={d.toTime} onChange={(v) => setD((f) => ({ ...f, toTime: v }))} flex={1} />
          </View>

          <Text style={[typo.caption, { color: t.faint, lineHeight: 16 }]}>
            Times default to the hotel&apos;s night-audit day boundary, so the report lines up with the
            night audit. They set the business-day window for revenue and GST; the expense ledger
            below is a whole-day ledger and always covers the full From–To dates.
          </Text>
        </View>
        <View style={{ height: 12 }} />
      </ScrollView>

      <View style={{ flexDirection: "row", gap: space.sm, paddingTop: 12 }}>
        <Button title="Reset" variant="outline" style={{ flex: 1 }} onPress={() => setPeriod("month")} />
        <Button title="Apply" style={{ flex: 1.4 }} onPress={() => { onApply(d); onClose(); }} />
      </View>
    </Sheet>
  );
}
