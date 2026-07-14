import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { listExpenses, type Expense } from "@/api/reference";
import { getCaSummary } from "@/api/finance";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { EmptyState, Screen, ScreenHeader, Skeleton } from "@/components/kit";
import { ExpenseFilterSheet, type ExpFilters } from "@/components/ExpenseFilterSheet";
import { prettyDate } from "@/components/fields";
import { monthRange, PERIODS } from "@/lib/ca-period";
import { money } from "@/lib/format";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");

function initialFilters(): ExpFilters {
  const [from, to] = monthRange(0);
  // Times + formula stay empty until /ca/summary reports the hotel's own defaults.
  return { period: "month", from, to, fromTime: "", toTime: "", formula: "" };
}

export function ExpensesScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [items, setItems] = useState<Expense[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ExpFilters>(initialFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The hotel's day-boundary + formula defaults are fetched once — /ca/summary runs the full
  // revenue query, so re-running it on every filter change would be a heavy call for values
  // that never change. The expense ledger itself only ever needs `from`/`to`.
  const defaultsLoaded = useRef(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    const { from, to } = filters;
    try {
      setErr(null);
      const r = await listExpenses(hotelId, { from, to });
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view expenses." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]);
    }

    if (defaultsLoaded.current) return;
    try {
      const s = await getCaSummary(hotelId, { from, to });
      defaultsLoaded.current = true;
      // `|| f.x` guards mean a later response can never clobber a value the user has edited.
      setFilters((f) => ({
        ...f,
        fromTime: f.fromTime || s.window?.fromTime || "",
        toTime: f.toTime || s.window?.toTime || "",
        formula: f.formula || s.formula || "",
      }));
    } catch {
      // Reports permission may be narrower than expenses — the ledger still works without it.
    }
  }, [hotelId, filters]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Endpoint-authoritative: don't hard-gate on the literal permission list (a super-admin may
  // pass `ctx.can()` on the server via role level without the exact perm string in /me/hotels).
  // We try the fetch and only show "No access" on a real 403.

  const periodLabel = PERIODS.find((p) => p.key === filters.period)?.label ?? "Custom";
  const window = filters.fromTime && filters.toTime ? ` · ${filters.fromTime}→${filters.toTime}` : "";

  return (
    <Screen>
      <ScreenHeader
        title="Expenses"
        subtitle="Petty cash & spend"
        onBack={() => nav.goBack()}
        right={items?.length ? <Text style={[{ color: t.text, fontWeight: "800", fontSize: 15 }, tabular]}>{money(total)}</Text> : undefined}
      />

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.7 : 1,
          marginHorizontal: space.base, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10,
          backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md,
        })}
      >
        <Ionicons name="options-outline" size={18} color={t.primary} style={{ flexShrink: 0 }} />
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{periodLabel}</Text>
          <Text style={[typo.caption, { color: t.muted }, tabular]} numberOfLines={1}>
            {prettyDate(filters.from)} → {prettyDate(filters.to)}{window}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={t.faint} style={{ flexShrink: 0 }} />
      </Pressable>

      {items === null ? (
        <View style={{ padding: space.base, gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 8, gap: 10, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "cash-outline"} title={err?.title ?? "No expenses"} hint={err?.hint ?? "Nothing logged in this period."} />}
          renderItem={({ item: x }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
              <View style={{ minWidth: 52, alignItems: "center", flexShrink: 0 }}>
                <Text style={[typo.caption, { color: t.muted }, tabular]} numberOfLines={1}>{fdate(x.date)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{x.particulars || cap(x.expHead) || "Expense"}</Text>
                <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{[cap(x.expHead), x.vendor, x.mop ? cap(x.mop) : null].filter(Boolean).join(" · ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]} numberOfLines={1}>{money(x.amount)}</Text>
                {x.gstAmount ? <Text style={[typo.caption, { color: t.faint }, tabular]} numberOfLines={1}>+{money(x.gstAmount)} GST</Text> : null}
              </View>
            </View>
          )}
        />
      )}

      <ExpenseFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onApply={(f) => { setItems(null); setFilters(f); }}
      />
    </Screen>
  );
}
