import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

export function GuestGate({ title, subtitle, icon = "lock" }: { title: string; subtitle: string; icon?: string }) {
  const router = useRouter();
  return (
    <View style={s.wrap} testID="guest-gate">
      <View style={s.iconWrap}>
        <Icon name={icon} size={44} color="#F5A623" />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>{subtitle}</Text>
      <Pressable onPress={() => router.push("/login")} style={s.btn} testID="guest-login-btn">
        <Icon name="login" size={18} color="#0D0D12" />
        <Text style={s.btnTxt}>تسجيل الدخول الآن</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#1A1A22", borderWidth: 2, borderColor: "#F5A623", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { color: "#F0F0F5", fontSize: 20, fontWeight: "900", textAlign: "center" },
  sub: { color: "#B0B0B8", fontSize: 13, textAlign: "center", paddingHorizontal: 20, lineHeight: 20 },
  btn: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#F5A623", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 10 },
  btnTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 14 },
});
