import { useRouter } from "expo-router";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleStartReading = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/reading/situation");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between gap-8">
          {/* Header - Ritual Gateway */}
          <View className="items-center gap-6 pt-16">
            {/* Decorative top ornament */}
            <View style={styles.ornamentContainer}>
              <View style={[styles.ornamentLine, { backgroundColor: colors.primary + "40" }]} />
              <Text style={[styles.ornamentSymbol, { color: colors.primary }]}>✦</Text>
              <View style={[styles.ornamentLine, { backgroundColor: colors.primary + "40" }]} />
            </View>

            {/* Main title - more poetic */}
            <View className="items-center gap-2">
              <Text style={[styles.title, { color: colors.foreground }]}>ALETHEIA</Text>
              <Text style={[styles.titleSub, { color: colors.primary }]}>not a fortune. a mirror.</Text>
            </View>

            {/* Atmospheric subtitle */}
            <Text style={[styles.tagline, { color: colors.muted }]}>
              Dừng lại. Phản chiếu. Hiểu.
            </Text>
          </View>

          {/* Main CTA - Ritual Object */}
          <View className="items-center gap-8">
            <Pressable
              onPress={handleStartReading}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.ctaInner}>
                <Text style={styles.ctaSymbol}>✦</Text>
                <Text style={styles.ctaText}>Lật một lá</Text>
                <Text style={styles.ctaSymbol}>✦</Text>
              </View>
            </Pressable>

            <Text style={[styles.ctaSubtext, { color: colors.muted }]}>
              Chọn biểu tượng — để đoạn trích nói với bạn
            </Text>
          </View>

          {/* Footer - Subtle, premium */}
          <View className="items-center gap-1 pb-8">
            <View style={[styles.footerDot, { backgroundColor: colors.primary + "30" }]} />
            <Text style={[styles.footerText, { color: colors.muted }]}>
              Không cần internet • Không cần tài khoản
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  ornamentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ornamentLine: {
    width: 40,
    height: 1,
  },
  ornamentSymbol: {
    fontSize: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "200",
    letterSpacing: 8,
  },
  titleSub: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: 15,
    fontWeight: "300",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  ctaButton: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaSymbol: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  ctaSubtext: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
