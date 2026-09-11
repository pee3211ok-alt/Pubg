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
      <Tabs.Screen name="home" options={{
        title: "الرئيسية",
        tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="store" options={{
        title: "المتجر",
        tabBarIcon: ({ color, size }) => <Icon name="cart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="rewards" options={{
        title: "جوائزي",
        tabBarIcon: ({ color, size }) => <Icon name="gift" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "الملف",
        tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
      }} />
      <Tabs.Screen name="more" options={{
        title: "المزيد",
        tabBarIcon: ({ color, size }) => <Icon name="dots-horizontal" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
