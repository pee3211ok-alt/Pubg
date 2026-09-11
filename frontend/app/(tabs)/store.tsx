import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, fileUrl } from "@/src/api";
import { PointsHeader } from "@/src/components/points-header";
import { rarityColor, rarityLabelAr } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

const CATS = [
  { id: "all", label: "الكل" },
  { id: "uc", label: "UC" },
  { id: "skins", label: "السكنات" },
  { id: "boxes", label: "الصناديق" },
  { id: "items", label: "عناصر" },
];

type Product = { product_id: string; name: string; description?: string; image_url?: string; category: string; rarity: string; price_points: number; stock: number; active: boolean };

export default function Store() {
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState("all");
  const [items, setItems] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();

  const load = async () => {
    const q = cat === "all" ? "" : `?category=${cat}`;
    setItems(await api(`/api/store/products${q}`));
  };
  useEffect(() => { load(); }, [cat]);

  const buy = async (p: Product) => {
    setBusy(true);
    try {
      await api("/api/store/purchase", { method: "POST", body: JSON.stringify({ product_id: p.product_id, pubg_id: "" }) });
      await refresh();
      Alert.alert("تم", `تم شراء ${p.name} — سيتم مراجعة الطلب`);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "فشل الشراء");
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="store-screen">
      <PointsHeader title="متجر الجوائز" />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {CATS.map((c) => {
            const active = cat === c.id;
            return (
              <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.chip, active && s.chipActive]} testID={`cat-${c.id}`}>
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl tintColor="#F5A623" refreshing={false} onRefresh={load} />}>
        <View style={s.grid}>
          {items.map((p) => (
            <View key={p.product_id} style={[s.card, { borderColor: rarityColor(p.rarity) + "88" }]} testID={`product-${p.product_id}`}>
              <View style={[s.rarityStrip, { backgroundColor: rarityColor(p.rarity) }]} />
              {p.image_url ? (
                <Image source={{ uri: fileUrl(p.image_url) }} style={s.thumb} />
              ) : (
                <View style={[s.thumb, s.thumbFallback]}>
                  <Icon name={p.category === "uc" ? "diamond-stone" : p.category === "boxes" ? "package-variant-closed" : p.category === "skins" ? "tshirt-crew" : "gift"} size={44} color={rarityColor(p.rarity)} />
                </View>
              )}
              <Text style={s.name} numberOfLines={1}>{p.name}</Text>
              <View style={s.priceRow}>
                <Icon name="circle" size={12} color="#F5A623" />
                <Text style={s.price}>{p.price_points.toLocaleString()}</Text>
              </View>
              <Pressable onPress={() => buy(p)} disabled={busy} style={s.buy} testID={`buy-${p.product_id}`}>
                <Text style={s.buyTxt}>شراء</Text>
              </Pressable>
              <Text style={[s.rarBadge, { color: rarityColor(p.rarity), borderColor: rarityColor(p.rarity) }]}>{rarityLabelAr(p.rarity)}</Text>
            </View>
          ))}
        </View>
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
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  card: { width: "48%", backgroundColor: "#1A1A22", borderRadius: 16, padding: 12, borderWidth: 1.5, marginBottom: 12, position: "relative", overflow: "hidden" },
  rarityStrip: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 10, marginBottom: 10, backgroundColor: "#262630" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  priceRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 6 },
  price: { color: "#F5A623", fontSize: 15, fontWeight: "800" },
  buy: { backgroundColor: "#F5A623", borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 8 },
  buyTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 13 },
  rarBadge: { position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, backgroundColor: "rgba(13,13,18,0.7)" },
});
