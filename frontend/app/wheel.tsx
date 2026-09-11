import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Path, Text as SvgText, Defs, LinearGradient as SvgLG, Stop, RadialGradient, Ellipse } from "react-native-svg";

import { PointsHeader } from "@/src/components/points-header";
import { Sparkles } from "@/src/components/sparkles";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { useRequireAuth } from "@/src/use-require-auth";
import { rarityColor, rarityLabelAr } from "@/src/theme";

type Prize = { prize_id: string; name: string; rarity: string; weight: number; prize_type: string; points_value: number; description?: string };

const { width } = Dimensions.get("window");
const WHEEL_SIZE = Math.min(width - 40, 340);
const CENTER = WHEEL_SIZE / 2;
const R = CENTER - 6;

const SLICE_COLORS = ["#1A1A22", "#262630"]; // alternating base slices

function polarToXY(angle: number, r: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function slicePath(startAngle: number, endAngle: number) {
  const start = polarToXY(endAngle, R);
  const end = polarToXY(startAngle, R);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${R} ${R} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export default function Wheel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const requireAuth = useRequireAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [status, setStatus] = useState<{ can_spin: boolean; next_spin_at?: string | null; cooldown_hours: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState("");
  const rotation = useSharedValue(0);

  const load = async () => {
    setPrizes(await api("/api/wheel/prizes"));
    if (user) {
      try { setStatus(await api("/api/wheel/status")); } catch {}
    } else {
      setStatus({ can_spin: true, next_spin_at: null, cooldown_hours: 24 });
    }
  };
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const tick = () => {
      if (status?.next_spin_at && !status.can_spin) {
        const diff = new Date(status.next_spin_at).getTime() - Date.now();
        if (diff <= 0) { setCooldown("متاح الآن"); load(); return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCooldown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status]);

  const slices = useMemo(() => {
    if (!prizes.length) return [];
    const step = 360 / prizes.length;
    return prizes.map((p, i) => ({ prize: p, start: i * step, end: (i + 1) * step, mid: i * step + step / 2 }));
  }, [prizes]);

  const spin = async () => {
    if (spinning) return;
    requireAuth("للف عجلة الحظ والفوز بجوائز PUBG.", async () => {
      if (!status?.can_spin) return;
      setSpinning(true);
      try {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const res = await api("/api/wheel/spin", { method: "POST" });
        const idx = prizes.findIndex((p) => p.prize_id === res.prize_id);
        const step = 360 / prizes.length;
        const targetBase = (360 - (idx * step + step / 2)) % 360;
        const spins = 6;
        const target = spins * 360 + targetBase;
        rotation.value = withTiming(target, { duration: 4800, easing: Easing.out(Easing.cubic) }, (fin) => {
          if (fin) runOnJS(finishSpin)(res);
        });
      } catch (e: any) {
        setSpinning(false);
        Alert.alert("خطأ", e?.message || "فشل الدوران");
      }
    });
  };

  const finishSpin = async (res: any) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(res);
    setSpinning(false);
    await refresh();
    // Reset rotation for next spin visually
    setTimeout(() => {
      rotation.value = rotation.value % 360;
      load();
    }, 300);
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D12", paddingTop: insets.top }} testID="wheel-screen">
      <PointsHeader title="عجلة الحظ" />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 40 }}>
        <View style={s.timerCard}>
          <Text style={s.timerLbl}>{user ? "الوقت المتبقي للدوران القادم" : "سجّل الدخول لتدوير العجلة"}</Text>
          <Text style={s.timerVal}>{!user ? "🔥 مجاناً كل 24 ساعة" : (status?.can_spin ? "متاحة الآن 🔥" : cooldown || "...")}</Text>
        </View>

        <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE + 30, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
          {/* Sparkles overlay behind wheel */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center" }}>
            <Sparkles count={20} area={{ width: WHEEL_SIZE, height: WHEEL_SIZE + 30 }} />
          </View>
          {/* Pointer */}
          <View style={s.pointer}>
            <Icon name="triangle" size={28} color="#F5A623" style={{ transform: [{ rotate: "180deg" }] }} />
          </View>
          <Animated.View style={[wheelStyle, { position: "absolute", top: 30 }]}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
              <Defs>
                <SvgLG id="ring" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#F5A623" />
                  <Stop offset="1" stopColor="#FF5722" />
                </SvgLG>
                <RadialGradient id="disc" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#3a2a4a" />
                  <Stop offset="1" stopColor="#0a0a0f" />
                </RadialGradient>
              </Defs>
              <Circle cx={CENTER} cy={CENTER} r={R + 3} fill="url(#ring)" />
              {slices.map((sl, i) => {
                const rc = rarityColor(sl.prize.rarity);
                const midRad = (sl.mid - 90) * Math.PI / 180;
                const discR = R * 0.62;
                const dx = CENTER + discR * Math.cos(midRad);
                const dy = CENTER + discR * Math.sin(midRad);
                return (
                  <G key={sl.prize.prize_id}>
                    <Path d={slicePath(sl.start, sl.end)} fill={SLICE_COLORS[i % 2]} stroke={rc} strokeWidth={1.5} />
                    {/* Prize disc (circular badge inside slice) */}
                    <Circle cx={dx} cy={dy} r={22} fill="url(#disc)" stroke={rc} strokeWidth={2} />
                    {/* Name below the disc */}
                    <G rotation={sl.mid} originX={CENTER} originY={CENTER}>
                      <SvgText
                        x={CENTER}
                        y={CENTER - R + 18}
                        fill={rc}
                        fontSize={11}
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {sl.prize.name.length > 12 ? sl.prize.name.slice(0, 10) + "…" : sl.prize.name}
                      </SvgText>
                    </G>
                  </G>
                );
              })}
              {/* Center circle */}
              <Circle cx={CENTER} cy={CENTER} r={48} fill="#F5A623" opacity={0.15} />
              <Circle cx={CENTER} cy={CENTER} r={44} fill="#0D0D12" stroke="#F5A623" strokeWidth={2} />
            </Svg>
            {/* Emoji-like icons on top of the disc (React Native icons over SVG) */}
            {slices.map((sl) => {
              const midRad = (sl.mid - 90) * Math.PI / 180;
              const discR = R * 0.62;
              const dx = CENTER + discR * Math.cos(midRad) - 14;
              const dy = CENTER + discR * Math.sin(midRad) - 14;
              const rc = rarityColor(sl.prize.rarity);
              const iconName = sl.prize.prize_type === "item" ? "package-variant-closed" : (sl.prize.rarity === "legendary" ? "trophy" : (sl.prize.rarity === "epic" ? "diamond-stone" : (sl.prize.rarity === "rare" ? "star-four-points" : "poker-chip")));
              return (
                <View key={sl.prize.prize_id + "-ic"} style={{ position: "absolute", left: dx, top: dy, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={iconName} size={22} color={rc} />
                </View>
              );
            })}
          </Animated.View>
          <Pressable onPress={spin} disabled={spinning || (!!user && !status?.can_spin)} style={s.spinBtn} testID="spin-btn">
            <Text style={s.spinTxt}>{spinning ? "..." : "أدر"}</Text>
          </Pressable>
        </View>

        <View style={s.pillsRow}>
          {[
            { l: "عادية", c: rarityColor("common"), p: "60%" },
            { l: "نادرة", c: rarityColor("rare"), p: "20%" },
            { l: "ملحمية", c: rarityColor("epic"), p: "15%" },
            { l: "أسطورية", c: rarityColor("legendary"), p: "5%" },
          ].map((r) => (
            <View key={r.l} style={[s.pill, { borderColor: r.c }]}>
              <Icon name="diamond-stone" size={14} color={r.c} />
              <Text style={[s.pillL, { color: r.c }]}>{r.l}</Text>
              <Text style={s.pillP}>{r.p}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>جوائز العجلة</Text>
        <View style={{ width: "100%" }}>
          {prizes.map((p) => (
            <View key={p.prize_id} style={s.prizeRow}>
              <Text style={[s.rar, { color: rarityColor(p.rarity), borderColor: rarityColor(p.rarity) }]}>{rarityLabelAr(p.rarity)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.prizeName}>{p.name}</Text>
                {p.description ? <Text style={s.prizeDesc}>{p.description}</Text> : null}
              </View>
              <View style={s.weightPill}>
                <Icon name="chart-donut" size={12} color="#F5A623" />
                <Text style={s.weightTxt}>{p.weight}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {result && (
        <Pressable style={s.resultOverlay} onPress={() => setResult(null)} testID="wheel-result-overlay">
          <View style={[s.resultCard, { borderColor: rarityColor(result.rarity) }]}>
            <Icon name="trophy" size={64} color={rarityColor(result.rarity)} />
            <Text style={s.resultTitle}>لقد ربحت!</Text>
            <Text style={[s.resultName, { color: rarityColor(result.rarity) }]}>{result.prize_name}</Text>
            {result.points_awarded > 0 && <Text style={s.resultPts}>+ {result.points_awarded} نقطة</Text>}
            <Pressable onPress={() => setResult(null)} style={s.resultBtn} testID="close-result-btn">
              <Text style={s.resultBtnTxt}>ممتاز</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  timerCard: { alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: "#1A1A22", borderWidth: 1, borderColor: "#33333F", width: "100%" },
  timerLbl: { color: "#B0B0B8", fontSize: 12 },
  timerVal: { color: "#F5A623", fontSize: 26, fontWeight: "900", letterSpacing: 3, marginTop: 4 },
  pointer: { position: "absolute", top: 4, zIndex: 5 },
  spinBtn: { position: "absolute", top: 30 + CENTER - 40, width: 80, height: 80, borderRadius: 40, backgroundColor: "#F5A623", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#0D0D12" },
  spinTxt: { color: "#0D0D12", fontSize: 22, fontWeight: "900" },
  pillsRow: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 24 },
  pill: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1A1A22" },
  pillL: { fontSize: 12, fontWeight: "800" },
  pillP: { color: "#F0F0F5", fontSize: 12, fontWeight: "800" },
  section: { alignSelf: "flex-end", color: "#F0F0F5", fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  prizeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#1A1A22", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#33333F" },
  prizeName: { color: "#F0F0F5", fontSize: 14, fontWeight: "800", textAlign: "right" },
  prizeDesc: { color: "#888899", fontSize: 11, textAlign: "right", marginTop: 2 },
  rar: { fontSize: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontWeight: "800" },
  weightPill: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: "#262630", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  weightTxt: { color: "#F5A623", fontSize: 12, fontWeight: "800" },
  resultOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 30 },
  resultCard: { backgroundColor: "#1A1A22", borderRadius: 24, padding: 30, alignItems: "center", borderWidth: 2, gap: 8, width: "100%", maxWidth: 340 },
  resultTitle: { color: "#F0F0F5", fontSize: 22, fontWeight: "900", marginTop: 8 },
  resultName: { fontSize: 26, fontWeight: "900", textAlign: "center", marginTop: 8 },
  resultPts: { color: "#00E676", fontSize: 18, fontWeight: "800", marginTop: 4 },
  resultBtn: { backgroundColor: "#F5A623", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, marginTop: 20 },
  resultBtnTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 15 },
});
