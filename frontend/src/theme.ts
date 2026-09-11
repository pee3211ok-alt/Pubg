import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0D0D12",
  onSurface: "#F0F0F5",
  surfaceSecondary: "#1A1A22",
  onSurfaceSecondary: "#D0D0D8",
  surfaceTertiary: "#262630",
  onSurfaceTertiary: "#B0B0B8",
  surfaceInverse: "#E5E5E8",
  onSurfaceInverse: "#0D0D12",
  muted: "#888899",

  brand: "#F5A623",
  onBrand: "#0D0D12",
  brandPrimary: "#F5A623",
  onBrandPrimary: "#0D0D12",
  brandSecondary: "#FF5722",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#4B5320",
  onBrandTertiary: "#FFFFFF",

  success: "#00E676",
  onSuccess: "#000000",
  warning: "#FFD700",
  onWarning: "#000000",
  error: "#FF1744",
  onError: "#FFFFFF",
  info: "#2979FF",
  onInfo: "#FFFFFF",

  border: "#33333F",
  borderStrong: "#555566",
  divider: "#2A2A35",

  // Rarity glow colors
  rarityCommon: "#9E9E9E",
  rarityRare: "#00BFA5",
  rarityEpic: "#8E24AA",
  rarityLegendary: "#FFD700",
};

export type ThemeColors = typeof dark;
export const defaultScheme = "dark" satisfies ColorScheme;
export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}
setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  useColorScheme();
  return { scheme: "dark", colors: themes.dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const rarityColor = (r: string) => {
  const m: Record<string, string> = {
    common: dark.rarityCommon,
    rare: dark.rarityRare,
    epic: dark.rarityEpic,
    legendary: dark.rarityLegendary,
  };
  return m[r?.toLowerCase()] || dark.rarityCommon;
};

export const rarityLabelAr = (r: string) => ({
  common: "عادية",
  rare: "نادرة",
  epic: "ملحمية",
  legendary: "أسطورية",
})[r?.toLowerCase()] || "عادية";
