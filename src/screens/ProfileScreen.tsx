import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { getPresence, setPresence } from "@/api/presence";
import { getProfile, updateProfile } from "@/api/profile";
import { useRealtime } from "@/realtime/useRealtime";
import { pickAndUpload } from "@/services/photo";
import { fixMediaUrl } from "@/api/uploads";
import { HotelSwitcherSheet } from "@/components/HotelSwitcherSheet";
import { Card, IconChip, Screen, ScreenHeader, StatusBadge } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress: () => void; color?: string };

export function ProfileScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const user = useAuthStore((s) => s.user);
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const signOut = useAuthStore((s) => s.signOut);
  const hotel = hotels.find((h) => h.id === activeHotelId) ?? null;
  const isStaff = (hotel?.role?.level ?? 5) <= 4;
  const isManager = (hotel?.role?.level ?? 5) <= 3;

  const [onShift, setOnShift] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [switcher, setSwitcher] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useEffect(() => { getProfile().then((p) => setAvatarUrl(p.avatarUrl)).catch(() => {}); }, []);
  const loadPresence = useCallback(async () => {
    if (!activeHotelId) return;
    try { setOnShift((await getPresence(activeHotelId)).onShift); } catch {}
  }, [activeHotelId]);
  useEffect(() => { void loadPresence(); }, [loadPresence]);
  useRealtime(activeHotelId, (e) => {
    if (e.type !== "presence.changed") return;
    const p = e.payload as { userId?: string; onShift?: boolean };
    if (p.userId === user?.id) setOnShift(!!p.onShift);
  });

  async function changeAvatar() {
    if (!activeHotelId || avatarBusy) return;
    setAvatarBusy(true);
    try { const url = await pickAndUpload(activeHotelId); if (url) { await updateProfile({ avatarUrl: url }); setAvatarUrl(url); } }
    catch { Alert.alert("Upload failed", "Could not update your photo."); }
    finally { setAvatarBusy(false); }
  }
  async function toggleShift(v: boolean) {
    if (!activeHotelId) return;
    setOnShift(v);
    try { await setPresence(activeHotelId, v); } catch { setOnShift(!v); }
  }
  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  const rows: Row[] = [
    { icon: "business-outline", label: "Switch hotel", value: hotel?.name, onPress: () => setSwitcher(true), color: t.primary },
    ...(isManager ? [{ icon: "people-outline" as const, label: "Team", onPress: () => nav.navigate("Team"), color: t.blue }] : []),
    { icon: "notifications-outline", label: "Notifications", onPress: () => nav.navigate("Notifications"), color: t.violet },
    { icon: "settings-outline", label: "Settings", onPress: () => nav.navigate("Settings"), color: t.muted },
  ];

  return (
    <Screen>
      <ScreenHeader title="Profile" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 14, paddingBottom: 40 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={changeAvatar} style={{ width: 60, height: 60 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: tint(t.primary, "22"), alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {avatarUrl ? <Image source={{ uri: fixMediaUrl(avatarUrl) }} style={{ width: 60, height: 60 }} /> : <Text style={{ color: t.primary, fontSize: 26, fontWeight: "800" }}>{(user?.fullName ?? "?").charAt(0).toUpperCase()}</Text>}
              </View>
              <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: t.navy, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: t.surface }}>
                {avatarBusy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={12} color="#fff" />}
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{user?.fullName ?? "—"}</Text>
              <Text style={[typo.caption, { color: t.muted }]} numberOfLines={1}>{user?.email ?? ""}</Text>
              {hotel?.role?.name ? <View style={{ marginTop: 6 }}><StatusBadge label={hotel.role.name} color={t.primary} /></View> : null}
            </View>
          </View>
        </Card>

        {isStaff ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: onShift ? t.green : t.faint, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>On shift</Text>
                <Text style={[typo.caption, { color: t.muted }]}>Available for task assignment</Text>
              </View>
              <Switch value={onShift} onValueChange={toggleShift} trackColor={{ true: t.green, false: t.slate300 }} thumbColor="#fff" />
            </View>
          </Card>
        ) : null}

        <Card style={{ padding: 4 }}>
          {rows.map((r, i) => (
            <Pressable key={r.label} onPress={r.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: t.divider }}>
              <IconChip icon={r.icon} color={r.color ?? t.muted} size={34} />
              <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]}>{r.label}</Text>
              {r.value ? <Text style={[typo.caption, { color: t.muted, maxWidth: 130 }]} numberOfLines={1}>{r.value}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </Pressable>
          ))}
        </Card>

        <Pressable onPress={confirmSignOut} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: tint(t.red, "44"), backgroundColor: tint(t.red, "0F"), borderRadius: 13, paddingVertical: 13 }}>
          <Ionicons name="log-out-outline" size={17} color={t.red} />
          <Text style={{ color: t.red, fontWeight: "700", fontSize: 14.5 }}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <HotelSwitcherSheet visible={switcher} onClose={() => setSwitcher(false)} />
    </Screen>
  );
}
