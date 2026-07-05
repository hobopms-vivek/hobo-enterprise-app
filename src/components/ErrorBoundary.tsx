import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { radius, tint, type as typo, useTheme } from "@/theme";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

/** Theme-aware fallback (hooks live here; the boundary itself is a class). */
function ErrorFallback({ message, onReset }: { message: string; onReset: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12, backgroundColor: t.bg }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: tint(t.red, "18"), alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="alert-circle-outline" size={28} color={t.red} />
      </View>
      <Text style={[typo.h2, { color: t.text }]}>Something went wrong</Text>
      <Text style={[typo.caption, { color: t.muted, textAlign: "center", maxWidth: 280 }]}>{message}</Text>
      <Pressable onPress={onReset} style={{ marginTop: 8, backgroundColor: t.primary, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 12 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Catches render-time crashes anywhere below it and shows a recoverable fallback. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Something went wrong" };
  }
  componentDidCatch(error: unknown) { console.error("[ErrorBoundary]", error); }
  private reset = () => this.setState({ hasError: false, message: undefined });
  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback message={this.state.message ?? "Something went wrong"} onReset={this.reset} />;
  }
}
