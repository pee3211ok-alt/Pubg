import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";

type Channel = { channel_id: string; name: string; handle?: string; platform: string; url: string; mandatory: boolean };

const platformIcon: Record<string, string> = {
  telegram: "send-circle",
  youtube: "youtube",
  tiktok: "music-circle",
  instagram: "instagram",
};

export default function Subscribe() {
  const insets = useSafeAreaInsets();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => { (async () => setChannels(await api("/api/channels")))(); }, []);

  const open = (c: Channel) => {
    Linking.openURL(c.url).catch(() => {});
    setOpened((o) => ({ ...o, [c.channel_id]: true }));
  };

  const confirm = async () => {
    try {
      await api("/api/channels/confirm", { method: "POST" });
      await refresh();
      router.replace("/(tabs)/home");
    } catch (e: any) { Alert.alert("خطأ", e?.message || "فشل"); }
  };

  const allOpened = channels.filter((c) => c.mandatory).every((c) => opened[c.channel_id]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]} testID="subscribe-screen">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.header}>
          <Icon name="shield-crown" size={40} color="#F5A623" />
          <Text style={styles.title}>الاشتراك الإجباري</Text>
          <Text style={styles.sub}>يجب الاشتراك في القنوات التالية قبل استخدام جميع ميزات التطبيق</Text>
          <Text style={styles.hint}>اضغط "اشترك" لكل قناة ثم اضغط "تحقق"</Text>
        </View>

        {channels.map((c) => (
          <View key={c.channel_id} style={styles.row} testID={`channel-${c.channel_id}`}>
            <View style={styles.left}>
              <View style={styles.iconWrap}>
                <Icon name={platformIcon[c.platform] || "link"} size={26} color="#F5A623" />
              </View>
              <View>
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowSub}>{c.handle || c.platform}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => open(c)}
              style={[styles.pill, opened[c.channel_id] && styles.pillDone]}
              testID={`subscribe-btn-${c.channel_id}`}
            >
              <Text style={[styles.pillTxt, opened[c.channel_id] && { color: "#00E676" }]}>
                {opened[c.channel_id] ? "✓ تم" : "اشترك"}
              </Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={confirm}
          disabled={!allOpened}
          style={[styles.verify, !allOpened && { opacity: 0.5 }]}
          testID="verify-subscription-btn"
        >
          <Text style={styles.verifyTxt}>تحقق من الاشتراك</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D12" },
  header: { alignItems: "center", marginBottom: 24, gap: 8 },
  title: { color: "#F5A623", fontSize: 24, fontWeight: "900" },
  sub: { color: "#B0B0B8", textAlign: "center", fontSize: 13, paddingHorizontal: 20 },
  hint: { color: "#F5A623", textAlign: "center", fontSize: 11, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1A1A22", borderWidth: 1, borderColor: "#33333F", borderRadius: 16, padding: 14, marginBottom: 12 },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#262630", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,166,35,0.3)" },
  rowTitle: { color: "#F0F0F5", fontSize: 14, fontWeight: "700" },
  rowSub: { color: "#888899", fontSize: 12, marginTop: 2 },
  pill: { backgroundColor: "#F5A623", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  pillDone: { backgroundColor: "rgba(0,230,118,0.15)", borderWidth: 1, borderColor: "#00E676" },
  pillTxt: { color: "#0D0D12", fontWeight: "800", fontSize: 12 },
  verify: { backgroundColor: "#F5A623", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 20 },
  verifyTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 15 },
});
