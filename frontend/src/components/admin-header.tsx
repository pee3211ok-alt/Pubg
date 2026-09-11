import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

export function AdminHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <Pressable onPress={() => router.back()} testID="admin-back-btn"><Icon name="chevron-right" size={26} color="#F5A623" /></Pressable>
      <Text style={s.title}>{title}</Text>
      <View>{right || <View style={{ width: 26 }} />}</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#33333F", backgroundColor: "#0D0D12" },
  title: { color: "#F5A623", fontSize: 17, fontWeight: "900" },
});
