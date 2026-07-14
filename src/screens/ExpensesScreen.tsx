import React, { useCallback, useLayoutEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listExpenses, type Expense } from "@/api/reference";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { EmptyState, Screen, ScreenHeader, Skeleton } from "@/components/kit";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const money = (n?: number | null) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");

export function ExpensesScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [items, setItems] = useState<Expense[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setErr(null); const r = await listExpenses(hotelId); setItems(r.items); setTotal(r.total); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view expenses." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Endpoint-authoritative: don't hard-gate on the literal permission list (a super-admin may
  // pass `ctx.can()` on the server via role level without the exact perm string in /me/hotels).
  // We try the fetch and only show "No access" on a real 403.

  return (
    <Screen>
      <ScreenHeader title="Expenses" subtitle="Petty cash & spend" onBack={() => nav.goBack()} right={items?.length ? <Text style={[{ color: t.text, fontWeight: "800", fontSize: 15 }, tabular]}>{money(total)}</Text> : undefined} />
      {items === null ? (
        <View style={{ padding: space.base, gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: space.base, gap: 10, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "cash-outline"} title={err?.title ?? "No expenses"} hint={err?.hint ?? "Nothing logged yet."} />}
          renderItem={({ item: x }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
              <View style={{ minWidth: 52, alignItems: "center" }}>
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{fdate(x.date)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{x.particulars || cap(x.expHead) || "Expense"}</Text>
                <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{[cap(x.expHead), x.vendor, x.mop ? cap(x.mop) : null].filter(Boolean).join(" · ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[{ color: t.text, fontWeight: "700", fontSize: 14 }, tabular]}>{money(x.amount)}</Text>
                {x.gstAmount ? <Text style={[typo.caption, { color: t.faint }, tabular]}>+{money(x.gstAmount)} GST</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
