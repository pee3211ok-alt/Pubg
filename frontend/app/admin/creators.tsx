import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";

const PLATS = ["youtube", "tiktok", "instagram", "telegram"];
type C = { creator_id?: string; name: string; avatar_url?: string; platforms: string[]; url?: string };
const empty: C = { name: "", avatar_url: "", platforms: ["youtube"], url: "" };

export default function AdminCreators() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<C[]>([]);
  const [editing, setEditing] = useState<C | null>(null);
  const load = async () => setItems(await api("/api/creators"));
  useEffect(() => { load(); }, []);

  const toggle = (p: string) => {
    if (!editing) return;
    const has = editing.platforms.includes(p);
    setEditing({ ...editing, platforms: has ? editing.platforms.filter(x => x !== p) : [...editing.platforms, p] });
  };
  const save = async () => {
    if (!editing) return;
    try {
      await api("/api/admin/creators", { method: "POST", body: JSON.stringify(editing) });
      setEditing(null); await load();
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };
  const del = async (id: string) => { try { await api(`/api/admin/creators/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("خطأ", e?.message); } };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-creators">
      <AdminHeader title="صناع المحتوى" right={<Pressable onPress={() => setEditing({ ...empty })}><Icon name="plus-circle" size={26} color="#F5A623" /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.map((c) => (
          <View key={c.creator_id} style={s.card}>
            <Pressable onPress={() => del(c.creator_id!)}><Icon name="delete" size={20} color="#FF1744" /></Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{c.name}</Text>
              <Text style={s.sub}>{c.platforms?.join(" · ")}</Text>
            </View>
            <View style={s.avatar}><Icon name="account" size={22} color="#F5A623" /></View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.modalWrap}>
          <View style={s.modal}>
            <Text style={s.mTitle}>صانع محتوى جديد</Text>
            <TextInput style={s.inp} placeholder="الاسم" placeholderTextColor="#666" value={editing?.name} onChangeText={(v) => setEditing({ ...editing!, name: v })} />
            <TextInput style={s.inp} placeholder="رابط الصفحة" placeholderTextColor="#666" value={editing?.url} onChangeText={(v) => setEditing({ ...editing!, url: v })} autoCapitalize="none" />
            <Text style={s.lbl}>المنصات</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
              {PLATS.map((p) => (
                <Pressable key={p} onPress={() => toggle(p)} style={[s.pill, editing?.platforms.includes(p) && s.pillA]}><Text style={editing?.platforms.includes(p) ? s.pillTA : s.pillT}>{p}</Text></Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
              <Pressable onPress={save} style={s.saveBtn}><Text style={s.saveTxt}>حفظ</Text></Pressable>
              <Pressable onPress={() => setEditing(null)} style={s.cancelBtn}><Text style={s.cancelTxt}>إلغاء</Text></Pressable>
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
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  sub: { color: "#888899", fontSize: 11, textAlign: "right" },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0D0D12", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  mTitle: { color: "#F5A623", fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  lbl: { color: "#B0B0B8", fontSize: 12, textAlign: "right" },
  inp: { backgroundColor: "#1A1A22", color: "#F0F0F5", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#33333F", textAlign: "right" },
  pill: { backgroundColor: "#1A1A22", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#33333F" },
  pillA: { backgroundColor: "#F5A623" },
  pillT: { color: "#B0B0B8", fontWeight: "700", fontSize: 12 },
  pillTA: { color: "#0D0D12", fontWeight: "900", fontSize: 12 },
  saveBtn: { flex: 1, backgroundColor: "#F5A623", borderRadius: 12, padding: 14, alignItems: "center" },
  saveTxt: { color: "#0D0D12", fontWeight: "900" },
  cancelBtn: { flex: 1, backgroundColor: "#262630", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#33333F" },
  cancelTxt: { color: "#B0B0B8", fontWeight: "700" },
});
