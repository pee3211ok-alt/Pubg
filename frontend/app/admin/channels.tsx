import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";

const platforms = ["telegram", "youtube", "tiktok", "instagram"];
type C = { channel_id?: string; name: string; handle?: string; platform: string; url: string; mandatory: boolean; active: boolean };
const empty: C = { name: "", handle: "", platform: "telegram", url: "", mandatory: true, active: true };

export default function AdminChannels() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<C[]>([]);
  const [editing, setEditing] = useState<C | null>(null);
  const load = async () => setItems(await api("/api/channels"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const body = JSON.stringify(editing);
    try {
      if (editing.channel_id) await api(`/api/admin/channels/${editing.channel_id}`, { method: "PUT", body });
      else await api("/api/admin/channels", { method: "POST", body });
      setEditing(null); await load();
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };
  const del = async (id: string) => { try { await api(`/api/admin/channels/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("خطأ", e?.message); } };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-channels">
      <AdminHeader title="قنوات الاشتراك" right={<Pressable onPress={() => setEditing({ ...empty })}><Icon name="plus-circle" size={26} color="#F5A623" /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.map((c) => (
          <View key={c.channel_id} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{c.name}</Text>
              <Text style={s.sub}>{c.platform} · {c.handle}</Text>
              <Text style={s.sub} numberOfLines={1}>{c.url}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => setEditing(c)}><Icon name="pencil" size={20} color="#F5A623" /></Pressable>
              <Pressable onPress={() => del(c.channel_id!)}><Icon name="delete" size={20} color="#FF1744" /></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.modalWrap}>
          <ScrollView style={s.modal} contentContainerStyle={{ padding: 20, gap: 10 }}>
            <Text style={s.mTitle}>{editing?.channel_id ? "تعديل قناة" : "قناة جديدة"}</Text>
            <Text style={s.lbl}>الاسم</Text>
            <TextInput style={s.inp} value={editing?.name} onChangeText={(v) => setEditing({ ...editing!, name: v })} />
            <Text style={s.lbl}>المعرف (@)</Text>
            <TextInput style={s.inp} value={editing?.handle} onChangeText={(v) => setEditing({ ...editing!, handle: v })} />
            <Text style={s.lbl}>الرابط</Text>
            <TextInput style={s.inp} value={editing?.url} onChangeText={(v) => setEditing({ ...editing!, url: v })} autoCapitalize="none" />
            <Text style={s.lbl}>المنصة</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
              {platforms.map((p) => (
                <Pressable key={p} onPress={() => setEditing({ ...editing!, platform: p })} style={[s.pill, editing?.platform === p && s.pillA]}><Text style={editing?.platform === p ? s.pillTA : s.pillT}>{p}</Text></Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 8 }}>
              <Text style={s.lbl}>إجباري</Text>
              <Switch value={editing?.mandatory} onValueChange={(v) => setEditing({ ...editing!, mandatory: v })} trackColor={{ true: "#F5A623" }} />
              <Text style={s.lbl}>مفعل</Text>
              <Switch value={editing?.active} onValueChange={(v) => setEditing({ ...editing!, active: v })} trackColor={{ true: "#F5A623" }} />
            </View>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 20 }}>
              <Pressable onPress={save} style={s.saveBtn}><Text style={s.saveTxt}>حفظ</Text></Pressable>
              <Pressable onPress={() => setEditing(null)} style={s.cancelBtn}><Text style={s.cancelTxt}>إلغاء</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1A1A22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#33333F" },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  sub: { color: "#888899", fontSize: 11, textAlign: "right" },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0D0D12", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
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
