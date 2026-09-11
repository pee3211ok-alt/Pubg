import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth-context";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (!(user.subscribed_channels && user.subscribed_channels.length)) return <Redirect href="/subscribe" />;
  return <Redirect href="/(tabs)/home" />;
}
