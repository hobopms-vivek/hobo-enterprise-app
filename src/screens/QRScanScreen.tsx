import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { type AppNav } from "@/navigation/types";
import { colors } from "@/theme";

/** Pull a room number out of values like "ROOM:204", "room-204", or "204". */
function parseRoomNumber(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const prefixed = value.match(/room[:\s\-#]*([\w-]+)/i);
  if (prefixed?.[1]) return prefixed[1];
  if (/^[\w-]+$/.test(value)) return value;
  return null;
}

export function QRScanScreen() {
  const navigation = useNavigation<AppNav>();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // Re-arm the scanner each time the screen regains focus — otherwise after one
  // scan + navigate, returning here leaves scannedRef stuck true (no re-scan).
  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
    }, []),
  );

  function onBarcodeScanned(result: BarcodeScanningResult) {
    if (scannedRef.current) return;
    const roomNumber = parseRoomNumber(result.data);
    if (!roomNumber) return;
    scannedRef.current = true;
    navigation.navigate("CreateTask", { roomNumber });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Room</Text>
      </View>

      {!permission ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Requesting camera access…</Text>
        </View>
      ) : !permission.granted ? (
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.muted} />
          <Text style={styles.centerText}>Camera access is needed to scan room QR codes.</Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant permission</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.instructions}>Point the camera at the room QR code</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  cameraWrap: { flex: 1, backgroundColor: "#000" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  instructions: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },
  centerText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  permissionBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  permissionBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
