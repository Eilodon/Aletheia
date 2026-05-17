import { memo } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { useColors } from "@/hooks/use-colors";

export const AmbientBackdrop = memo(function AmbientBackdrop() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  const orbSize = Math.max(width * 0.84, 300);
  const lowerOrbSize = Math.max(width * 1.08, 360);
  const centerHalo = Math.max(width * 0.56, 220);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#07060A", opacity: 0.18 }]} />

      <View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: colors.primary + "18",
            top: -orbSize * 0.16,
            left: -orbSize * 0.16,
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
            backgroundColor: colors.border + "16",
            top: height * 0.12,
            right: -orbSize * 0.18,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: centerHalo,
            height: centerHalo,
            borderRadius: centerHalo / 2,
            backgroundColor: colors.primary + "10",
            top: height * 0.22,
            alignSelf: "center",
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
            backgroundColor: colors.primary + "0C",
            bottom: -lowerOrbSize * 0.2,
            alignSelf: "center",
          },
        ]}
      />

      <View style={[styles.edgeTop, { borderBottomColor: colors.primary + "08" }]} />
      <View style={[styles.edgeBottom, { backgroundColor: "#07060A", opacity: 0.28 }]} />
      <View style={[styles.veil, { borderColor: colors.border + "14" }]} />

      {Platform.OS === "web" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(216,184,106,0.08) 0%, transparent 32%), radial-gradient(circle at 80% 10%, rgba(135,96,189,0.07) 0%, transparent 26%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.24) 0%, transparent 42%), radial-gradient(circle at 50% 40%, rgba(255,230,182,0.05) 0%, transparent 24%)",
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
  edgeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderBottomWidth: 1,
  },
  edgeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
});
