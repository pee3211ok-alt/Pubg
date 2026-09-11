import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, fileUrl } from "@/src/api";
import { PointsHeader } from "@/src/components/points-header";
import { rarityColor, rarityLabelAr } from "@/src/theme";

type Item = { id: string; source: "wheel"|"store"; name: string; rarity: string; image_url?: string; status: string; created_at: string; points_awarded?: number; price_points?: number };

const statusLabel = (s: string) => ({ pending: "قيد المراجعة", approved: "موافق", delivered: "تم التسليم", rejected: "مرفوض" } as any)[s] || s;
const statusColor = (s: string) => ({ pending: "#FFD700", approved: "#2979FF", delivered: "#00E676", rejected: "#FF1744" } as any)[s] || "#888899";

export default function Rewards() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const load = async () => setItems(await api("/api/rewards/mine"));
  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="rewards-screen">
      <PointsHeader title="جوائزي" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl tintColor="#F5A623" refreshing={false} onRefresh={load} />}>
        {items.length === 0 && (
          <View style={s.empty}>
            <Icon name="package-variant" size={64} color="#33333F" />
            <Text style={s.emptyTxt}>لم تحصل على جوائز بعد</Text>
          </View>
        )}
        {items.map((it) => (
          <View key={it.id} style={[s.card, { borderColor: rarityColor(it.rarity) + "77" }]} testID={`reward-${it.id}`}>
            {it.image_url ? <Image source={{ uri: fileUrl(it.image_url) }} style={s.img}/> : (
              <View style={[s.img, { alignItems: "center", justifyContent: "center", backgroundColor: "#262630" }]}>
                <Icon name={it.source === "wheel" ? "rotate-360" : "cart"} size={30} color={rarityColor(it.rarity)} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.name} numberOfLines={1}>{it.name}</Text>
              <View style={s.rowMeta}>
                <Text style={[s.rarity, { color: rarityColor(it.rarity), borderColor: rarityColor(it.rarity) }]}>{rarityLabelAr(it.rarity)}</Text>
                <Text style={s.source}>{it.source === "wheel" ? "عجلة الحظ" : "المتجر"}</Text>
              </View>
              <Text style={s.date}>#{it.id.slice(0,8)} · {new Date(it.created_at).toLocaleDateString("ar-EG")}</Text>
            </View>
            <View style={{ alignItems: "flex-start" }}>
              <Text style={[s.status, { color: statusColor(it.status), borderColor: statusColor(it.status) }]}>{statusLabel(it.status)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyTxt: { color: "#888899", fontSize: 14 },
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, borderWidth: 1.5, marginBottom: 10 },
  img: { width: 60, height: 60, borderRadius: 10 },
  name: { color: "#F0F0F5", fontSize: 15, fontWeight: "800", textAlign: "right" },
  rowMeta: { flexDirection: "row-reverse", gap: 8 },
  rarity: { fontSize: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontWeight: "800" },
  source: { fontSize: 11, color: "#888899" },
  date: { color: "#666677", fontSize: 11, textAlign: "right" },
  status: { fontSize: 11, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontWeight: "800" },
});
