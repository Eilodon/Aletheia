import { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { haptic } from "@/lib/utils/haptics";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { OnboardingPassagePreview } from "@/components/onboarding-passage-preview";
import { useColors } from "@/hooks/use-colors";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { SubscriptionTier, UserIntent } from "@/lib/types";
import { ONBOARDING_PREVIEW_PASSAGES, ONBOARDING_PREVIEW_PASSAGES_EN } from "@/lib/data/onboarding-content";
import { Fonts } from "@/constants/theme";
import { useStrings, getLocale } from "@/lib/i18n";

const STEPS = ["welcome", "intent", "ready"] as const;

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = useStrings();
  const [step, setStep] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canContinue = useMemo(() => {
    if (currentStep === "intent") return Boolean(selectedIntent);
    if (currentStep === "ready") return revealComplete;
    return true;
  }, [currentStep, selectedIntent, revealComplete]);

  const intents = useMemo(() => [
    { intent: UserIntent.Clarity,  icon: "✧", ...s.onboarding.intent.clarity },
    { intent: UserIntent.Comfort,  icon: "❋", ...s.onboarding.intent.comfort },
    { intent: UserIntent.Challenge,icon: "✦", ...s.onboarding.intent.challenge },
    { intent: UserIntent.Guidance, icon: "◈", ...s.onboarding.intent.guidance },
  ], [s]);

  const transitionTo = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      const userId = await getCurrentUserId();
      const userState = await coreStore.getUserState(userId);
      await coreStore.updateUserState({
        ...userState,
        user_id: userId,
        subscription_tier: userState.subscription_tier ?? SubscriptionTier.Free,
        onboarding_complete: true,
        user_intent: selectedIntent ?? userState.user_intent ?? UserIntent.Clarity,
      });
      haptic("success");
      router.replace("/");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  const handleNext = () => {
    if (!canContinue || isCompleting) return;
    haptic("navigation");
    if (isLastStep) {
      completeOnboarding();
      return;
    }
    transitionTo(step + 1);
  };

  const handleSkip = () => {
    if (isCompleting) return;
    haptic("navigation");
    setSelectedIntent((value) => value ?? UserIntent.Clarity);
    completeOnboarding();
  };

  const previewPassages = getLocale() === "en"
    ? ONBOARDING_PREVIEW_PASSAGES_EN
    : ONBOARDING_PREVIEW_PASSAGES;
  const preview = previewPassages[selectedIntent ?? UserIntent.Clarity];

  return (
    <ScreenContainer className="px-6 pb-6">
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={styles.progressTrack}>
            {STEPS.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.progressPill,
                  {
                    width: index === step ? 28 : 8,
                    backgroundColor: index <= step ? colors.primary : colors.border + "44",
                  },
                ]}
              />
            ))}
          </View>
          <Pressable onPress={handleSkip}>
            <Text testID="onboarding-skip" style={[styles.skip, { color: colors.muted }]}>
              {s.onboarding.skipLabel}
            </Text>
          </Pressable>
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1, justifyContent: "space-between" }}>
          <View style={styles.main}>
            {currentStep === "welcome" ? (
              <>
                <View style={[styles.heroHalo, { backgroundColor: colors.primary + "10" }]} />
                <RitualOrnament variant="eye" size="lg" />
                <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.displayStrong }]}>
                  {s.onboarding.welcome.title}
                </Text>
                <Text style={[styles.kicker, { color: colors.primary }]}>
                  {s.onboarding.welcome.kicker}
                </Text>
                <Text style={[styles.tagline, { color: colors.foreground }]}>
                  {s.onboarding.welcome.tagline}
                </Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  {s.onboarding.welcome.body}
                </Text>
              </>
            ) : null}

            {currentStep === "intent" ? (
              <>
                <RitualOrnament variant="sigil" />
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>
                  {s.onboarding.intent.title}
                </Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  {s.onboarding.intent.body}
                </Text>
                <View style={styles.intentGrid}>
                  {intents.map((item) => {
                    const isSelected = selectedIntent === item.intent;
                    return (
                      <Pressable
                        key={item.intent}
                        testID={`intent-card-${item.intent}`}
                        accessibilityLabel={`intent-card-${item.intent}`}
                        onPress={() => {
                          haptic("confirm");
                          setSelectedIntent(item.intent);
                        }}
                        style={[
                          styles.intentCard,
                          {
                            backgroundColor: isSelected ? colors.primary + "18" : colors.surface + "CC",
                            borderColor: isSelected ? colors.primary + "88" : colors.primary + "22",
                          },
                        ]}
                      >
                        <Text style={[styles.intentIcon, { color: colors.primary }]}>{item.icon}</Text>
                        <Text style={[styles.intentTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.intentDesc, { color: colors.muted }]}>
                          {item.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {currentStep === "ready" ? (
              <>
                <RitualOrnament variant="line" />
                <Text style={[styles.previewLabel, { color: colors.muted }]}>
                  {s.onboarding.preview.label}
                </Text>
                <OnboardingPassagePreview
                  text={preview.text}
                  reference={preview.reference}
                  closingQuestion={preview.closingQuestion}
                  onRevealComplete={() => setRevealComplete(true)}
                />
              </>
            ) : null}
          </View>

          <View style={styles.bottom}>
            <Pressable
              testID="onboarding-primary-action"
              accessibilityLabel="onboarding-primary-action"
              onPress={handleNext}
              disabled={!canContinue || isCompleting}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "76",
                  opacity: !canContinue || isCompleting ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>
                {isLastStep
                  ? isCompleting
                    ? s.onboarding.enteringLabel
                    : s.onboarding.enterLabel
                  : s.onboarding.continueLabel}
              </Text>
            </Pressable>
            <Text style={[styles.stepText, { color: colors.muted }]}>
              {s.onboarding.stepOf(step + 1, STEPS.length)}
            </Text>
            {currentStep === "welcome" && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Pressable onPress={() => router.push("/(auth)/sign-in" as any)} hitSlop={8}>
                <Text style={[styles.authLink, { color: colors.muted }]}>
                  {s.auth.alreadyHaveAccount}{" "}
                  <Text style={{ color: colors.primary }}>{s.auth.signIn}</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 24 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  progressTrack: { flexDirection: "row", gap: 8 },
  progressPill: { height: 8, borderRadius: 999 },
  skip: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2 },
  main: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, position: "relative" },
  heroHalo: { position: "absolute", width: 240, height: 240, borderRadius: 120, top: -24 },
  title: { fontSize: 40, letterSpacing: 8 },
  kicker: { fontSize: 10, letterSpacing: 3.2, textTransform: "uppercase" },
  tagline: { fontSize: 13, letterSpacing: 3.2, textTransform: "uppercase", textAlign: "center" },
  sectionTitle: { fontSize: 28, lineHeight: 34, textAlign: "center" },
  previewLabel: { fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", textAlign: "center", fontFamily: Fonts.bodyItalic },
  body: { maxWidth: 320, textAlign: "center", fontSize: 15, lineHeight: 24, fontFamily: Fonts.bodyItalic },
  intentGrid: { width: "100%", gap: 12, marginTop: 8 },
  intentCard: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 18, gap: 8 },
  intentIcon: { fontSize: 22 },
  intentTitle: { fontSize: 18 },
  intentDesc: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodyItalic },
  bottom: { gap: 12, paddingBottom: 12 },
  primaryButton: { borderRadius: 22, borderWidth: 1.2, paddingHorizontal: 24, paddingVertical: 18, alignItems: "center" },
  primaryButtonText: { fontSize: 18, letterSpacing: 1.2, textAlign: "center", textTransform: "uppercase" },
  stepText: { textAlign: "center", fontSize: 12 },
  authLink: { fontSize: 13, textAlign: "center" },
});
