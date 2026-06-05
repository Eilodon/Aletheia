import { useState, useEffect, useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { haptic } from "@/lib/utils/haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { useLayout } from "@/hooks/use-layout";
import { SymbolMethod } from "@/lib/types";
import { secureRandomIndex } from "@/lib/utils/random";
import { Fonts } from "@/constants/theme";
import { showToast } from "@/components/toast";
import { useStrings, useDisplayFont, getLocale } from "@/lib/i18n";
import { getLocalizedSymbol, getLocalizedThemeName } from "@/lib/i18n/symbol-names";
import { getSymbolAsset } from "@/assets/symbols";

function SymbolCard({
  symbol,
  index,
  isRevealed,
  isSelected,
  onSelect,
  cardMaxWidth,
}: {
  symbol: { id: string; display_name: string; flavor_text?: string; archetype_asset_id?: string };
  index: number;
  isRevealed: boolean;
  isSelected: boolean;
  onSelect: () => void;
  cardMaxWidth: number;
}) {
  const colors = useColors();
  const s = useStrings();
  const df = useDisplayFont();
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
        haptic("emphasis");
        onSelect();
      }}
      disabled={!isRevealed || isSelected}
      style={({ pressed }) => [
        styles.cardShell,
        { maxWidth: cardMaxWidth, opacity: isSelected ? 1 : pressed ? 0.88 : 1, transform: [{ scale: isSelected ? 1.025 : pressed ? 0.97 : 1 }] },
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
          <View style={styles.cardImageArea}>
            {getSymbolAsset(symbol) ? (
              <Image
                source={getSymbolAsset(symbol)!}
                style={{ width: Math.floor(cardMaxWidth * 0.56), height: Math.floor(cardMaxWidth * 0.56), opacity: 0.9 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.symbolGlyph, { color: colors.primary }]}>✦</Text>
            )}
          </View>

          <View style={styles.cardTextArea}>
            <Text
              style={[styles.symbolTitle, { color: colors.foreground, fontFamily: df.display, textTransform: "uppercase" }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {symbol.display_name}
            </Text>
            {symbol.flavor_text ? (
              <Text
                style={[styles.symbolFlavor, { color: isSelected ? colors.foreground : colors.muted }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {symbol.flavor_text}
              </Text>
            ) : null}
          </View>
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
  const df = useDisplayFont();
  const { ornamentScale, width: screenWidth } = useLayout();
  const deckHaloSize = Math.round(320 * ornamentScale);
  // px-5 on ScreenContainer = 20px each side; gap: 10 between 3 cards = 20px total
  const cardMaxWidth = Math.min(180, Math.floor((screenWidth - 60) / 3));
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsRevealed(true);
      haptic("success");
    }, 1100);
    return () => clearTimeout(timeout);
  }, []);

  const handleAutoChoose = useCallback(async () => {
    if (!session || isAutoSelecting || selectedSymbolId) return;
    setIsAutoSelecting(true);
    haptic("heavy");
    try {
      const randomIndex = secureRandomIndex(session.symbols.length);
      await chooseSymbol(session.symbols[randomIndex].id, SymbolMethod.Auto);
      router.push("/reading/ritual");
    } catch (error) {
      console.error("Failed to auto choose:", error);
      haptic("error");
      showToast("error", s.wildcard.error);
      setIsAutoSelecting(false);
    }
  }, [chooseSymbol, isAutoSelecting, router, s, selectedSymbolId, session]);


  const handleSelect = useCallback(
    async (symbolId: string) => {
      if (!session || isAutoSelecting) return;
      setIsAutoSelecting(true);
      try {
        await chooseSymbol(symbolId, SymbolMethod.Manual);
        router.push("/reading/ritual");
      } catch (error) {
        console.error("Failed to choose symbol:", error);
        haptic("error");
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
        <View style={[styles.deckHalo, { width: deckHaloSize, height: deckHaloSize, borderRadius: deckHaloSize / 2, backgroundColor: colors.primary + "0D" }]} />

        <View style={styles.header}>
          <RitualOrnament variant="line" />
          <Text testID="reading-wildcard-title" style={[styles.headerTitle, { color: colors.foreground, fontFamily: df.display }]}>
            {s.wildcard.title}
          </Text>
          <Text style={[styles.headerMeta, { color: colors.muted }]}>
            {getLocalizedThemeName(session.theme.id, session.theme.name, getLocale())} • {session.symbols.length} {s.wildcard.metaSuffix}
          </Text>
          <Text style={[styles.headerHint, { color: colors.primary }]}>{s.wildcard.hint}</Text>
        </View>

        <View style={styles.cardsRow}>
          {session.symbols.map((symbol, index) => {
            const localizedSymbol = getLocalizedSymbol(symbol, getLocale());
            return (
              <SymbolCard
                key={symbol.id}
                symbol={localizedSymbol}
                index={index}
                isRevealed={isRevealed}
                isSelected={selectedSymbolId === symbol.id}
                onSelect={() => handleSelect(symbol.id)}
                cardMaxWidth={cardMaxWidth}
              />
            );
          })}
        </View>

        <View style={styles.footer}>
          {isRevealed && !selectedSymbolId ? (
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
              <Text style={[styles.secondaryButtonText, { color: colors.foreground, fontFamily: df.display }]}>
                {isAutoSelecting ? s.wildcard.autoButtonLoading : s.wildcard.autoButton}
              </Text>
            </Pressable>
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
  deckHalo: { position: "absolute", alignSelf: "center", top: 88 },
  header: { alignItems: "center", gap: 10, paddingBottom: 28 },
  headerTitle: { fontSize: 30, textAlign: "center" },
  headerMeta: { fontSize: 13, textAlign: "center", fontFamily: Fonts.bodyItalic },
  headerHint: { fontSize: 10, letterSpacing: 2.6, textTransform: "uppercase" },
  cardsRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  cardShell: { flex: 1 },
  cardFrame: { aspectRatio: 0.66, position: "relative" },
  cardFace: {
    position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1.2,
    alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden",
    paddingHorizontal: 10, paddingVertical: 14, gap: 8,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 7,
  },
  cardBack: { justifyContent: "flex-start" },
  cardImageArea: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  cardTextArea: { flexShrink: 0, width: "100%", alignItems: "center", gap: 5, paddingTop: 6 },
  faceHint: { fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  symbolTitle: { fontSize: 21, textAlign: "center" },
  symbolFlavor: { fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: Fonts.bodyItalic },
  symbolGlyph: { fontSize: 16 },
  footer: { alignItems: "center", gap: 12, paddingTop: 20, paddingBottom: 10 },
  autoText: { fontSize: 13, fontFamily: Fonts.bodyItalic },
  secondaryButton: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14 },
  secondaryButtonText: { fontSize: 15, letterSpacing: 1.1, textTransform: "uppercase" },
});
