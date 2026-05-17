import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalModel } from "@/hooks/use-local-model";
import { useColors } from "@/hooks/use-colors";

export function LocalModelManager() {
  const colors = useColors();
  const {
    capability,
    modelInfo,
    isReady,
    isSupported,
    isDownloading,
    downloadProgress,
    isLoading,
    error,
    prepareModel,
    cancelDownload,
    deleteModel,
    refresh,
  } = useLocalModel();

  if (isLoading) {
    return (
      <View style={[styles.container, { borderColor: `${colors.muted}40` }]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Checking device capability...
        </Text>
      </View>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.container, { borderColor: `${colors.muted}40` }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.tint}20` }]}>
          <MaterialIcons name="memory" size={20} color={colors.tint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Local AI Model</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {isReady ? "Ready for offline inference" : "Download for on-device AI"}
          </Text>
        </View>
      </View>

      {/* Device Capability */}
      {capability && (
        <View style={[styles.section, { borderTopColor: `${colors.muted}20` }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Device Capability</Text>
          <View style={styles.capabilityRow}>
            <MaterialIcons
              name={isSupported ? "check-circle" : "error-outline"}
              size={16}
              color={isSupported ? colors.success : colors.warning}
            />
            <Text style={[styles.capabilityText, { color: colors.text }]}>
              {isSupported ? "Supported" : capability.unsupported_reason ?? "Not supported"}
            </Text>
          </View>
          <View style={styles.capabilityDetails}>
            <Text style={[styles.detailText, { color: colors.muted }]}>
              RAM: {capability.available_ram_mb}MB available
            </Text>
            <Text style={[styles.detailText, { color: colors.muted }]}>
              CPU: {capability.cpu_cores} cores
            </Text>
            {capability.estimated_tps > 0 && (
              <Text style={[styles.detailText, { color: colors.muted }]}>
                Est. speed: ~{capability.estimated_tps.toFixed(1)} tok/s
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Model Status */}
      {modelInfo && (
        <View style={[styles.section, { borderTopColor: `${colors.muted}20` }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Model Status</Text>
          
          {isReady ? (
            <View style={styles.statusRow}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Ready ({formatBytes(modelInfo.model_size_bytes)})
              </Text>
            </View>
          ) : isDownloading ? (
            <View style={styles.downloadProgress}>
              <View style={[styles.progressBar, { backgroundColor: `${colors.muted}30` }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.tint, width: `${downloadProgress}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.text }]}>
                Downloading... {downloadProgress}%
              </Text>
              {modelInfo.eta_seconds && (
                <Text style={[styles.etaText, { color: colors.muted }]}>
                  ETA: {formatTime(modelInfo.eta_seconds)}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.statusRow}>
              <MaterialIcons name="download" size={16} color={colors.muted} />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                Not downloaded (~2GB)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${colors.error}10` }]}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: `${colors.muted}20` }]}>
        {isDownloading ? (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.error }]}
            onPress={cancelDownload}
          >
            <MaterialIcons name="cancel" size={18} color={colors.error} />
            <Text style={[styles.buttonText, { color: colors.error }]}>Cancel Download</Text>
          </TouchableOpacity>
        ) : isReady ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.muted }]}
              onPress={refresh}
            >
              <MaterialIcons name="refresh" size={18} color={colors.muted} />
              <Text style={[styles.buttonText, { color: colors.muted }]}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton, { borderColor: colors.error }]}
              onPress={deleteModel}
            >
              <MaterialIcons name="delete-outline" size={18} color={colors.error} />
              <Text style={[styles.buttonText, { color: colors.error }]}>Delete Model</Text>
            </TouchableOpacity>
          </>
        ) : isSupported ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => prepareModel()}
          >
            <MaterialIcons name="download" size={18} color="white" />
            <Text style={[styles.buttonText, { color: "white" }]}>Download Model</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.unsupportedText, { color: colors.muted }]}>
            Your device does not support local AI inference
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  capabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  capabilityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  capabilityDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  downloadProgress: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
  },
  etaText: {
    fontSize: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    borderWidth: 1,
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
    flex: 1,
  },
  dangerButton: {
    borderWidth: 1,
    flex: 1,
  },
  unsupportedText: {
    fontSize: 13,
    textAlign: "center",
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});
