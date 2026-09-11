import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, Easing } from "react-native-reanimated";
import Icon from "@react-native-vector-icons/material-design-icons";

type Spark = { top: number; left: number; delay: number; size: number };

function Sparkle({ spark }: { spark: Spark }) {
  const o = useSharedValue(0);
  const sc = useSharedValue(0.6);
  useEffect(() => {
    o.value = withDelay(spark.delay, withRepeat(withSequence(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
    ), -1, false));
    sc.value = withDelay(spark.delay, withRepeat(withSequence(
      withTiming(1.4, { duration: 700 }),
      withTiming(0.6, { duration: 900 }),
    ), -1, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", top: spark.top, left: spark.left }, st]}>
      <Icon name="star-four-points" size={spark.size} color="#F5A623" />
    </Animated.View>
  );
}

export function Sparkles({ count = 14, area = { width: 340, height: 380 } }: { count?: number; area?: { width: number; height: number } }) {
  const sparks: Spark[] = React.useMemo(() =>
    Array.from({ length: count }).map(() => ({
      top: Math.random() * (area.height - 20),
      left: Math.random() * (area.width - 20),
      delay: Math.floor(Math.random() * 2200),
      size: 6 + Math.floor(Math.random() * 10),
    })), [count, area.width, area.height]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: area.width, height: area.height }]}>
      {sparks.map((sp, i) => <Sparkle key={i} spark={sp} />)}
    </View>
  );
}
