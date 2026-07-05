import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import { getInbox, sendInboxMessage, type InboxGuest, type InboxMessage } from "@/api/inbox";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, Button, Screen, ScreenHeader, Sheet, StatusBadge } from "@/components/kit";
import { radius, space, tint, type as typo, useTheme } from "@/theme";
import type { AppNav, AppStackParamList } from "@/navigation/types";

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function GuestConversationScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  const { params } = useRoute<RouteProp<AppStackParamList, "GuestConversation">>();
  const hotelId = useAuthStore((s) => s.activeHotelId)!;
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [windowOpen, setWindowOpen] = useState(true);
  const [guest, setGuest] = useState<InboxGuest | null>(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<InboxMessage>>(null);

  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);
  const load = useCallback(async () => {
    try { const r = await getInbox(hotelId, params.wa); setMessages(r.messages); setGuest(r.context.guest ? { ...r.context.guest, tags: r.context.tags ?? r.context.guest.tags } : null); if (typeof r.context.windowOpen === "boolean") setWindowOpen(r.context.windowOpen); }
    catch { /* keep */ }
  }, [hotelId, params.wa]);

  useFocusEffect(useCallback(() => {
    void load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]));

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try { await sendInboxMessage(hotelId, params.wa, body); await load(); listRef.current?.scrollToEnd({ animated: true }); }
    catch (e) { setText(body); Alert.alert("Couldn't send", e instanceof Error ? e.message : "The 24-hour window may be closed."); }
    finally { setSending(false); }
  }

  return (
    <Screen>
      <ScreenHeader
        title={params.name}
        onBack={() => nav.goBack()}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ backgroundColor: tint(windowOpen ? t.green : t.amber, "22"), borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: windowOpen ? t.green : t.amber, fontSize: 11, fontWeight: "700" }}>{windowOpen ? "Window open" : "Window closed"}</Text></View>
            <Pressable onPress={() => setCtxOpen(true)} hitSlop={8}><Ionicons name="information-circle-outline" size={22} color={t.muted} /></Pressable>
          </View>
        }
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.base, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: m }) => {
          const out = m.direction === "out";
          return (
            <View style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "82%" }}>
              <View style={{ backgroundColor: out ? t.primary : t.surface, borderWidth: out ? 0 : 1, borderColor: t.border, borderRadius: 16, borderBottomRightRadius: out ? 4 : 16, borderBottomLeftRadius: out ? 16 : 4, paddingHorizontal: 12, paddingVertical: 9 }}>
                {m.kind !== "text" && m.kind !== "interactive" ? <Text style={{ color: out ? "rgba(255,255,255,0.7)" : t.faint, fontSize: 10, fontWeight: "700", marginBottom: 2, textTransform: "uppercase" }}>{m.kind}</Text> : null}
                <Text style={{ color: out ? "#fff" : t.text, fontSize: 14.5, lineHeight: 20 }}>{m.body ?? `(${m.kind})`}</Text>
              </View>
              <Text style={[typo.caption, { color: t.faint, marginTop: 2, alignSelf: out ? "flex-end" : "flex-start" }]}>{time(m.createdAt)}</Text>
            </View>
          );
        }}
      />

      {windowOpen ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface }}>
          <TextInput value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={t.faint} multiline style={{ flex: 1, maxHeight: 110, minHeight: 40, backgroundColor: t.surfaceSunken, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: t.text, fontSize: 14.5 }} />
          <Pressable onPress={send} disabled={!text.trim() || sending} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() ? t.primary : t.slate300, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: space.base, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface }}>
          <Text style={[typo.caption, { color: t.muted, textAlign: "center" }]}>The 24-hour reply window is closed. Send an approved template from the web dashboard.</Text>
        </View>
      )}

      <Sheet visible={ctxOpen} onClose={() => setCtxOpen(false)} title="Guest details">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Avatar name={guest?.fullName ?? params.name} size={48} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[typo.h2, { color: t.text }]} numberOfLines={1}>{guest?.fullName ?? params.name}</Text>
              {guest?.vipStatus && guest.vipStatus !== "NONE" ? <StatusBadge label={guest.vipStatus} color={t.gold} /> : null}
            </View>
            {guest?.phone ? <Text style={[typo.caption, { color: t.muted }]}>{guest.phone}</Text> : null}
            {guest?.email ? <Text style={[typo.caption, { color: t.muted }]}>{guest.email}</Text> : null}
          </View>
        </View>
        {guest?.tags?.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{guest.tags.map((tg) => <StatusBadge key={tg} label={tg} color={t.blue} />)}</View>
        ) : null}
        <View style={{ gap: 10 }}>
          <Button title="Create task" icon="add-circle-outline" onPress={() => { setCtxOpen(false); nav.navigate("CreateTask"); }} />
          {guest?.id ? <Button title="Open profile" variant="outline" icon="person-outline" onPress={() => { setCtxOpen(false); nav.navigate("GuestProfile", { guestId: guest.id }); }} /> : null}
        </View>
        <View style={{ height: space.base }} />
      </Sheet>
    </Screen>
  );
}
