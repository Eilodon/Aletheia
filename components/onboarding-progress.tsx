import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";

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
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= currentStep ? (i === currentStep ? colors.primary : colors.primary + "80") : colors.muted + "4D",
              width: i === currentStep ? 24 : 8,
            }}
          />
        ))}
      </View>
      <View style={{ width: "100%", height: 4, backgroundColor: colors.border + "4D", borderRadius: 2, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: "100%",
            backgroundColor: colors.primary,
            borderRadius: 2,
            width: animated ? progress : `${((currentStep + 1) / totalSteps) * 100}%`,
          }}
        />
      </View>
      <View style={{ marginTop: 4 }}>
        <Animated.Text style={{ fontSize: 12, color: colors.muted }}>
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
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
      {steps.map((step, index) => (
        <View key={index} style={{ flex: 1, alignItems: "center" }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: index < currentStep ? colors.success + "4D" : index === currentStep ? colors.primary : colors.border + "4D",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            {index < currentStep ? (
              <Animated.Text style={{ color: colors.success, fontSize: 14, fontWeight: "600" }}>✓</Animated.Text>
            ) : (
              <Animated.Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: index === currentStep ? "#FFFFFF" : colors.muted,
                }}
              >
                {index + 1}
              </Animated.Text>
            )}
          </View>
          <Animated.Text
            style={{
              fontSize: 10,
              color: index === currentStep ? colors.foreground : colors.muted,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {step}
          </Animated.Text>
          {index < steps.length - 1 && (
            <View
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                width: "100%",
                height: 2,
                backgroundColor: index < currentStep ? colors.success + "80" : colors.border + "4D",
                zIndex: -1,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}
