import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Clipboard from "expo-clipboard";
import { api } from "@/src/api";
import { PointsHeader } from "@/src/components/points-header";
import { GuestGate } from "@/src/components/guest-gate";
import { useAuth } from "@/src/auth-context";

export default function Referrals() {
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const [data, setData] = useState<any>(null);
  const [redeem, setRedeem] = useState("");
  const load = async () => { if (user) setData(await api("/api/referrals/mine")); };
  useEffect(() => { load(); }, [user]);

  const copy = async () => {
    if (!data?.invite_link) return;
    await Clipboard.setStringAsync(data.invite_link);
    Alert.alert("تم النسخ", "تم نسخ رابط الدعوة");
  };
  const share = async () => {
    try {
      if (Platform.OS === "web") { await copy(); return; }
      await Share.share({ message: `انضم إلى هيبة HEEBA — رابطي: ${data?.invite_link}` });
    } catch {}
  };
  const doRedeem = async () => {
    try {
      await api("/api/referrals/redeem", { method: "POST", body: JSON.stringify({ invite_code: redeem.trim() }) });
      await refresh(); await load();
      Alert.alert("تم", "تم استخدام الكود وحصلت على 10 نقاط");
      setRedeem("");
    } catch (e: any) { Alert.alert("خطأ", e?.message || "فشل"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="referrals-screen">
      <PointsHeader title="الإحالات" />
      {!user ? (
        <GuestGate icon="account-multiple-plus" title="الإحالات" subtitle="سجّل الدخول للحصول على رابط دعوة خاص بك واربح 10 نقاط عن كل صديق يسجّل من رابطك." />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <View style={s.hero}>
          <Text style={s.title}>ادعُ أصدقائك واربح نقاط</Text>
          <Text style={s.sub}>كل صديق يسجّل من رابطك يمنحك 10 نقطة إضافية</Text>
          <View style={s.linkBox}>
            <Text style={s.linkTxt} numberOfLines={1}>{data?.invite_link || "..."}</Text>
            <Pressable onPress={copy} style={s.copyBtn} testID="copy-invite-btn"><Icon name="content-copy" size={16} color="#F5A623" /></Pressable>
          </View>
          <Pressable onPress={share} style={s.shareBtn} testID="share-invite-btn">
            <Text style={s.shareTxt}>مشاركة الرابط</Text>
          </Pressable>
        </View>

        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNum}>{data?.total_referrals || 0}</Text><Text style={s.statLbl}>إجمالي الإحالات</Text></View>
          <View style={s.stat}><Text style={s.statNum}>+{data?.total_points_earned || 0}</Text><Text style={s.statLbl}>النقاط المكتسبة</Text></View>
        </View>

        {!user?.referred_by && (
          <View style={s.redeem}>
            <Text style={s.redeemLbl}>لديك كود إحالة صديق؟</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <TextInput value={redeem} onChangeText={setRedeem} placeholder="كود مثال HEEBA1" placeholderTextColor="#666677" style={s.input} autoCapitalize="characters" testID="redeem-input" />
              <Pressable onPress={doRedeem} style={s.useBtn} testID="redeem-btn"><Text style={s.useTxt}>استخدم</Text></Pressable>
            </View>
          </View>
        )}

        <Text style={s.section}>أصدقاؤك النشطون</Text>
        {(data?.friends || []).map((f: any, i: number) => (
          <View key={i} style={s.friendRow}>
            <Text style={s.friendBonus}>+{f.bonus} نقاط</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.friendName}>{f.name}</Text>
              <Text style={s.friendDate}>{new Date(f.created_at).toLocaleDateString("ar-EG")}</Text>
            </View>
            <View style={s.friendAvatar}><Icon name="account" size={22} color="#F5A623" /></View>
          </View>
        ))}
        {(!data?.friends || data.friends.length === 0) && <Text style={{ color: "#888899", textAlign: "center", padding: 12 }}>لا يوجد أصدقاء نشطون بعد</Text>}
      </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: "#1A1A22", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(245,166,35,0.35)", gap: 12 },
  title: { color: "#F5A623", fontSize: 20, fontWeight: "900", textAlign: "right" },
  sub: { color: "#B0B0B8", fontSize: 13, textAlign: "right" },
  linkBox: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#262630", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#33333F" },
  linkTxt: { flex: 1, color: "#F0F0F5", fontSize: 12, textAlign: "right" },
  copyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#0D0D12" },
  shareBtn: { backgroundColor: "#F5A623", borderRadius: 12, padding: 12, alignItems: "center" },
  shareTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 14 },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  stat: { flex: 1, backgroundColor: "#1A1A22", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#33333F" },
  statNum: { color: "#F5A623", fontSize: 24, fontWeight: "900" },
  statLbl: { color: "#888899", fontSize: 11, marginTop: 4 },
  redeem: { backgroundColor: "#1A1A22", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#33333F", gap: 10 },
  redeemLbl: { color: "#F0F0F5", fontSize: 13, fontWeight: "700", textAlign: "right" },
  input: { flex: 1, backgroundColor: "#262630", color: "#F0F0F5", borderRadius: 10, padding: 12, textAlign: "right" },
  useBtn: { backgroundColor: "#F5A623", borderRadius: 10, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  useTxt: { color: "#0D0D12", fontWeight: "900" },
  section: { color: "#F0F0F5", fontSize: 15, fontWeight: "800", textAlign: "right", marginTop: 6 },
  friendRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1A1A22", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#33333F" },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#262630", alignItems: "center", justifyContent: "center" },
  friendName: { color: "#F0F0F5", fontSize: 13, fontWeight: "700", textAlign: "right" },
  friendDate: { color: "#666677", fontSize: 11, textAlign: "right" },
  friendBonus: { color: "#00E676", fontSize: 12, fontWeight: "800" },
});
