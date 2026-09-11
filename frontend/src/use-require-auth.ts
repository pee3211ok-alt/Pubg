import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";

/**
 * Returns a function that ensures the user is logged in and subscribed to
 * mandatory channels before performing a protected action (spin, purchase, etc).
 * On web, we redirect straight to /login (Alert.alert with buttons isn't rendered on RN Web).
 * On native, we show an Alert with cancel/login buttons.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const router = useRouter();
  return (msg: string, run: () => void | Promise<void>) => {
    if (!user) {
      if (Platform.OS === "web") {
        // On web the multi-button Alert doesn't render, so redirect directly.
        try {
          if (typeof window !== "undefined") window.alert(`${msg}\n\nيرجى تسجيل الدخول أولاً.`);
        } catch {}
        router.push("/login");
        return;
      }
      Alert.alert(
        "يتطلب تسجيل الدخول",
        `${msg}\n\nقم بتسجيل الدخول أولاً للمتابعة.`,
        [
          { text: "لاحقاً", style: "cancel" },
          { text: "تسجيل الدخول", onPress: () => router.push("/login") },
        ],
      );
      return;
    }
    if (!(user.subscribed_channels && user.subscribed_channels.length)) {
      if (Platform.OS === "web") {
        try {
          if (typeof window !== "undefined") window.alert("قبل استخدام هذه الميزة، اشترك في القنوات الإجبارية.");
        } catch {}
        router.push("/subscribe");
        return;
      }
      Alert.alert(
        "الاشتراك في القنوات",
        "قبل استخدام هذه الميزة، اشترك في القنوات الإجبارية.",
        [
          { text: "لاحقاً", style: "cancel" },
          { text: "اشترك الآن", onPress: () => router.push("/subscribe") },
        ],
      );
      return;
    }
    run();
  };
}
