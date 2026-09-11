import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";

export default function AdminWheel() {
  const insets = useSafeAreaInsets();
  const [cool, setCool] = useState("24");
  const [cost, setCost] = useState("0");

  useEffect(() => { (async () => {
    try {
      const cfg = await api("/api/config");
      setCool(String(cfg.wheel?.cooldown_hours ?? 24));
      setCost(String(cfg.wheel?.spin_cost_points ?? 0));
    } catch {}
  })(); }, []);

  const save = async () => {
    try {
      await api("/api/admin/config/wheel", { method: "POST", body: JSON.stringify({ cooldown_hours: Number(cool) || 24, spin_cost_points: Number(cost) || 0 }) });
      Alert.alert("تم", "تم حفظ الإعدادات");
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-wheel">
      <AdminHeader title="إعدادات العجلة" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={s.lbl}>فترة الانتظار (ساعات)</Text>
        <TextInput style={s.inp} keyboardType="numeric" value={cool} onChangeText={setCool} testID="wheel-cool-input" />
        <Text style={s.lbl}>تكلفة الدوران (نقاط، 0 = مجاني)</Text>
        <TextInput style={s.inp} keyboardType="numeric" value={cost} onChangeText={setCost} testID="wheel-cost-input" />
        <Pressable onPress={save} style={s.btn} testID="wheel-save-btn"><Text style={s.btnTxt}>حفظ</Text></Pressable>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  lbl: { color: "#B0B0B8", fontSize: 12, textAlign: "right", marginTop: 6 },
  inp: { backgroundColor: "#1A1A22", color: "#F0F0F5", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#33333F", textAlign: "right" },
  btn: { backgroundColor: "#F5A623", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  btnTxt: { color: "#0D0D12", fontWeight: "900" },
});
