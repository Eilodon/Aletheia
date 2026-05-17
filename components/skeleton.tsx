import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";

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
  const colors = useColors();
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
        width ? { width } : { flex: 1 },
        { height, borderRadius, backgroundColor: colors.surface + "D6", overflow: "hidden", borderWidth: 1, borderColor: colors.border + "44" },
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.primary,
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
  const colors = useColors();
  
  return (
    <View style={{
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.surface + "C0",
      borderWidth: 1,
      borderColor: colors.primary + "22",
      marginBottom: 12,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={80} height={16} />
        </View>
        <Skeleton width={40} height={20} borderRadius={10} />
      </View>

      <View style={{ gap: 8 }}>
        <Skeleton width={undefined} height={16} />
        <Skeleton width={undefined} height={16} />
        {lines > 2 && <Skeleton width={60} height={16} />}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 16 }}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} lines={index % 2 === 0 ? 3 : 2} />
      ))}
    </View>
  );
}
