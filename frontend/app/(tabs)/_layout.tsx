import { Tabs } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F5A623",
        tabBarInactiveTintColor: "#888899",
        tabBarStyle: {
          backgroundColor: "#0D0D12",
          borderTopColor: "#33333F",
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      {/* Order in RTL (right → left): home, store, rewards, notifications, profile */}
      <Tabs.Screen name="home" options={{
        title: "الرئيسية",
        tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="store" options={{
        title: "متجر الجوائز",
        tabBarIcon: ({ color, size }) => <Icon name="cart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="rewards" options={{
        title: "جوائزي",
        tabBarIcon: ({ color, size }) => <Icon name="package-variant-closed" size={size} color={color} />,
      }} />
      <Tabs.Screen name="notifications" options={{
        title: "الإشعارات",
        tabBarIcon: ({ color, size }) => <Icon name="bell" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "ملف اللاعب",
        tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
