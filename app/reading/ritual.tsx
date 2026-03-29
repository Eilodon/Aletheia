import { useEffect } from "react";
import { View, Text, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

export default function RitualScreen() {
  const { passage } = useReading();
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Haptic feedback for ritual start
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: (x) => x * x * (3 - 2 * x), // Smooth ease-in-out
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to passage after animation
    const timeout = setTimeout(() => {
      router.replace("/reading/passage");
    }, 1500);

    return () => clearTimeout(timeout);
  }, [fadeAnim, scaleAnim, router]);

  return (
    <ScreenContainer className="justify-center items-center">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        className="items-center"
      >
        {/* Ritual animation visual */}
        <View className="w-32 h-32 rounded-full border-2 border-primary/30 items-center justify-center mb-8">
          <View className="w-24 h-24 rounded-full border border-primary/50 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
              <Text className="text-3xl">✦</Text>
            </View>
          </View>
        </View>

        <Text className="text-2xl font-light text-foreground mb-2">
          Đang lật...
        </Text>
        <Text className="text-sm text-muted text-center max-w-xs">
          {passage?.reference || "Một đoạn trích đang chờ bạn"}
        </Text>
      </Animated.View>
    </ScreenContainer>
  );
}
