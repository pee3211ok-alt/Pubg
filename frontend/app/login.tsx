import React from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable, ScrollView, TextInput, Modal, Platform, Linking as RNLinking, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useState } from "react";

import { colors } from "@/src/theme";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";

const HERO_URL = "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&q=80";
const AUTH_BASE = "https://auth.emergentagent.com/";

export default function Login() {
  const { colors } = useTheme();
  const { signInWithToken, refresh } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onGoogle = async () => {
    setBusy(true);
    try {
      let redirect: string;
      if (Platform.OS === "web") {
        redirect = window.location.origin + "/";
        const url = `${AUTH_BASE}?redirect=${encodeURIComponent(redirect)}`;
        window.location.href = url;
        return;
      }
      redirect = Linking.createURL("");
      const url = `${AUTH_BASE}?redirect=${encodeURIComponent(redirect)}`;
      await WebBrowser.openAuthSessionAsync(url, redirect);
    } finally {
      setBusy(false);
    }
  };

  const onAdminLogin = async () => {
    setBusy(true);
    try {
      const res = await api("/api/auth/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (res?.session_token) {
        await signInWithToken(res.session_token);
      }
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "فشل تسجيل الدخول");
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }} testID="login-screen">
      <ImageBackground source={{ uri: HERO_URL }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover">
        <LinearGradient
          colors={["transparent", "rgba(13,13,18,0.65)", "rgba(13,13,18,0.98)"]}
          style={StyleSheet.absoluteFillObject as any}
          locations={[0, 0.55, 1]}
        />
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.logoWrap}>
            <LinearGradient colors={["#F5A623", "#FF5722"]} style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Icon name="crown" size={44} color="#F5A623" />
              </View>
            </LinearGradient>
            <Text style={styles.title}>هيبة</Text>
            <Text style={styles.subtitle}>HEEBA</Text>
            <Text style={styles.tagline}>PUBG REWARDS & LUCKY WHEEL</Text>
          </View>

          <BlurView intensity={30} tint="dark" style={styles.card}>
            <View style={styles.cardOverlay} />
            <Text style={styles.welcome}>مرحباً بك في هيبة</Text>
            <Text style={styles.welcomeSub}>منصة الجوائز والألعاب المتخصصة بببجي</Text>

            <Pressable testID="google-login-btn" onPress={onGoogle} disabled={busy} style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }]}>
              <Icon name="google" size={20} color="#0D0D12" />
              <Text style={styles.googleTxt}>تسجيل الدخول بواسطة Google</Text>
            </Pressable>

            <Pressable testID="admin-login-btn" onPress={() => setShowAdmin(true)} style={styles.adminLink}>
              <Icon name="shield-crown" size={16} color="#F5A623" />
              <Text style={styles.adminLinkTxt}>دخول الأدمن</Text>
            </Pressable>
          </BlurView>
        </View>
      </ScrollView>

      <Modal visible={showAdmin} transparent animationType="fade" onRequestClose={() => setShowAdmin(false)}>
        <View style={styles.modalWrap}>
          <BlurView intensity={40} tint="dark" style={styles.modalCard}>
            <View style={styles.cardOverlay} />
            <Text style={styles.modalTitle}>دخول الأدمن</Text>
            <TextInput
              testID="admin-email-input" style={styles.input} placeholder="Email"
              placeholderTextColor="#888899" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
            />
            <TextInput
              testID="admin-password-input" style={styles.input} placeholder="كلمة المرور"
              placeholderTextColor="#888899" value={password} onChangeText={setPassword}
              secureTextEntry
            />
            <Pressable testID="admin-submit-btn" onPress={onAdminLogin} disabled={busy} style={styles.googleBtn}>
              <Text style={styles.googleTxt}>{busy ? "..." : "دخول"}</Text>
            </Pressable>
            <Pressable onPress={() => setShowAdmin(false)}><Text style={styles.cancel}>إلغاء</Text></Pressable>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "flex-end", padding: 24, paddingBottom: 48 },
  top: { gap: 32 },
  logoWrap: { alignItems: "center", marginTop: 40 },
  logoRing: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoInner: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#0D0D12", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 44, color: "#F5A623", fontWeight: "900", letterSpacing: 2 },
  subtitle: { fontSize: 22, color: "#F0F0F5", fontWeight: "800", letterSpacing: 6, marginTop: -4 },
  tagline: { fontSize: 11, color: "#B0B0B8", letterSpacing: 3, marginTop: 6 },
  card: { borderRadius: 20, overflow: "hidden", padding: 20, borderWidth: 1, borderColor: "rgba(245,166,35,0.35)" },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(26,26,34,0.75)" },
  welcome: { color: "#F0F0F5", fontSize: 20, fontWeight: "800", textAlign: "center" },
  welcomeSub: { color: "#B0B0B8", fontSize: 13, textAlign: "center", marginTop: 6, marginBottom: 18 },
  googleBtn: { backgroundColor: "#F5A623", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  googleTxt: { color: "#0D0D12", fontSize: 15, fontWeight: "800" },
  adminLink: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 14 },
  adminLinkTxt: { color: "#F5A623", fontSize: 13, fontWeight: "700" },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 20, overflow: "hidden", padding: 24, borderWidth: 1, borderColor: "rgba(245,166,35,0.35)" },
  modalTitle: { color: "#F5A623", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#262630", color: "#F0F0F5", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#33333F", textAlign: "right" },
  cancel: { color: "#B0B0B8", textAlign: "center", marginTop: 14, fontSize: 13 },
});
