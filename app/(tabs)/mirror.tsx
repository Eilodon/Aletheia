import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, FlatList, Animated, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
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

interface ReadingWithDetails extends Reading {
  sourceName?: string;
  symbolName?: string;
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [readings, setReadings] = useState<ReadingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
  }, [fadeAnim, loadReadings]);

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

  const renderReadingItem = ({ item }: { item: ReadingWithDetails }) => (
    <PressableCard
      onPress={() => handleReadingPress(item)}
      style={{
        padding: 18,
        borderRadius: 20,
        backgroundColor: colors.surface + "E0",
        borderWidth: 1,
        borderColor: colors.border + "66",
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
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>AI</Text>
          </View>
        )}
      </View>
      
      <Text style={{ fontSize: 16, color: colors.foreground, marginBottom: 12, lineHeight: 24, fontFamily: Fonts.serif }} numberOfLines={2}>
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
      </View>
    </PressableCard>
  );

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-20">
      <RitualOrnament variant="sigil" />
      <Text className="text-lg text-foreground mb-2 mt-4" style={{ fontFamily: Fonts.serif }}>
        Chưa có lần đọc nào
      </Text>
      <Text className="text-sm text-muted text-center max-w-xs">
        Bắt đầu lần đọc đầu tiên của bạn. Mỗi lần đọc sẽ được lưu lại ở đây.
      </Text>
      <Pressable
        onPress={() => router.push("/reading/situation")}
        className="mt-6 px-6 py-3 rounded-xl"
        style={{ backgroundColor: colors.surface + "F2", borderWidth: 1, borderColor: colors.primary + "88" }}
      >
        <Text className="text-base text-foreground" style={{ fontFamily: Fonts.serif }}>Bắt đầu đọc</Text>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <View className="pb-6 pt-2 items-center gap-3">
      <RitualOrnament variant="line" />
      <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts.serif }}>Gương</Text>
      <Text className="text-sm text-muted text-center">
        {readings.length} lần đọc đã lưu
      </Text>
    </View>
  );

  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <FlatList
          data={readings}
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
