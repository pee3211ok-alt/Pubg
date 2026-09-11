import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, Switch, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { api, apiUpload, fileUrl } from "@/src/api";
import { AdminHeader } from "@/src/components/admin-header";
import { rarityColor, rarityLabelAr } from "@/src/theme";
import * as ImagePicker from "expo-image-picker";

const RARITIES = ["common", "rare", "epic", "legendary"];
const CATS = [
  { id: "uc", label: "UC" }, { id: "skins", label: "سكنات" }, { id: "boxes", label: "صناديق" }, { id: "items", label: "عناصر" },
];

type P = { product_id?: string; name: string; description?: string; image_url?: string; category: string; rarity: string; price_points: number; stock: number; active: boolean };
const empty: P = { name: "", description: "", image_url: "", category: "uc", rarity: "common", price_points: 100, stock: -1, active: true };

export default function AdminProducts() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<P[]>([]);
  const [editing, setEditing] = useState<P | null>(null);
  const load = async () => setItems(await api("/api/admin/products"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      const body = JSON.stringify({
        name: editing.name, description: editing.description || "", image_url: editing.image_url || "",
        category: editing.category, rarity: editing.rarity, price_points: Number(editing.price_points) || 0,
        stock: Number(editing.stock), active: editing.active,
      });
      if (editing.product_id) await api(`/api/admin/products/${editing.product_id}`, { method: "PUT", body });
      else await api("/api/admin/products", { method: "POST", body });
      setEditing(null); await load();
    } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };
  const del = async (id: string) => {
    try { await api(`/api/admin/products/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("خطأ", e?.message); }
  };
  const pickImage = async () => {
    if (!editing) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] as any, quality: 0.7 });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const up = await apiUpload("/api/admin/upload", a.uri, a.fileName || "img.jpg", a.mimeType || "image/jpeg");
      setEditing({ ...editing, image_url: up.url });
    } catch (e: any) { Alert.alert("خطأ", e?.message || "فشل الرفع"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="admin-products">
      <AdminHeader title="منتجات المتجر" right={<Pressable onPress={() => setEditing({ ...empty })} testID="admin-add-product"><Icon name="plus-circle" size={26} color="#F5A623" /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.map((p) => (
          <View key={p.product_id} style={[s.card, { borderColor: rarityColor(p.rarity) }]} testID={`product-${p.product_id}`}>
            {p.image_url ? <Image source={{ uri: fileUrl(p.image_url) }} style={s.img} /> : <View style={[s.img, { backgroundColor: "#262630" }]} />}
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.name}</Text>
              <View style={s.rowMeta}>
                <Text style={[s.rar, { color: rarityColor(p.rarity), borderColor: rarityColor(p.rarity) }]}>{rarityLabelAr(p.rarity)}</Text>
                <Text style={s.meta}>{CATS.find(c => c.id === p.category)?.label || p.category}</Text>
                <Text style={s.meta}>{p.price_points}pt</Text>
                <Text style={s.meta}>{p.active ? "مفعل" : "معطل"}</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => setEditing(p)}><Icon name="pencil" size={20} color="#F5A623" /></Pressable>
              <Pressable onPress={() => del(p.product_id!)}><Icon name="delete" size={20} color="#FF1744" /></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.modalWrap}>
          <ScrollView style={s.modal} contentContainerStyle={{ padding: 20, gap: 10 }}>
            <Text style={s.mTitle}>{editing?.product_id ? "تعديل منتج" : "منتج جديد"}</Text>
            <Pressable onPress={pickImage} style={s.imgPicker}>
              {editing?.image_url ? <Image source={{ uri: fileUrl(editing.image_url) }} style={{ width: "100%", height: "100%", borderRadius: 12 }} /> : <><Icon name="image-plus" size={30} color="#F5A623" /><Text style={{ color: "#B0B0B8" }}>اختر صورة</Text></>}
            </Pressable>
            <Text style={s.lbl}>الاسم</Text>
            <TextInput style={s.inp} value={editing?.name} onChangeText={(v) => setEditing({ ...editing!, name: v })} />
            <Text style={s.lbl}>الوصف</Text>
            <TextInput style={s.inp} value={editing?.description} onChangeText={(v) => setEditing({ ...editing!, description: v })} />
            <Text style={s.lbl}>الفئة</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
              {CATS.map((c) => (
                <Pressable key={c.id} onPress={() => setEditing({ ...editing!, category: c.id })} style={[s.pill, editing?.category === c.id && s.pillA]}><Text style={editing?.category === c.id ? s.pillTA : s.pillT}>{c.label}</Text></Pressable>
              ))}
            </View>
            <Text style={s.lbl}>الندرة</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
              {RARITIES.map((r) => (
                <Pressable key={r} onPress={() => setEditing({ ...editing!, rarity: r })} style={[s.pill, editing?.rarity === r && s.pillA, { borderColor: rarityColor(r) }]}><Text style={{ color: editing?.rarity === r ? "#0D0D12" : rarityColor(r), fontWeight: "800", fontSize: 12 }}>{rarityLabelAr(r)}</Text></Pressable>
              ))}
            </View>
            <Text style={s.lbl}>السعر بالنقاط</Text>
            <TextInput style={s.inp} keyboardType="numeric" value={String(editing?.price_points ?? 0)} onChangeText={(v) => setEditing({ ...editing!, price_points: Number(v) || 0 })} />
            <Text style={s.lbl}>الكمية (-1 = غير محدود)</Text>
            <TextInput style={s.inp} keyboardType="numeric" value={String(editing?.stock ?? -1)} onChangeText={(v) => setEditing({ ...editing!, stock: Number(v) })} />
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 8 }}>
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
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1A1A22", borderRadius: 12, padding: 10, borderWidth: 1.5 },
  img: { width: 50, height: 50, borderRadius: 8 },
  name: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  rowMeta: { flexDirection: "row-reverse", gap: 8, marginTop: 4, flexWrap: "wrap" },
  rar: { fontSize: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontWeight: "800" },
  meta: { color: "#888899", fontSize: 11 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0D0D12", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  mTitle: { color: "#F5A623", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  imgPicker: { height: 140, borderRadius: 12, backgroundColor: "#1A1A22", borderWidth: 1, borderColor: "#33333F", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  lbl: { color: "#B0B0B8", fontSize: 12, textAlign: "right", marginTop: 6 },
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
