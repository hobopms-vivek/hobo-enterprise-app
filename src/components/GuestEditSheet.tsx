import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BookingGuest } from "@/api/bookings";
import { captureAndUpload, pickAndUpload } from "@/services/photo";
import { fixMediaUrl } from "@/api/uploads";
import { Button, Sheet } from "@/components/kit";
import { radius, tint, type as typo, useTheme } from "@/theme";

const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID", "Other"];
const GENDERS = ["Male", "Female", "Other"];

/** Edit one party guest (companion): details + ID scan. Read-only when canEdit=false. */
export function GuestEditSheet({
  visible, guest, index, hotelId, canEdit, onClose, onSave,
}: {
  visible: boolean;
  guest: Partial<BookingGuest> | null;
  index: number;
  hotelId: string;
  canEdit: boolean;
  onClose: () => void;
  onSave: (g: Partial<BookingGuest>) => Promise<void>;
}) {
  const t = useTheme();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [idType, setIdType] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFullName(guest?.fullName ?? "");
    setPhone(guest?.phone ?? "");
    setAge(guest?.age != null ? String(guest.age) : "");
    setGender(guest?.gender ?? null);
    setIdType(guest?.idType ?? null);
    setIdNumber(guest?.idNumber ?? "");
    setIdPhotoUrl(guest?.idPhotoUrl ?? null);
  }, [visible, guest]);

  async function grabId(fromCamera: boolean) {
    setUploading(true);
    try {
      // `setLocalPreview` shows the picked/captured image instantly; on success we swap to the
      // uploaded URL (and clear the local preview in `finally`).
      const url = fromCamera ? await captureAndUpload(hotelId, setLocalPreview) : await pickAndUpload(hotelId, setLocalPreview);
      if (url) setIdPhotoUrl(url);
    } catch (e) { Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again."); }
    finally { setUploading(false); setLocalPreview(null); }
  }
  const shownId = localPreview ?? fixMediaUrl(idPhotoUrl);

  async function save() {
    if (!fullName.trim()) { Alert.alert("Name required", "Enter the guest's name."); return; }
    setBusy(true);
    try {
      await onSave({
        ...guest,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender,
        idType,
        idNumber: idNumber.trim() || null,
        idPhotoUrl,
        isPrimary: guest?.isPrimary ?? false,
      });
      onClose();
    } catch (e) { Alert.alert("Couldn't save", e instanceof Error ? e.message : "You may not have permission."); }
    finally { setBusy(false); }
  }

  const input = { borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: t.text, backgroundColor: t.surface } as const;
  const chipRow = { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 };
  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={canEdit ? onPress : undefined} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 7, opacity: canEdit ? 1 : 0.85 }}>
      <Text style={{ color: active ? "#fff" : t.muted, fontSize: 12.5, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={guest?.isPrimary ? "Primary guest" : `Guest ${index + 1}`}>
      <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
        {/* ID photo */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          {shownId ? (
            <View style={{ width: "100%" }}>
              <Image source={{ uri: shownId }} style={{ width: "100%", height: 170, borderRadius: radius.md, backgroundColor: t.surfaceSunken }} resizeMode="cover" />
              {uploading ? (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: radius.md }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 6 }}>Uploading…</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ width: "100%", height: 110, borderRadius: radius.md, backgroundColor: t.surfaceSunken, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.border, borderStyle: "dashed" }}>
              <Ionicons name="card-outline" size={26} color={t.faint} />
              <Text style={[typo.caption, { color: t.faint, marginTop: 4 }]}>No ID uploaded</Text>
            </View>
          )}
          {canEdit ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignSelf: "stretch" }}>
              <Button title={uploading ? "Uploading…" : "Scan ID"} icon="camera-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} onPress={() => grabId(true)} disabled={uploading} />
              <Button title="Upload" icon="image-outline" size="sm" variant="outline" full={false} style={{ flex: 1 }} onPress={() => grabId(false)} disabled={uploading} />
              {uploading ? <ActivityIndicator color={t.primary} style={{ marginLeft: 4 }} /> : null}
            </View>
          ) : null}
        </View>

        <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Full name{canEdit ? " *" : ""}</Text>
        <TextInput value={fullName} onChangeText={setFullName} editable={canEdit} placeholder="Guest name" placeholderTextColor={t.faint} style={input} />

        <Text style={[typo.label, { color: t.muted, marginTop: 12, marginBottom: 6 }]}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} editable={canEdit} keyboardType="phone-pad" placeholder="Phone (optional)" placeholderTextColor={t.faint} style={input} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ width: 96 }}>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Age</Text>
            <TextInput value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))} editable={canEdit} keyboardType="number-pad" placeholder="—" placeholderTextColor={t.faint} style={input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Gender</Text>
            <View style={chipRow}>{GENDERS.map((g) => <Chip key={g} active={gender === g} label={g} onPress={() => setGender(g)} />)}</View>
          </View>
        </View>

        <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 8 }]}>ID type</Text>
        <View style={chipRow}>{ID_TYPES.map((v) => <Chip key={v} active={idType === v} label={v} onPress={() => setIdType(v)} />)}</View>

        <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>ID number</Text>
        <TextInput value={idNumber} onChangeText={setIdNumber} editable={canEdit} autoCapitalize="characters" placeholder="ID number (optional)" placeholderTextColor={t.faint} style={input} />

        {guest?.arrivalTime ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, backgroundColor: tint(t.blue, "14"), borderRadius: radius.md, padding: 10 }}>
            <Ionicons name="time-outline" size={15} color={t.blue} />
            <Text style={[typo.caption, { color: t.blue }]}>Arriving {new Date(guest.arrivalTime).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Text>
          </View>
        ) : null}

        {canEdit ? <View style={{ marginTop: 18 }}><Button title="Save guest" icon="checkmark" loading={busy} onPress={save} /></View> : null}
        <View style={{ height: 8 }} />
      </ScrollView>
    </Sheet>
  );
}
