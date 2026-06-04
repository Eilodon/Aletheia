import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/utils/haptics";

import { Fonts } from "@/constants/theme";
import { RitualOrnament } from "@/components/ritual-ornament";
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonCard } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { useColors } from "@/hooks/use-colors";
import { useReading } from "@/lib/context/reading-context";
import { coreStore } from "@/lib/services/core-store";
import { shouldUseAletheiaNative } from "@/lib/native/runtime";
import type { MoodTag, Reading } from "@/lib/types";
import { screen, trackArchiveEvent, trackGiftEvent, trackShareEvent } from "@/lib/analytics";

const MOOD_LABELS: Record<MoodTag, string> = {
  anxious: "Lo âu",
  confused: "Mơ hồ",
  curious: "Tò mò",
  grateful: "Biết ơn",
  grief: "Mất mát",
  hopeful: "Hy vọng",
};

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
      showToast("success", reading.is_favorite ? "Đã bỏ khỏi mục yêu thích" : "Đã thêm vào mục yêu thích");
    } catch (error) {
      console.error("Failed to update favorite:", error);
      showToast("error", error instanceof Error ? error.message : "Không thể cập nhật yêu thích");
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const handleShareAgain = async () => {
    if (!reading || isSharing) return;
    haptic("confirm");
    setIsSharing(true);

    try {
      const quote = passageText ?? reading.situation_text ?? "Một lần phản chiếu từ Aletheia";
      const reference = passageReference ?? sourceName ?? reading.source_id;
      await Share.share({
        message: `“${quote}”\n\n— ${reference}\nBiểu tượng: ${reading.symbol_chosen}\n\nTừ Aletheia ✦`,
      });
      await syncFlags({ shared: true });
      trackShareEvent("shared", {
        mode: "archive_detail",
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      showToast("success", "Đã mở chia sẻ");
    } catch (error) {
      console.error("Failed to share reading:", error);
      showToast("error", "Không thể chia sẻ lần đọc này");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    if (!reading || isDeleting) return;
    haptic("confirm");
    Alert.alert(
      "Xóa lần đọc?",
      "Lần đọc này sẽ bị xóa khỏi Gương. Không thể hoàn tác.",
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xóa",
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
              showToast("error", "Không thể xóa lần đọc này.");
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
      showToast("error", "Không thể mở lại flow từ lần đọc này");
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
          `Gần đây mình đang đọc ${sourceTitle} trên Aletheia — và muốn gửi cho bạn một lần đọc từ cùng nguồn này.`,
          ``,
          `Chọn một biểu tượng và để nó phản chiếu điều gì đó:`,
          gift.deep_link,
          ``,
          `(Link dùng được trong 7 ngày, không cần cài app)`,
        ].join("\n"),
      });
      trackGiftEvent("shared", {
        reading_id: reading.id,
        source_id: reading.source_id,
      });
      showToast("success", "Đã tạo và mở quà để chia sẻ");
    } catch (error) {
      console.error("Failed to create gift:", error);
      trackGiftEvent("create_failed", {
        reading_id: reading.id,
        source_id: reading.source_id,
        message: error instanceof Error ? error.message : "unknown",
      });
      showToast("error", error instanceof Error ? error.message : "Không thể tạo quà");
    } finally {
      setIsGifting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="px-6 pb-6">
        <View style={styles.loadingWrap}>
          <RitualOrnament variant="sigil" />
          <Text style={[styles.loadingTitle, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
            Đang mở lại phản chiếu
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
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
            Không tìm thấy lần đọc
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Có thể bản ghi này đã không còn trên thiết bị, hoặc deep-link bạn mở không còn hợp lệ.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>Quay lại</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6 pb-6">
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
          <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
            {sourceName || reading.source_id}
          </Text>
          <Text style={[styles.metaText, { color: colors.muted }]}>{formattedDate}</Text>
        </View>

        {passageText ? (
          <View style={[styles.heroCard, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "42" }]}>
            <Text style={[styles.heroQuote, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>“{passageText}”</Text>
            <View style={styles.heroFooter}>
              <View style={[styles.rule, { backgroundColor: colors.primary + "50" }]} />
              <Text style={[styles.heroRef, { color: colors.muted }]}>{passageReference}</Text>
            </View>
          </View>
        ) : null}

        {reading.situation_text ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Tình huống lúc đó</Text>
              {reading.hide_situation && (
                <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ẩn trong Gương</Text>
              )}
            </View>
            <Text style={[styles.sectionBody, { color: colors.foreground }]}>{reading.situation_text}</Text>
          </View>
        ) : null}

        <View style={styles.rowGrid}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Biểu tượng đã chọn</Text>
            <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>{reading.symbol_chosen}</Text>
            <Text style={[styles.infoHint, { color: colors.muted }]}>
              {reading.symbol_method === "auto" ? "Được chọn bởi hệ thống" : "Được chọn thủ công"}
            </Text>
          </View>

          {reading.mood_tag ? (
            <View style={[styles.infoCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Cảm xúc ghi nhận</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
                {MOOD_EMOJIS[reading.mood_tag]} {MOOD_LABELS[reading.mood_tag]}
              </Text>
              <Text style={[styles.infoHint, { color: colors.muted }]}>#{reading.mood_tag}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface + "BC", borderColor: colors.primary + "22" }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Dấu vết của phiên đọc</Text>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>AI diễn giải</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>
              {reading.ai_interpreted ? (reading.ai_used_fallback ? "Có, dùng fallback" : "Có") : "Không"}
            </Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>Thời gian đọc</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>
              {reading.read_duration_s ? `${Math.floor(reading.read_duration_s / 60)}p ${reading.read_duration_s % 60}s` : "Không rõ"}
            </Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>Đã chia sẻ</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>{reading.shared ? "Có" : "Chưa"}</Text>
          </View>
          <View style={styles.traceRow}>
            <Text style={[styles.traceKey, { color: colors.muted }]}>Yêu thích</Text>
            <Text style={[styles.traceValue, { color: colors.foreground }]}>{reading.is_favorite ? "Có" : "Chưa"}</Text>
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
                {reading.is_favorite ? "Bỏ yêu thích" : "Yêu thích"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShareAgain}
              disabled={isSharing}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isSharing ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                {isSharing ? "Đang chia sẻ..." : "Chia sẻ lại"}
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
                {reading.hide_situation ? "Hiện tình huống trong Gương" : "Ẩn tình huống trong Gương"}
              </Text>
            </Pressable>
          ) : null}
          {shouldUseAletheiaNative() && (
            <Pressable
              onPress={handleGift}
              disabled={isGifting}
              style={[styles.secondaryButton, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "22", opacity: isGifting ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                {isGifting ? "Đang tạo quà..." : "Tặng lần đọc này"}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleReopen}
            disabled={isReopening}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72", opacity: isReopening ? 0.65 : 1 }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
              {isReopening ? "Đang mở lại..." : "Đọc lại từ nguồn này"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "72" }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
              Quay lại lịch sử
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
