import { memo } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { useColors } from "@/hooks/use-colors";

export const AmbientBackdrop = memo(function AmbientBackdrop() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  const orbSize = Math.max(width * 0.72, 260);
  const lowerOrbSize = Math.max(width * 0.9, 320);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />

      <View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: colors.primary + "16",
            top: -orbSize * 0.22,
            left: -orbSize * 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: orbSize * 0.9,
            height: orbSize * 0.9,
            borderRadius: (orbSize * 0.9) / 2,
            backgroundColor: colors.border + "18",
            top: height * 0.14,
            right: -orbSize * 0.24,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: lowerOrbSize,
            height: lowerOrbSize,
            borderRadius: lowerOrbSize / 2,
            backgroundColor: colors.primary + "10",
            bottom: -lowerOrbSize * 0.28,
            alignSelf: "center",
          },
        ]}
      />

      <View style={[styles.veil, { borderColor: colors.border + "16" }]} />

      {Platform.OS === "web" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 32%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.04) 0%, transparent 26%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.18) 0%, transparent 40%)",
            } as any,
          ]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    opacity: 1,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.9,
  },
});
