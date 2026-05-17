import { useState, useEffect, useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { SymbolMethod } from "@/lib/types";
import { Fonts } from "@/constants/theme";

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
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 650,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 800 + index * 220);

    return () => clearTimeout(timeout);
  }, [flipAnim, index]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <Pressable
      testID={`symbol-card-${symbol.id}`}
      accessibilityLabel={`symbol-card-${symbol.id}`}
      onPress={() => {
        if (!isRevealed || isSelected) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect();
      }}
      disabled={!isRevealed || isSelected}
      style={({ pressed }) => [
        styles.cardShell,
        {
          opacity: isSelected ? 1 : pressed ? 0.9 : 1,
          transform: [{ scale: isSelected ? 1.01 : pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.cardFrame}>
        <Animated.View
          style={[
            styles.cardFace,
            {
              transform: [{ rotateY: frontRotate }],
              backgroundColor: colors.surface + "ED",
              borderColor: colors.primary + "55",
            },
          ]}
        >
          <RitualOrnament variant="eye" />
          <Text style={[styles.faceHint, { color: colors.primary }]}>Chạm để lật</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              transform: [{ rotateY: backRotate }],
              backgroundColor: isSelected ? colors.primary + "E6" : colors.surface + "F2",
              borderColor: isSelected ? colors.primary + "AA" : colors.border + "88",
            },
          ]}
        >
          <Text style={[styles.symbolTitle, { color: isSelected ? colors.background : colors.foreground, fontFamily: Fonts.serif }]}>
            {symbol.display_name}
          </Text>
          {symbol.flavor_text ? (
            <Text style={[styles.symbolFlavor, { color: isSelected ? colors.background + "CC" : colors.muted }]}>
              {symbol.flavor_text}
            </Text>
          ) : null}
          <Text style={[styles.symbolGlyph, { color: isSelected ? colors.background + "AA" : colors.primary }]}>✦</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default function WildcardScreen() {
  const { session, chooseSymbol, selectedSymbolId } = useReading();
  const router = useRouter();
  const colors = useColors();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsRevealed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1100);
    return () => clearTimeout(timeout);
  }, []);

  const handleAutoChoose = useCallback(async () => {
    if (!session || isAutoSelecting || selectedSymbolId) return;
    setIsAutoSelecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const randomIndex = Math.floor(Math.random() * session.symbols.length);
      await chooseSymbol(session.symbols[randomIndex].id, SymbolMethod.Auto);
      router.push("/reading/ritual");
    } catch (error) {
      console.error("Failed to auto choose:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAutoSelecting(false);
    }
  }, [chooseSymbol, isAutoSelecting, router, selectedSymbolId, session]);

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
  }, [handleAutoChoose, isAutoSelecting, isRevealed, selectedSymbolId]);

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
        setIsAutoSelecting(false);
      }
    },
    [chooseSymbol, isAutoSelecting, router, session],
  );

  if (!session) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-muted">Đang tải...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pb-6">
      <View style={styles.screen}>
        <View style={styles.header}>
          <RitualOrnament variant="line" />
          <Text
            testID="reading-wildcard-title"
            style={[styles.headerTitle, { color: colors.foreground, fontFamily: Fonts.serif }]}
          >
            Chọn một biểu tượng
          </Text>
          <Text style={[styles.headerMeta, { color: colors.muted }]}>
            {session.theme.name} • {session.symbols.length} dấu hiệu đang chờ bạn
          </Text>
        </View>

        <View style={styles.cardsRow}>
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

        <View style={styles.footer}>
          {isRevealed && !selectedSymbolId ? (
            <>
              <Text style={[styles.autoText, { color: colors.muted }]}>Tự động chọn sau {countdown}s</Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.border + "44" }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(countdown / 5) * 100}%` }]} />
              </View>

              <Pressable
                testID="reading-wildcard-auto"
                accessibilityLabel="reading-wildcard-auto"
                onPress={handleAutoChoose}
                disabled={isAutoSelecting}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surface + "E6",
                    borderColor: colors.primary + "66",
                    opacity: isAutoSelecting ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>
                  {isAutoSelecting ? "Đang chọn..." : "Để vũ trụ chọn"}
                </Text>
              </Pressable>
            </>
          ) : null}

          {selectedSymbolId ? (
            <Text style={[styles.autoText, { color: colors.primary }]}>Đang mở lá bài...</Text>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
  },
  header: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 30,
    textAlign: "center",
  },
  headerMeta: {
    fontSize: 13,
    textAlign: "center",
  },
  cardsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardShell: {
    flex: 1,
    maxWidth: 124,
  },
  cardFrame: {
    aspectRatio: 0.66,
    position: "relative",
  },
  cardFace: {
    position: "absolute",
    inset: 0,
    borderRadius: 22,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 18,
    gap: 12,
  },
  cardBack: {
    justifyContent: "space-between",
  },
  faceHint: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  symbolTitle: {
    fontSize: 24,
    textAlign: "center",
  },
  symbolFlavor: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  symbolGlyph: {
    fontSize: 16,
  },
  footer: {
    alignItems: "center",
    gap: 12,
    paddingTop: 20,
    paddingBottom: 10,
  },
  autoText: {
    fontSize: 13,
  },
  progressTrack: {
    width: 140,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  secondaryButton: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
