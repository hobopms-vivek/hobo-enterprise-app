import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

/** Catches render-time crashes anywhere below it and shows a recoverable
 * fallback instead of a white screen / hard crash. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Something went wrong" };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
  }

  private reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.msg}>{this.state.message}</Text>
        <Pressable style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.bg, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  msg: { fontSize: 13, color: colors.muted, textAlign: "center" },
  btn: { marginTop: 8, backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
