import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";

const statuses = [
  { id: "pending", label: "قيد المراجعة", color: "#FFD700" },
  { id: "approved", label: "موافق", color: "#2979FF" },
  { id: "delivered", label: "تم التسليم", color: "#00E676" },
  { id: "rejected", label: "مرفوض", color: "#FF1744" },
];

export default function AdminOrders() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>({ orders: [], wins: [] });
  const load = async () => setData(await api("/api/admin/orders"));
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    try {
      await api(`/api/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status, admin_note: "" }) });
      await load();
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-orders">
      <AdminHeader title="الطلبات" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.sec}>طلبات المتجر</Text>
        {data.orders.map((o: any) => (
          <View key={o.order_id} style={s.card} testID={`order-${o.order_id}`}>
            <Text style={s.name}>{o.product_name}</Text>
            <Text style={s.sub}>#{o.order_id.slice(0, 8)} · {o.price_points}pt · PUBG ID: {o.pubg_id || "—"}</Text>
            <View style={s.actions}>
              {statuses.map((st) => (
                <Pressable key={st.id} onPress={() => setStatus(o.order_id, st.id)} style={[s.pill, { borderColor: st.color }, o.status === st.id && { backgroundColor: st.color }]}>
                  <Text style={{ color: o.status === st.id ? "#0D0D12" : st.color, fontSize: 11, fontWeight: "800" }}>{st.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Text style={s.sec}>جوائز عجلة تحتاج تسليم</Text>
        {data.wins.map((w: any) => (
          <View key={w.win_id} style={s.card} testID={`win-${w.win_id}`}>
            <Text style={s.name}>{w.prize_name}</Text>
            <Text style={s.sub}>#{w.win_id.slice(0, 8)} · PUBG ID: {w.pubg_id || "—"}</Text>
            <View style={s.actions}>
              {statuses.map((st) => (
                <Pressable key={st.id} onPress={() => setStatus(w.win_id, st.id)} style={[s.pill, { borderColor: st.color }, w.status === st.id && { backgroundColor: st.color }]}>
                  <Text style={{ color: w.status === st.id ? "#0D0D12" : st.color, fontSize: 11, fontWeight: "800" }}>{st.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sec: { color: "#F5A623", fontSize: 14, fontWeight: "900", textAlign: "right", marginTop: 8 },
  card: { backgroundColor: "#1A1A22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#33333F", gap: 6 },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  sub: { color: "#888899", fontSize: 11, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 6, flexWrap: "wrap", marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
