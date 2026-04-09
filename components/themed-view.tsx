import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export interface ThemedViewProps extends ViewProps {
  className?: string;
  variant?: "default" | "surface" | "glass";
}

/**
 * A View component with automatic theme-aware background.
 * Uses NativeWind for styling - pass className for additional styles.
 */
export function ThemedView({ className, variant = "default", ...otherProps }: ThemedViewProps) {
  const variantClassName =
    variant === "glass"
      ? "bg-surface/80 border border-primary/20 rounded-[24px]"
      : variant === "surface"
        ? "bg-surface rounded-[22px]"
        : "bg-background";

  return <View className={cn(variantClassName, className)} {...otherProps} />;
}
