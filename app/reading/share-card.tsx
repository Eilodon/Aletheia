import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, Share, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";

// Card preview component - Premium artifact style
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
    dark: { bg: "#0f1117", text: "#e5e7eb", accent: "#8b5cf6", secondary: "#4b5563" },
    light: { bg: "#fafafa", text: "#1f2937", accent: "#7c3aed", secondary: "#9ca3af" },
    gold: { bg: "#1c1917", text: "#fef3c7", accent: "#f59e0b", secondary: "#78350f" },
  };
  const style = themeStyles[theme];

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  };

  return (
    <View
      style={{ 
        backgroundColor: style.bg, 
        aspectRatio: 9 / 16, 
        maxHeight: 480,
        borderRadius: 0,
      }}
    >
      {/* Top decorative */}
      <View style={{ alignItems: "center", paddingTop: 32 }}>
        <Text style={{ color: style.accent, fontSize: 28 }}>✦</Text>
        <View style={{ width: 40, height: 1, backgroundColor: style.accent, opacity: 0.4, marginTop: 12 }} />
      </View>

      {/* Content - Centered, breathing */}
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text
          style={{ 
            color: style.text, 
            fontSize: 17, 
            fontWeight: "300",
            lineHeight: 28,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          "{truncateText(passageText)}"
        </Text>
      </View>

      {/* Bottom - Symbol & Reference */}
      <View style={{ alignItems: "center", paddingBottom: 32 }}>
        <View style={{ width: 30, height: 1, backgroundColor: style.accent, opacity: 0.4, marginBottom: 16 }} />
        <Text style={{ color: style.accent, fontSize: 13, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" }}>
          {symbolName}
        </Text>
        <Text style={{ color: style.text, fontSize: 11, opacity: 0.6, marginTop: 6 }}>
          {reference}
        </Text>
        <Text style={{ color: style.text, fontSize: 10, opacity: 0.4, marginTop: 16, letterSpacing: 1 }}>
          A L E T H E I A
        </Text>
      </View>
    </View>
  );
}

export default function ShareCardScreen() {
  const { passage, session, selectedSymbol } = useReading();
  const colors = useColors();
  const router = useRouter();
  const cardRef = useRef(null);
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light" | "gold">("dark");
  const [isSharing, setIsSharing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleShare = async () => {
    if (!passage || !selectedSymbol) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSharing(true);

    try {
      // Try to capture card as image
      if (cardRef.current) {
        const uri = await captureRef(cardRef, {
          format: "png",
          quality: 0.9,
        });

        await Share.share({
          url: uri,
          message: `"${passage.text.slice(0, 100)}..." — ${selectedSymbol.display_name}\n\nTừ Aletheia, not a fortune. A mirror.`,
        });
      } else {
        // Fallback to text share
        await Share.share({
          message: `"${passage.text.slice(0, 150)}..." — ${selectedSymbol.display_name} (${passage.reference})\n\nTừ Aletheia ✦`,
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyText = async () => {
    if (!passage || !selectedSymbol) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const textToCopy = `"${passage.text}"\n\n— ${passage.reference}\nBiểu tượng: ${selectedSymbol.display_name}\n\nTừ Aletheia ✦`;

    try {
      await Share.share({
        message: textToCopy,
      });
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center gap-2 pt-4 pb-6">
            <Text className="text-xl font-semibold text-foreground">
              Chia sẻ lá bài
            </Text>
            <Text className="text-sm text-muted">
              {selectedSymbol.display_name}
            </Text>
          </View>

          {/* Card Preview */}
          <View className="items-center mb-6">
            <View
              ref={cardRef}
              collapsable={false}
              className="w-full max-w-[280px]"
            >
              <CardPreview
                passageText={passage.text}
                symbolName={selectedSymbol.display_name}
                reference={passage.reference}
                theme={selectedTheme}
              />
            </View>
          </View>

          {/* Theme Selector */}
          <View className="flex-row justify-center gap-3 mb-8">
            {themes.map((theme) => (
              <Pressable
                key={theme.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTheme(theme.key);
                }}
                className={`px-4 py-2 rounded-full border ${
                  selectedTheme === theme.key
                    ? "border-primary bg-primary/10"
                    : "border-muted/30"
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedTheme === theme.key
                      ? "text-primary font-medium"
                      : "text-muted"
                  }`}
                >
                  {theme.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions */}
          <View className="gap-3 pb-4">
            <Pressable
              onPress={handleShare}
              disabled={isSharing}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 12,
                opacity: pressed || isSharing ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text className="text-lg font-semibold text-white text-center">
                {isSharing ? "Đang chuẩn bị..." : "Chia sẻ"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCopyText}
              className="py-4 px-6 rounded-xl border border-muted/30"
            >
              <Text className="text-sm text-foreground text-center">
                Chỉ sao chép văn bản
              </Text>
            </Pressable>

            <Pressable onPress={handleClose} className="py-3">
              <Text className="text-sm text-muted text-center">Đóng</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
