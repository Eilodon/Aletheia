import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SymbolMethod, ReadingState } from "@/lib/types";
import * as Haptics from "expo-haptics";

// Card flip animation component
function SymbolCard({
  symbol,
  index,
  isRevealed,
  isSelected,
  onSelect,
}: {
  symbol: { id: string; display_name: string; flavor_text?: string };
  index: number;
  isRevealed: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const colors = useColors();
  const animatedValue = new Animated.Value(0);
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  useEffect(() => {
    // Staggered flip animation
    const delay = index * 200;
    const timeout = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 180,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [index]);

  const handlePress = () => {
    if (!isRevealed || isSelected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Pressable onPress={handlePress} className="flex-1 mx-2" disabled={!isRevealed || isSelected}>
      <View className="aspect-[2/3] relative">
        {/* Back of card (hidden initially, shown after flip) */}
        <Animated.View
          style={{
            transform: [{ rotateY: backInterpolate }],
            backfaceVisibility: "hidden",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
          className="rounded-2xl p-4 justify-between"
        >
          <View
            className="absolute inset-0 rounded-2xl"
            style={{
              backgroundColor: isSelected ? colors.primary : "#1F2937",
              opacity: isSelected ? 1 : 0.9,
            }}
          />
          <View className="flex-1 justify-center items-center">
            <Text
              className="text-3xl font-bold text-center"
              style={{ color: isSelected ? "white" : "#F3F4F6" }}
            >
              {symbol.display_name}
            </Text>
          </View>
          {symbol.flavor_text && (
            <Text
              className="text-xs text-center italic"
              style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}
            >
              {symbol.flavor_text}
            </Text>
          )}
        </Animated.View>

        {/* Front of card (shown initially) */}
        <Animated.View
          style={{
            transform: [{ rotateY: frontInterpolate }],
            backfaceVisibility: "hidden",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
          className="rounded-2xl bg-primary/20 border-2 border-primary/30 justify-center items-center"
        >
          <Text className="text-4xl opacity-50">✦</Text>
          <Text className="text-xs text-muted mt-2">Chạm để lật</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default function WildcardScreen() {
  const { session, currentState, chooseSymbol, selectedSymbolId } = useReading();
  const colors = useColors();
  const router = useRouter();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Auto-reveal cards after delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsRevealed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-select countdown
  useEffect(() => {
    if (!isRevealed || isAutoSelecting || selectedSymbolId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAutoChoose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, isAutoSelecting, selectedSymbolId]);

  const handleSelect = useCallback(
    async (symbolId: string) => {
      if (!session || isAutoSelecting) return;

      setIsAutoSelecting(true);
      try {
        await chooseSymbol(symbolId, SymbolMethod.Manual);
        router.push("/reading/ritual");
      } catch (error) {
        console.error("Failed to choose symbol:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsAutoSelecting(false);
      }
    },
    [session, chooseSymbol, router, isAutoSelecting]
  );

  const handleAutoChoose = useCallback(async () => {
    if (!session || isAutoSelecting || selectedSymbolId) return;

    setIsAutoSelecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Pick random symbol
      const randomIndex = Math.floor(Math.random() * session.symbols.length);
      const randomSymbol = session.symbols[randomIndex];
      await chooseSymbol(randomSymbol.id, SymbolMethod.Auto);
      router.push("/reading/ritual");
    } catch (error) {
      console.error("Failed to auto choose:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAutoSelecting(false);
    }
  }, [session, chooseSymbol, router, isAutoSelecting, selectedSymbolId]);

  if (!session) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-muted">Đang tải...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <View className="flex-1">
        {/* Header */}
        <View className="items-center gap-2 pt-4 pb-8">
          <Text className="text-xl font-semibold text-foreground text-center">
            Chọn một biểu tượng
          </Text>
          <Text className="text-sm text-muted text-center">
            {session.theme.name} — {session.symbols.length} lá bài đang chờ
          </Text>
        </View>

        {/* Cards */}
        <View className="flex-1 flex-row items-center justify-center px-2">
          {session.symbols.map((symbol, index) => (
            <SymbolCard
              key={symbol.id}
              symbol={symbol}
              index={index}
              isRevealed={isRevealed}
              isSelected={selectedSymbolId === symbol.id}
              onSelect={() => handleSelect(symbol.id)}
            />
          ))}
        </View>

        {/* Auto-choose option */}
        <View className="items-center gap-4 pb-8 pt-4">
          {isRevealed && !selectedSymbolId && (
            <>
              <View className="items-center">
                <Text className="text-sm text-muted">
                  Tự động chọn sau {countdown}s
                </Text>
                <View
                  className="w-32 h-1 bg-muted/30 rounded-full mt-2 overflow-hidden"
                >
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(countdown / 5) * 100}%` }}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleAutoChoose}
                disabled={isAutoSelecting}
                className="py-3 px-6 rounded-full border border-primary/30"
              >
                <Text className="text-sm text-primary font-medium">
                  {isAutoSelecting ? "Đang chọn..." : "Để vũ trụ chọn"}
                </Text>
              </Pressable>
            </>
          )}

          {selectedSymbolId && (
            <Text className="text-sm text-primary font-medium">
              Đang mở lá bài...
            </Text>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
