import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";

export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={s.row}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Icon name="information-outline" size={14} color="#F5A623" /> : null}
      </View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  label: { color: "#F0F0F5", fontSize: 13, fontWeight: "800", textAlign: "right" },
  hint: { color: "#888899", fontSize: 11, textAlign: "right", marginTop: 3, lineHeight: 16 },
});
