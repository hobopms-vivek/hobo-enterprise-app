import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { actOnTicket } from "@/api/tickets";
import { captureAndUpload } from "@/services/photo";
import { fixMediaUrl } from "@/api/uploads";
import { Button, IconChip, Sheet, SegmentedTabs } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";

const REASONS = ["Guest not in room", "Item unavailable", "Access denied", "Other"];

/** Finish-task bottom sheet — Delivered / Couldn't-complete, calling the ticket `done` action. */
export function FinishTaskSheet({ visible, onClose, hotelId, ticketId, onFinished, initialPhotos }: {
  visible: boolean; onClose: () => void; hotelId: string; ticketId: string; onFinished: () => void; initialPhotos?: string[];
}) {
  const t = useTheme();
  const [tab, setTab] = useState<"delivered" | "failed">("delivered");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [localUri, setLocalUri] = useState<string | null>(null); // shown instantly while uploading
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fresh state each time the sheet opens; seed with any photos already captured on the ticket.
  useEffect(() => {
    if (visible) { setTab("delivered"); setNote(""); setReason(REASONS[0]); setPhotos(initialPhotos ?? []); setLocalUri(null); setUploading(false); }
  }, [visible, initialPhotos]);

  // `captureAndUpload` can throw (network, unsupported type, read-only role). It had no catch, so
  // a failed upload was an unhandled rejection that React Native swallows — indistinguishable
  // from a slow one: no spinner, no photo, no error. Preview + spinner + a real message now.
  async function addPhoto() {
    if (uploading) return;
    setUploading(true);
    try {
      const url = await captureAndUpload(hotelId, setLocalUri);
      if (url) setPhotos((p) => [...p, url]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploading(false);
      setLocalUri(null);
    }
  }

  async function submit(delivered: boolean) {
    setBusy(true);
    try {
      await actOnTicket(hotelId, ticketId, "done", {
        delivered,
        reason: delivered ? note || undefined : reason,
        photos: photos.map((url) => ({ step: "done", url })),
      });
      onFinished();
      onClose();
    } catch (e) {
      Alert.alert("Couldn't finish task", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Finish task">
      <View style={{ marginBottom: 14 }}>
        <SegmentedTabs
          tabs={[{ key: "delivered", label: "Delivered" }, { key: "failed", label: "Couldn't complete" }]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === "delivered" ? (
        <View style={{ gap: 14 }}>
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 6 }}>
            <IconChip icon="checkmark-circle" color={t.green} size={56} />
            <Text style={[typo.h2, { color: t.text }]}>Task finished</Text>
          </View>
          <View>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Photos</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {photos.map((url) => (
                <Image key={url} source={{ uri: fixMediaUrl(url) }} style={{ width: 64, height: 64, borderRadius: radius.md }} />
              ))}
              {localUri ? (
                <View style={{ width: 64, height: 64, borderRadius: radius.md, overflow: "hidden" }}>
                  <Image source={{ uri: localUri }} style={{ width: 64, height: 64 }} />
                  <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#0006" }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                </View>
              ) : null}
              <Pressable
                onPress={addPhoto}
                disabled={uploading}
                style={{ width: 64, height: 64, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.border, alignItems: "center", justifyContent: "center", backgroundColor: tint(t.primary, "0F"), opacity: uploading ? 0.5 : 1 }}
              >
                {uploading && !localUri ? <ActivityIndicator color={t.primary} /> : <Ionicons name="camera-outline" size={22} color={t.primary} />}
              </Pressable>
            </View>
          </View>
          <View>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Note (optional)</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Details about the delivery…" placeholderTextColor={t.faint} multiline style={{ minHeight: 64, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, textAlignVertical: "top", backgroundColor: t.surface }} />
          </View>
          {/* Blocked while a photo is still uploading — submitting now would send `photos` without it. */}
          <Button title="Mark completed" variant="success" icon="checkmark" loading={busy} disabled={uploading} onPress={() => submit(true)} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Text style={[typo.caption, { color: t.muted }]}>Why couldn't this task be completed?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {REASONS.map((r) => {
              const active = r === reason;
              return (
                <Pressable key={r} onPress={() => setReason(r)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: active ? "#fff" : t.muted, fontWeight: "600", fontSize: 12.5 }}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder="Add any specific details…" placeholderTextColor={t.faint} multiline style={{ minHeight: 64, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, textAlignVertical: "top", backgroundColor: t.surface }} />
          <Button title="Mark not completed (re-attempt)" variant="danger" icon="refresh" loading={busy} onPress={() => submit(false)} style={{ backgroundColor: t.amber }} />
        </View>
      )}
      <View style={{ height: space.base }} />
    </Sheet>
  );
}
