import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { listMessages, sendMessage, type ChatMessage } from "@/api/chat";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { AppNav, AppStackParamList } from "@/navigation/types";
import { colors } from "@/theme";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatRoomScreen() {
  const hotelId = useAuthStore((s) => s.activeHotelId);
  const navigation = useNavigation<AppNav>();
  const route = useRoute<RouteProp<AppStackParamList, "ChatRoom">>();
  const { userId, name } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!hotelId) return;
      if (showSpinner) setLoading(true);
      try {
        const items = await listMessages(hotelId, userId);
        setMessages(items);
      } catch {
        if (showSpinner) setMessages([]);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [hotelId, userId],
  );

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(false), 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  async function onSend() {
    const body = text.trim();
    if (!hotelId || !body || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await sendMessage(hotelId, userId, body);
      setMessages((prev) => [...prev, msg]);
      await load(false);
    } catch {
      setText(body); // restore on failure
    } finally {
      setSending(false);
    }
  }

  if (!hotelId) return <Center text="No hotel selected." />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {loading && messages.length === 0 ? (
        <Center text="Loading…" spinner />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 16, flexGrow: 1 }}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={<Center text="No messages yet. Say hello!" />}
          renderItem={({ item }) => {
            const inbound = item.fromUserId === userId;
            return (
              <View style={[styles.bubbleRow, inbound ? styles.rowLeft : styles.rowRight]}>
                <View style={[styles.bubble, inbound ? styles.bubbleIn : styles.bubbleOut]}>
                  <Text style={[styles.bubbleText, inbound ? styles.textIn : styles.textOut]}>{item.body}</Text>
                  <Text style={[styles.bubbleTime, inbound ? styles.timeIn : styles.timeOut]}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable
          onPress={() => void onSend()}
          disabled={sending || text.trim().length === 0}
          style={[styles.sendBtn, (sending || text.trim().length === 0) && styles.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Center({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <View style={styles.center}>
      {spinner ? <ActivityIndicator color={colors.blue} /> : null}
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleIn: { backgroundColor: colors.white, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleOut: { backgroundColor: colors.blue, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  textIn: { color: colors.text },
  textOut: { color: "#fff" },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeIn: { color: colors.muted },
  timeOut: { color: "#E0EAFF" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: colors.slate100,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  centerText: { color: colors.muted, fontSize: 14 },
});
