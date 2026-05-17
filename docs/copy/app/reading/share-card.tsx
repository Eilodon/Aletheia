import { useState, useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { screen, trackShareEvent } from "@/lib/analytics";

function CardPreview({
  passageText,
  symbolName,
  reference,
  theme,
}: {
  passageText: string;
  symbolName: string;
  reference: string;
  theme: "dark" | "light" | "gold";
}) {
  const themeStyles = {
    dark: { bg: "#12141B", text: "#F2EADB", accent: "#D7B46A", secondary: "#786E62" },
    light: { bg: "#F6EFE5", text: "#2B241E", accent: "#B7893D", secondary: "#8A7A6C" },
    gold: { bg: "#221A12", text: "#F6E7BC", accent: "#E1BA6B", secondary: "#8A6530" },
  };
  const style = themeStyles[theme];

  const truncateText = (text: string, maxLength = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  };

  return (
    <View
      style={{
        backgroundColor: style.bg,
        aspectRatio: 9 / 16,
        maxHeight: 500,
        borderRadius: 28,
        paddingHorizontal: 24,
        paddingVertical: 28,
        justifyContent: "space-between",
      }}
    >
      <View style={{ alignItems: "center", gap: 12 }}>
        <Text style={{ color: style.accent, fontSize: 11, letterSpacing: 2.2 }}>ALETHEIA</Text>
        <Text style={{ color: style.accent, fontSize: 15 }}>{symbolName.toUpperCase()}</Text>
      </View>

      <View style={{ gap: 16 }}>
        <Text
          style={{
            color: style.text,
            fontSize: 24,
            lineHeight: 36,
            textAlign: "center",
            fontFamily: Fonts.serif,
          }}
        >
          “{truncateText(passageText)}”
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: 12 }}>
        <View style={{ width: 34, height: 1, backgroundColor: style.accent, opacity: 0.5 }} />
        <Text style={{ color: style.secondary, fontSize: 12, textAlign: "center" }}>{reference}</Text>
      </View>
    </View>
  );
}

export default function ShareCardScreen() {
  const { passage, session, selectedSymbol } = useReading();
  const colors = useColors();
  const router = useRouter();
  const cardRef = useRef<View>(null);
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light" | "gold">("dark");
  const [isSharing, setIsSharing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    screen("share_card", {
      source_id: session?.source.id,
      symbol_id: selectedSymbol?.id,
    });
  }, [selectedSymbol?.id, session?.source.id]);

  const handleShare = async () => {
    if (!passage || !selectedSymbol) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSharing(true);

    try {
      if (cardRef.current) {
        const uri = await captureRef(cardRef, { format: "png", quality: 0.92 });
        await Share.share({
          url: uri,
          message: `"${passage.text.slice(0, 100)}..." — ${selectedSymbol.display_name}\n\nTừ Aletheia, not a fortune. A mirror.`,
        });
        trackShareEvent("shared", {
          mode: "image",
          source_id: session?.source.id,
          symbol_id: selectedSymbol.id,
          theme: selectedTheme,
        });
      } else {
        await Share.share({
          message: `"${passage.text.slice(0, 150)}..." — ${selectedSymbol.display_name} (${passage.reference})\n\nTừ Aletheia ✦`,
        });
        trackShareEvent("shared", {
          mode: "text_fallback",
          source_id: session?.source.id,
          symbol_id: selectedSymbol.id,
          theme: selectedTheme,
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
      trackShareEvent("failed", {
        mode: "card",
        source_id: session?.source.id,
        symbol_id: selectedSymbol.id,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyText = async () => {
    if (!passage || !selectedSymbol) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await Share.share({
        message: `"${passage.text}"\n\n— ${passage.reference}\nBiểu tượng: ${selectedSymbol.display_name}\n\nTừ Aletheia ✦`,
      });
      trackShareEvent("text_shared", {
        source_id: session?.source.id,
        symbol_id: selectedSymbol.id,
      });
    } catch (error) {
      console.error("Copy failed:", error);
      trackShareEvent("failed", {
        mode: "text_only",
        source_id: session?.source.id,
        symbol_id: selectedSymbol.id,
      });
    }
  };

  if (!passage || !session || !selectedSymbol) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-muted">Không có dữ liệu để chia sẻ</Text>
      </ScreenContainer>
    );
  }

  const themes: { key: typeof selectedTheme; label: string }[] = [
    { key: "dark", label: "Tối" },
    { key: "light", label: "Sáng" },
    { key: "gold", label: "Vàng" },
  ];

  return (
    <ScreenContainer className="px-6 pb-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <RitualOrnament variant="line" />
            <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>Chia sẻ lá bài</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{selectedSymbol.display_name}</Text>
          </View>

          <View style={styles.previewWrap}>
            <View ref={cardRef} collapsable={false} style={styles.previewInner}>
              <CardPreview
                passageText={passage.text}
                symbolName={selectedSymbol.display_name}
                reference={passage.reference}
                theme={selectedTheme}
              />
            </View>
          </View>

          <View style={styles.themeRow}>
            {themes.map((theme) => {
              const active = selectedTheme === theme.key;
              return (
                <Pressable
                  key={theme.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTheme(theme.key);
                    trackShareEvent("theme_changed", { theme: theme.key });
                  }}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: active ? colors.surface + "F0" : colors.surface + "D6",
                      borderColor: active ? colors.primary + "88" : colors.border + "66",
                    },
                  ]}
                >
                  <Text style={[styles.themeChipText, { color: active ? colors.foreground : colors.muted }]}>
                    {theme.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <Pressable
              onPress={handleShare}
              disabled={isSharing}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.surface + "F4",
                  borderColor: colors.primary + "88",
                  opacity: isSharing ? 0.65 : 1,
                },
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>
                {isSharing ? "Đang chuẩn bị..." : "Chia sẻ"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCopyText}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "E6", borderColor: colors.border + "66" }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Chỉ sao chép văn bản</Text>
            </Pressable>

            <Pressable onPress={() => router.back()}>
              <Text style={[styles.closeText, { color: colors.muted }]}>Đóng</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
    paddingBottom: 22,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 13,
  },
  previewWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  previewInner: {
    width: "100%",
    maxWidth: 300,
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },
  themeChip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  themeChipText: {
    fontSize: 13,
  },
  spacer: {
    flex: 1,
    minHeight: 18,
  },
  actions: {
    gap: 12,
    paddingBottom: 6,
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 18,
  },
  secondaryButton: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
  },
  closeText: {
    textAlign: "center",
    fontSize: 13,
    paddingTop: 4,
  },
});
