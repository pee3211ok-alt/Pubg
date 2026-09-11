import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";

/**
 * Returns a function that ensures the user is logged in and subscribed to
 * mandatory channels before performing a protected action (spin, purchase, etc).
 * If not logged in — shows an alert and redirects to /login.
 * If logged in but not subscribed — redirects to /subscribe.
 * If OK — runs the callback.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const router = useRouter();
  return (msg: string, run: () => void | Promise<void>) => {
    if (!user) {
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
