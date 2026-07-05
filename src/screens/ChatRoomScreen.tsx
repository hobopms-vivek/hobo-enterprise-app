import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { useAuthStore } from "@/store/useAuthStore";
import { listMessages, sendMessage, type ChatMessage } from "@/api/chat";
import { useRealtime } from "@/realtime/useRealtime";
import { Loader, Screen, ScreenHeader } from "@/components/kit";
import { space, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const time = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

export function ChatRoomScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "ChatRoom">>();
  const { userId, name } = params;
  const hotelId = useAuthStore((s) => s.activeHotelId);

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const hotelRef = useRef(hotelId);
  hotelRef.current = hotelId;

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    const forHotel = hotelId;
    try { const items = await listMessages(forHotel, userId); if (forHotel === hotelRef.current) setMessages(items); }
    catch { if (forHotel === hotelRef.current) setMessages([]); }
  }, [hotelId, userId]);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]));
  useRealtime(hotelId, (e) => {
    if (e.type !== "chat.message") return;
    const p = e.payload as { fromUserId?: string; toUserId?: string };
    if (p.fromUserId === userId || p.toUserId === userId) void load();
  });

  async function onSend() {
    const body = text.trim();
    if (!hotelId || !body || sending) return;
    setSending(true); setText("");
    try { const msg = await sendMessage(hotelId, userId, body); setMessages((prev) => [...(prev ?? []), msg]); void load(); }
    catch (e) { setText(body); Alert.alert("Message not sent", e instanceof Error ? e.message : "Please try again."); }
    finally { setSending(false); }
  }

  return (
    <Screen>
      <ScreenHeader title={name} onBack={() => nav.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        {messages === null ? <Loader /> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: space.base, gap: 8, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}><Text style={[typo.caption, { color: t.faint }]}>No messages yet. Say hello!</Text></View>}
            renderItem={({ item }) => {
              const inbound = item.fromUserId === userId;
              return (
                <View style={{ alignSelf: inbound ? "flex-start" : "flex-end", maxWidth: "80%" }}>
                  <View style={{ backgroundColor: inbound ? t.surface : t.primary, borderWidth: inbound ? 1 : 0, borderColor: t.border, borderRadius: 16, borderBottomLeftRadius: inbound ? 4 : 16, borderBottomRightRadius: inbound ? 16 : 4, paddingHorizontal: 12, paddingVertical: 9 }}>
                    <Text style={{ color: inbound ? t.text : "#fff", fontSize: 14.5, lineHeight: 20 }}>{item.body}</Text>
                  </View>
                  <Text style={[typo.caption, { color: t.faint, marginTop: 2, alignSelf: inbound ? "flex-start" : "flex-end" }]}>{time(item.createdAt)}</Text>
                </View>
              );
            }}
          />
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
          <TextInput value={text} onChangeText={setText} placeholder="Type a message…" placeholderTextColor={t.faint} multiline style={{ flex: 1, maxHeight: 120, minHeight: 42, backgroundColor: t.surfaceSunken, borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14.5, color: t.text }} />
          <Pressable onPress={onSend} disabled={sending || !text.trim()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() ? t.primary : t.slate300, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
