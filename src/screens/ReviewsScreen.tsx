import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getReviewStats, listReviews, respondReview, type Review, type ReviewStats } from "@/api/reviews";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Card, EmptyState, Screen, ScreenHeader, SegmentedTabs, Sheet, Skeleton, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const fdate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");
const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
type Tab = "all" | "needs" | "responded";

export function ReviewsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const hotel = useAuthStore((s) => s.hotels.find((h) => h.id === hotelId));
  const canRead = !!hotel && hotel.enabledModules.includes("guest_management") && hotel.permissions.includes("guest_management.guest_feedback.read");
  const canRespond = !!hotel && hotel.permissions.includes("guest_management.guest_feedback.update");

  const [items, setItems] = useState<Review[] | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [err, setErr] = useState<{ title: string; hint: string } | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [reply, setReply] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try {
      setErr(null);
      const [list, st] = await Promise.all([listReviews(hotelId), getReviewStats(hotelId)]);
      setItems(list); setStats(st);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setErr({ title: "No access", hint: e.message || "You can't view reviews." });
      else setErr({ title: "Couldn't load", hint: e instanceof Error ? e.message : "Pull to refresh." });
      setItems([]);
    }
  }, [hotelId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const rows = useMemo(() => {
    const all = items ?? [];
    if (tab === "responded") return all.filter((r) => r.status === "RESPONDED");
    if (tab === "needs") return all.filter((r) => r.status !== "RESPONDED" && r.rating <= 3);
    return all;
  }, [items, tab]);

  async function submitReply() {
    if (!reply || !replyText.trim()) return;
    setBusy(true);
    try { await respondReview(hotelId, reply.id, replyText.trim()); setReply(null); setReplyText(""); await load(); }
    catch (e) { Alert.alert("Couldn't send reply", e instanceof Error ? e.message : "You may not have permission."); }
    finally { setBusy(false); }
  }

  const ratingColor = (r: number) => (r >= 4 ? t.green : r === 3 ? t.amber : t.red);
  const Stars = ({ n, size = 13 }: { n: number; size?: number }) => (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={i <= n ? "star" : "star-outline"} size={size} color={i <= n ? t.gold : t.faint} />)}
    </View>
  );

  if (!canRead) {
    return (
      <Screen>
        <ScreenHeader title="Reviews" onBack={() => nav.goBack()} />
        <EmptyState icon="lock-closed-outline" title="No access" hint="The Guest Management module + guest-feedback read permission are required." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Reviews" subtitle="Guest reputation" onBack={() => nav.goBack()} />

      {stats ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, padding: space.base, alignItems: "center" }}>
          {[
            { label: "Avg rating", value: stats.avgRating.toFixed(1), color: ratingColor(Math.round(stats.avgRating)), star: true },
            { label: "Satisfaction", value: `${Math.round(stats.satisfaction)}%`, color: t.green },
            { label: "Needs reply", value: String(stats.pendingResponse), color: t.red },
            { label: "Total", value: String(stats.total), color: t.text },
          ].map((s) => (
            <View key={s.label} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, minWidth: 96, alignItems: "center", gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={[{ fontSize: 20, fontWeight: "800", color: s.color as string }, tabular]}>{s.value}</Text>
                {s.star ? <Ionicons name="star" size={15} color={t.gold} /> : null}
              </View>
              <Text style={[typo.caption, { color: t.muted }]}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ paddingHorizontal: space.base, paddingBottom: 10 }}>
        <SegmentedTabs value={tab} onChange={setTab} tabs={[{ key: "all", label: "All", count: items?.length }, { key: "needs", label: "Needs reply", count: stats?.pendingResponse }, { key: "responded", label: "Responded" }]} />
      </View>

      {items === null ? (
        <View style={{ padding: space.base, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={radius.lg} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.base, paddingTop: 4, gap: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
          ListEmptyComponent={<EmptyState icon={err ? "lock-closed-outline" : "star-outline"} title={err?.title ?? "No reviews"} hint={err?.hint ?? "Nothing in this view."} />}
          renderItem={({ item: r }) => {
            const name = r.guest?.fullName || r.reviewerName || "Guest";
            const responded = r.status === "RESPONDED";
            return (
              <Card accent={r.rating <= 2 ? t.red : undefined}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Stars n={r.rating} />
                  <View style={{ backgroundColor: tint(t.teal, "18"), borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: t.teal, fontSize: 10.5, fontWeight: "700" }}>{cap(r.source)}</Text></View>
                  <Text style={[typo.caption, { color: t.faint, marginLeft: "auto" }, tabular]}>{fdate(r.createdAt)}</Text>
                </View>
                <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{name}{r.title ? ` · ${r.title}` : ""}</Text>
                {r.comment ? <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]}>{r.comment}</Text> : null}
                {responded && r.response ? (
                  <View style={{ marginTop: 8, backgroundColor: t.surfaceSunken, borderRadius: radius.md, padding: 10 }}>
                    <Text style={[typo.caption, { color: t.primary, fontWeight: "700", marginBottom: 2 }]}>Your reply</Text>
                    <Text style={[typo.caption, { color: t.text }]}>{r.response}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
                  <StatusBadge label={cap(r.status)} color={responded ? t.green : r.rating <= 3 ? t.amber : t.muted} />
                  {canRespond ? (
                    <View style={{ marginLeft: "auto" }}>
                      <Button title={responded ? "Edit reply" : "Reply"} icon="chatbubble-ellipses-outline" size="sm" variant="outline" full={false} onPress={() => { setReply(r); setReplyText(r.response ?? ""); }} />
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      <Sheet visible={!!reply} onClose={() => setReply(null)} title="Reply to review">
        {reply ? (
          <View style={{ paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Stars n={reply.rating} size={15} />
              <Text style={[typo.bodyStrong, { color: t.text }]}>{reply.guest?.fullName || reply.reviewerName || "Guest"}</Text>
            </View>
            {reply.comment ? <Text style={[typo.caption, { color: t.muted, marginBottom: 12 }]}>{reply.comment}</Text> : null}
            <TextInput
              value={replyText} onChangeText={setReplyText} placeholder="Write a professional reply…" placeholderTextColor={t.faint}
              multiline textAlignVertical="top"
              style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, minHeight: 110, fontSize: 14.5 }}
            />
            <View style={{ marginTop: 14 }}><Button title="Send reply" icon="send" loading={busy} disabled={!replyText.trim()} onPress={submitReply} /></View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
