import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { PointsHeader } from "@/src/components/points-header";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "youtube", label: "يوتيوب" },
  { id: "tiktok", label: "تيك توك" },
  { id: "instagram", label: "انستغرام" },
  { id: "telegram", label: "تيليجرام" },
];
const platIcons: any = { youtube: "youtube", tiktok: "music-circle", instagram: "instagram", telegram: "send-circle" };

export default function Creators() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");
  const [creators, setCreators] = useState<any[]>([]);
  const load = async () => setCreators(await api(`/api/creators${filter === "all" ? "" : `?platform=${filter}`}`));
  useEffect(() => { load(); }, [filter]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="creators-screen">
      <PointsHeader title="صناع المحتوى" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[s.chip, filter === f.id && s.chipActive]} testID={`creator-filter-${f.id}`}>
            <Text style={[s.chipTxt, filter === f.id && s.chipTxtActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
        {creators.map((c) => (
          <View key={c.creator_id} style={s.row} testID={`creator-${c.creator_id}`}>
            <View style={s.avatar}><Icon name="account-circle" size={40} color="#F5A623" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{c.name}</Text>
              <View style={{ flexDirection: "row-reverse", gap: 6, marginTop: 6 }}>
                {(c.platforms || []).map((p: string) => (
                  <Icon key={p} name={platIcons[p] || "link"} size={16} color="#B0B0B8" />
                ))}
              </View>
            </View>
            <Pressable onPress={() => c.url && Linking.openURL(c.url)} style={s.followBtn}><Text style={s.followTxt}>متابعة</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, height: 56, alignItems: "center" },
  chip: { flexShrink: 0, backgroundColor: "#1A1A22", borderRadius: 999, paddingHorizontal: 18, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#33333F" },
  chipActive: { backgroundColor: "#F5A623", borderColor: "#F5A623" },
  chipTxt: { color: "#B0B0B8", fontSize: 13, fontWeight: "700" },
  chipTxtActive: { color: "#0D0D12" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#33333F" },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#262630", alignItems: "center", justifyContent: "center" },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  followBtn: { backgroundColor: "#F5A623", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  followTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 12 },
});
