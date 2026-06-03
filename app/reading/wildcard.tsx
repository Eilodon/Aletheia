import { useState, useEffect, useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { SymbolMethod } from "@/lib/types";
import { secureRandomIndex } from "@/lib/utils/random";
import { Fonts } from "@/constants/theme";
import { showToast } from "@/components/toast";
import { useStrings } from "@/lib/i18n";

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
  const s = useStrings();
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 800,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();
    }, 800 + index * 220);
    return () => clearTimeout(timeout);
  }, [flipAnim, index]);

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

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
        { opacity: isSelected ? 1 : pressed ? 0.88 : 1, transform: [{ scale: isSelected ? 1.025 : pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={styles.cardFrame}>
        <Animated.View
          style={[
            styles.cardFace,
            { transform: [{ rotateY: frontRotate }], backgroundColor: colors.surface + "D2", borderColor: colors.primary + "42" },
          ]}
        >
          <RitualOrnament variant="eye" />
          <Text style={[styles.faceHint, { color: colors.primary }]}>{s.wildcard.cardTapHint}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              transform: [{ rotateY: backRotate }],
              backgroundColor: isSelected ? colors.primary + "22" : colors.surface + "C8",
              borderColor: isSelected ? colors.primary + "AA" : colors.primary + "28",
              shadowColor: isSelected ? colors.primary : "transparent",
              shadowOpacity: isSelected ? 0.4 : 0,
              shadowRadius: 12,
              elevation: isSelected ? 8 : 0,
            },
          ]}
        >
          <Text style={[styles.symbolTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>
            {symbol.display_name}
          </Text>
          {symbol.flavor_text ? (
            <Text style={[styles.symbolFlavor, { color: isSelected ? colors.foreground : colors.muted }]}>
              {symbol.flavor_text}
            </Text>
          ) : null}
          <Text style={[styles.symbolGlyph, { color: colors.primary }]}>✦</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default function WildcardScreen() {
  const { session, chooseSymbol, selectedSymbolId } = useReading();
  const router = useRouter();
  const colors = useColors();
  const s = useStrings();
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
      const randomIndex = secureRandomIndex(session.symbols.length);
      await chooseSymbol(session.symbols[randomIndex].id, SymbolMethod.Auto);
      router.push("/reading/ritual");
    } catch (error) {
      console.error("Failed to auto choose:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("error", s.wildcard.error);
      setIsAutoSelecting(false);
    }
  }, [chooseSymbol, isAutoSelecting, router, s, selectedSymbolId, session]);

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
        showToast("error", s.wildcard.error);
        setIsAutoSelecting(false);
      }
    },
    [chooseSymbol, isAutoSelecting, router, s, session],
  );

  if (!session) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-muted">{s.common.loading}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pb-6">
      <View style={styles.screen}>
        <View style={[styles.deckHalo, { backgroundColor: colors.primary + "0D" }]} />

        <View style={styles.header}>
          <RitualOrnament variant="line" />
          <Text testID="reading-wildcard-title" style={[styles.headerTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>
            {s.wildcard.title}
          </Text>
          <Text style={[styles.headerMeta, { color: colors.muted }]}>
            {session.theme.name} • {session.symbols.length} {s.wildcard.metaSuffix}
          </Text>
          <Text style={[styles.headerHint, { color: colors.primary }]}>{s.wildcard.hint}</Text>
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
              <Text style={[styles.autoText, { color: colors.muted }]}>
                {s.wildcard.autoCountdown(countdown)}
              </Text>
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
                  { backgroundColor: colors.primary + "15", borderColor: colors.primary + "60", opacity: isAutoSelecting ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>
                  {isAutoSelecting ? s.wildcard.autoButtonLoading : s.wildcard.autoButton}
                </Text>
              </Pressable>
            </>
          ) : null}

          {selectedSymbolId ? (
            <Text style={[styles.autoText, { color: colors.primary }]}>{s.wildcard.selectedText}</Text>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 18, position: "relative" },
  deckHalo: { position: "absolute", width: 320, height: 320, borderRadius: 160, alignSelf: "center", top: 88 },
  header: { alignItems: "center", gap: 10, paddingBottom: 28 },
  headerTitle: { fontSize: 30, textAlign: "center" },
  headerMeta: { fontSize: 13, textAlign: "center", fontFamily: Fonts.bodyItalic },
  headerHint: { fontSize: 10, letterSpacing: 2.6, textTransform: "uppercase" },
  cardsRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  cardShell: { flex: 1, maxWidth: 124 },
  cardFrame: { aspectRatio: 0.66, position: "relative" },
  cardFace: {
    position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1.2,
    alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden",
    paddingHorizontal: 12, paddingVertical: 18, gap: 12,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 7,
  },
  cardBack: { justifyContent: "space-between" },
  faceHint: { fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  symbolTitle: { fontSize: 21, textAlign: "center" },
  symbolFlavor: { fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: Fonts.bodyItalic },
  symbolGlyph: { fontSize: 16 },
  footer: { alignItems: "center", gap: 12, paddingTop: 20, paddingBottom: 10 },
  autoText: { fontSize: 13, fontFamily: Fonts.bodyItalic },
  progressTrack: { width: 140, height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  secondaryButton: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14 },
  secondaryButtonText: { fontSize: 15, letterSpacing: 1.1, textTransform: "uppercase" },
});
