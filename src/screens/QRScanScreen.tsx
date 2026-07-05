import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Sheet } from "@/components/kit";
import { radius, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

const FRAME = 250;
const BLUE = "#2A68D3";

function parseRoomNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/room[:\s\-#]*([\w-]+)/i);
  if (m?.[1]) return m[1];
  if (/^[\w-]+$/.test(v)) return v;
  return null;
}

export function QRScanScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState("");
  const scannedRef = useRef(false);
  const scan = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  useFocusEffect(useCallback(() => { scannedRef.current = false; }, []));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [scan]);

  function onBarcodeScanned(r: BarcodeScanningResult) {
    if (scannedRef.current) return;
    const room = parseRoomNumber(r.data);
    if (!room) return;
    scannedRef.current = true;
    nav.navigate("CreateTask", { roomNumber: room });
  }

  const lineY = scan.interpolate({ inputRange: [0, 1], outputRange: [8, FRAME - 8] });

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onBarcodeScanned} />
      ) : null}

      {/* Dim overlay + frame */}
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }]}>
        {permission && !permission.granted ? (
          <View style={{ alignItems: "center", gap: 12, padding: 30 }}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>Camera access is needed to scan room QR codes.</Text>
            <Button title="Grant permission" full={false} onPress={requestPermission} />
          </View>
        ) : (
          <>
            <View style={{ width: FRAME, height: FRAME, borderRadius: 20, overflow: "hidden" }}>
              {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h], i) => (
                <View key={i} style={{ position: "absolute", [v]: 0, [h]: 0, width: 34, height: 34, borderColor: BLUE,
                  borderTopWidth: v === "top" ? 4 : 0, borderBottomWidth: v === "bottom" ? 4 : 0, borderLeftWidth: h === "left" ? 4 : 0, borderRightWidth: h === "right" ? 4 : 0,
                  borderTopLeftRadius: v === "top" && h === "left" ? 20 : 0, borderTopRightRadius: v === "top" && h === "right" ? 20 : 0, borderBottomLeftRadius: v === "bottom" && h === "left" ? 20 : 0, borderBottomRightRadius: v === "bottom" && h === "right" ? 20 : 0 } as never} />
              ))}
              <Animated.View style={{ position: "absolute", left: 8, right: 8, height: 2, backgroundColor: BLUE, transform: [{ translateY: lineY }], shadowColor: BLUE, shadowOpacity: 0.9, shadowRadius: 6 }} />
            </View>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 24, textAlign: "center", paddingHorizontal: 24 }}>Point at the room QR to create a task</Text>
          </>
        )}
      </View>

      {/* Top bar */}
      <View style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={{ padding: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 }}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, flex: 1, textAlign: "center" }}>Scan room</Text>
        <Pressable onPress={() => setTorch((x) => !x)} hitSlop={10} style={{ padding: 8, backgroundColor: torch ? BLUE : "rgba(0,0,0,0.4)", borderRadius: 20 }}><Ionicons name="flashlight" size={20} color="#fff" /></Pressable>
      </View>

      {/* Manual entry */}
      <View style={{ position: "absolute", bottom: insets.bottom + 28, left: 0, right: 0, alignItems: "center" }}>
        <Pressable onPress={() => setManualOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 11 }}>
          <Ionicons name="keypad-outline" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13.5 }}>Enter room number manually</Text>
        </Pressable>
      </View>

      <Sheet visible={manualOpen} onClose={() => setManualOpen(false)} title="Enter room number">
        <TextInput value={manual} onChangeText={setManual} placeholder="e.g. 204" placeholderTextColor={t.faint} autoFocus keyboardType="default" style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, backgroundColor: t.surface, marginBottom: 12, fontSize: 16 }} />
        <Button title="Create task for room" icon="arrow-forward" disabled={!manual.trim()} onPress={() => { const room = manual.trim(); setManualOpen(false); setManual(""); if (room) nav.navigate("CreateTask", { roomNumber: room }); }} />
        <View style={{ height: 8 }} />
      </Sheet>
    </View>
  );
}
