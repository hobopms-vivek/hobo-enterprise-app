import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, View, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { listNightAudits, nightAuditCformPath, nightAuditXlsxPath, type NightAudit } from "@/api/finance";
import { ApiError } from "@/api/client";
import { downloadAndShare } from "@/services/documents";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Card, EmptyState, Screen, ScreenHeader, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export function NightAuditScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const hotel = useAuthStore((s) => s.hotels.find((h) => h.id === hotelId));
  const canFinance = !!hotel && hotel.enabledModules.includes("finance") &&
    (hotel.permissions.includes("finance.ledger.read") || hotel.permissions.includes("finance.invoice.read"));

  const [items, setItems] = useState<NightAudit[] | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setErr(null); setItems((await listNightAudits(hotelId)).items); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You don't have permission to view night-audit reports." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function download(a: NightAudit, kind: "xlsx" | "cform") {
    setBusy(a.id + kind);
    try {
      const day = dayKey(a.businessDate);
      if (kind === "xlsx") await downloadAndShare(nightAuditXlsxPath(hotelId, a.id), `night-audit-${day}.xlsx`, XLSX_MIME);
      else await downloadAndShare(nightAuditCformPath(hotelId, a.id), `c-form-${day}.csv`, "text/csv");
    } catch (e) { Alert.alert("Download failed", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(null); }
  }

  if (!canFinance) {
    return (
      <Screen>
        <ScreenHeader title="Night audit" onBack={() => nav.goBack()} />
        <EmptyState icon="lock-closed-outline" title="No access" hint="The Finance module + a ledger/invoice read permission are required to view night-audit reports." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Night audit" subtitle="Download past closes" onBack={() => nav.goBack()} />
      {items === null ? (
        <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "moon-outline"} title={err?.title ?? "No closes yet"} hint={err?.hint ?? "Night-audit closes will appear here."} />}
          renderItem={({ item: a }) => (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={[typo.h2, { color: t.text, flex: 1 }]} numberOfLines={1}>{fdate(a.businessDate)}</Text>
                <StatusBadge label={a.runType} color={a.runType === "AUTO" ? t.blue : t.violet} />
                {a.status ? <StatusBadge label={a.status.replace(/_/g, " ")} color={t.muted} /> : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {a.trialBalanceOk !== undefined ? (
                  <Text style={[typo.caption, { color: a.trialBalanceOk ? t.green : t.red }]}>{a.trialBalanceOk ? "✓ Trial balance OK" : "⚠ Trial balance off"}</Text>
                ) : null}
                {a.noShowsProcessed != null ? <Text style={[typo.caption, { color: t.muted }, tabular]}>{a.noShowsProcessed} no-shows</Text> : null}
                {a.runByName ? <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>by {a.runByName}</Text> : null}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="Excel report" icon="download-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} loading={busy === a.id + "xlsx"} onPress={() => download(a, "xlsx")} />
                <Button title="C-Form (CSV)" icon="document-text-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} loading={busy === a.id + "cform"} onPress={() => download(a, "cform")} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
