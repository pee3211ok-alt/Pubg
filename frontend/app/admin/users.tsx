import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";

export default function AdminUsers() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [adj, setAdj] = useState<{ user: any; delta: string } | null>(null);
  const load = async () => setUsers(await api("/api/admin/users"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!adj) return;
    try {
      await api(`/api/admin/users/${adj.user.user_id}/points`, { method: "POST", body: JSON.stringify({ delta: Number(adj.delta) || 0, reason: "admin_adjust" }) });
      setAdj(null); await load();
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-users">
      <AdminHeader title="المستخدمون" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {users.map((u) => (
          <View key={u.user_id} style={s.card} testID={`user-${u.user_id}`}>
            <Pressable onPress={() => setAdj({ user: u, delta: "" })} style={s.adjBtn}><Icon name="pencil" size={18} color="#F5A623" /></Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{u.name} {u.is_admin ? "👑" : ""}</Text>
              <Text style={s.sub}>{u.email}</Text>
              <View style={s.meta}>
                <Text style={s.metaTxt}>النقاط: <Text style={{ color: "#F5A623" }}>{u.points}</Text></Text>
                <Text style={s.metaTxt}>الإحالات: {u.referrals_count || 0}</Text>
              </View>
            </View>
            <View style={s.avatar}><Icon name="account" size={22} color="#F5A623" /></View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!adj} transparent animationType="fade" onRequestClose={() => setAdj(null)}>
        <View style={s.modalWrap}>
          <View style={s.modal}>
            <Text style={s.mTitle}>تعديل نقاط {adj?.user?.name}</Text>
            <Text style={{ color: "#B0B0B8", textAlign: "right", fontSize: 12 }}>الرصيد الحالي: {adj?.user?.points}</Text>
            <TextInput style={s.inp} keyboardType="numeric" placeholder="مثال +100 أو -50" placeholderTextColor="#666677" value={adj?.delta} onChangeText={(v) => setAdj({ ...adj!, delta: v })} testID="user-delta-input" />
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <Pressable onPress={save} style={s.saveBtn} testID="user-save-btn"><Text style={s.saveTxt}>حفظ</Text></Pressable>
              <Pressable onPress={() => setAdj(null)} style={s.cancelBtn}><Text style={s.cancelTxt}>إلغاء</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1A1A22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#33333F" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#262630", alignItems: "center", justifyContent: "center" },
  adjBtn: { padding: 8 },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  sub: { color: "#888899", fontSize: 11, textAlign: "right" },
  meta: { flexDirection: "row-reverse", gap: 12, marginTop: 4 },
  metaTxt: { color: "#B0B0B8", fontSize: 11 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", padding: 24, justifyContent: "center" },
  modal: { backgroundColor: "#0D0D12", borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: "rgba(245,166,35,0.3)" },
  mTitle: { color: "#F5A623", fontSize: 18, fontWeight: "900", textAlign: "center" },
  inp: { backgroundColor: "#1A1A22", color: "#F0F0F5", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#33333F", textAlign: "right" },
  saveBtn: { flex: 1, backgroundColor: "#F5A623", borderRadius: 12, padding: 12, alignItems: "center" },
  saveTxt: { color: "#0D0D12", fontWeight: "900" },
  cancelBtn: { flex: 1, backgroundColor: "#262630", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#33333F" },
  cancelTxt: { color: "#B0B0B8", fontWeight: "700" },
});
