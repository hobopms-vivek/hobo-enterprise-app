import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { addGuestDocument, getGuest, updateGuest, type GuestDetail, type GuestStay } from "@/api/guests";
import { captureAndUpload } from "@/services/photo";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, Button, Card, IconChip, Loader, Screen, ScreenHeader, Sheet, StatusBadge } from "@/components/kit";
import { radius, space, tabular, tint, type as typo, useTheme } from "@/theme";
import type { AppStackParamList } from "@/navigation/types";

const ID_TYPES = ["AADHAAR", "PASSPORT", "DRIVING_LICENSE", "VOTER_ID", "PAN", "OTHER"];
const money = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" }) : "");

export function GuestProfileScreen() {
  const t = useTheme();
  const nav = useNavigation();
  const { params } = useRoute<RouteProp<AppStackParamList, "GuestProfile">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;

  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [stays, setStays] = useState<GuestStay[]>([]);
  const [idSheet, setIdSheet] = useState<{ url: string } | null>(null);
  const [docType, setDocType] = useState(ID_TYPES[0]);
  const [docNumber, setDocNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { const r = await getGuest(hotelId, params.guestId); setGuest(r.guest); setStays(r.stays); }
    catch { /* leave null */ }
  }, [hotelId, params.guestId]);
  useEffect(() => { void load(); }, [load]);

  async function scanId() {
    const url = await captureAndUpload(hotelId);
    if (!url) return;
    setDocType(guest?.documentType && ID_TYPES.includes(guest.documentType) ? guest.documentType : ID_TYPES[0]);
    setDocNumber(guest?.documentNumber ?? "");
    setIdSheet({ url });
  }

  async function saveId() {
    if (!idSheet) return;
    setSaving(true);
    try {
      // Validate + save the ID number FIRST — if the number format is rejected we
      // haven't uploaded the image yet, so nothing is left half-saved.
      if (docNumber) await updateGuest(hotelId, params.guestId, { documentType: docType, documentNumber: docNumber });
      await addGuestDocument(hotelId, params.guestId, { fileUrl: idSheet.url, docType, setPrimary: true, fileName: `${docType}.jpg` });
      setIdSheet(null);
      await load();
    } catch (e) { Alert.alert("Couldn't save ID", e instanceof Error ? e.message : "Please try again — check the ID number format."); }
    finally { setSaving(false); }
  }

  if (!guest) return <Screen><ScreenHeader title="Guest" onBack={() => nav.goBack()} /><Loader /></Screen>;
  const vip = guest.vipStatus && guest.vipStatus !== "NONE";

  return (
    <Screen>
      <ScreenHeader title={guest.fullName} onBack={() => nav.goBack()} right={vip ? <StatusBadge label={guest.vipStatus!} color={t.gold} solid /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 12, paddingBottom: 40 }}>
        {/* Guest */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={guest.fullName} size={52} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{guest.fullName}</Text>
                {guest.isBlacklisted ? <StatusBadge label="Blacklisted" color={t.red} /> : null}
              </View>
              {guest.email ? <Text style={[typo.caption, { color: t.muted }]}>{guest.email}</Text> : null}
              {[guest.city, guest.nationality].filter(Boolean).length ? <Text style={[typo.caption, { color: t.muted }]}>{[guest.city, guest.nationality].filter(Boolean).join(" · ")}</Text> : null}
            </View>
            {guest.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${guest.phone}`)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.primary, "18"), alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="call" size={18} color={t.primary} />
              </Pressable>
            ) : null}
          </View>
        </Card>

        {/* ID & documents */}
        <Card>
          <Text style={[typo.label, { color: t.muted, marginBottom: 10 }]}>ID & documents</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {guest.documentImageUrl ? (
              <Image source={{ uri: guest.documentImageUrl }} style={{ width: 72, height: 54, borderRadius: radius.sm, backgroundColor: t.surfaceSunken }} />
            ) : (
              <View style={{ width: 72, height: 54, borderRadius: radius.sm, backgroundColor: t.surfaceSunken, alignItems: "center", justifyContent: "center" }}><Ionicons name="card-outline" size={22} color={t.faint} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[typo.bodyStrong, { color: t.text }]}>{guest.documentType ? guest.documentType.replace(/_/g, " ") : "No ID on file"}</Text>
              {guest.documentNumber ? <Text style={[typo.caption, { color: t.muted }, tabular]}>{guest.documentNumber}</Text> : null}
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Button title="Scan / capture ID" icon="camera-outline" onPress={scanId} />
          </View>
        </Card>

        {/* Tags */}
        {guest.tags?.length ? (
          <Card>
            <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>Tags</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {guest.tags.map((tag) => <StatusBadge key={tag} label={tag} color={t.blue} />)}
            </View>
          </Card>
        ) : null}

        {/* Stay history */}
        <Card>
          <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Stay history</Text>
          {stays.length ? stays.map((s, i, arr) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: t.divider }}>
              <IconChip icon="bed-outline" color={t.violet} size={34} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typo.bodyStrong, { color: t.text }]}>{s.roomType?.name ?? "Room"} · {s.code}</Text>
                <Text style={[typo.caption, { color: t.muted }, tabular]}>{fmt(s.checkInDate)} – {fmt(s.checkOutDate)}</Text>
              </View>
              <Text style={[{ color: t.text, fontWeight: "700", fontSize: 13 }, tabular]}>{money(s.totalAmount)}</Text>
            </View>
          )) : <Text style={[typo.caption, { color: t.faint }]}>No stays yet.</Text>}
        </Card>
      </ScrollView>

      {/* ID review + save sheet */}
      <Sheet visible={!!idSheet} onClose={() => setIdSheet(null)} title="Verify ID">
        {idSheet ? <Image source={{ uri: idSheet.url }} style={{ width: "100%", height: 160, borderRadius: radius.md, backgroundColor: t.surfaceSunken, marginBottom: 14 }} resizeMode="cover" /> : null}
        <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>ID type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {ID_TYPES.map((x) => {
            const active = x === docType;
            return (
              <Pressable key={x} onPress={() => setDocType(x)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: active ? "#fff" : t.muted, fontWeight: "600", fontSize: 12 }}>{x.replace(/_/g, " ")}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>ID number</Text>
        <TextInput value={docNumber} onChangeText={setDocNumber} placeholder="Document number" placeholderTextColor={t.faint} autoCapitalize="characters" style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, marginBottom: 14 }} />
        <Button title="Save & verify" variant="success" icon="checkmark" loading={saving} onPress={saveId} />
        <View style={{ height: space.base }} />
      </Sheet>
    </Screen>
  );
}
