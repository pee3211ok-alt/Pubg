import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";
import { PointsHeader } from "@/src/components/points-header";

const BG = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="home-screen">
      <PointsHeader />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}>
        {/* Player card */}
        <View style={s.playerCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.pcName}>قائد {user?.name || "هيبة"}</Text>
            <Text style={s.pcCode}>كود الدعوة: {user?.invite_code}</Text>
          </View>
          <View style={s.pcAvatar}>
            <Icon name="shield-crown" size={36} color="#F5A623" />
          </View>
          <View style={{ alignItems: "flex-start", marginRight: 12 }}>
            <Text style={s.pcPts}>{(user?.points ?? 0).toLocaleString()}</Text>
            <Text style={s.pcLbl}>النقاط</Text>
          </View>
        </View>

        {/* Wheel CTA */}
        <Pressable onPress={() => router.push("/wheel" as any)} testID="open-wheel-btn">
          <ImageBackground source={{ uri: BG }} style={s.wheelCta} imageStyle={{ borderRadius: 20, opacity: 0.35 }}>
            <LinearGradient colors={["rgba(245,166,35,0.15)", "rgba(255,87,34,0.2)"]} style={StyleSheet.absoluteFillObject as any} />
            <View style={s.wheelCtaContent}>
              <View style={{ flex: 1 }}>
                <Text style={s.wheelTitle}>عجلة الحظ</Text>
                <Text style={s.wheelSub}>دوران مجاني كل 24 ساعة</Text>
                <View style={s.liveDot}>
                  <Text style={s.liveTxt}>🔥 متاحة الآن</Text>
                </View>
              </View>
              <View style={s.wheelIcon}>
                <Icon name="rotate-360" size={64} color="#F5A623" />
              </View>
            </View>
          </ImageBackground>
        </Pressable>

        {/* Referral CTA */}
        <Pressable onPress={() => router.push("/referrals" as any)} style={s.refCta} testID="referral-cta">
          <View style={{ flex: 1 }}>
            <Text style={s.refTitle}>اجمع النقاط بمشاركة التطبيق</Text>
            <Text style={s.refSub}>كل صديق يسجّل من رابطك يمنحك 10 نقطة تشتري بها من المتجر</Text>
          </View>
          <Icon name="parachute" size={40} color="#FF5722" />
        </Pressable>

        {/* Quick links */}
        <View style={s.grid}>
          <Pressable onPress={() => router.push("/(tabs)/store" as any)} style={s.tile} testID="tile-store">
            <Icon name="cart" size={30} color="#F5A623" />
            <Text style={s.tileTxt}>متجر الجوائز</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/creators" as any)} style={s.tile} testID="tile-creators">
            <Icon name="movie-open" size={30} color="#F5A623" />
            <Text style={s.tileTxt}>صناع المحتوى</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/referrals" as any)} style={s.tile} testID="tile-refs">
            <Icon name="account-multiple-plus" size={30} color="#F5A623" />
            <Text style={s.tileTxt}>الإحالات</Text>
          </Pressable>
        </View>

        {user?.is_admin && (
          <Pressable onPress={() => router.push("/admin" as any)} style={s.adminBar} testID="admin-panel-btn">
            <Icon name="shield-crown" size={22} color="#0D0D12" />
            <Text style={s.adminTxt}>لوحة تحكم HEEBA</Text>
            <Icon name="chevron-left" size={22} color="#0D0D12" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  playerCard: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,166,35,0.25)", gap: 12 },
  pcName: { color: "#F0F0F5", fontSize: 18, fontWeight: "800", textAlign: "right" },
  pcCode: { color: "#888899", fontSize: 12, marginTop: 4, textAlign: "right" },
  pcAvatar: { width: 60, height: 60, borderRadius: 12, borderWidth: 1.5, borderColor: "#F5A623", alignItems: "center", justifyContent: "center", backgroundColor: "#262630" },
  pcPts: { color: "#F5A623", fontSize: 28, fontWeight: "900" },
  pcLbl: { color: "#888899", fontSize: 11 },
  wheelCta: { borderRadius: 20, overflow: "hidden", minHeight: 140, borderWidth: 1, borderColor: "rgba(245,166,35,0.35)" },
  wheelCtaContent: { flexDirection: "row-reverse", padding: 20, alignItems: "center", gap: 12 },
  wheelTitle: { color: "#F0F0F5", fontSize: 28, fontWeight: "900", textAlign: "right" },
  wheelSub: { color: "#B0B0B8", fontSize: 13, textAlign: "right", marginTop: 4 },
  liveDot: { alignSelf: "flex-end", marginTop: 8 },
  liveTxt: { color: "#F5A623", fontWeight: "800", fontSize: 13 },
  wheelIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#0D0D12", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F5A623" },
  refCta: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#33333F", gap: 12 },
  refTitle: { color: "#F0F0F5", fontSize: 15, fontWeight: "800", textAlign: "right" },
  refSub: { color: "#888899", fontSize: 12, textAlign: "right", marginTop: 6 },
  grid: { flexDirection: "row-reverse", gap: 10 },
  tile: { flex: 1, backgroundColor: "#1A1A22", borderRadius: 14, padding: 18, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(245,166,35,0.2)" },
  tileTxt: { color: "#D0D0D8", fontSize: 12, fontWeight: "700", textAlign: "center" },
  adminBar: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#F5A623", borderRadius: 14, padding: 14, justifyContent: "space-between" },
  adminTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 15, flex: 1, textAlign: "center" },
});
