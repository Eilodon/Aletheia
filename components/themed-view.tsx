import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export interface ThemedViewProps extends ViewProps {
  className?: string;
  variant?: "default" | "surface" | "glass" | "ritual";
}

/**
 * A View component with automatic theme-aware background.
 * Uses NativeWind for styling - pass className for additional styles.
 */
export function ThemedView({ className, variant = "default", ...otherProps }: ThemedViewProps) {
  const variantClassName =
    variant === "ritual"
      ? "bg-surface/88 border border-primary/25 rounded-[28px] shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
      : variant === "glass"
      ? "bg-surface/80 border border-primary/20 rounded-[24px]"
      : variant === "surface"
        ? "bg-surface rounded-[22px]"
        : "bg-background";

  return <View className={cn(variantClassName, className)} {...otherProps} />;
}
