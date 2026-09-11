import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { PointsHeader } from "@/src/components/points-header";
import { useAuth } from "@/src/auth-context";

const rows = [
  { key: "referrals", icon: "account-multiple-plus", label: "الإحالات", route: "/referrals" },
  { key: "creators", icon: "movie-open", label: "صناع المحتوى", route: "/creators" },
  { key: "notifications", icon: "bell-ring", label: "الإشعارات", route: "/notifications" },
  { key: "wheel", icon: "rotate-360", label: "عجلة الحظ", route: "/wheel" },
  { key: "subscribe", icon: "check-decagram", label: "الاشتراكات الإجبارية", route: "/subscribe" },
];

export default function More() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="more-screen">
      <PointsHeader title="المزيد" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
        {rows.map((r) => (
          <Pressable key={r.key} onPress={() => router.push(r.route as any)} style={s.row} testID={`more-${r.key}`}>
            <Icon name="chevron-left" size={22} color="#888899" />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{r.label}</Text>
            </View>
            <View style={s.iconWrap}><Icon name={r.icon} size={22} color="#F5A623" /></View>
          </Pressable>
        ))}
        {user?.is_admin && (
          <Pressable onPress={() => router.push("/admin" as any)} style={[s.row, { borderColor: "#F5A623" }]} testID="more-admin">
            <Icon name="chevron-left" size={22} color="#F5A623" />
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: "#F5A623" }]}>لوحة تحكم الأدمن</Text>
            </View>
            <View style={s.iconWrap}><Icon name="shield-crown" size={22} color="#F5A623" /></View>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#1A1A22", borderWidth: 1, borderColor: "#33333F", borderRadius: 14, padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#262630", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,166,35,0.3)" },
  label: { color: "#F0F0F5", fontSize: 15, fontWeight: "700", textAlign: "right" },
});
