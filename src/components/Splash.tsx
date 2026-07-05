import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

import { colors } from "@/theme";

/** Branded loading/splash surface shown while the session hydrates. */
export function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", gap: 18 }}>
      <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Image source={require("../assets/img/logo.png")} style={{ width: 52, height: 52 }} resizeMode="contain" />
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 }}>Hobo Enterprise</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Staff & Operations</Text>
      </View>
      <ActivityIndicator color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }} />
    </View>
  );
}
