import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, Pressable, FlatList, Animated, RefreshControl, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonList } from "@/components/skeleton";
import { PressableCard } from "@/components/pressable-card";
import { RitualOrnament } from "@/components/ritual-ornament";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { Reading, MoodTag } from "@/lib/types";
import { Fonts } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { screen, trackArchiveEvent } from "@/lib/analytics";

interface ReadingWithDetails extends Reading {
  sourceName?: string;
  symbolName?: string;
}

type ArchiveFilter = "all" | "favorites" | "ai" | "shared";
type ArchiveSort = "latest" | "oldest" | "depth";

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [readings, setReadings] = useState<ReadingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ArchiveFilter>("all");
  const [activeSort, setActiveSort] = useState<ArchiveSort>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const PAGE_SIZE = 20;

  const loadReadings = useCallback(async (pageNum: number = 0, refresh: boolean = false) => {
    try {
      await getCurrentUserId();
      
      const pageResult = await coreStore.getReadingsPage(PAGE_SIZE, pageNum * PAGE_SIZE);
      const total = pageResult.total_count;
      const pagedReadings = pageResult.items;
      
      // Transform
      const transformed: ReadingWithDetails[] = pagedReadings.map((r: any) => ({
        ...r,
        sourceName: r.source_id || "Unknown",
        symbolName: r.symbol_chosen || "?",
      }));
      
      setReadings((prev) => refresh ? transformed : [...prev, ...transformed]);
      setHasMore((pageNum + 1) * PAGE_SIZE < total);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load readings:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    
    loadReadings(0, true);
    screen("archive", { surface: "mirror_tab" });
  }, [fadeAnim, loadReadings]);

  useFocusEffect(
    useCallback(() => {
      loadReadings(0, true);
    }, [loadReadings]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReadings(0, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadReadings(page + 1);
    }
  };

  const handleReadingPress = (reading: ReadingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackArchiveEvent("reading_opened", {
      reading_id: reading.id,
      source_id: reading.source_id,
      ai_interpreted: reading.ai_interpreted,
      is_favorite: reading.is_favorite,
      shared: reading.shared,
    });
    // Using any to bypass expo-router type strictness - route exists in app/reading/_layout.tsx
    router.push((`/reading/${reading.id}`) as any);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
    });
  };

  const getMoodEmoji = (mood?: MoodTag) => {
    const emojis: Record<string, string> = {
      confused: "😕",
      hopeful: "🌟",
      anxious: "😰",
      curious: "🤔",
      grateful: "🙏",
      grief: "😢",
    };
    return mood ? emojis[mood] || "💭" : "💭";
  };

  const getDepthScore = useCallback((reading: ReadingWithDetails) => {
    let score = 0;
    if (reading.ai_interpreted) score += 4;
    if (reading.mood_tag) score += 2;
    if (reading.situation_text?.trim()) score += 2;
    if (reading.read_duration_s) score += Math.min(reading.read_duration_s / 60, 3);
    if (reading.is_favorite) score += 1.5;
    if (reading.shared) score += 1;
    return score;
  }, []);

  const visibleReadings = useMemo(() => {
    const filtered = readings.filter((reading) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 ||
        reading.situation_text?.toLowerCase().includes(normalizedQuery) ||
        reading.sourceName?.toLowerCase().includes(normalizedQuery) ||
        reading.symbolName?.toLowerCase().includes(normalizedQuery) ||
        reading.symbol_chosen?.toLowerCase().includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }

      switch (activeFilter) {
        case "favorites":
          return reading.is_favorite;
        case "ai":
          return reading.ai_interpreted;
        case "shared":
          return reading.shared;
        default:
          return true;
      }
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (activeSort) {
        case "oldest":
          return a.created_at - b.created_at;
        case "depth":
          return getDepthScore(b) - getDepthScore(a) || b.created_at - a.created_at;
        default:
          return b.created_at - a.created_at;
      }
    });

    return sorted;
  }, [activeFilter, activeSort, getDepthScore, readings, searchQuery]);

  useEffect(() => {
    trackArchiveEvent("filter_changed", { filter: activeFilter });
  }, [activeFilter]);

  useEffect(() => {
    trackArchiveEvent("sort_changed", { sort: activeSort });
  }, [activeSort]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) return;
    const timeoutId = setTimeout(() => {
      trackArchiveEvent("search", {
        query: searchQuery.trim(),
        result_count: visibleReadings.length,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, visibleReadings.length]);

  const filterOptions: { key: ArchiveFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "favorites", label: "Yêu thích" },
    { key: "ai", label: "Có AI" },
    { key: "shared", label: "Đã chia sẻ" },
  ];

  const sortOptions: { key: ArchiveSort; label: string }[] = [
    { key: "latest", label: "Mới nhất" },
    { key: "oldest", label: "Cũ nhất" },
    { key: "depth", label: "Có chiều sâu" },
  ];

  const renderReadingItem = ({ item }: { item: ReadingWithDetails }) => (
    <PressableCard
      onPress={() => handleReadingPress(item)}
      style={{
        padding: 20,
        borderRadius: 24,
        backgroundColor: colors.surface + "C8",
        borderWidth: 1,
        borderColor: colors.primary + "22",
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{getMoodEmoji(item.mood_tag)}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        {item.ai_interpreted && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.primary + "1E", borderWidth: 1, borderColor: colors.primary + "44" }}>
            <Text style={{ fontSize: 10, color: colors.primary, letterSpacing: 1, textTransform: "uppercase", fontFamily: Fonts.display }}>AI</Text>
          </View>
        )}
      </View>
      
      <Text style={{ fontSize: 17, color: colors.foreground, marginBottom: 12, lineHeight: 26, fontFamily: Fonts.bodyItalic }} numberOfLines={2}>
        {item.situation_text || "Không có tình huống"}
      </Text>
      
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 12 }}>✦</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {item.symbol_chosen || "?"}
          </Text>
        </View>
        {item.read_duration_s && (
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {Math.floor(item.read_duration_s / 60)}p{item.read_duration_s % 60}s
          </Text>
        )}
        {item.is_favorite ? <Text style={{ fontSize: 12, color: colors.primary }}>♥</Text> : null}
        {item.shared ? <Text style={{ fontSize: 12, color: colors.primary }}>↗</Text> : null}
      </View>
    </PressableCard>
  );

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-20">
      <RitualOrnament variant="sigil" />
      <Text className="text-lg text-foreground mb-2 mt-4" style={{ fontFamily: Fonts.display }}>
        {readings.length === 0 ? "Chưa có lần đọc nào" : "Không có kết quả phù hợp"}
      </Text>
      <Text className="text-sm text-muted text-center max-w-xs">
        {readings.length === 0
          ? "Bắt đầu lần đọc đầu tiên của bạn. Mỗi lần đọc sẽ được lưu lại ở đây."
          : "Thử đổi từ khóa, bộ lọc hoặc cách sắp xếp để nhìn archive theo một góc khác."}
      </Text>
      {readings.length === 0 ? (
        <Pressable
          onPress={() => router.push("/reading/situation")}
          className="mt-6 px-6 py-3 rounded-xl"
          style={{ backgroundColor: colors.primary + "18", borderWidth: 1, borderColor: colors.primary + "72" }}
        >
          <Text className="text-base text-foreground" style={{ fontFamily: Fonts.display }}>Bắt đầu đọc</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderHeader = () => (
    <View className="pb-6 pt-2 items-center gap-3">
      <RitualOrnament variant="line" />
      <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts.display }}>Gương</Text>
      <Text className="text-sm text-muted text-center">
        {visibleReadings.length} / {readings.length} lần đọc đang hiện
      </Text>
      <View style={{ width: "100%", gap: 12, marginTop: 8 }}>
        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.primary + "22",
            backgroundColor: colors.surface + "BC",
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tình huống, nguồn hoặc biểu tượng"
            placeholderTextColor={colors.muted}
            style={{
              color: colors.foreground,
              paddingVertical: 12,
              fontSize: 14,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {filterOptions.map((option) => {
            const active = option.key === activeFilter;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(option.key);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: active ? colors.primary + "18" : colors.surface + "DA",
                  borderWidth: 1,
                  borderColor: active ? colors.primary + "72" : colors.primary + "22",
                }}
              >
                <Text style={{ color: active ? colors.foreground : colors.muted, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {sortOptions.map((option) => {
            const active = option.key === activeSort;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSort(option.key);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: active ? colors.primary + "18" : "transparent",
                }}
              >
                <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <FlatList
          data={visibleReadings}
          renderItem={renderReadingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={isLoading ? <SkeletonList count={3} /> : renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </ScreenContainer>
  );
}
