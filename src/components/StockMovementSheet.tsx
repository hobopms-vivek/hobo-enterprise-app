import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { adjustStock, issueStock, listMovements, type Movement, type StockRow } from "@/api/inventory";
import { Button, Sheet } from "@/components/kit";
import { radius, tabular, type as typo, useTheme } from "@/theme";

type MType = "receive" | "issue" | "adjust" | "writeoff";
const TYPES: { key: MType; label: string }[] = [
  { key: "receive", label: "Receive" }, { key: "issue", label: "Issue" }, { key: "adjust", label: "Adjust" }, { key: "writeoff", label: "Write-off" },
];
const rel = (iso: string) => { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 60) return `${Math.max(1, m)}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; };

/** Record a stock movement for one item in a store (Receive/Issue/Adjust/Write-off). */
export function StockMovementSheet({ visible, onClose, hotelId, row, onDone }: {
  visible: boolean; onClose: () => void; hotelId: string; row: StockRow | null; onDone: () => void;
}) {
  const t = useTheme();
  const [type, setType] = useState<MType>("issue");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState<Movement[]>([]);

  useEffect(() => {
    if (!visible || !row) return;
    setType("issue"); setQty(1); setNote("");
    listMovements(hotelId, row.itemId, row.storeId).then(setMoves).catch(() => setMoves([]));
  }, [visible, row, hotelId]);

  if (!row) return null;
  const isAdjust = type === "adjust";

  async function submit() {
    if (!row || qty < 0 || (qty === 0 && !isAdjust)) return;
    setBusy(true);
    try {
      if (type === "receive") await adjustStock(hotelId, { storeId: row.storeId, itemId: row.itemId, mode: "DELTA", quantity: qty, reason: note || "Received" });
      else if (type === "issue") await issueStock(hotelId, { storeId: row.storeId, itemId: row.itemId, quantity: qty, issuedTo: note || "Consumption" });
      else if (type === "adjust") await adjustStock(hotelId, { storeId: row.storeId, itemId: row.itemId, mode: "SET", quantity: qty, reason: note || "Stock count" });
      else await adjustStock(hotelId, { storeId: row.storeId, itemId: row.itemId, mode: "DELTA", quantity: -qty, reason: note || "Write-off" });
      onDone(); onClose();
    } catch (e) { Alert.alert("Couldn't record", e instanceof Error ? e.message : "You may not have permission."); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ marginBottom: 12 }}>
        <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{row.item}</Text>
        <Text style={[typo.caption, { color: t.muted }]}>{row.store}{row.reorderLevel > 0 ? ` · reorder at ${row.reorderLevel}` : ""}</Text>
        <Text style={[{ fontSize: 30, fontWeight: "800", color: t.text, marginTop: 6 }, tabular]}>{row.quantity} <Text style={[typo.body, { color: t.muted }]}>{row.unit ?? ""}</Text></Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {TYPES.map((x) => {
          const active = x.key === type;
          return (
            <Pressable key={x.key} onPress={() => setType(x.key)} style={{ backgroundColor: active ? t.primary : t.surface, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: active ? "#fff" : t.muted, fontWeight: "600", fontSize: 12.5 }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typo.label, { color: t.muted, marginBottom: 8 }]}>{isAdjust ? "New on-hand quantity" : "Quantity"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, alignSelf: "center", marginBottom: 14 }}>
        <Pressable onPress={() => setQty((q) => Math.max(0, q - 1))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="remove" size={22} color={t.text} /></Pressable>
        <TextInput value={String(qty)} onChangeText={(v) => setQty(Math.max(0, parseInt(v.replace(/[^0-9]/g, "") || "0", 10)))} keyboardType="number-pad" style={[{ fontSize: 30, fontWeight: "800", color: t.text, minWidth: 70, textAlign: "center" }, tabular]} />
        <Pressable onPress={() => setQty((q) => q + 1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color={t.text} /></Pressable>
      </View>

      <TextInput value={note} onChangeText={setNote} placeholder={type === "issue" ? "Issued to (dept / purpose)…" : "Note (optional)"} placeholderTextColor={t.faint} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, marginBottom: 14 }} />

      {moves.length ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={[typo.overline, { color: t.muted, marginBottom: 6 }]}>Recent movements</Text>
          {moves.slice(0, 3).map((m) => (
            <View key={m.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={[typo.caption, { color: t.muted }]}>{m.type.replace(/_/g, " ").toLowerCase()} · {rel(m.createdAt)}</Text>
              <Text style={[{ color: m.quantity >= 0 ? t.green : t.red, fontWeight: "700", fontSize: 12.5 }, tabular]}>{m.quantity >= 0 ? "+" : ""}{m.quantity}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button title="Record movement" icon="checkmark" loading={busy} onPress={submit} />
      <View style={{ height: 8 }} />
    </Sheet>
  );
}
