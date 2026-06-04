import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { useStrings } from "@/lib/i18n";
import { RitualOrnament } from "@/components/ritual-ornament";

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AITrustSheet({ visible, onConfirm, onCancel }: Props) {
  const colors = useColors();
  const s = useStrings();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} />
      <View style={[styles.sheet, { backgroundColor: colors.surface + "F8", borderColor: colors.primary + "28" }]}>
        <View style={styles.handle} />

        <RitualOrnament variant="line" />

        <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.display }]}>
          {s.passage.aiTrustTitle}
        </Text>

        <View style={styles.points}>
          {s.passage.aiTrustPoints.map((point, i) => (
            <View key={i} style={styles.point}>
              <Text style={[styles.pointDot, { color: colors.primary }]}>◦</Text>
              <Text style={[styles.pointText, { color: colors.muted }]}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onConfirm}
            style={[styles.confirmButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.confirmText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
              {s.passage.aiTrustConfirm}
            </Text>
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.muted }]}>
              {s.passage.aiTrustCancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40,
    gap: 20, alignItems: "center",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 4 },
  title: { fontSize: 20, letterSpacing: 1, textAlign: "center" },
  points: { gap: 12, width: "100%" },
  point: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  pointDot: { fontSize: 16, lineHeight: 22, marginTop: 1 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 22, fontFamily: Fonts.bodyItalic },
  actions: { gap: 12, width: "100%", marginTop: 4 },
  confirmButton: { borderRadius: 22, borderWidth: 1, paddingVertical: 18, alignItems: "center" },
  confirmText: { fontSize: 17, letterSpacing: 1.1, textTransform: "uppercase" },
  cancelButton: { paddingVertical: 10, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: Fonts.bodyItalic },
});
