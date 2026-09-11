import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { PointsHeader } from "@/src/components/points-header";
import { GuestGate } from "@/src/components/guest-gate";
import { useAuth } from "@/src/auth-context";

const icons: Record<string, string> = { trophy: "trophy", cart: "cart", bell: "bell", info: "information", crown: "crown" };
const colorMap: Record<string, string> = { trophy: "#F5A623", cart: "#00E676", bell: "#2979FF", info: "#FF5722", crown: "#F5A623" };

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { if (user) (async () => setItems(await api("/api/notifications")))(); }, [user]);

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.floor(h / 24)} يوم`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="notifications-screen">
      <PointsHeader title="الإشعارات" />
      {!user ? (
        <GuestGate icon="bell" title="الإشعارات" subtitle="سجّل الدخول لعرض إشعاراتك الشخصية عن الجوائز، المشتريات، والقنوات الجديدة." />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
        {items.length === 0 && (
          <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
            <Icon name="bell-off" size={60} color="#33333F" />
            <Text style={{ color: "#888899" }}>لا توجد إشعارات</Text>
          </View>
        )}
        {items.map((n) => (
          <View key={n.notif_id} style={s.row} testID={`notif-${n.notif_id}`}>
            <View style={[s.icon, { borderColor: colorMap[n.icon] || "#F5A623" }]}>
              <Icon name={icons[n.icon] || "bell"} size={22} color={colorMap[n.icon] || "#F5A623"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{n.title}</Text>
              {n.body ? <Text style={s.body}>{n.body}</Text> : null}
              <Text style={s.time}>{timeAgo(n.created_at)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row-reverse", gap: 12, alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#33333F" },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: "#262630" },
  title: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  body: { color: "#B0B0B8", fontSize: 12, textAlign: "right", marginTop: 2 },
  time: { color: "#666677", fontSize: 11, textAlign: "right", marginTop: 4 },
});
