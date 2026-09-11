import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { LogBox, View, ActivityIndicator, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth-context";
import { api } from "@/src/api";

LogBox.ignoreAllLogs(true);
WebBrowser.maybeCompleteAuthSession();

const processedSessionIds = new Set<string>();

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function Gate() {
  const { user, loading, signInWithToken } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Deep-link session_id handler
  useEffect(() => {
    let sub: any;
    const handle = async (url: string | null) => {
      const sid = extractSessionId(url);
      if (!sid || processedSessionIds.has(sid)) return;
      processedSessionIds.add(sid);
      try {
        const res = await api("/api/auth/session", { method: "POST", body: JSON.stringify({ session_id: sid }) });
        if (res?.session_token) {
          await signInWithToken(res.session_token);
          if (Platform.OS === "web" && typeof window !== "undefined") {
            const clean = window.location.pathname;
            window.history.replaceState(window.history.state, "", clean);
          }
        }
      } catch {}
    };
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        handle(window.location.href);
      }
    } else {
      Linking.getInitialURL().then(handle);
      sub = Linking.addEventListener("url", (e) => handle(e.url));
    }
    return () => { if (sub) sub.remove(); };
  }, [signInWithToken]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "login";
    if (user && inAuth) {
      // Just logged in — send to subscribe if needed, else home
      const needsSub = !(user.subscribed_channels?.length);
      router.replace(needsSub ? "/subscribe" : "/(tabs)/home");
    }
    // No forced redirect to /login when user is null — allow guest browsing.
    // Protected actions (spin, purchase, subscribe verify) each redirect themselves.
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D12", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0D0D12" } }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0D0D12" }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Gate />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
