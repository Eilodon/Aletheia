import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  animated?: boolean;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  animated = true,
}: OnboardingProgressProps) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep, animated, progressAnim]);

  const progress = animated
    ? progressAnim.interpolate({
        inputRange: [0, totalSteps],
        outputRange: ["0%", "100%"],
      })
    : `${(currentStep / totalSteps) * 100}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.pills}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= currentStep ? (i === currentStep ? colors.primary : colors.primary + "66") : colors.muted + "32",
              width: i === currentStep ? 28 : 8,
            }}
          />
        ))}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border + "3A" }]}>
        <Animated.View
          style={{
            height: "100%",
            backgroundColor: colors.primary,
            borderRadius: 2,
            width: animated ? (progress as any) : `${((currentStep + 1) / totalSteps) * 100}%`,
          }}
        />
      </View>
      <View style={styles.captionWrap}>
        <Animated.Text style={[styles.caption, { color: colors.muted }]}>
          {currentStep + 1} / {totalSteps}
        </Animated.Text>
      </View>
    </View>
  );
}

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const colors = useColors();
  
  return (
    <View style={styles.indicatorRow}>
      {steps.map((step, index) => (
        <View key={index} style={styles.indicatorItem}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: index < currentStep ? colors.success + "30" : index === currentStep ? colors.primary + "18" : colors.border + "30",
              borderWidth: 1,
              borderColor: index === currentStep ? colors.primary + "72" : index < currentStep ? colors.success + "48" : colors.border + "3A",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            {index < currentStep ? (
              <Animated.Text style={{ color: colors.success, fontSize: 14, fontFamily: Fonts.display }}>✓</Animated.Text>
            ) : (
              <Animated.Text
                style={{
                  fontSize: 12,
                  fontFamily: Fonts.display,
                  color: index === currentStep ? colors.foreground : colors.muted,
                }}
              >
                {index + 1}
              </Animated.Text>
            )}
          </View>
          <Animated.Text style={[styles.stepLabel, { color: index === currentStep ? colors.foreground : colors.muted }]} numberOfLines={1}>
            {step}
          </Animated.Text>
          {index < steps.length - 1 && (
            <View
              style={{
                position: "absolute",
                top: 15,
                left: "50%",
                width: "100%",
                height: 2,
                backgroundColor: index < currentStep ? colors.success + "48" : colors.border + "2E",
                zIndex: -1,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 12,
  },
  pills: {
    flexDirection: "row",
    gap: 8,
  },
  track: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  captionWrap: {
    marginTop: 4,
  },
  caption: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  indicatorItem: {
    flex: 1,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Fonts.display,
  },
});
