import { useRef } from "react";
import { Pressable, Animated, ViewProps } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

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
  const colors = useColors();
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

  const cardStyle = {
    backgroundColor: colors.surface + "D0",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + "24",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 6,
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
          cardStyle,
          { transform: [{ scale: scaleAnim }] },
          disabled && { opacity: 0.5 },
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
  const colors = useColors();
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
    primary: { backgroundColor: colors.primary + "1C", borderWidth: 1, borderColor: colors.primary + "7A" },
    secondary: { backgroundColor: colors.surface + "D0", borderWidth: 1, borderColor: colors.border + "66" },
    ghost: { backgroundColor: "transparent" },
  };

  const sizeStyles = {
    small: { paddingHorizontal: 16, paddingVertical: 8 },
    medium: { paddingHorizontal: 24, paddingVertical: 12 },
    large: { paddingHorizontal: 32, paddingVertical: 16 },
  };

  const textVariantStyles = {
    primary: { color: colors.foreground },
    secondary: { color: colors.foreground },
    ghost: { color: colors.primary },
  };

  const textSizeStyles = {
    small: { fontSize: 14 },
    medium: { fontSize: 16 },
    large: { fontSize: 18 },
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
          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 22 },
          variantStyles[variant],
          sizeStyles[size],
          disabled && { opacity: 0.5 },
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
        {...props}
      >
        {icon}
        <Animated.Text style={[{ fontWeight: "600" }, textVariantStyles[variant], textSizeStyles[size]]}>
          {title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export { type PressableCardProps, type AnimatedButtonProps };
