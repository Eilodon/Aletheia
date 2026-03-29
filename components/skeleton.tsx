import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

interface SkeletonProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  isLoading?: boolean;
  className?: string;
}

export function Skeleton({
  width,
  height = 20,
  borderRadius = 8,
  isLoading = true,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) return;

    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim, isLoading]);

  if (!isLoading) return null;

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        width ? { width } : styles.flexible,
        { height, borderRadius, backgroundColor: "#374151", overflow: "hidden" },
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#6B7280",
          opacity,
          transform: [
            {
              translateX: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 200],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={80} height={16} />
        </View>
        <Skeleton width={40} height={20} borderRadius={10} />
      </View>

      <View style={styles.lines}>
        <Skeleton width={undefined} height={16} />
        <Skeleton width={undefined} height={16} />
        {lines > 2 && <Skeleton width={60} height={16} />}
      </View>

      <View style={styles.footer}>
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexible: { flex: 1 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(55, 65, 81, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.2)",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lines: { gap: 8 },
  lineWrapper: {},
  itemWrapper: {},
  footer: { flexDirection: "row", gap: 12, marginTop: 16 },
  list: { gap: 16 },
});
