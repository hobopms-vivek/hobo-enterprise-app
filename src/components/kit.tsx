import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type StyleProp, type TextStyle, type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, shadow, space, tabular, tint, type as typo, useTheme, type Theme } from "@/theme";
import { fixMediaUrl } from "@/api/uploads";

type Ion = keyof typeof Ionicons.glyphMap;

/** Full-bleed screen surface. Adds top safe-area inset unless a header handles it. */
export function Screen({ children, style, topInset = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; topInset?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: t.bg, paddingTop: topInset ? insets.top : 0 }, style]}>{children}</View>;
}

/** Solid inner-screen header with optional back chevron + trailing slot. */
export function ScreenHeader({ title, subtitle, onBack, right, count }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; count?: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border, paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: space.base }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ marginLeft: -6, padding: 6 }}>
            <Ionicons name="chevron-back" size={24} color={t.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[typo.h1, { color: t.text }]} numberOfLines={1}>{title}</Text>
            {count !== undefined ? (
              <View style={{ backgroundColor: tint(t.red, "22"), borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 }}>
                <Text style={{ color: t.red, fontWeight: "800", fontSize: 12 }}>{count}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={[typo.caption, { color: t.muted, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Navy hero header (Home / dashboards). */
export function HeroHeader({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ backgroundColor: t.navy, paddingTop: insets.top + 10, paddingBottom: 18, paddingHorizontal: space.base }, style]}>
      {children}
    </View>
  );
}

/** Base card surface (16px radius, hairline border, soft shadow). Optional left accent + press. */
export function Card({ children, style, onPress, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string }) {
  const t = useTheme();
  const body = (
    <View style={[styles(t).card, accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null, style]}>{children}</View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.85, transform: [{ scale: 0.995 }] } : undefined)}>{body}</Pressable>;
}

export function SectionHeader({ title, icon, accent, right }: { title: string; icon?: Ion; accent?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 4 }}>
      {icon ? <Ionicons name={icon} size={15} color={accent ?? t.primary} style={{ marginRight: 6 }} /> : null}
      <Text style={[typo.title, { color: t.text }]}>{title}</Text>
      {right ? <View style={{ marginLeft: "auto" }}>{right}</View> : null}
    </View>
  );
}

/** Rounded icon chip (tinted). */
export function IconChip({ icon, color, size = 36 }: { icon: Ion; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: tint(color, "22"), alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

/** Coloured status / priority pill (22% tint bg + saturated text, or solid). */
export function StatusBadge({ label, color, solid = false }: { label: string; color: string; solid?: boolean }) {
  return (
    <View style={{ backgroundColor: solid ? color : tint(color, "22"), borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text numberOfLines={1} style={{ color: solid ? "#fff" : color, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{label}</Text>
    </View>
  );
}

export function Button({
  title, onPress, variant = "primary", icon, loading, disabled, size = "md", full = true, style,
}: {
  title: string; onPress?: () => void; variant?: "primary" | "outline" | "ghost" | "danger" | "success"; icon?: Ion;
  loading?: boolean; disabled?: boolean; size?: "sm" | "md"; full?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.primary : variant === "danger" ? t.red : variant === "success" ? t.green : "transparent";
  const fg = variant === "outline" || variant === "ghost" ? t.text : "#fff";
  const border = variant === "outline" ? t.border : "transparent";
  const pad = size === "sm" ? { paddingVertical: 9, paddingHorizontal: 12 } : { paddingVertical: 13, paddingHorizontal: 16 };
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: 13, borderWidth: variant === "outline" ? 1 : 0, borderColor: border,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: full ? "stretch" : "flex-start", opacity: off ? 0.5 : pressed ? 0.9 : 1 },
        pad, style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: "700", fontSize: size === "sm" ? 13 : 14.5 }}>{title}</Text>
    </Pressable>
  );
}

/** Generic list row: leading slot + title/subtitle + right slot + chevron. */
export function ListRow({ leading, title, subtitle, right, onPress, chevron = true }: {
  leading?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; chevron?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed && onPress ? 0.7 : 1 })}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={[typo.bodyStrong, { color: t.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[typo.caption, { color: t.muted, marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
    </Pressable>
  );
}

export function StatTile({ label, value, icon, accent, onPress }: { label: string; value: string | number; icon: Ion; accent?: string; onPress?: () => void }) {
  const t = useTheme();
  const a = accent ?? t.primary;
  const body = (
    <View style={[styles(t).card, { padding: 12, gap: 2 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: tint(a, "22"), alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
          <Ionicons name={icon} size={16} color={a} />
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={t.faint} /> : null}
      </View>
      <Text style={[{ fontSize: 20, fontWeight: "800", color: t.text }, tabular]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={[typo.caption, { color: t.muted }]} numberOfLines={2}>{label}</Text>
    </View>
  );
  // flexGrow + flexBasis (NOT the `flex: 1` shorthand, which sets flexBasis: 0%)
  // — a 0% basis inside flexWrap makes RN's layout engine misjudge which items
  // fit the current row, squishing/overlapping the wrapped row instead of
  // cleanly breaking to a new line. flexBasis gives it a real starting size.
  const wrapStyle: StyleProp<ViewStyle> = { flexGrow: 1, flexBasis: "30%", minWidth: 100 };
  if (!onPress) return <View style={wrapStyle}>{body}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [wrapStyle, pressed ? { opacity: 0.85 } : null]}>{body}</Pressable>;
}

export function KpiCard({ label, hint, value, accent, icon, delta, onPress }: { label: string; hint?: string; value: string; accent?: string; icon: Ion; delta?: number; onPress?: () => void }) {
  const t = useTheme();
  const a = accent ?? t.primary;
  const up = (delta ?? 0) >= 0;
  const body = (
    <View style={[styles(t).card, { padding: 14 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: tint(a, "22"), alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={16} color={a} /></View>
        {delta !== undefined && Math.abs(delta) >= 0.05 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: tint(up ? t.green : t.red, "22"), borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Ionicons name={up ? "trending-up" : "trending-down"} size={11} color={up ? t.green : t.red} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: up ? t.green : t.red }}>{Math.abs(delta).toFixed(1)}%</Text>
          </View>
        ) : onPress ? <Ionicons name="chevron-forward" size={14} color={t.faint} /> : null}
      </View>
      <Text style={[{ fontSize: 22, fontWeight: "800", color: t.text, letterSpacing: -0.4 }, tabular]} numberOfLines={1}>{value}</Text>
      <Text style={[typo.label, { color: t.text, marginTop: 3 }]}>{label}</Text>
      {hint ? <Text style={[typo.caption, { color: t.muted, marginTop: 1 }]} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
  const wrapStyle: StyleProp<ViewStyle> = { flexGrow: 1, flexBasis: "46%", minWidth: 150 };
  if (!onPress) return <View style={wrapStyle}>{body}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [wrapStyle, pressed ? { opacity: 0.85 } : null]}>{body}</Pressable>;
}

/** Segmented tab control with optional counts. */
export function SegmentedTabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.surfaceSunken, borderRadius: radius.md, padding: 4, gap: 4 }}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={{ flex: 1, backgroundColor: active ? t.surface : "transparent", borderRadius: radius.sm, paddingVertical: 8, alignItems: "center", ...(active ? shadow.card : {}) }}>
            <Text style={{ fontSize: 13, fontWeight: active ? "700" : "600", color: active ? t.primary : t.muted }} numberOfLines={1}>
              {tab.label}{tab.count !== undefined ? ` ${tab.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal filter chips (single-select). */
export function FilterChips<K extends string>({ chips, value, onChange }: { chips: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.base }}>
      {chips.map((c) => {
        const active = c.key === value;
        return (
          <Pressable key={c.key} onPress={() => onChange(c.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : t.muted }}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchBar({ value, onChangeText, placeholder = "Search" }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44 }}>
      <Ionicons name="search" size={18} color={t.faint} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.faint} style={{ flex: 1, color: t.text, fontSize: 14.5 }} autoCorrect={false} />
      {value ? <Pressable onPress={() => onChangeText("")} hitSlop={8}><Ionicons name="close-circle" size={18} color={t.faint} /></Pressable> : null}
    </View>
  );
}

/** Circular avatar with initial (or image) + optional online dot. */
export function Avatar({ name, uri, size = 40, online }: { name?: string; uri?: string | null; size?: number; online?: boolean }) {
  const t = useTheme();
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <View>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint(t.primary, "22"), alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {uri ? <Animated.Image source={{ uri: fixMediaUrl(uri) }} style={{ width: size, height: size }} /> : <Text style={{ color: t.primary, fontWeight: "800", fontSize: size * 0.4 }}>{initial}</Text>}
      </View>
      {online !== undefined ? (
        <View style={{ position: "absolute", right: -1, bottom: -1, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: online ? t.green : t.faint, borderWidth: 2, borderColor: t.surface }} />
      ) : null}
    </View>
  );
}

/** Pulsing skeleton placeholder. */
export function Skeleton({ height = 16, width = "100%", radius: r = 8, style }: { height?: number; width?: number | `${number}%` | "100%"; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ height, width, borderRadius: r, backgroundColor: t.surfaceSunken, opacity: op }, style]} />;
}

/** Bottom-sheet modal with grab handle. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={onClose} />
      <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 12, ...shadow.sheet }}>
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.slate300 }} />
        </View>
        {title ? (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.base, paddingTop: 10 }}>
            <Text style={[typo.h2, { color: t.text, flex: 1 }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={t.muted} /></Pressable>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: space.base, paddingTop: 12 }}>{children}</View>
      </View>
    </Modal>
  );
}

export function EmptyState({ icon = "checkmark-done-circle-outline", title, hint, height = 220 }: { icon?: Ion; title: string; hint?: string; height?: number }) {
  const t = useTheme();
  return (
    <View style={{ height, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: t.surfaceSunken, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={t.slate300} />
      </View>
      <Text style={[typo.title, { color: t.muted }]}>{title}</Text>
      {hint ? <Text style={[typo.caption, { color: t.faint, textAlign: "center", maxWidth: 260 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Loader() {
  const t = useTheme();
  return <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={t.primary} /></View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.divider }} />;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, padding: 16, ...shadow.card },
  });

export type { Ion };
export { space, radius, tint };
