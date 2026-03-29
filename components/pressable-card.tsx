import React, { useRef } from "react";
import { Pressable, Animated, ViewProps, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

interface PressableCardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  scaleValue?: number;
  disabled?: boolean;
}

export function PressableCard({
  children,
  onPress,
  scaleValue = 0.96,
  disabled = false,
  style,
  ...props
}: PressableCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabled,
          style,
        ]}
        {...props}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface AnimatedButtonProps extends ViewProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function AnimatedButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  icon,
  style,
  ...props
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const variantStyles = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    ghost: styles.buttonGhost,
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  const textVariantStyles = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    ghost: styles.textGhost,
  };

  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.button,
          variantStyles[variant],
          sizeStyles[size],
          disabled && styles.buttonDisabled,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
        {...props}
      >
        {icon}
        <Animated.Text
          style={[
            styles.buttonText,
            textVariantStyles[variant],
            textSizeStyles[size],
          ]}
        >
          {title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(55, 65, 81, 0.3)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.3)",
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
  },
  buttonPrimary: {
    backgroundColor: "#0a7ea4",
  },
  buttonSecondary: {
    backgroundColor: "rgba(55, 65, 81, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(155, 161, 166, 0.3)",
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonMedium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLarge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "600",
  },
  textPrimary: {
    color: "#FFFFFF",
  },
  textSecondary: {
    color: "#ECEDEE",
  },
  textGhost: {
    color: "#0a7ea4",
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
});
