import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Sheet } from "@/components/kit";
import { radius, space, tabular, type as typo, useTheme } from "@/theme";

/**
 * Form fields for the app's filter sheets.
 *
 * These are deliberately PURE JS — no `@react-native-community/datetimepicker`, no
 * calendar library. A native module would change the Expo fingerprint, which would
 * strand every already-installed build (OTA updates only reach a matching
 * runtimeVersion). Everything here ships over-the-air.
 */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const toYmd = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

/** Parse "YYYY-MM-DD" as a LOCAL calendar date (never `new Date(str)`, which parses as UTC). */
function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

export function prettyDate(ymd: string): string {
  const p = parseYmd(ymd);
  if (!p) return ymd || "—";
  return new Date(p.y, p.m, p.d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ─── Trigger (shared look for all three fields) ───

function Trigger({ label, value, onPress, icon, flex }: { label?: string; value: string; onPress: () => void; icon: React.ComponentProps<typeof Ionicons>["name"]; flex?: number }) {
  const t = useTheme();
  return (
    <View style={{ flex, gap: 5 }}>
      {label ? <Text style={[typo.caption, { color: t.muted }]}>{label}</Text> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1,
          backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md,
          paddingHorizontal: 12, height: 44,
        })}
      >
        <Ionicons name={icon} size={16} color={t.faint} style={{ flexShrink: 0 }} />
        <Text style={[{ color: t.text, fontSize: 14, flexShrink: 1 }, tabular]} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={15} color={t.faint} style={{ marginLeft: "auto", flexShrink: 0 }} />
      </Pressable>
    </View>
  );
}

// ─── SelectField ───

export function SelectField<K extends string>({
  label, value, options, onChange, title, icon = "list-outline", flex,
}: {
  label?: string; value: K; options: { key: K; label: string }[]; onChange: (k: K) => void;
  title?: string; icon?: React.ComponentProps<typeof Ionicons>["name"]; flex?: number;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);
  return (
    <>
      <Trigger label={label} icon={icon} flex={flex} value={current?.label ?? "Select"} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={title ?? label ?? "Select"}>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const active = o.key === value;
            return (
              <Pressable
                key={o.key}
                onPress={() => { onChange(o.key); setOpen(false); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.divider }}
              >
                <Text style={[typo.body, { color: active ? t.primary : t.text, fontWeight: active ? "700" : "500", flex: 1 }]}>{o.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
              </Pressable>
            );
          })}
          <View style={{ height: 8 }} />
        </ScrollView>
      </Sheet>
    </>
  );
}

// ─── DateField (hand-rolled month grid) ───

export function DateField({ label, value, onChange, flex }: { label?: string; value: string; onChange: (ymd: string) => void; flex?: number }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const sel = parseYmd(value);
  const today = new Date();
  const [cursor, setCursor] = useState(() => (sel ? new Date(sel.y, sel.m, 1) : new Date(today.getFullYear(), today.getMonth(), 1)));

  // Re-anchor the grid on the selected month each time the sheet opens.
  const openSheet = () => {
    const p = parseYmd(value);
    setCursor(p ? new Date(p.y, p.m, 1) : new Date(today.getFullYear(), today.getMonth(), 1));
    setOpen(true);
  };

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const lead = new Date(y, m, 1).getDay();          // 0 = Sunday
    const days = new Date(y, m + 1, 0).getDate();     // day 0 of next month = last day of this
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [cursor]);

  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <>
      <Trigger label={label} icon="calendar-outline" flex={flex} value={prettyDate(value)} onPress={openSheet} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? "Pick a date"}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Pressable onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={20} color={t.muted} />
          </Pressable>
          <Text style={[typo.bodyStrong, { color: t.text, flex: 1, textAlign: "center" }]}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <Pressable onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row" }}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[typo.caption, { color: t.faint, flex: 1, textAlign: "center", marginBottom: 6 }]}>{w}</Text>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((d, i) => {
            if (d === null) return <View key={`p${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;
            const ymd = toYmd(cursor.getFullYear(), cursor.getMonth(), d);
            const active = ymd === value;
            const isToday = ymd === todayYmd;
            return (
              <Pressable
                key={ymd}
                onPress={() => { onChange(ymd); setOpen(false); }}
                style={{ width: `${100 / 7}%`, height: 42, alignItems: "center", justifyContent: "center" }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: active ? t.primary : "transparent", borderWidth: !active && isToday ? 1 : 0, borderColor: t.border }}>
                  <Text style={[{ fontSize: 14, fontWeight: active ? "800" : "600", color: active ? "#fff" : t.text }, tabular]}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 10 }} />
      </Sheet>
    </>
  );
}

// ─── TimeField (HH:mm, 24h — matches the web <input type="time"> contract) ───

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeField({ label, value, onChange, flex }: { label?: string; value: string; onChange: (hm: string) => void; flex?: number }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  const h = m ? Math.min(23, Number(m[1])) : 0;
  const mi = m ? Math.min(59, Number(m[2])) : 0;

  const col = (items: number[], active: number, onPick: (n: number) => void) => (
    <ScrollView style={{ flex: 1, maxHeight: 240 }} showsVerticalScrollIndicator={false}>
      {items.map((n) => {
        const on = n === active;
        return (
          <Pressable key={n} onPress={() => onPick(n)} style={{ paddingVertical: 10, alignItems: "center", backgroundColor: on ? t.primary : "transparent", borderRadius: radius.sm, marginBottom: 2 }}>
            <Text style={[{ fontSize: 15, fontWeight: on ? "800" : "600", color: on ? "#fff" : t.text }, tabular]}>{pad2(n)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <>
      <Trigger label={label} icon="time-outline" flex={flex} value={value || "—"} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? "Pick a time"}>
        <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typo.caption, { color: t.muted, textAlign: "center", marginBottom: 6 }]}>Hour</Text>
            {col(HOURS, h, (n) => onChange(`${pad2(n)}:${pad2(mi)}`))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typo.caption, { color: t.muted, textAlign: "center", marginBottom: 6 }]}>Minute</Text>
            {col(MINUTES, mi, (n) => onChange(`${pad2(h)}:${pad2(n)}`))}
          </View>
        </View>
        <View style={{ height: 10 }} />
      </Sheet>
    </>
  );
}
