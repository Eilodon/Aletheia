import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/utils/haptics";

import { Fonts } from "@/constants/theme";
import { DURATION } from "@/lib/constants/animation";
import { RitualOrnament } from "@/components/ritual-ornament";
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonCard } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { useColors } from "@/hooks/use-colors";
import { useStrings, useDisplayFont } from "@/lib/i18n";
import { useReading } from "@/lib/context/reading-context";
import { coreStore } from "@/lib/services/core-store";
import type { MoodTag, Reading } from "@/lib/types";
import { screen, trackArchiveEvent, trackGiftEvent, trackShareEvent } from "@/lib/analytics";


const MOOD_EMOJIS: Record<MoodTag, string> = {
  anxious: "😰",
  confused: "😕",
  curious: "🤔",
  grateful: "🙏",
  grief: "😢",
  hopeful: "🌟",
};

export default function ReadingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const s = useStrings();
  const df = useDisplayFont();
  const router = useRouter();
  const { startReading } = useReading();
  const [reading, setReading] = useState<Reading | null>(null);
  const [sourceName, setSourceName] = useState<string | undefined>();
  const [passageText, setPassageText] = useState<string | undefined>();
  const [passageReference, setPassageReference] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isGifting, setIsGifting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHidingSituation, setIsHidingSituation] = useState(false);

  useEffect(() => {
    const loadReading = async () => {
      try {
        const detail = await coreStore.getReadingDetail(id);
        setReading(detail?.reading ?? null);
        setSourceName(detail?.source?.name);
        setPassageText(detail?.passage?.text);
        setPassageReference(detail?.passage?.reference);
      } catch (error) {
        console.error("Failed to load reading:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadReading();
    }
  }, [id]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLoading && reading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATION.normal,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, reading, fadeAnim]);

  const formattedDate = useMemo(() => {
    if (!reading) return "";
    return new Date(reading.created_at).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [reading]);

  useEffect(() => {
    if (!reading) return;
    screen("reading_detail", {
      reading_id: reading.id,
      source_id: reading.source_id,
      ai_interpreted: reading.ai_interpreted,
    });
  }, [reading]);

  const syncFlags = async (flags: { is_favorite?: boolean; shared?: boolean }) => {
    if (!reading) return;
    const updated = await coreStore.updateReadingFlags(reading.id, flags);
    if (updated) {
      setReading(updated);
    }
  };

  const handleToggleFavorite = async () => {
    if (!reading || isSavingFavorite) return;
    setIsSavingFavorite(true);
    haptic("navigation");

    try {
      await syncFlags({ is_favorite: !reading.is_favorite });
      trackArchiveEvent("favorite_toggled", {
        reading_id: reading.id,
        next_value: !reading.is_favorite,
      });
      showToast("success", reading.is_favorite ? s.readingDetail.favoriteRemoved : s.readingDetail.favoriteAdded);
    } catch (error) {
      console.error("Failed to update favorite:", error);
      showToast("error", error instanceof Error ? error.message : s.readingDetail.favoriteError);
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const handleShareAgain = async () => {
    if (!reading || isSharing) return;
    haptic("confirm");
    setIsSharing(true);

    try {
      const quote = passageText ?? reading.situation_text ?? s.readingDetail.shareDefaultQuote;
      const reference = passageReference ?? sourceName ?? reading.source_id;
      await Share.share({
        message: `"${quote}"\n\n— ${reference}\n${s.readingDetail.shareSymbolLabel} ${reading.symbol_chosen}\n\n${s.readingDetail.shareFrom}`,
      });
      await syncFlags({ shared: true });
      trackShareEvent("shared", {
        mode: "archive_detail",
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      showToast("success", s.readingDetail.shareOpened);
    } catch (error) {
      console.error("Failed to share reading:", error);
      showToast("error", s.readingDetail.shareError);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    if (!reading || isDeleting) return;
    haptic("confirm");
    Alert.alert(
      s.readingDetail.deleteTitle,
      s.readingDetail.deleteBody,
      [
        { text: s.readingDetail.deleteCancel, style: "cancel" },
        {
          text: s.readingDetail.deleteConfirm,
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await coreStore.deleteReading(reading.id);
              trackArchiveEvent("reading_deleted", { reading_id: reading.id, source_id: reading.source_id });
              haptic("success");
              router.back();
            } catch (error) {
              console.error("Failed to delete reading:", error);
              showToast("error", s.readingDetail.deleteError);
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleToggleHideSituation = async () => {
    if (!reading || isHidingSituation) return;
    setIsHidingSituation(true);
    haptic("navigation");
    try {
      const updated = await coreStore.updateReadingFlags(reading.id, {
        hide_situation: !reading.hide_situation,
      });
      if (updated) setReading(updated);
    } catch (error) {
      console.error("Failed to toggle hide_situation:", error);
    } finally {
      setIsHidingSituation(false);
    }
  };

  const handleReopen = async () => {
    if (!reading || isReopening) return;
    setIsReopening(true);
    haptic("confirm");

    try {
      await startReading(reading.source_id, reading.situation_text);
      trackArchiveEvent("reopened", {
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      router.replace("/reading/wildcard");
    } catch (error) {
      console.error("Failed to reopen reading:", error);
      showToast("error", s.readingDetail.reopenError);
      setIsReopening(false);
    }
  };

  const handleGift = async () => {
    if (!reading || isGifting) return;
    setIsGifting(true);
    haptic("confirm");
    trackGiftEvent("create_attempted", {
      reading_id: reading.id,
      source_id: reading.source_id,
    });

    try {
      const gift = await coreStore.createGift(reading.source_id);
      trackGiftEvent("created", {
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      const sourceTitle = sourceName || reading.source_id;
      await Share.share({
        message: [
          `${sourceTitle} — ${gift.deep_link}`,
          ``,
          `${s.shareCard.shareAttributionShort}`,
        ].join("\n"),
      });
      trackGiftEvent("shared", {
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      showToast("success", s.readingDetail.giftCreated);
    } catch (error) {
      console.error("Failed to create gift:", error);
      trackGiftEvent("create_failed", {
        reading_id: reading.id,
        source_id: reading.source_id,
        message: error instanceof Error ? error.message : "unknown",
      });
      showToast("error", error instanceof Error ? error.message : s.readingDetail.giftError);
    } finally {
      setIsGifting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="px-6 pb-6">
        <View style={styles.loadingWrap}>
          <RitualOrnament variant="sigil" />
          <Text style={[styles.loadingTitle, { color: colors.foreground, fontFamily: df.display }]}>
            {s.readingDetail.reopeningLabel}
          </Text>
          <View style={styles.loadingCards}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!reading) {
    return (
      <ScreenContainer className="px-6 pb-6">
        <View style={styles.emptyWrap}>
          <RitualOrnament variant="eye" size="lg" />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: df.display }]}>
            {s.readingDetail.notFoundTitle}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {s.readingDetail.notFoundBody}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: df.display }]}>{s.readingDetail.backButton}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6 pb-6">
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22" }]}
          >
            <Text style={[styles.backButtonText, { color: colors.foreground }]}>←</Text>
          </Pressable>
          <RitualOrnament variant="line" />
          <Text style={[styles.kicker, { color: colors.primary }]}>Reflection Archive</Text>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: df.display }]}>
            {sourceName || reading.source_id}
          </Text>
          <Text style={[styles.metaText, { color: colors.muted }]}>{formattedDate}</Text>
        </View>

        {passageText ? (
          <View style={[styles.heroCard, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "42" }]}>
            <Text style={[styles.heroQuote, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>"{passageText}"</Text>
            <View style={styles.heroFooter}>
              <View style={[styles.rule, { backgroundColor: colors.primary + "50" }]} />
              <Text style={[styles.heroRef, { color: colors.muted }]}>{passageReference}</Text>
            </View>
          </View>
        ) : null}

        {reading.situation_text ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>{s.readingDetail.sectionSituation}</Text>
              {reading.hide_situation && (
                <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.readingDetail.hiddenInMirror}</Text>
              )}
            </View>
            <Text style={[styles.sectionBody, { color: colors.foreground }]}>{reading.situation_text}</Text>
          </View>
        ) : null}

        <View style={styles.rowGrid}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>{s.readingDetail.sectionSymbol}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: df.display }]}>{reading.symbol_chosen}</Text>
            <Text style={[styles.infoHint, { color: colors.muted }]}>
              {reading.symbol_method === "auto" ? s.readingDetail.symbolMethodAuto : s.readingDetail.symbolMethodManual}
            </Text>
          </View>

          {reading.mood_tag ? (
            <View style={[styles.infoCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>{s.readingDetail.sectionMood}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: df.display }]}>
                {MOOD_EMOJIS[reading.mood_tag]} {s.readingDetail.moodLabels[reading.mood_tag] ?? reading.mood_tag}
              </Text>
              <Text style={[styles.infoHint, { color: colors.muted }]}>#{reading.mood_tag}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{s.readingDetail.sectionTrace}</Text>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>{s.readingDetail.traceAI}</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>
              {reading.ai_interpreted ? (reading.ai_used_fallback ? s.readingDetail.traceAIFallback : s.readingDetail.traceAIYes) : s.readingDetail.traceAINo}
            </Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>{s.readingDetail.traceDuration}</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>
              {reading.read_duration_s ? `${Math.floor(reading.read_duration_s / 60)}p ${reading.read_duration_s % 60}s` : s.readingDetail.traceDurationUnknown}
            </Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>{s.readingDetail.traceShared}</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>{reading.shared ? s.readingDetail.traceYes : s.readingDetail.traceNo}</Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>{s.readingDetail.traceFavorite}</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>{reading.is_favorite ? s.readingDetail.traceYes : s.readingDetail.traceNo}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.actionGrid}>
            <Pressable
              onPress={handleToggleFavorite}
              disabled={isSavingFavorite}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isSavingFavorite ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                {reading.is_favorite ? s.readingDetail.actionFavoriteRemove : s.readingDetail.actionFavoriteAdd}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShareAgain}
              disabled={isSharing}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isSharing ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                {isSharing ? s.readingDetail.actionSharing : s.readingDetail.actionShareAgain}
              </Text>
            </Pressable>
          </View>
          {reading.situation_text ? (
            <Pressable
              onPress={handleToggleHideSituation}
              disabled={isHidingSituation}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isHidingSituation ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>
                {reading.hide_situation ? s.readingDetail.actionShowSituation : s.readingDetail.actionHideSituation}
              </Text>
            </Pressable>
          ) : null}
          {coreStore.canCreateGift() && (
            <Pressable
              onPress={handleGift}
              disabled={isGifting}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isGifting ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                {isGifting ? s.readingDetail.actionGifting : s.readingDetail.actionGift}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleReopen}
            disabled={isReopening}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72", opacity: isReopening ? 0.65 : 1 }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: df.display }]}>
              {isReopening ? s.readingDetail.actionReopening : s.readingDetail.actionReopen}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: df.display }]}>
              {s.readingDetail.backToHistory}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 18,
  },
  loadingTitle: {
    fontSize: 28,
    textAlign: "center",
  },
  loadingCards: {
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  emptyTitle: {
    fontSize: 28,
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 300,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
  header: {
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
    paddingBottom: 22,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 22,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    textAlign: "center",
  },
  metaText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: Fonts.bodyItalic,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingVertical: 26,
    marginBottom: 16,
  },
  heroQuote: {
    fontSize: 22,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: Fonts.bodyItalic,
  },
  heroFooter: {
    marginTop: 18,
    alignItems: "center",
    gap: 10,
  },
  rule: {
    width: 34,
    height: 1,
  },
  heroRef: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bodyItalic,
  },
  rowGrid: {
    gap: 14,
    marginBottom: 14,
  },
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  infoValue: {
    fontSize: 20,
  },
  infoHint: {
    fontSize: 12,
    fontFamily: Fonts.bodyItalic,
  },
  traceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  traceKey: {
    fontSize: 14,
  },
  traceValue: {
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  primaryButton: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
