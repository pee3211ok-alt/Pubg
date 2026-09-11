import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import Svg, { Circle, Path, G } from "react-native-svg";
import { useAuth } from "@/src/auth-context";
import { PointsHeader } from "@/src/components/points-header";

function MiniWheel({ size = 110 }: { size?: number }) {
  const c = size / 2;
  const r = c - 4;
  const slices = 8;
  const step = 360 / slices;
  const colors = ["#F5A623", "#1A1A22", "#F5A623", "#1A1A22", "#F5A623", "#1A1A22", "#F5A623", "#1A1A22"];
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r + 2} fill="#F5A623" />
        {Array.from({ length: slices }).map((_, i) => {
          const start = (i * step - 90) * Math.PI / 180;
          const end = ((i + 1) * step - 90) * Math.PI / 180;
          const x1 = c + r * Math.cos(start), y1 = c + r * Math.sin(start);
          const x2 = c + r * Math.cos(end), y2 = c + r * Math.sin(end);
          const d = `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
          return <Path key={i} d={d} fill={colors[i]} />;
        })}
        <Circle cx={c} cy={c} r={20} fill="#0D0D12" stroke="#F5A623" strokeWidth={2} />
      </Svg>
      <Text style={{ position: "absolute", color: "#F5A623", fontSize: 12, fontWeight: "900" }}>أدر</Text>
    </View>
  );
}

const TILES = [
  { key: "store", icon: "cart-outline", label: "متجر الجوائز", route: "/(tabs)/store" },
  { key: "guides", icon: "movie-filter-outline", label: "شروحات ببجي", url: "https://www.youtube.com/results?search_query=pubg+mobile+شروحات" },
  { key: "sensitivity", icon: "target", label: "حساسية ببجي", url: "https://www.youtube.com/results?search_query=pubg+mobile+حساسية" },
  { key: "creators", icon: "video-outline", label: "صناع المحتوى", route: "/creators" },
  { key: "refs", icon: "account-multiple-plus-outline", label: "ادعُ أصدقاءك", route: "/referrals" },
  { key: "rewards", icon: "package-variant-closed", label: "جوائزي", route: "/(tabs)/rewards" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="home-screen">
      <PointsHeader />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 14 }}>
        {/* Player card */}
        <View style={s.playerCard}>
          <View style={{ flex: 1, alignItems: "flex-start", paddingLeft: 8 }}>
            <Text style={s.pcPts}>{(user?.points ?? 0).toLocaleString()}</Text>
            <Text style={s.pcLbl}>النقاط</Text>
          </View>
          <View style={{ flex: 1.4, alignItems: "flex-end", flexDirection: "row-reverse", gap: 12 }}>
            <View style={s.pcAvatar}>
              <Icon name="shield-crown" size={30} color="#F5A623" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pcName}>قائد {user?.name || "هيبة"}</Text>
              <Text style={s.pcCode}>كود الدعوة: {user?.invite_code}</Text>
            </View>
          </View>
        </View>

        {/* Wheel CTA */}
        <Pressable onPress={() => router.push("/wheel" as any)} style={s.wheelCta} testID="open-wheel-btn">
          <LinearGradient colors={["#3a2818", "#1a1a22"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={s.wheelTitle}>عجلة الحظ</Text>
            <Text style={s.wheelSub}>دوران مجاني كل 24 ساعة</Text>
            <Text style={s.wheelLive}>متاحة الآن 🔥</Text>
          </View>
          <MiniWheel size={110} />
        </Pressable>

        {/* Referral CTA */}
        <Pressable onPress={() => router.push("/referrals" as any)} style={s.refCta} testID="referral-cta">
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={s.refTitle}>اجمع النقاط بمشاركة التطبيق</Text>
            <Text style={s.refSub}>كل صديق يسجّل من رابطك يمنحك <Text style={{ color: "#F5A623", fontWeight: "800" }}>10 نقطة</Text> تشتري بها من المتجر</Text>
          </View>
          <Icon name="parachute" size={44} color="#FF5722" />
        </Pressable>

        {/* Grid 3x2 */}
        <View style={s.grid}>
          {TILES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => t.route ? router.push(t.route as any) : Linking.openURL(t.url!)}
              style={s.tile}
              testID={`tile-${t.key}`}
            >
              <Icon name={t.icon} size={32} color="#F5A623" />
              <Text style={s.tileTxt}>{t.label}</Text>
            </Pressable>
          ))}
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
  playerCard: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,166,35,0.25)" },
  pcName: { color: "#F0F0F5", fontSize: 18, fontWeight: "800", textAlign: "right" },
  pcCode: { color: "#888899", fontSize: 12, marginTop: 4, textAlign: "right" },
  pcAvatar: { width: 56, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: "#F5A623", alignItems: "center", justifyContent: "center", backgroundColor: "#262630" },
  pcPts: { color: "#F5A623", fontSize: 40, fontWeight: "900", letterSpacing: 0.5 },
  pcLbl: { color: "#888899", fontSize: 12, marginTop: -4 },
  wheelCta: { flexDirection: "row-reverse", alignItems: "center", gap: 12, minHeight: 130, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,166,35,0.3)", padding: 18 },
  wheelTitle: { color: "#F0F0F5", fontSize: 26, fontWeight: "900", textAlign: "right" },
  wheelSub: { color: "#B0B0B8", fontSize: 12, textAlign: "right", marginTop: 6 },
  wheelLive: { color: "#F5A623", fontWeight: "800", fontSize: 13, marginTop: 8 },
  refCta: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#1A1A22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#33333F", gap: 12 },
  refTitle: { color: "#F0F0F5", fontSize: 16, fontWeight: "800", textAlign: "right" },
  refSub: { color: "#888899", fontSize: 12, textAlign: "right", marginTop: 6, lineHeight: 18 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  tile: { width: "31.5%", aspectRatio: 1, backgroundColor: "#1A1A22", borderRadius: 14, padding: 12, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(245,166,35,0.2)" },
  tileTxt: { color: "#F0F0F5", fontSize: 12, fontWeight: "700", textAlign: "center" },
  adminBar: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#F5A623", borderRadius: 14, padding: 14, justifyContent: "space-between", marginTop: 4 },
  adminTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 15, flex: 1, textAlign: "center" },
});
