import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";

const tiles = [
  { key: "prizes", label: "جوائز العجلة", icon: "rotate-360", route: "/admin/prizes" },
  { key: "products", label: "منتجات المتجر", icon: "cart", route: "/admin/products" },
  { key: "users", label: "المستخدمون", icon: "account-group", route: "/admin/users" },
  { key: "orders", label: "الطلبات", icon: "package-variant", route: "/admin/orders" },
  { key: "channels", label: "قنوات الاشتراك", icon: "send-circle", route: "/admin/channels" },
  { key: "creators", label: "صناع المحتوى", icon: "movie-open", route: "/admin/creators" },
  { key: "wheel", label: "إعدادات العجلة", icon: "cog", route: "/admin/wheel" },
];

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<any>({});
  useEffect(() => { (async () => { try { setStats(await api("/api/admin/stats")); } catch {} })(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-home">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} testID="admin-back"><Icon name="chevron-right" size={26} color="#F5A623" /></Pressable>
        <Text style={s.title}>HEEBA Management</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNum}>{stats.users || 0}</Text><Text style={s.statLbl}>مستخدم</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{stats.orders_pending || 0}</Text><Text style={s.statLbl}>طلبات معلقة</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{stats.products || 0}</Text><Text style={s.statLbl}>منتجات</Text></View>
        </View>
        <View style={s.grid}>
          {tiles.map((t) => (
            <Pressable key={t.key} onPress={() => router.push(t.route as any)} style={s.tile} testID={`admin-tile-${t.key}`}>
              <Icon name={t.icon} size={30} color="#F5A623" />
              <Text style={s.tileTxt}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#33333F" },
  title: { color: "#F5A623", fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  stat: { flex: 1, backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,166,35,0.25)" },
  statNum: { color: "#F5A623", fontSize: 22, fontWeight: "900" },
  statLbl: { color: "#888899", fontSize: 11 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  tile: { width: "48%", backgroundColor: "#1A1A22", borderRadius: 14, padding: 20, alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#33333F", marginBottom: 6 },
  tileTxt: { color: "#F0F0F5", fontSize: 13, fontWeight: "800", textAlign: "center" },
});
