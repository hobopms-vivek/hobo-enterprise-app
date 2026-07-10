import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getDashboard, type DashAnalytics } from "@/api/analytics";
import { getFrontDeskOverview, type FrontDeskOverview, type OpsRow } from "@/api/frontdesk";
import { listTickets, type Ticket } from "@/api/tickets";
import { getHousekeeping, type HkSummary } from "@/api/housekeeping";
import { getPresence, setPresence } from "@/api/presence";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtime } from "@/realtime/useRealtime";
import { HotelSwitcherSheet } from "@/components/HotelSwitcherSheet";
import { GuestListSheet } from "@/components/GuestListSheet";
import { TicketListSheet } from "@/components/TicketListSheet";
import { HeaderIcons, HotelPill } from "@/components/AppHeader";
import { Card, HeroHeader, KpiCard, Screen, SectionHeader, Sheet, StatTile } from "@/components/kit";
import { money, moneyShort, pct } from "@/lib/format";
import { RANGES, rangeToWindow, type RangeKey } from "@/lib/range";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type QA = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; go: (n: AppNav) => void; manager?: boolean; module?: string };
type GuestDrill = { title: string; rows: OpsRow[]; balance?: boolean; totalDue?: number } | null;
type TicketRow = { id: string; code: string; subject: string; priority?: string | null; status: string; room?: string | null; category?: string | null };
type TicketDrill = { title: string; rows: TicketRow[] } | null;
type KpiDrill = { label: string; value: string; delta: number; days: number } | null;

export function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const user = useAuthStore((s) => s.user);
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const hotel = hotels.find((h) => h.id === activeHotelId);
  const level = hotel?.role?.level ?? 5;
  const isManager = level <= 3;
  const on = (k?: string) => !k || (hotel?.enabledModules?.includes(k) ?? true);

  // ── Department-tailored home ──────────────────────────────────────────────
  // The user's department memberships (from /me/hotels) drive a personalised
  // "Your department" section so each staffer lands on THEIR world. Reuses
  // existing endpoints only.
  type DeptScreen = "FrontDesk" | "Housekeeping";
  type DeptCfg = { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; module?: string; screen?: DeptScreen };
  const DEPT_CFG: Record<string, DeptCfg> = {
    front_office: { label: "Front Desk", icon: "people-outline", color: t.teal, module: "front_desk", screen: "FrontDesk" },
    housekeeping: { label: "Housekeeping", icon: "bed-outline", color: t.green, module: "housekeeping", screen: "Housekeeping" },
    fnb: { label: "Food & Beverage", icon: "restaurant-outline", color: t.amber, module: "fnb" },
    maintenance: { label: "Maintenance", icon: "construct-outline", color: t.violet },
    security: { label: "Security", icon: "shield-checkmark-outline", color: t.blue },
  };
  const departments = hotel?.departments ?? [];
  const primaryDept = departments.find((d) => DEPT_CFG[d.key] && on(DEPT_CFG[d.key].module)) ?? departments[0];
  const deptKey = primaryDept?.key;
  const deptCfg = deptKey ? DEPT_CFG[deptKey] : undefined;
  // Front-desk overview = folio-accurate + uncapped operational lists (preferred over the capped/raw dashboard ops).
  const canFd = !!hotel && hotel.enabledModules.includes("front_desk") && hotel.permissions.includes("front_desk.booking.read");

  const [data, setData] = useState<DashAnalytics | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const [fd, setFd] = useState<FrontDeskOverview | null>(null);
  const [hkSummary, setHkSummary] = useState<HkSummary | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [onShift, setOnShift] = useState(false);
  const [shiftUntil, setShiftUntil] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [guestDrill, setGuestDrill] = useState<GuestDrill>(null);
  const [ticketDrill, setTicketDrill] = useState<TicketDrill>(null);
  const [kpiDrill, setKpiDrill] = useState<KpiDrill>(null);

  const load = useCallback(async () => {
    if (!activeHotelId) return;
    // KPI window follows the Performance range selector (default 30 days = web default).
    const win = range === "30d" ? undefined : rangeToWindow(range, new Date());
    const [d, tk, p, ov] = await Promise.all([
      getDashboard(activeHotelId, win).catch(() => null),
      listTickets(activeHotelId, { mine: true }).catch(() => [] as Ticket[]),
      getPresence(activeHotelId).catch(() => ({ onShift: false, onShiftUntil: null })),
      canFd ? getFrontDeskOverview(activeHotelId).catch(() => null) : Promise.resolve(null),
    ]);
    setData(d); setTickets(tk); setOnShift(p.onShift); setShiftUntil(p.onShiftUntil); setFd(ov);
    // Housekeeping-department staff get a live rooms summary on their home.
    if (deptKey === "housekeeping") getHousekeeping(activeHotelId).then((r) => setHkSummary(r.summary ?? null)).catch(() => setHkSummary(null));
    else setHkSummary(null);
  }, [activeHotelId, level, deptKey, canFd, range]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtime(activeHotelId, (e) => {
    if (e.type.startsWith("ticket.")) void load();
    if (e.type === "presence.changed") { const pl = e.payload as { userId?: string; onShift?: boolean }; if (pl?.userId === user?.id) setOnShift(!!pl.onShift); }
  });

  const my = useMemo(() => {
    const g: { open: Ticket[]; progress: Ticket[]; escalated: Ticket[] } = { open: [], progress: [], escalated: [] };
    tickets.forEach((tk) => {
      if (["OPEN", "ASSIGNED"].includes(tk.status)) g.open.push(tk);
      else if (tk.status === "IN_PROGRESS") g.progress.push(tk);
      else if (tk.status === "ESCALATED") g.escalated.push(tk);
    });
    return g;
  }, [tickets]);
  const myMaint = useMemo(() => tickets.filter((tk) => (tk.category ?? "").toUpperCase() === "MAINTENANCE" && !["RESOLVED", "CLOSED"].includes(tk.status)), [tickets]);

  async function toggleShift(v: boolean) {
    setOnShift(v);
    try { const r = await setPresence(activeHotelId!, v); setOnShift(r.onShift); }
    catch { setOnShift(!v); Alert.alert("Couldn't update shift"); }
  }

  const ops = data?.operations;
  // Dashboard operations MIRROR THE WEB DASHBOARD exactly: same engine (computeOperations)
  // → raw balance (totalAmount − amountPaid), same 12-row cap, same counts, and the same raw
  // `payment.totalOutstanding` for "To collect". (Folio-accurate + uncapped lives on the Front
  // Desk screen, which mirrors the web front-desk.) Day-use isn't on the web dashboard; we add
  // it as an ADDITIVE card sourced from the front-desk overview when the user can see it.
  const dayUseRows: OpsRow[] = fd
    ? [...fd.dayUsePending, ...fd.dayUseActive.map((d): OpsRow => ({ id: d.id, code: d.code, guest: d.guest ?? "Guest", room: d.room, roomType: d.minutesLeft != null ? `${d.minutesLeft}m left` : "in-house", balance: 0 }))]
    : [];
  const opsSrc = ops ? {
    counts: { arrivals: ops.counts.arrivals, departures: ops.counts.departures, inHouse: ops.counts.inHouse, upcoming: ops.counts.upcoming, dayUse: dayUseRows.length },
    arrivals: ops.arrivals as OpsRow[], departures: ops.departures as OpsRow[], inHouse: ops.inHouse as OpsRow[], upcoming: ops.upcoming as OpsRow[],
    dayUse: dayUseRows,
    balances: ops.balances as OpsRow[],
    toCollect: ops.payment.totalOutstanding, // raw — EXACTLY the web dashboard's "Outstanding to collect"
  } : null;
  const managerial = data?.role?.isManagerial;
  const until = shiftUntil ? new Date(shiftUntil).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
  const openBooking = (id: string) => { setGuestDrill(null); nav.navigate("BookingDetail", { bookingId: id }); };
  const openTicket = (id: string) => { setTicketDrill(null); nav.navigate("TicketDetail", { ticketId: id }); };

  const allQuick: QA[] = [
    { key: "fd", label: "Front Desk", icon: "people-outline", color: t.teal, module: "front_desk", go: (n) => n.navigate("FrontDesk") },
    { key: "hk", label: "Housekeeping", icon: "bed-outline", color: t.green, module: "housekeeping", go: (n) => n.navigate("Housekeeping") },
    { key: "task", label: "New Task", icon: "add-circle-outline", color: t.primary, manager: true, module: "whatsapp", go: (n) => n.navigate("CreateTask") },
    { key: "scan", label: "Scan Room", icon: "qr-code-outline", color: t.violet, module: "whatsapp", go: (n) => n.navigate("QRScan") },
    { key: "inv", label: "Inventory", icon: "cube-outline", color: t.amber, module: "inventory", go: (n) => n.navigate("Inventory") },
    { key: "team", label: "Team", icon: "people-circle-outline", color: t.blue, manager: true, go: (n) => n.navigate("Team") },
  ];
  // Put the user's own department's action first.
  const quick = allQuick
    .filter((q) => (!q.manager || isManager) && on(q.module))
    .sort((a, b) => (a.module && a.module === deptCfg?.module ? -1 : 0) - (b.module && b.module === deptCfg?.module ? -1 : 0));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={t.primary} />}
      >
        <HeroHeader>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <HotelPill light onPress={() => setSwitcher(true)} />
            <View style={{ flex: 1 }} />
            <HeaderIcons light onSearch={() => nav.navigate("Search")} />
          </View>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 16, letterSpacing: -0.4 }}>Hi, {user?.fullName?.split(" ")[0] ?? "there"} 👋</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 }}>{[hotel?.role?.name, primaryDept?.name, hotel?.city].filter(Boolean).join(" · ")}</Text>
        </HeroHeader>

        <View style={{ paddingHorizontal: space.base, marginTop: -14, gap: 18 }}>
          {/* Shift card */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: onShift ? t.green : t.faint, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>{onShift ? "You're on shift" : "You're off shift"}</Text>
                <Text style={[typo.caption, { color: t.muted }]}>{onShift ? (until ? `Until ${until}` : "Receiving tasks") : "Go on shift to receive tasks"}</Text>
              </View>
              <Switch value={onShift} onValueChange={toggleShift} trackColor={{ true: t.green, false: t.slate300 }} thumbColor="#fff" />
            </View>
          </Card>

          {/* My work */}
          <View>
            <SectionHeader title="My work" icon="briefcase-outline" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatTile label="New / assigned" value={my.open.length} icon="add-circle-outline" accent={t.blue} onPress={() => setTicketDrill({ title: "New / assigned", rows: my.open })} />
              <StatTile label="In progress" value={my.progress.length} icon="time-outline" accent={t.amber} onPress={() => setTicketDrill({ title: "In progress", rows: my.progress })} />
              <StatTile label="Escalated" value={my.escalated.length} icon="alert-circle-outline" accent={t.red} onPress={() => setTicketDrill({ title: "Escalated", rows: my.escalated })} />
            </View>
          </View>

          {/* Your department — personalised by the user's department membership */}
          {deptCfg ? (
            <View>
              <SectionHeader
                title={`${deptCfg.label} · today`}
                icon={deptCfg.icon}
                accent={deptCfg.color}
                right={deptCfg.screen ? <Pressable onPress={() => nav.navigate(deptCfg.screen!)}><Text style={[typo.caption, { color: t.primary, fontWeight: "700" }]}>Open ›</Text></Pressable> : undefined}
              />
              {deptKey === "housekeeping" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <StatTile label="Dirty vacant" value={hkSummary?.dirtyVacant ?? 0} icon="brush-outline" accent={t.amber} onPress={() => nav.navigate("Housekeeping")} />
                  <StatTile label="Cleaning" value={hkSummary?.cleaning ?? 0} icon="water-outline" accent={t.blue} onPress={() => nav.navigate("Housekeeping")} />
                  <StatTile label="Awaiting" value={hkSummary?.inspectionPending ?? 0} icon="eye-outline" accent={t.violet} onPress={() => nav.navigate("Housekeeping")} />
                  <StatTile label="Vacant clean" value={hkSummary?.cleanReady ?? 0} icon="checkmark-circle-outline" accent={t.green} onPress={() => nav.navigate("Housekeeping")} />
                </View>
              ) : deptKey === "front_office" && opsSrc ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <StatTile label="Arrivals" value={opsSrc.counts.arrivals} icon="log-in-outline" accent={t.green} onPress={() => setGuestDrill({ title: "Arrivals today", rows: opsSrc.arrivals })} />
                  <StatTile label="Departures" value={opsSrc.counts.departures} icon="log-out-outline" accent={t.amber} onPress={() => setGuestDrill({ title: "Departures today", rows: opsSrc.departures })} />
                  <StatTile label="In-house" value={opsSrc.counts.inHouse} icon="people-outline" accent={t.violet} onPress={() => setGuestDrill({ title: "In-house now", rows: opsSrc.inHouse })} />
                  <StatTile label="Arriving · 7d" value={opsSrc.counts.upcoming} icon="calendar-outline" accent={t.blue} onPress={() => setGuestDrill({ title: "Arriving next 7 days", rows: opsSrc.upcoming })} />
                  {opsSrc.counts.dayUse > 0 ? <StatTile label="Day-use" value={opsSrc.counts.dayUse} icon="hourglass-outline" accent={t.teal} onPress={() => setGuestDrill({ title: "Day-use / hourly", rows: opsSrc.dayUse, balance: false })} /> : null}
                </View>
              ) : deptKey === "maintenance" ? (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <StatTile label="My maintenance" value={myMaint.length} icon="construct-outline" accent={t.violet} onPress={() => setTicketDrill({ title: "My maintenance", rows: myMaint })} />
                  <StatTile label="Escalated" value={my.escalated.length} icon="alert-circle-outline" accent={t.red} onPress={() => setTicketDrill({ title: "Escalated", rows: my.escalated })} />
                  <View style={{ flex: 1, minWidth: 100 }} />
                </View>
              ) : (
                <Card onPress={deptCfg.screen ? () => nav.navigate(deptCfg.screen!) : undefined}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(deptCfg.color, "22"), alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={deptCfg.icon} size={20} color={deptCfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typo.bodyStrong, { color: t.text }]}>{deptCfg.label}</Text>
                      <Text style={[typo.caption, { color: t.muted }]}>{deptCfg.screen ? "Open your department board" : "Coming to the app soon"}</Text>
                    </View>
                    {deptCfg.screen ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
                  </View>
                </Card>
              )}
            </View>
          ) : null}

          {/* Today at the hotel (managers) */}
          {isManager && opsSrc ? (
            <View>
              <SectionHeader title="Today at the hotel" icon="today-outline" accent={t.teal} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <StatTile label="Arrivals" value={opsSrc.counts.arrivals} icon="log-in-outline" accent={t.green} onPress={() => setGuestDrill({ title: "Arrivals today", rows: opsSrc.arrivals })} />
                <StatTile label="In-house" value={opsSrc.counts.inHouse} icon="people-outline" accent={t.violet} onPress={() => setGuestDrill({ title: "In-house now", rows: opsSrc.inHouse })} />
                <StatTile label="Departures" value={opsSrc.counts.departures} icon="log-out-outline" accent={t.amber} onPress={() => setGuestDrill({ title: "Departures today", rows: opsSrc.departures })} />
                <StatTile label="Arriving · 7d" value={opsSrc.counts.upcoming} icon="calendar-outline" accent={t.blue} onPress={() => setGuestDrill({ title: "Arriving next 7 days", rows: opsSrc.upcoming })} />
                {opsSrc.counts.dayUse > 0 ? <StatTile label="Day-use" value={opsSrc.counts.dayUse} icon="hourglass-outline" accent={t.teal} onPress={() => setGuestDrill({ title: "Day-use / hourly", rows: opsSrc.dayUse, balance: false })} /> : null}
                <StatTile label="Open tickets" value={data?.tickets?.activeCount ?? 0} icon="construct-outline" accent={t.red} onPress={() => setTicketDrill({ title: "Open tickets", rows: data?.tickets?.active ?? [] })} />
                {managerial ? <StatTile label="To collect" value={moneyShort(opsSrc.toCollect)} icon="cash-outline" accent={t.teal} onPress={() => setGuestDrill({ title: "Balances to collect", rows: opsSrc.balances, balance: true, totalDue: opsSrc.toCollect })} /> : <View style={{ flex: 1, minWidth: 100 }} />}
              </View>
            </View>
          ) : null}

          {/* Performance (managers) */}
          {isManager && data ? (
            <View>
              <SectionHeader title="Performance" icon="stats-chart-outline" accent={t.violet} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
                {RANGES.map((r) => {
                  const active = range === r.key;
                  return (
                    <Pressable key={r.key} onPress={() => setRange(r.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <KpiCard label="Occupancy" value={pct(data.kpis.occupancy.value)} delta={data.kpis.occupancy.delta} icon="pie-chart-outline" accent={t.blue} onPress={() => setKpiDrill({ label: "Occupancy", value: pct(data.kpis.occupancy.value), delta: data.kpis.occupancy.delta, days: data.range.days })} />
                <KpiCard label="ADR" value={money(data.kpis.adr.value)} delta={data.kpis.adr.delta} icon="pricetag-outline" accent={t.green} onPress={() => setKpiDrill({ label: "ADR (average daily rate)", value: money(data.kpis.adr.value), delta: data.kpis.adr.delta, days: data.range.days })} />
                <KpiCard label="RevPAR" value={money(data.kpis.revpar.value)} delta={data.kpis.revpar.delta} icon="trending-up-outline" accent={t.violet} onPress={() => setKpiDrill({ label: "RevPAR", value: money(data.kpis.revpar.value), delta: data.kpis.revpar.delta, days: data.range.days })} />
                <KpiCard label="Revenue" value={moneyShort(data.kpis.totalRevenue.value)} delta={data.kpis.totalRevenue.delta} icon="wallet-outline" accent={t.teal} onPress={() => setKpiDrill({ label: "Total revenue", value: money(data.kpis.totalRevenue.value), delta: data.kpis.totalRevenue.delta, days: data.range.days })} />
              </View>
            </View>
          ) : null}

          {/* In-house preview (managers) */}
          {isManager && opsSrc?.inHouse?.length ? (
            <View>
              <SectionHeader title="In-house now" icon="home-outline" right={opsSrc.inHouse.length > 4 ? (
                <Pressable onPress={() => setGuestDrill({ title: "In-house now", rows: opsSrc.inHouse })}><Text style={[typo.caption, { color: t.primary, fontWeight: "700" }]}>See all ({opsSrc.inHouse.length})</Text></Pressable>
              ) : undefined} />
              <Card>
                {opsSrc.inHouse.slice(0, 4).map((g, i, arr) => (
                  <Pressable key={g.id} onPress={() => openBooking(g.id)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: t.divider }, pressed ? { opacity: 0.7 } : null]}>
                    <View style={{ minWidth: 42, height: 28, borderRadius: 8, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center", marginRight: 10, paddingHorizontal: 6 }}>
                      <Text style={[{ color: t.primary, fontWeight: "800", fontSize: 12 }, tabular]}>{g.room ?? "—"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{g.guest}</Text>
                      <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{g.roomType ?? g.roomTypeName ?? "Room"}</Text>
                    </View>
                    {managerial ? <Text style={[{ color: g.balance > 0 ? t.red : t.green, fontWeight: "700", fontSize: 13 }, tabular]}>{g.balance > 0 ? money(g.balance) : "Paid"}</Text> : null}
                    <Ionicons name="chevron-forward" size={16} color={t.faint} style={{ marginLeft: 6 }} />
                  </Pressable>
                ))}
              </Card>
            </View>
          ) : null}

          {/* Quick actions */}
          <View>
            <SectionHeader title="Quick actions" icon="flash-outline" accent={t.amber} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {quick.map((q) => (
                <Pressable key={q.key} onPress={() => q.go(nav)} style={{ width: "47%", flexGrow: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: tint(q.color, "22"), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={q.icon} size={19} color={q.color} />
                  </View>
                  <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={1}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <HotelSwitcherSheet visible={switcher} onClose={() => setSwitcher(false)} />

      <GuestListSheet
        visible={!!guestDrill}
        onClose={() => setGuestDrill(null)}
        title={guestDrill?.title ?? ""}
        rows={guestDrill?.rows ?? []}
        showBalance={managerial}
        totalDue={guestDrill?.totalDue}
        onOpenBooking={openBooking}
      />

      <TicketListSheet
        visible={!!ticketDrill}
        onClose={() => setTicketDrill(null)}
        title={ticketDrill?.title ?? ""}
        rows={ticketDrill?.rows ?? []}
        onOpenTicket={openTicket}
      />

      <Sheet visible={!!kpiDrill} onClose={() => setKpiDrill(null)} title={kpiDrill?.label}>
        {kpiDrill ? (
          <View style={{ paddingBottom: 16 }}>
            <Text style={[{ fontSize: 34, fontWeight: "800", color: t.text }, tabular]}>{kpiDrill.value}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Ionicons name={kpiDrill.delta >= 0 ? "trending-up" : "trending-down"} size={16} color={kpiDrill.delta >= 0 ? t.green : t.red} />
              <Text style={{ color: kpiDrill.delta >= 0 ? t.green : t.red, fontWeight: "700", fontSize: 14 }}>{Math.abs(kpiDrill.delta).toFixed(1)}% vs previous period</Text>
            </View>
            <Text style={[typo.caption, { color: t.muted, marginTop: 10 }]}>Computed over the last {kpiDrill.days} days. Open Reports for the full trend and per-room-type breakdown.</Text>
            {isManager ? <View style={{ marginTop: 14 }}><Pressable onPress={() => { setKpiDrill(null); nav.navigate("Reports"); }}><Text style={{ color: t.primary, fontWeight: "700", fontSize: 14 }}>Open full Reports ›</Text></Pressable></View> : null}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
