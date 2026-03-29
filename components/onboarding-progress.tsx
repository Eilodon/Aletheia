import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

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
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= currentStep && styles.dotActive,
              i === currentStep && styles.dotCurrent,
            ]}
          />
        ))}
      </View>
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            animated
              ? { width: progress }
              : { width: `${((currentStep + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>
      <View style={styles.stepText}>
        <Animated.Text style={styles.stepLabel}>
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
  return (
    <View style={styles.stepIndicatorContainer}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              index < currentStep && styles.stepCircleCompleted,
              index === currentStep && styles.stepCircleCurrent,
            ]}
          >
            {index < currentStep ? (
              <Animated.Text style={styles.stepCheck}>✓</Animated.Text>
            ) : (
              <Animated.Text
                style={[
                  styles.stepNumber,
                  index === currentStep && styles.stepNumberCurrent,
                ]}
              >
                {index + 1}
              </Animated.Text>
            )}
          </View>
          <Animated.Text
            style={[
              styles.stepTitle,
              index === currentStep && styles.stepTitleCurrent,
            ]}
            numberOfLines={1}
          >
            {step}
          </Animated.Text>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < currentStep && styles.stepLineCompleted,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(155, 161, 166, 0.3)",
  },
  dotActive: {
    backgroundColor: "rgba(10, 126, 164, 0.5)",
  },
  dotCurrent: {
    backgroundColor: "#0a7ea4",
    width: 24,
  },
  progressBarContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(55, 65, 81, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0a7ea4",
    borderRadius: 2,
  },
  stepText: {
    marginTop: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(55, 65, 81, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
  },
  stepCircleCurrent: {
    backgroundColor: "#0a7ea4",
  },
  stepCheck: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "600",
  },
  stepNumber: {
    color: "#9BA1A6",
    fontSize: 12,
    fontWeight: "600",
  },
  stepNumberCurrent: {
    color: "#FFFFFF",
  },
  stepTitle: {
    fontSize: 10,
    color: "#9BA1A6",
    textAlign: "center",
  },
  stepTitleCurrent: {
    color: "#ECEDEE",
  },
  stepLine: {
    position: "absolute",
    top: 14,
    left: "50%",
    width: "100%",
    height: 2,
    backgroundColor: "rgba(55, 65, 81, 0.3)",
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.5)",
  },
});
