import { View, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { LocalModelManager } from "@/components/local-model-manager";
import { InferenceModeBadge } from "@/components/inference-mode-badge";
import { useLocalModel } from "@/hooks/use-local-model";
import { determineInferenceMode } from "@/hooks/use-local-model";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { capability, modelInfo, isReady, isSupported } = useLocalModel();

  const currentMode = determineInferenceMode({
    isOnline: true, // Assume online for settings display
    isLocalReady: isReady,
    isLocalSupported: isSupported,
    hasApiKey: true, // Assume API key configured
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 20,
      }}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Manage your AI preferences
      </Text>

      {/* Current Inference Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Current Mode
        </Text>
        <InferenceModeBadge
          mode={currentMode}
          localModelStatus={modelInfo?.status}
          downloadProgress={modelInfo?.download_progress}
          estimatedTps={capability?.estimated_tps}
        />
      </View>

      {/* Local Model Manager */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          On-Device AI
        </Text>
        <LocalModelManager />
      </View>

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: `${colors.tint}10`, borderColor: `${colors.tint}30` }]}>
        <Text style={[styles.infoTitle, { color: colors.tint }]}>About Local AI</Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          Local AI runs entirely on your device, providing:
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {"\n"}- Offline interpretation
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {"\n"}- Privacy (data never leaves device)
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {"\n"}- No API costs
        </Text>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {"\n"}- Slower than cloud AI
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
