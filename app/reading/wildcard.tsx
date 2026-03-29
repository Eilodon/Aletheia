import { useState, useEffect, useCallback, useRef } from "react";
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
  const animatedValue = useRef(new Animated.Value(0)).current;
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
    <Pressable onPress={handlePress} className="flex-1 mx-1" disabled={!isRevealed || isSelected}>
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
          className="rounded-3xl p-4 justify-between"
        >
          <View
            className="absolute inset-0 rounded-3xl"
            style={{
              backgroundColor: isSelected ? colors.primary : colors.surface,
              opacity: isSelected ? 1 : 0.95,
              borderWidth: 1,
              borderColor: isSelected ? colors.primary : colors.border + "50",
            }}
          />
          {/* Decorative corner */}
          <View style={{ alignItems: "center", paddingTop: 12 }}>
            <Text style={{ color: isSelected ? "rgba(255,255,255,0.5)" : colors.muted, fontSize: 12 }}>✦</Text>
          </View>
          <View className="flex-1 justify-center items-center px-2">
            <Text
              className="text-3xl font-bold text-center"
              style={{ color: isSelected ? "#FFFFFF" : colors.foreground }}
            >
              {symbol.display_name}
            </Text>
          </View>
          {symbol.flavor_text && (
            <Text
              className="text-xs text-center italic"
              style={{ color: isSelected ? "rgba(255,255,255,0.7)" : colors.muted, paddingBottom: 12 }}
            >
              {symbol.flavor_text}
            </Text>
          )}
        </Animated.View>

        {/* Front of card (shown initially) - Mystical card back */}
        <Animated.View
          style={{
            transform: [{ rotateY: frontInterpolate }],
            backfaceVisibility: "hidden",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
          className="rounded-3xl justify-center items-center"
        >
          <View
            className="absolute inset-0 rounded-3xl"
            style={{
              backgroundColor: colors.surface + "CC",
              borderWidth: 1,
              borderColor: colors.primary + "30",
            }}
          />
          {/* Mystical pattern */}
          <View style={{ position: "absolute", top: 20, opacity: 0.3 }}>
            <Text style={{ color: colors.primary, fontSize: 24 }}>✦</Text>
          </View>
          <View style={{ position: "absolute", bottom: 20, opacity: 0.3 }}>
            <Text style={{ color: colors.primary, fontSize: 24 }}>✦</Text>
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 36, opacity: 0.6 }}>✦</Text>
            <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>CHẠM ĐỂ LẬT</Text>
          </View>
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

  // Handle auto-select (surrender to the universe)
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

  // Auto-select countdown - shows surrender option
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
  }, [isRevealed, isAutoSelecting, selectedSymbolId, handleAutoChoose]);

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
