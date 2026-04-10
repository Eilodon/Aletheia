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
            <View style={[styles.heroHalo, { backgroundColor: colors.primary + "0E" }]} />
            <View style={[styles.heroRing, { borderColor: colors.primary + "16" }]} />
            <View style={[styles.heroRingInner, { borderColor: colors.primary + "12" }]} />
            <View style={styles.brandMark}>
              <RitualOrnament variant="eye" size="lg" />
            </View>
            <View style={styles.brandRule}>
              <View style={[styles.ruleLine, { backgroundColor: colors.primary + "30" }]} />
              <View style={[styles.ruleDiamond, { borderColor: colors.primary + "88", backgroundColor: colors.primary + "16" }]} />
              <View style={[styles.ruleLine, { backgroundColor: colors.primary + "30" }]} />
            </View>
            <Text style={[styles.kicker, { color: colors.primary }]}>not a fortune • a mirror</Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.displayStrong }]}>ALETHEIA</Text>
            <Text style={[styles.tagline, { color: colors.foreground }]}>Dừng lại. Phản chiếu. Hiểu.</Text>
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
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "72",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.ctaGlyph, { color: colors.primary }]}>✦</Text>
              <Text style={[styles.ctaText, { color: colors.foreground, fontFamily: Fonts.display }]}>Lật một lá</Text>
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
                backgroundColor: colors.surface + "CC",
                borderColor: colors.primary + "28",
              },
            ]}
          >
            <Text style={[styles.featureLabel, { color: colors.primary }]}>PASSAGE OF THE PRACTICE</Text>
            <Text style={[styles.featureQuote, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>
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
              <View key={item} style={[styles.pillar, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "1E" }]}>
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
    paddingTop: 36,
    paddingBottom: 8,
  },
  heroHalo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -26,
  },
  heroRing: {
    position: "absolute",
    width: 248,
    height: 248,
    borderRadius: 124,
    top: 2,
    borderWidth: 1,
  },
  heroRingInner: {
    position: "absolute",
    width: 208,
    height: 208,
    borderRadius: 104,
    top: 22,
    borderWidth: 1,
  },
  brandMark: {
    marginBottom: 6,
  },
  brandRule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  ruleLine: {
    width: 44,
    height: 1,
  },
  ruleDiamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: "45deg" }],
    borderWidth: 1,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 44,
    letterSpacing: 9,
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 320,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 25,
    fontFamily: Fonts.bodyItalic,
  },
  ctaGroup: {
    alignItems: "center",
    gap: 12,
  },
  ctaButton: {
    minWidth: 270,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1.2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 6,
  },
  ctaGlyph: {
    fontSize: 16,
  },
  ctaText: {
    fontSize: 18,
    letterSpacing: 1.9,
    textTransform: "uppercase",
  },
  ctaHint: {
    maxWidth: 300,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bodyItalic,
  },
  featureCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderWidth: 1,
    gap: 12,
  },
  featureLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  featureQuote: {
    fontSize: 21,
    lineHeight: 31,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },
  pillarText: {
    fontSize: 14,
    lineHeight: 21,
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
