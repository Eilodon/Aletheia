import { View, Text, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useColors } from "@/hooks/use-colors";

export type InferenceMode = "local" | "cloud" | "fallback" | "offline";
export type LocalModelStatus = "not_downloaded" | "downloading" | "ready" | "update_available" | "error" | "unsupported";

export interface InferenceModeBadgeProps {
  mode: InferenceMode;
  localModelStatus?: LocalModelStatus;
  downloadProgress?: number;
  estimatedTps?: number;
  compact?: boolean;
}

export function InferenceModeBadge({
  mode,
  localModelStatus,
  downloadProgress,
  estimatedTps,
  compact = false,
}: InferenceModeBadgeProps) {
  const colors = useColors();

  const getStatusConfig = () => {
    switch (mode) {
      case "local":
        return {
          icon: "memory" as const,
          label: "Local AI",
          color: colors.success,
          description: estimatedTps ? `~${estimatedTps.toFixed(1)} tok/s` : "On-device",
        };
      case "cloud":
        return {
          icon: "cloud" as const,
          label: "Cloud AI",
          color: colors.tint,
          description: "Online",
        };
      case "fallback":
        return {
          icon: "help-outline" as const,
          label: "Offline",
          color: colors.muted,
          description: "Cached prompts",
        };
      case "offline":
        return {
          icon: "error-outline" as const,
          label: "Offline",
          color: colors.warning,
          description: "No AI available",
        };
    }
  };

  const config = getStatusConfig();
  const iconName = config.icon;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: `${config.color}20` }]}>
        <MaterialIcons name={iconName} size={12} color={config.color} />
        <Text style={[styles.compactLabel, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: `${config.color}40` }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <MaterialIcons name={iconName} size={16} color={config.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: colors.text }]}>{config.label}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{config.description}</Text>
        </View>
      </View>

      {mode === "local" && localModelStatus && (
        <LocalModelStatusIndicator
          status={localModelStatus}
          downloadProgress={downloadProgress}
          colors={colors}
        />
      )}
    </View>
  );
}

interface LocalModelStatusIndicatorProps {
  status: LocalModelStatus;
  downloadProgress?: number;
  colors: ReturnType<typeof useColors>;
}

function LocalModelStatusIndicator({ status, downloadProgress, colors }: LocalModelStatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case "not_downloaded":
        return {
          icon: "download" as const,
          text: "Model not downloaded",
          color: colors.muted,
        };
      case "downloading":
        return {
          icon: "download" as const,
          text: `Downloading... ${downloadProgress ?? 0}%`,
          color: colors.tint,
        };
      case "ready":
        return {
          icon: "check-circle" as const,
          text: "Ready for inference",
          color: colors.success,
        };
      case "update_available":
        return {
          icon: "download" as const,
          text: "Update available",
          color: colors.warning,
        };
      case "error":
        return {
          icon: "error-outline" as const,
          text: "Error loading model",
          color: colors.error,
        };
      case "unsupported":
        return {
          icon: "error-outline" as const,
          text: "Device not supported",
          color: colors.muted,
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <View style={[styles.statusRow, { borderTopColor: `${colors.muted}20` }]}>
      <MaterialIcons name={display.icon} size={12} color={display.color} />
      <Text style={[styles.statusText, { color: display.color }]}>{display.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
