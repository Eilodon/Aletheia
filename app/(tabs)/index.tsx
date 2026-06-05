import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/utils/haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useColors } from "@/hooks/use-colors";
import { useLayout } from "@/hooks/use-layout";
import { Fonts } from "@/constants/theme";
import { screen, trackRitualEvent } from "@/lib/analytics";
import { useStrings, useDisplayFont } from "@/lib/i18n";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = useStrings();
  const df = useDisplayFont();
  const insets = useSafeAreaInsets();
  const { ornamentScale, contentMaxWidth, isCompact, typeScale } = useLayout();
  const haloSize = Math.round(300 * ornamentScale);
  const ringSize = Math.round(248 * ornamentScale);
  const ringInnerSize = Math.round(208 * ornamentScale);

  useEffect(() => {
    screen("home", { surface: "tabs_index" });
  }, []);

  const handleStartReading = () => {
    haptic("confirm");
    trackRitualEvent("start", { entrypoint: "home_cta" });
    router.push("/reading/situation");
  };

  return (
    <ScreenContainer className="px-6 pb-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.root, !isCompact && { maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" }]}>
          <View style={styles.hero}>
            <View style={[styles.heroHalo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2, backgroundColor: colors.primary + "0E" }]} />
            <View style={[styles.heroRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: colors.primary + "16" }]} />
            <View style={[styles.heroRingInner, { width: ringInnerSize, height: ringInnerSize, borderRadius: ringInnerSize / 2, borderColor: colors.primary + "12" }]} />
            <View style={styles.brandMark}>
              <RitualOrnament variant="diamond" size="lg" />
            </View>
            <View style={styles.brandRule}>
              <View style={[styles.ruleLine, { backgroundColor: colors.primary + "30" }]} />
              <View style={[styles.ruleDiamond, { borderColor: colors.primary + "88", backgroundColor: colors.primary + "16" }]} />
              <View style={[styles.ruleLine, { backgroundColor: colors.primary + "30" }]} />
            </View>
            <Text style={[styles.kicker, { color: colors.primary }]}>{s.home.kicker}</Text>
            <Text style={[styles.title, { fontSize: Math.round(44 * typeScale), color: colors.foreground, fontFamily: Fonts.brand }]}>{s.home.title}</Text>
            <Text style={[styles.tagline, { color: colors.foreground }]}>{s.home.tagline}</Text>
            <Text style={[styles.subtitle, { maxWidth: Math.min(320, contentMaxWidth * 0.82), color: colors.muted }]}>{s.home.subtitle}</Text>
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
              <Text style={[styles.ctaText, { color: colors.foreground, fontFamily: df.display }]}>{s.home.cta}</Text>
              <Text style={[styles.ctaGlyph, { color: colors.primary }]}>✦</Text>
            </Pressable>
            <Text style={[styles.ctaHint, { maxWidth: Math.min(300, contentMaxWidth * 0.78), color: colors.muted }]}>{s.home.ctaHint}</Text>
          </View>

          <View
            style={[
              styles.featureCard,
              { backgroundColor: colors.surface + "CC", borderColor: colors.primary + "28" },
            ]}
          >
            <Text style={[styles.featureLabel, { color: colors.primary }]}>{s.home.passageLabel}</Text>
            <Text style={[styles.featureQuote, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>
              “{s.home.quote}”
            </Text>
            <View style={styles.featureFooter}>
              <View style={[styles.featureRule, { backgroundColor: colors.primary + "44" }]} />
              <Text style={[styles.featureRef, { color: colors.muted }]}>{s.home.passageRef}</Text>
            </View>
          </View>

          <View style={styles.pillars}>
            <View style={[styles.pillar, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "1E" }]}>
              <Text style={[styles.pillarText, { color: colors.foreground, textAlign: "center" }]}>{s.home.pillarSummary}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <RitualOrnament variant="dot" />
            <Text style={[styles.footerText, { color: colors.muted }]}>{s.home.footerText}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: "space-between", gap: 28, paddingTop: 28 },
  hero: { alignItems: "center", gap: 12, paddingTop: 36, paddingBottom: 8 },
  heroHalo: { position: "absolute", top: -26 },
  heroRing: { position: "absolute", top: 2, borderWidth: 1 },
  heroRingInner: { position: "absolute", top: 22, borderWidth: 1 },
  brandMark: { marginBottom: 6 },
  brandRule: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  ruleLine: { width: 44, height: 1 },
  ruleDiamond: { width: 8, height: 8, transform: [{ rotate: "45deg" }], borderWidth: 1 },
  kicker: { fontSize: 10, letterSpacing: 3.2, textTransform: "uppercase", fontFamily: Fonts.body },
  title: { letterSpacing: 9 },
  tagline: { fontSize: 13, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", fontFamily: Fonts.body },
  subtitle: { textAlign: "center", fontSize: 15, lineHeight: 25, fontFamily: Fonts.bodyItalic },
  ctaGroup: { alignItems: "center", gap: 12 },
  ctaButton: {
    minWidth: 270, flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 12, paddingHorizontal: 28, paddingVertical: 18, borderRadius: 22, borderWidth: 1.2,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 28, elevation: 6,
  },
  ctaGlyph: { fontSize: 16 },
  ctaText: { fontSize: 18, letterSpacing: 1.9 },
  ctaHint: { textAlign: "center", fontSize: 13, lineHeight: 20, fontFamily: Fonts.bodyItalic },
  featureCard: { borderRadius: 28, paddingHorizontal: 22, paddingVertical: 22, borderWidth: 1, gap: 12 },
  featureLabel: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: Fonts.body },
  featureQuote: { fontSize: 21, lineHeight: 31 },
  featureFooter: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  featureRule: { width: 28, height: 1 },
  featureRef: { fontSize: 12, fontFamily: Fonts.body },
  pillars: { gap: 10 },
  pillar: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 15, borderWidth: 1 },
  pillarText: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.body },
  footer: { alignItems: "center", gap: 10, paddingBottom: 12 },
  footerText: { fontSize: 12, letterSpacing: 0.4, fontFamily: Fonts.body },
});
