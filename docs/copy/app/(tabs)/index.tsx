import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { screen, trackRitualEvent } from "@/lib/analytics";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    screen("home", { surface: "tabs_index" });
  }, []);

  const handleStartReading = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackRitualEvent("start", { entrypoint: "home_cta" });
    router.push("/reading/situation");
  };

  return (
    <ScreenContainer className="px-6 pb-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.root}>
          <View style={styles.hero}>
            <View style={[styles.heroHalo, { backgroundColor: colors.primary + "12" }]} />
            <RitualOrnament variant="eye" size="lg" />
            <Text style={[styles.kicker, { color: colors.primary }]}>A mirror, not a promise</Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>ALETHEIA</Text>
            <RitualOrnament variant="line" />
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Dừng lại trong vài phút. Gọi tên điều bạn đang mang. Rồi để một đoạn trích phản chiếu lại nó.
            </Text>
          </View>

          <View style={styles.ctaGroup}>
            <Pressable
              testID="home-start-reading"
              accessibilityLabel="home-start-reading"
              onPress={handleStartReading}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: colors.surface + "F2",
                  borderColor: colors.primary + "88",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.ctaGlyph, { color: colors.primary }]}>✦</Text>
              <Text style={[styles.ctaText, { color: colors.foreground, fontFamily: Fonts.serif }]}>Bắt đầu nghi thức</Text>
              <Text style={[styles.ctaGlyph, { color: colors.primary }]}>✦</Text>
            </Pressable>
            <Text style={[styles.ctaHint, { color: colors.muted }]}>
              Bạn sẽ mô tả tình huống, chọn một biểu tượng, rồi nhận đoạn trích phù hợp nhất với khoảnh khắc này.
            </Text>
          </View>

          <View
            style={[
              styles.featureCard,
              {
                backgroundColor: colors.surface + "E6",
                borderColor: colors.border + "66",
              },
            ]}
          >
            <Text style={[styles.featureLabel, { color: colors.primary }]}>PASSAGE OF THE PRACTICE</Text>
            <Text style={[styles.featureQuote, { color: colors.foreground, fontFamily: Fonts.serif }]}>
              “Đừng đi tìm câu trả lời hoàn hảo. Hãy đi tìm câu hỏi đang thật sự sống trong bạn.”
            </Text>
            <View style={styles.featureFooter}>
              <View style={[styles.featureRule, { backgroundColor: colors.primary + "44" }]} />
              <Text style={[styles.featureRef, { color: colors.muted }]}>Nghi thức mở đầu của Aletheia</Text>
            </View>
          </View>

          <View style={styles.pillars}>
            {[
              "Lưu local, không cần tài khoản",
              "AI chỉ xuất hiện khi bạn yêu cầu",
              "Thiết kế chậm, tối, tập trung vào phản chiếu",
            ].map((item) => (
              <View key={item} style={[styles.pillar, { backgroundColor: colors.surface + "CC", borderColor: colors.border + "55" }]}>
                <Text style={[styles.pillarText, { color: colors.foreground }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <RitualOrnament variant="dot" />
            <Text style={[styles.footerText, { color: colors.muted }]}>Không cần nhanh. Chỉ cần thành thật.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 28,
    paddingTop: 28,
  },
  hero: {
    alignItems: "center",
    gap: 12,
    paddingTop: 28,
  },
  heroHalo: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -24,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 42,
    letterSpacing: 7,
  },
  subtitle: {
    maxWidth: 320,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
  },
  ctaGroup: {
    alignItems: "center",
    gap: 12,
  },
  ctaButton: {
    minWidth: 260,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 26,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  ctaGlyph: {
    fontSize: 16,
  },
  ctaText: {
    fontSize: 18,
    letterSpacing: 1.1,
  },
  ctaHint: {
    maxWidth: 300,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  featureCard: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderWidth: 1,
    gap: 10,
  },
  featureLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  featureQuote: {
    fontSize: 20,
    lineHeight: 30,
  },
  featureFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  featureRule: {
    width: 28,
    height: 1,
  },
  featureRef: {
    fontSize: 12,
  },
  pillars: {
    gap: 10,
  },
  pillar: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  pillarText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
