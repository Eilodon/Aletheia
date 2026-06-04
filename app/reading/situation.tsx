import { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { haptic } from "@/lib/utils/haptics";

import { useReading } from "@/lib/context/reading-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { Fonts } from "@/constants/theme";
import { showToast } from "@/components/toast";
import { useStrings } from "@/lib/i18n";
import { detectCrisis } from "@/lib/utils/crisis-guard";
import { CrisisResponseModal } from "@/components/crisis-response-modal";

export default function SituationScreen() {
  const [situationText, setSituationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [pendingContinue, setPendingContinue] = useState(false);
  const { startReading } = useReading();
  const colors = useColors();
  const router = useRouter();
  const s = useStrings();
  const { sourceId } = useLocalSearchParams<{ sourceId?: string }>();

  const proceedReading = async () => {
    setIsLoading(true);
    try {
      await startReading(sourceId, situationText.trim() || undefined, ephemeral);
      router.push("/reading/wildcard");
    } catch (error) {
      console.error("Failed to start reading:", error);
      haptic("error");
      showToast("error", s.situation.error);
    } finally {
      setIsLoading(false);
      setPendingContinue(false);
    }
  };

  const handleContinue = async () => {
    if (isLoading) return;
    haptic("confirm");
    if (situationText.trim() && detectCrisis(situationText)) {
      setPendingContinue(true);
      setShowCrisisModal(true);
      return;
    }
    setIsLoading(true);
    try {
      await startReading(sourceId, situationText.trim() || undefined, ephemeral);
      router.push("/reading/wildcard");
    } catch (error) {
      console.error("Failed to start reading:", error);
      haptic("error");
      showToast("error", s.situation.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrisisContinue = () => {
    setShowCrisisModal(false);
    if (pendingContinue) void proceedReading();
  };

  const handleCrisisReturn = () => {
    setShowCrisisModal(false);
    setPendingContinue(false);
    setIsLoading(false);
  };

  const handleSkip = async () => {
    if (isLoading) return;
    haptic("selection");
    setIsLoading(true);
    try {
      await startReading(sourceId, undefined, ephemeral);
      router.push("/reading/wildcard");
    } catch (error) {
      console.error("Failed to start reading:", error);
      haptic("error");
      showToast("error", s.situation.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-6">
      <CrisisResponseModal
        visible={showCrisisModal}
        onContinue={handleCrisisContinue}
        onReturn={handleCrisisReturn}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View style={styles.screen}>
          <View style={[styles.heroHalo, { backgroundColor: colors.primary + "10" }]} />

          <View style={styles.header}>
            <RitualOrnament variant="line" />
            <Text testID="reading-situation-title" style={[styles.title, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
              {s.situation.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {s.situation.subtitle}
            </Text>
          </View>

          <View style={styles.inputWrap}>
            <View style={[styles.inputShell, { backgroundColor: colors.surface + "BE", borderColor: colors.primary + "28" }]}>
              <Text style={[styles.inputKicker, { color: colors.primary }]}>{s.situation.inputKicker}</Text>
              <TextInput
                testID="reading-situation-input"
                accessibilityLabel="reading-situation-input"
                value={situationText}
                onChangeText={setSituationText}
                placeholder={s.situation.placeholder}
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={[styles.input, { color: colors.foreground }]}
                maxLength={500}
              />
              <View style={styles.inputFooter}>
                <Text style={[styles.footerHint, { color: colors.muted }]}>{s.situation.inputHint}</Text>
                <Text style={[styles.counter, { color: colors.muted }]}>{situationText.length}/500</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              testID="reading-situation-continue"
              accessibilityLabel="reading-situation-continue"
              onPress={handleContinue}
              disabled={isLoading}
              style={({ pressed }) => ({
                backgroundColor: colors.primary + "18",
                borderWidth: 1,
                borderColor: colors.primary + "72",
                paddingHorizontal: 32,
                paddingVertical: 18,
                borderRadius: 22,
                opacity: pressed || isLoading ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={[styles.primaryText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
                {isLoading ? s.situation.ctaLoading : s.situation.cta}
              </Text>
            </Pressable>

            <Pressable
              testID="reading-situation-skip"
              accessibilityLabel="reading-situation-skip"
              onPress={handleSkip}
              disabled={isLoading}
              style={styles.skipButton}
            >
              <Text style={[styles.skipText, { color: colors.muted }]}>{s.situation.skipText} →</Text>
            </Pressable>

            <Pressable
              testID="reading-situation-ephemeral"
              onPress={() => {
                haptic("selection");
                setEphemeral((v) => !v);
              }}
              style={styles.ephemeralRow}
            >
              <View style={[
                styles.ephemeralBox,
                { borderColor: ephemeral ? colors.primary + "88" : colors.muted + "55",
                  backgroundColor: ephemeral ? colors.primary + "18" : "transparent" },
              ]}>
                {ephemeral ? <Text style={{ color: colors.primary, fontSize: 10 }}>✓</Text> : null}
              </View>
              <View>
                <Text style={[styles.ephemeralLabel, { color: ephemeral ? colors.foreground : colors.muted }]}>
                  {s.situation.ephemeralToggle}
                </Text>
                {ephemeral ? (
                  <Text style={[styles.ephemeralHint, { color: colors.muted }]}>
                    {s.situation.ephemeralHint}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "space-between", position: "relative" },
  heroHalo: { position: "absolute", width: 280, height: 280, borderRadius: 140, alignSelf: "center", top: 52 },
  header: { alignItems: "center", gap: 14, paddingTop: 32 },
  title: { fontSize: 31, lineHeight: 38, textAlign: "center", letterSpacing: 1.6 },
  subtitle: { maxWidth: 304, textAlign: "center", fontSize: 14, lineHeight: 23, fontFamily: Fonts.bodyItalic },
  inputWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 2 },
  inputShell: {
    borderRadius: 30, borderWidth: 1, paddingTop: 16, paddingBottom: 14,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.24, shadowRadius: 34, elevation: 8,
  },
  inputKicker: { textAlign: "center", textTransform: "uppercase", letterSpacing: 3.2, fontSize: 10 },
  input: { minHeight: 220, fontSize: 16, lineHeight: 28, fontFamily: Fonts.bodyItalic, paddingHorizontal: 20, paddingVertical: 18 },
  inputFooter: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  footerHint: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: Fonts.bodyItalic },
  counter: { fontSize: 11, letterSpacing: 0.4 },
  actions: { gap: 12, paddingBottom: 12 },
  primaryText: { fontSize: 17, letterSpacing: 1.4, textAlign: "center", textTransform: "uppercase" },
  skipButton: { paddingVertical: 8 },
  skipText: { textAlign: "center", fontSize: 13, fontFamily: Fonts.bodyItalic },
  ephemeralRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6, paddingHorizontal: 4 },
  ephemeralBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  ephemeralLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium },
  ephemeralHint: { fontSize: 11, fontFamily: Fonts.bodyItalic, marginTop: 2 },
});
