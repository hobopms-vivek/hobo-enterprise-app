import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getNightAuditReport, nightAuditXlsxPath, type NightAuditReport, type ReportCell, type ReportSection } from "@/api/finance";
import { ApiError } from "@/api/client";
import { downloadAndShare } from "@/services/documents";
import { useAuthStore } from "@/store/useAuthStore";
import { EmptyState, Screen, ScreenHeader, Skeleton } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const dayKey = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "report");

export function NightAuditReportScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "NightAuditReport">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [report, setReport] = useState<NightAuditReport | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { setErr(null); setReport(await getNightAuditReport(hotelId, params.auditId)); }
    catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view night-audit reports." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setReport(null);
    }
  }, [hotelId, params.auditId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function download() {
    setBusy(true);
    try { await downloadAndShare(nightAuditXlsxPath(hotelId, params.auditId), `night-audit-${dayKey(params.businessDate ?? report?.fileDay)}.xlsx`, XLSX_MIME); }
    catch (e) { Alert.alert("Download failed", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  const sections = report?.view?.sections ?? [];
  const dateLabel = params.businessDate ? new Date(params.businessDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Report";

  return (
    <Screen>
      <ScreenHeader
        title="Night-audit report"
        subtitle={dateLabel}
        onBack={() => nav.goBack()}
        right={<Pressable onPress={download} disabled={busy} hitSlop={8} style={{ padding: 6 }}>{busy ? <ActivityIndicator color={t.primary} /> : <Ionicons name="download-outline" size={22} color={t.primary} />}</Pressable>}
      />
      {report === null && !err ? (
        <View style={{ padding: space.base, gap: 14 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={radius.lg} />)}</View>
      ) : err ? (
        <EmptyState icon="lock-closed-outline" title={err.title} hint={err.hint} />
      ) : sections.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No report data" hint="This close has no report layout to show." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.base, gap: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
        >
          {sections.map((s) => <SectionView key={s.id} s={s} />)}
          <Text style={[typo.caption, { color: t.faint, textAlign: "center", marginTop: 2 }]}>Same figures as the web night-audit report · tap ⤓ to download Excel</Text>
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * One pre-formatted report section. Every column gets a FIXED width shared by the header row
 * and all data rows (→ perfect alignment). Narrow tables stretch the first column to fill the
 * screen; wide tables scroll horizontally — so a cell is never squeezed or clipped.
 */
function SectionView({ s }: { s: ReportSection }) {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const cols = s.columns ?? [];
  const isKv = s.kind === "kv";
  const header = s.header && s.header.length ? s.header : null;
  const nCols = Math.max(header?.length ?? 0, cols.length, ...s.rows.map((r) => r.cells.length), isKv ? 2 : 1);

  const alignOf = (i: number): "left" | "right" | "center" => {
    const a = cols[i]?.align;
    if (a) return a;
    if (isKv) return i === 0 ? "left" : "right";
    return cols[i]?.type && cols[i].type !== "text" ? "right" : "left";
  };
  const baseW = (i: number): number => {
    if (i === 0) return isKv ? 150 : 164;
    const ty = cols[i]?.type;
    if (ty === "number") return 78;
    if (ty === "money" || ty === "moneySigned" || ty === "moneyPlain") return 110;
    return 140; // text / unknown
  };

  const avail = screenW - space.base * 2 - 2; // usable width inside the section card
  let totalBase = 0; for (let i = 0; i < nCols; i++) totalBase += baseW(i);
  const slack = Math.max(0, avail - totalBase);               // give spare width to col 0 so narrow tables fill
  const colW = (i: number) => baseW(i) + (i === 0 ? slack : 0);
  const containerW = Math.max(avail, totalBase);
  const scrolls = totalBase > avail;

  const Row = ({ cells, head, bold, zebra }: { cells: ReportCell[]; head?: boolean; bold?: boolean; zebra?: boolean }) => {
    const padded = cells.length >= nCols ? cells : [...cells, ...Array(nCols - cells.length).fill("")];
    return (
      <View style={{ flexDirection: "row", borderTopWidth: head ? 0 : 1, borderTopColor: t.divider, backgroundColor: head ? t.surfaceSunken : bold ? tint(t.primary, "14") : zebra ? tint(t.muted, "08") : "transparent" }}>
        {padded.slice(0, nCols).map((c, i) => (
          <View key={i} style={{ width: colW(i), paddingVertical: 9, paddingHorizontal: 11, justifyContent: "center" }}>
            <Text style={[{ fontSize: 12.5, lineHeight: 17, color: head ? t.muted : t.text, fontWeight: head || bold ? "800" : "500", textAlign: alignOf(i) }, tabular]}>{String(c ?? "")}</Text>
          </View>
        ))}
      </View>
    );
  };

  const table = (
    <View style={{ width: containerW }}>
      {header ? <Row cells={header} head /> : null}
      {s.rows.length === 0
        ? <View style={{ paddingVertical: 16 }}><Text style={[typo.caption, { color: t.faint, textAlign: "center" }]}>—</Text></View>
        : s.rows.map((r, ri) => <Row key={ri} cells={r.cells} bold={r.bold} zebra={ri % 2 === 1 && !r.bold} />)}
    </View>
  );

  return (
    <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tint(t.primary, "12"), paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: t.primary }} />
        <Text style={{ color: t.primary, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4, flex: 1 }} numberOfLines={2}>{(s.title ?? "").toUpperCase()}</Text>
        {scrolls ? <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Ionicons name="swap-horizontal" size={13} color={t.faint} /><Text style={[typo.caption, { color: t.faint }]}>scroll</Text></View> : null}
      </View>
      {scrolls ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: containerW }}>{table}</ScrollView> : table}
    </View>
  );
}
