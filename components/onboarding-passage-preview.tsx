import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { DURATION, EASING } from "@/lib/constants/animation";
import { useStrings } from "@/lib/i18n";

interface Props {
  text: string;
  reference: string;
  closingQuestion: string;
  onRevealComplete: () => void;
}

// Slower than the reading passage reveal — onboarding needs more gravity.
const WORD_DELAY_MS = 130;
const COMMA_DELAY_MS = 220;
const PERIOD_DELAY_MS = 420;
const INITIAL_PAUSE_MS = 600;
const POST_REVEAL_PAUSE_MS = 520;

function buildWordSteps(text: string): { text: string; delayMs: number }[] {
  const words = text.split(" ");
  const steps: { text: string; delayMs: number }[] = [];
  let current = "";
  for (const word of words) {
    if (current) current += " ";
    current += word;
    const last = word.slice(-1);
    steps.push({
      text: current,
      delayMs: [".", "!", "?"].includes(last)
        ? PERIOD_DELAY_MS
        : [",", ";", ":"].includes(last)
          ? COMMA_DELAY_MS
          : WORD_DELAY_MS,
    });
  }
  return steps;
}

export function OnboardingPassagePreview({
  text,
  reference,
  closingQuestion,
  onRevealComplete,
}: Props) {
  const colors = useColors();
  const s = useStrings();
  const [visibleText, setVisibleText] = useState("");
  const [passageDone, setPassageDone] = useState(false);

  const containerFade = useRef(new Animated.Value(0)).current;
  const questionFade = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);
  const blinkAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Stable finish function via ref so useEffect closure stays clean.
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    blinkAnimRef.current?.stop();
    setVisibleText(text);
    setPassageDone(true);
    const id = setTimeout(() => {
      Animated.timing(questionFade, {
        toValue: 1,
        duration: DURATION.slow,
        useNativeDriver: true,
      }).start(() => onRevealCompleteRef.current());
    }, POST_REVEAL_PAUSE_MS);
    timeoutsRef.current.push(id);
  }, [text, questionFade]);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    // Entrance fade-in
    Animated.timing(containerFade, {
      toValue: 1,
      duration: DURATION.slower,
      easing: EASING.spring,
      useNativeDriver: true,
    }).start();

    // Cursor blink loop
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.08,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimRef.current = blink;
    blink.start();

    // Word-by-word reveal
    const steps = buildWordSteps(text);
    let elapsed = INITIAL_PAUSE_MS;
    steps.forEach((step, i) => {
      const id = setTimeout(() => {
        setVisibleText(step.text);
        if (i === steps.length - 1) {
          finishRef.current();
        }
      }, elapsed);
      elapsed += step.delayMs;
      timeoutsRef.current.push(id);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      blinkAnimRef.current?.stop();
    };
  }, [containerFade, cursorOpacity, text]);

  return (
    <Animated.View style={[styles.wrapper, { opacity: containerFade }]}>
      {/* Tap anywhere to skip animation and jump to full reveal */}
      <Pressable onPress={() => !passageDone && finishRef.current()}>
        <Text style={[styles.reference, { color: colors.primary }]}>
          {reference}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface + "C8",
              borderColor: colors.primary + "42",
            },
          ]}
        >
          <Text
            style={[
              styles.quoteMark,
              { color: colors.primary + "88", fontFamily: Fonts.display },
            ]}
          >
            “
          </Text>

          <Text
            style={[
              styles.passageText,
              { color: colors.foreground, fontFamily: Fonts.bodyItalic },
            ]}
          >
            {visibleText}
            {!passageDone && (
              <Animated.Text
                style={{ color: colors.primary, opacity: cursorOpacity }}
              >
                |
              </Animated.Text>
            )}
          </Text>
        </View>

        <Animated.View style={{ opacity: questionFade }}>
          <Text
            style={[
              styles.closingQuestion,
              { color: colors.muted, fontFamily: Fonts.bodyItalic },
            ]}
          >
            {closingQuestion}
          </Text>
        </Animated.View>

        {!passageDone && (
          <Text style={[styles.skipHint, { color: colors.muted + "66" }]}>
            {s.preview.tapHint}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  reference: {
    textAlign: "center",
    fontSize: 10,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1.2,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 6,
  },
  quoteMark: {
    fontSize: 38,
    lineHeight: 36,
    textAlign: "center",
  },
  passageText: {
    fontSize: 19,
    lineHeight: 32,
    textAlign: "center",
    minHeight: 68,
  },
  closingQuestion: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  skipHint: {
    marginTop: 14,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
