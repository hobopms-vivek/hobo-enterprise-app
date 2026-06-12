import React, { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/config";
import { colors } from "@/theme";

export function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password || busy) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch {
      // error surfaced via store.error
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Image source={require("@/assets/img/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Hobo Enterprise</Text>
          <Text style={styles.subtitle}>Staff & operations</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@hotel.com"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              onSubmitEditing={onSubmit}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
          </View>

          <Text style={styles.host}>{API_BASE}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "center" },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  logoMark: { color: "#fff", fontSize: 28, fontWeight: "800" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 14 },
  subtitle: { color: "#9FB3D1", fontSize: 13, textAlign: "center", marginTop: 2, marginBottom: 24 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
  error: { color: colors.red, fontSize: 13, marginTop: 12 },
  button: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  host: { color: "#6B83A8", fontSize: 11, textAlign: "center", marginTop: 18 },
});
