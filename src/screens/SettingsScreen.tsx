import React, { useLayoutEffect } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";

import { Card, IconChip, Screen, ScreenHeader } from "@/components/kit";
import { space, type as typo, useTheme } from "@/theme";
import type { AppNav } from "@/navigation/types";

type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void; color: string };

export function SettingsScreen() {
  const t = useTheme();
  const nav = useNavigation<AppNav>();
  useLayoutEffect(() => { nav.setOptions({ headerShown: false }); }, [nav]);

  const version = Constants.expoConfig?.version ?? "1.0.0";

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Appearance",
      items: [{ icon: "contrast-outline", label: "Theme", value: t.scheme === "dark" ? "Dark (system)" : "Light (system)", color: t.violet }],
    },
    {
      title: "Notifications",
      items: [
        { icon: "notifications-outline", label: "Notification center", color: t.primary, onPress: () => nav.navigate("Notifications") },
        { icon: "options-outline", label: "System notification settings", color: t.muted, onPress: () => Linking.openSettings().catch(() => {}) },
      ],
    },
    {
      title: "About",
      items: [
        { icon: "information-circle-outline", label: "Version", value: version, color: t.teal },
        { icon: "document-text-outline", label: "Terms & privacy", color: t.muted, onPress: () => Alert.alert("Terms & privacy", "Contact your administrator for the terms of use.") },
      ],
    },
  ];

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.base, gap: 18, paddingBottom: 40 }}>
        {groups.map((g) => (
          <View key={g.title}>
            <Text style={[typo.overline, { color: t.muted, marginBottom: 8, marginLeft: 4 }]}>{g.title}</Text>
            <Card style={{ padding: 4 }}>
              {g.items.map((it, i) => (
                <Pressable key={it.label} disabled={!it.onPress} onPress={it.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: i < g.items.length - 1 ? 1 : 0, borderBottomColor: t.divider }}>
                  <IconChip icon={it.icon} color={it.color} size={34} />
                  <Text style={[typo.bodyStrong, { color: t.text, flex: 1 }]}>{it.label}</Text>
                  {it.value ? <Text style={[typo.caption, { color: t.muted }]}>{it.value}</Text> : it.onPress ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
        <Text style={[typo.caption, { color: t.faint, textAlign: "center" }]}>Hobo Enterprise · Dark mode follows your device</Text>
      </ScrollView>
    </Screen>
  );
}
