import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { PointsHeader } from "@/src/components/points-header";
import { GuestGate } from "@/src/components/guest-gate";
import { rarityColor } from "@/src/theme";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [txs, setTxs] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try { setTxs(await api("/api/transactions/mine")); } catch {}
      try { setRewards(await api("/api/rewards/mine")); } catch {}
    })();
  }, [user]);

  const doLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="profile-screen">
      <PointsHeader title="الملف الشخصي" />
      {!user ? (
        <GuestGate icon="account" title="ملف اللاعب" subtitle="سجّل الدخول لرؤية رصيد نقاطك، جوائزك، إحالاتك، وسجل عمليات النقاط." />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <View style={s.hero}>
          <View style={s.avatar}>
            <Icon name="shield-crown" size={44} color="#F5A623" />
          </View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.levelBarBg}>
            <View style={[s.levelBarFill, { width: `${Math.min(100, ((user?.points || 0) % 1000) / 10)}%` }]} />
          </View>
          <Text style={s.levelTxt}>مستوى {Math.floor((user?.points || 0) / 1000) + 1}</Text>
        </View>

        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{(user?.points || 0).toLocaleString()}</Text><Text style={s.statLbl}>رصيد النقاط</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{user?.referrals_count || 0}</Text><Text style={s.statLbl}>عدد الإحالات</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{rewards.length}</Text><Text style={s.statLbl}>عدد الجوائز</Text></View>
        </View>

        <Text style={s.section}>الجوائز التي حصلت عليها</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {rewards.slice(0, 8).map((r) => (
            <View key={r.id} style={[s.rwd, { borderColor: rarityColor(r.rarity) }]}>
              <Icon name={r.source === "wheel" ? "rotate-360" : "gift"} size={26} color={rarityColor(r.rarity)} />
              <Text style={s.rwdTxt} numberOfLines={1}>{r.name}</Text>
            </View>
          ))}
          {rewards.length === 0 && <Text style={{ color: "#888899", padding: 12 }}>لا يوجد بعد</Text>}
        </ScrollView>

        <Text style={s.section}>سجل النقاط</Text>
        <View style={s.list}>
          {txs.slice(0, 20).map((t) => (
            <View key={t.tx_id} style={s.txRow}>
              <Text style={[s.txDelta, { color: t.delta >= 0 ? "#00E676" : "#FF1744" }]}>{t.delta > 0 ? "+" : ""}{t.delta}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.txReason}>{t.reason}</Text>
                <Text style={s.txDate}>{new Date(t.created_at).toLocaleString("ar-EG")}</Text>
              </View>
            </View>
          ))}
          {txs.length === 0 && <Text style={{ color: "#888899", padding: 12 }}>لا توجد عمليات</Text>}
        </View>

        <Pressable onPress={doLogout} style={s.logout} testID="logout-btn">
          <Icon name="logout" size={18} color="#FF1744" />
          <Text style={s.logoutTxt}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(245,166,35,0.25)" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#262630", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F5A623", marginBottom: 12 },
  name: { color: "#F0F0F5", fontSize: 20, fontWeight: "900" },
  email: { color: "#888899", fontSize: 12, marginTop: 2 },
  levelBarBg: { width: "80%", height: 8, backgroundColor: "#262630", borderRadius: 999, marginTop: 14 },
  levelBarFill: { height: 8, backgroundColor: "#F5A623", borderRadius: 999 },
  levelTxt: { color: "#F5A623", fontSize: 12, marginTop: 6, fontWeight: "800" },
  stats: { flexDirection: "row-reverse", gap: 10 },
  stat: { flex: 1, backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#33333F" },
  statNum: { color: "#F5A623", fontSize: 20, fontWeight: "900" },
  statLbl: { color: "#888899", fontSize: 11, marginTop: 4 },
  section: { color: "#F0F0F5", fontSize: 15, fontWeight: "800", textAlign: "right", marginTop: 6 },
  rwd: { width: 96, height: 96, borderRadius: 12, borderWidth: 1.5, backgroundColor: "#1A1A22", alignItems: "center", justifyContent: "center", padding: 8, gap: 6 },
  rwdTxt: { color: "#D0D0D8", fontSize: 10, textAlign: "center", fontWeight: "700" },
  list: { backgroundColor: "#1A1A22", borderRadius: 14, borderWidth: 1, borderColor: "#33333F", overflow: "hidden" },
  txRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, borderBottomColor: "#262630", gap: 12, alignItems: "center" },
  txDelta: { fontSize: 16, fontWeight: "900", minWidth: 60, textAlign: "right" },
  txReason: { color: "#F0F0F5", fontSize: 13, fontWeight: "700", textAlign: "right" },
  txDate: { color: "#666677", fontSize: 11, textAlign: "right", marginTop: 2 },
  logout: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 8, padding: 14, borderWidth: 1, borderColor: "#FF1744", borderRadius: 14, marginTop: 10 },
  logoutTxt: { color: "#FF1744", fontWeight: "800", fontSize: 14 },
});
