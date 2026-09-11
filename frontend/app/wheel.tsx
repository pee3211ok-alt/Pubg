import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform, Dimensions, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Path, Text as SvgText, Defs, LinearGradient as SvgLG, Stop, RadialGradient, Ellipse } from "react-native-svg";

import { PointsHeader } from "@/src/components/points-header";
import { Sparkles } from "@/src/components/sparkles";
import { api, fileUrl } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { useRequireAuth } from "@/src/use-require-auth";
import { rarityColor, rarityLabelAr } from "@/src/theme";

type Prize = { prize_id: string; name: string; rarity: string; weight: number; prize_type: string; points_value: number; description?: string; image_url?: string };

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
          <Icon name="clock-fast" size={16} color="#F5A623" />
          <Text style={s.timerLbl}>{user ? "الوقت المتبقي:" : "سجّل الدخول للف العجلة —"}</Text>
          <Text style={s.timerVal}>{!user ? "مجاناً كل 24 ساعة 🔥" : (status?.can_spin ? "متاحة الآن 🔥" : cooldown || "...")}</Text>
        </View>

        <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE + 30, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
          {/* Sparkles overlay behind wheel */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center" }}>
            <Sparkles count={22} area={{ width: WHEEL_SIZE, height: WHEEL_SIZE + 30 }} />
          </View>
          {/* Pointer */}
          <View style={s.pointer}>
            <Icon name="triangle" size={28} color="#F5A623" style={{ transform: [{ rotate: "180deg" }] }} />
          </View>
          <Animated.View style={[wheelStyle, { position: "absolute", top: 30, width: WHEEL_SIZE, height: WHEEL_SIZE }]}>
            {/* SVG: golden ring + slices */}
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
              <Defs>
                <SvgLG id="ring" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFD26B" />
                  <Stop offset="1" stopColor="#F5A623" />
                </SvgLG>
              </Defs>
              {/* Outer gold ring */}
              <Circle cx={CENTER} cy={CENTER} r={R + 3} fill="url(#ring)" />
              <Circle cx={CENTER} cy={CENTER} r={R - 2} fill="#0D0D12" />
              {/* Slice separators — gold radial lines */}
              {slices.map((sl) => (
                <G key={sl.prize.prize_id}>
                  <Path d={slicePath(sl.start, sl.end)} fill="transparent" stroke="#F5A623" strokeWidth={1.5} strokeOpacity={0.75} />
                </G>
              ))}
              {/* Center circle */}
              <Circle cx={CENTER} cy={CENTER} r={54} fill="#F5A623" opacity={0.15} />
              <Circle cx={CENTER} cy={CENTER} r={48} fill="#0D0D12" stroke="#F5A623" strokeWidth={2.5} />
            </Svg>

            {/* Per-slice content: circular BUBBLE (image + prize name inside) — no rotation, text stays readable */}
            {slices.map((sl) => {
              const midRad = (sl.mid - 90) * Math.PI / 180;
              const discR = R * 0.60;
              const bubbleSize = 72;
              const cx = CENTER + discR * Math.cos(midRad);
              const cy = CENTER + discR * Math.sin(midRad);
              const rc = rarityColor(sl.prize.rarity);
              return (
                <View
                  key={sl.prize.prize_id + "-slice"}
                  style={{
                    position: "absolute",
                    left: cx - bubbleSize / 2,
                    top: cy - bubbleSize / 2,
                    width: bubbleSize,
                    height: bubbleSize,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={[s.bubble, { borderColor: rc }]}>
                    {sl.prize.image_url ? (
                      <>
                        <Image source={{ uri: fileUrl(sl.prize.image_url) }} style={s.bubbleImg} resizeMode="cover" />
                        <View style={s.bubbleImgOverlay} />
                        <Text style={s.bubbleImgText} numberOfLines={2}>
                          {sl.prize.name}
                        </Text>
                      </>
                    ) : (
                      <Text style={[s.bubbleText, { color: rc }]} numberOfLines={2}>
                        {sl.prize.name}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Animated.View>
          <Pressable onPress={spin} disabled={spinning || (!!user && !status?.can_spin)} style={s.spinBtn} testID="spin-btn">
            <Text style={s.spinTxt}>{spinning ? "..." : "أدر"}</Text>
          </Pressable>
        </View>

        {/* Big "Spin Now" button below the wheel */}
        <Pressable onPress={spin} disabled={spinning || (!!user && !status?.can_spin)} testID="spin-big-btn" style={s.bigSpinWrap}>
          <View style={[s.bigSpin, (spinning || (!!user && !status?.can_spin)) && { opacity: 0.6 }]}>
            <Icon name="ferris-wheel" size={22} color="#0D0D12" />
            <Text style={s.bigSpinTxt}>{spinning ? "جاري الدوران..." : "أدر العجلة الآن"}</Text>
          </View>
        </Pressable>

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
              {p.image_url ? (
                <Image source={{ uri: fileUrl(p.image_url) }} style={s.prizeThumb} />
              ) : (
                <View style={[s.prizeThumb, { alignItems: "center", justifyContent: "center", backgroundColor: "#262630" }]}>
                  <Icon name="gift" size={20} color={rarityColor(p.rarity)} />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {result && (
        <Pressable style={s.resultOverlay} onPress={() => setResult(null)} testID="wheel-result-overlay">
          <View style={[s.resultCard, { borderColor: rarityColor(result.rarity) }]}>
            {result.image_url ? (
              <Image source={{ uri: fileUrl(result.image_url) }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: rarityColor(result.rarity) }} />
            ) : (
              <Icon name="trophy" size={64} color={rarityColor(result.rarity)} />
            )}
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
  timerCard: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#1A1A22", borderWidth: 1, borderColor: "#33333F", alignSelf: "center" },
  timerLbl: { color: "#B0B0B8", fontSize: 12, fontWeight: "700" },
  timerVal: { color: "#F5A623", fontSize: 13, fontWeight: "900" },
  pointer: { position: "absolute", top: 4, zIndex: 5 },
  bubble: { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#0D0D12" },
  bubbleImg: { position: "absolute", width: "100%", height: "100%", borderRadius: 34 },
  bubbleImgOverlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 34 },
  bubbleImgText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", textAlign: "center", paddingHorizontal: 4 },
  bubbleText: { fontSize: 12, fontWeight: "900", textAlign: "center", paddingHorizontal: 4 },
  bigSpinWrap: { width: "100%", marginTop: 24 },
  bigSpin: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F5A623", borderRadius: 14, paddingVertical: 14, borderWidth: 2, borderColor: "#FFC061" },
  bigSpinTxt: { color: "#0D0D12", fontWeight: "900", fontSize: 16 },
  disc: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#0D0D12" },
  discImg: { width: "100%", height: "100%", borderRadius: 22 },
  sliceLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", textAlign: "center", marginTop: 4, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 }, maxWidth: 80 },
  spinBtn: { position: "absolute", top: 30 + CENTER - 40, width: 80, height: 80, borderRadius: 40, backgroundColor: "#F5A623", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#0D0D12" },
  spinTxt: { color: "#0D0D12", fontSize: 22, fontWeight: "900" },
  pillsRow: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 24 },
  pill: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1A1A22" },
  pillL: { fontSize: 12, fontWeight: "800" },
  pillP: { color: "#F0F0F5", fontSize: 12, fontWeight: "800" },
  section: { alignSelf: "flex-end", color: "#F0F0F5", fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 12 },
  prizeThumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: "#F5A623" },
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
