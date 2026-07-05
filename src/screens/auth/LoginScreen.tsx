import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/kit";
import { radius, tint, type as typo, useTheme } from "@/theme";

export function LoginScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password || busy) return;
    setBusy(true);
    try { await signIn(email, password); } catch { /* store.error */ } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <View style={{ width: 68, height: 68, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <Image source={require("../../assets/img/logo.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
            </View>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 16, letterSpacing: -0.4 }}>Welcome back</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13.5, marginTop: 4 }}>Sign in to your hotel</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: 22, gap: 4 }}>
            <Text style={[typo.label, { color: t.muted, marginBottom: 6 }]}>Email</Text>
            <Field icon="mail-outline">
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@hotel.com" placeholderTextColor={t.faint} style={{ flex: 1, color: t.text, fontSize: 15 }} />
            </Field>

            <Text style={[typo.label, { color: t.muted, marginTop: 14, marginBottom: 6 }]}>Password</Text>
            <Field icon="lock-closed-outline">
              <TextInput value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder="••••••••" placeholderTextColor={t.faint} onSubmitEditing={onSubmit} style={{ flex: 1, color: t.text, fontSize: 15 }} />
              <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color={t.faint} /></Pressable>
            </Field>

            <Pressable onPress={() => Alert.alert("Reset password", "Contact your administrator to reset your password.")} style={{ alignSelf: "flex-end", marginTop: 10 }}>
              <Text style={{ color: t.primary, fontWeight: "600", fontSize: 13 }}>Forgot password?</Text>
            </Pressable>

            {error ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tint(t.red, "14"), borderRadius: radius.md, padding: 10, marginTop: 12 }}>
                <Ionicons name="alert-circle" size={16} color={t.red} />
                <Text style={{ color: t.red, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ marginTop: 16 }}>
              <Button title="Sign in" icon="log-in-outline" loading={busy} onPress={onSubmit} />
            </View>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 24 }}>Hobo Enterprise · Staff & operations</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, height: 48, backgroundColor: t.surfaceSunken }}>
      <Ionicons name={icon} size={18} color={t.faint} />
      {children}
    </View>
  );
}
