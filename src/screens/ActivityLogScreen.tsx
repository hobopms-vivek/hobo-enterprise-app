import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listAuditLogs, type AuditLog, type AuditSummary } from "@/api/reference";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const cap = (s?: string | null) => (s ? s.replace(/[_.]/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const fdt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export function ActivityLogScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [items, setItems] = useState<AuditLog[] | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setErr(null); const r = await listAuditLogs(hotelId, { limit: 50 }); setItems(r.items); setSummary(r.summary ?? null); setNextCursor(r.nextCursor); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view the activity log." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]); setNextCursor(null);
    }
  }, [hotelId]);
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try { const r = await listAuditLogs(hotelId, { limit: 50, cursor: nextCursor }); setItems((xs) => [...(xs ?? []), ...r.items]); setNextCursor(r.nextCursor); }
    catch { /* keep what we have */ }
    finally { setLoadingMore(false); }
  }, [hotelId, nextCursor, loadingMore]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sevColor = (s?: string | null) => (s === "CRITICAL" ? t.red : s === "WARNING" ? t.amber : t.muted);

  return (
    <Screen>
      <ScreenHeader title="Activity log" subtitle="Who did what" onBack={() => nav.goBack()} />
      {summary ? (
        <View style={{ flexDirection: "row", gap: 10, padding: space.base, paddingBottom: 8 }}>
          {[["Actors", summary.actors, t.blue], ["Failed", summary.failed, t.amber], ["Critical", summary.critical, t.red]].map(([lbl, val, c]) => (
            <View key={lbl as string} style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" }}>
              <Text style={[{ fontSize: 20, fontWeight: "800", color: c as string }, tabular]}>{val as number}</Text>
              <Text style={[typo.caption, { color: t.muted }]}>{lbl as string}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {items === null ? (
        <View style={{ padding: space.base, gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} radius={radius.md} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 10, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: 18 }}><ActivityIndicator color={t.primary} /></View> : null}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "receipt-outline"} title={err?.title ?? "No activity"} hint={err?.hint ?? "Nothing logged yet."} />}
          renderItem={({ item: a }) => {
            const failed = a.outcome === "FAILURE";
            return (
              <View style={{ flexDirection: "row", gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(failed ? t.red : sevColor(a.severity), "18"), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={failed ? "close" : "checkmark"} size={16} color={failed ? t.red : sevColor(a.severity)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{cap(a.action)}{a.entityLabel ? ` · ${a.entityLabel}` : a.entity ? ` · ${cap(a.entity)}` : ""}</Text>
                  <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{[a.userEmail, a.userRole ? cap(a.userRole) : null].filter(Boolean).join(" · ")}</Text>
                  <Text style={[typo.caption, { color: t.faint }, tabular]}>{fdt(a.createdAt)}</Text>
                </View>
                {a.severity && a.severity !== "INFO" ? <StatusBadge label={cap(a.severity)} color={sevColor(a.severity)} /> : null}
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
