import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { getPresence, setPresence } from "@/api/presence";
import { getProfile, updateProfile } from "@/api/profile";
import { pickAndUpload } from "@/services/photo";
import type { AppNav } from "@/navigation/types";
import { colors } from "@/theme";

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const hotels = useAuthStore((s) => s.hotels);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const setActiveHotel = useAuthStore((s) => s.setActiveHotel);
  const signOut = useAuthStore((s) => s.signOut);
  const navigation = useNavigation<AppNav>();
  const hotel = hotels.find((h) => h.id === activeHotelId) ?? null;

  const [onShift, setOnShift] = useState(false);
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    getProfile().then((p) => setAvatarUrl(p.avatarUrl)).catch(() => undefined);
  }, []);

  const changeAvatar = useCallback(async () => {
    if (!activeHotelId || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const url = await pickAndUpload(activeHotelId);
      if (url) {
        await updateProfile({ avatarUrl: url });
        setAvatarUrl(url);
      }
    } catch {
      Alert.alert("Upload failed", "Could not update your photo.");
    } finally {
      setAvatarBusy(false);
    }
  }, [activeHotelId, avatarBusy]);

  const loadPresence = useCallback(async () => {
    if (!activeHotelId) return;
    try {
      const p = await getPresence(activeHotelId);
      setOnShift(p.onShift);
    } catch {
      /* ignore */
    }
  }, [activeHotelId]);

  useEffect(() => {
    void loadPresence();
  }, [loadPresence]);

  async function togglePresence(next: boolean) {
    if (!activeHotelId || presenceBusy) return;
    setPresenceBusy(true);
    setOnShift(next);
    try {
      await setPresence(activeHotelId, next);
    } catch {
      setOnShift(!next); // revert on failure
    } finally {
      setPresenceBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Pressable onPress={() => void changeAvatar()} style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{(user?.fullName ?? "?").charAt(0).toUpperCase()}</Text>
          )}
          <View style={styles.avatarEdit}>
            {avatarBusy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={13} color="#fff" />}
          </View>
        </Pressable>
        <Text style={styles.name}>{user?.fullName ?? "—"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.rowTitle}>On shift</Text>
            <Text style={styles.rowSub}>Available for task assignment</Text>
          </View>
          <Switch value={onShift} onValueChange={togglePresence} disabled={presenceBusy} trackColor={{ true: colors.green }} />
        </View>
      </View>

      <Pressable style={styles.section} onPress={() => navigation.navigate("Team")}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.rowTitle}>Team</Text>
            <Text style={styles.rowSub}>View hotel staff</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>

      <Text style={styles.sectionLabel}>Hotel</Text>
      <View style={styles.section}>
        {hotels.map((h) => (
          <Pressable key={h.id} style={styles.hotelRow} onPress={() => void setActiveHotel(h.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotelName}>{h.name}</Text>
              <Text style={styles.hotelMeta}>{h.role?.name}{h.city ? ` · ${h.city}` : ""}</Text>
            </View>
            {h.id === activeHotelId ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
        {hotels.length === 0 ? <Text style={styles.rowSub}>No hotels assigned.</Text> : null}
      </View>

      <Pressable style={styles.signout} onPress={confirmSignOut}>
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.role}>{hotel?.role?.name ? `Role: ${hotel.role.name}` : ""}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarEdit: { position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 12 },
  email: { fontSize: 13, color: colors.muted, marginTop: 2 },
  section: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 20, marginBottom: 4, marginLeft: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  hotelRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  hotelName: { fontSize: 15, fontWeight: "600", color: colors.text },
  hotelMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  check: { color: colors.blue, fontSize: 18, fontWeight: "800" },
  signout: { backgroundColor: "#FEE2E2", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  signoutText: { color: colors.red, fontWeight: "700", fontSize: 15 },
  role: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
