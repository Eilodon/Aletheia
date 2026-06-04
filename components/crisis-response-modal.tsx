import { Modal, View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { useStrings } from "@/lib/i18n";
import { CRISIS_HOTLINES } from "@/lib/utils/crisis-guard";
import { getLocale } from "@/lib/i18n";

interface Props {
  visible: boolean;
  onContinue: () => void;
  onReturn: () => void;
}

export function CrisisResponseModal({ visible, onContinue, onReturn }: Props) {
  const colors = useColors();
  const s = useStrings();
  const locale = getLocale();
  const hotlines = locale === "vi" ? CRISIS_HOTLINES.vi : CRISIS_HOTLINES.en;

  const handleHotlinePress = (contact: string) => {
    if (contact.startsWith("http")) {
      Linking.openURL(contact);
    } else if (contact.startsWith("Text")) {
      // SMS — just show the number, can't auto-compose cross-platform reliably
    } else {
      Linking.openURL(`tel:${contact.replace(/\s/g, "")}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onReturn}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface + "FA", borderColor: colors.primary + "22" }]}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
            {s.situation.crisisTitle}
          </Text>

          <Text style={[styles.body, { color: colors.foreground }]}>
            {s.situation.crisisBody}
          </Text>

          <View style={[styles.hotlineBlock, { borderColor: colors.primary + "28" }]}>
            <Text style={[styles.hotlineLabel, { color: colors.muted }]}>
              {s.situation.crisisHotlineLabel}
            </Text>
            {hotlines.map((h, i) => (
              <Pressable key={i} onPress={() => handleHotlinePress(h.number)} style={styles.hotlineRow}>
                <Text style={[styles.hotlineName, { color: colors.foreground }]}>{h.name}</Text>
                <Text style={[styles.hotlineNumber, { color: colors.primary }]}>{h.number}</Text>
                <Text style={[styles.hotlineNote, { color: colors.muted }]}>{h.note}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onReturn}
            style={[styles.returnButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.returnText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
              {s.situation.crisisReturn}
            </Text>
          </Pressable>

          <Pressable onPress={onContinue} style={styles.continueButton}>
            <Text style={[styles.continueText, { color: colors.muted }]}>
              {s.situation.crisisContinue}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { borderRadius: 32, borderWidth: 1, padding: 28, gap: 18, width: "100%", maxWidth: 400 },
  title: { fontSize: 20, textAlign: "center", letterSpacing: 0.5 },
  body: { fontSize: 15, lineHeight: 24, textAlign: "center", fontFamily: Fonts.bodyItalic },
  hotlineBlock: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  hotlineLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2, textAlign: "center" },
  hotlineRow: { gap: 2 },
  hotlineName: { fontSize: 13, fontFamily: Fonts.bodyMedium },
  hotlineNumber: { fontSize: 15, fontFamily: Fonts.display, letterSpacing: 0.5 },
  hotlineNote: { fontSize: 11, fontFamily: Fonts.bodyItalic },
  returnButton: { borderRadius: 22, borderWidth: 1, paddingVertical: 16, alignItems: "center" },
  returnText: { fontSize: 16, letterSpacing: 0.8, textTransform: "uppercase" },
  continueButton: { paddingVertical: 8, alignItems: "center" },
  continueText: { fontSize: 13, fontFamily: Fonts.bodyItalic },
});
