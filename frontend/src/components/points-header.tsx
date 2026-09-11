import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";

export function PointsHeader({ title = "هيبة" }: { title?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  return (
    <View style={s.wrap} testID="points-header">
      <Pressable onPress={() => user ? router.push("/(tabs)/profile" as any) : router.push("/login")} style={s.rightBlock}>
        <View style={s.logoBox}>
          <Icon name="crown" size={22} color="#F5A623" />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>HEEBA</Text>
        </View>
      </Pressable>

      {user ? (
        <>
          <Pressable onPress={() => router.push("/(tabs)/notifications" as any)} style={s.notif} testID="open-notifications">
            <Icon name="shield-outline" size={20} color="#00E676" />
          </Pressable>
          <View style={s.pointsPill} testID="points-pill">
            <Icon name="circle" size={12} color="#F5A623" />
            <Text style={s.pointsTxt}>{(user?.points ?? 0).toLocaleString()}</Text>
            <Text style={s.pointsLbl}>نقطة</Text>
          </View>
        </>
      ) : (
        <Pressable onPress={() => router.push("/login")} style={s.loginPill} testID="header-login-btn">
          <Icon name="login" size={16} color="#0D0D12" />
          <Text style={s.loginTxt}>تسجيل الدخول</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: "#33333F", backgroundColor: "#0D0D12" },
  rightBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: "#F5A623", alignItems: "center", justifyContent: "center", backgroundColor: "#1A1A22" },
  title: { color: "#F5A623", fontSize: 16, fontWeight: "900" },
  subtitle: { color: "#B0B0B8", fontSize: 10, letterSpacing: 2 },
  notif: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "#00E676", alignItems: "center", justifyContent: "center" },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#F5A623", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#1A1A22" },
  pointsTxt: { color: "#F5A623", fontWeight: "900", fontSize: 14 },
  pointsLbl: { color: "#B0B0B8", fontSize: 11 },
  loginPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F5A623", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  loginTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 12 },
});
