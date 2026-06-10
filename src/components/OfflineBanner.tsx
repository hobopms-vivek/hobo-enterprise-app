import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";

import { colors } from "@/theme";

/** Thin top banner shown whenever the device loses connectivity, so users
 * understand why data isn't loading instead of staring at empty screens. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOffline(s.isConnected === false));
    return () => unsub();
  }, []);

  if (!offline) return null;
  return <Text style={[styles.banner, { paddingTop: insets.top + 6 }]}>No internet connection</Text>;
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.red,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingBottom: 6,
  },
});
