import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth-context";

export default function Index() {
  const { loading } = useAuth();
  if (loading) return null;
  return <Redirect href="/(tabs)/home" />;
}
