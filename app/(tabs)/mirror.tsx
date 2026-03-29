import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, FlatList, Animated, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonList } from "@/components/skeleton";
import { PressableCard } from "@/components/pressable-card";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { Reading, MoodTag } from "@/lib/types";
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
      
      // Get readings from store (limit, offset)
      const allReadings = await store.getReadings(1000, 0);
      
      // Transform and paginate
      const transformed: ReadingWithDetails[] = allReadings.map((r: any) => ({
        ...r,
        sourceName: r.source_id || "Unknown",
        symbolName: r.symbol_chosen || "?",
      }));
      
      const start = pageNum * PAGE_SIZE;
      const paged = transformed.slice(start, start + PAGE_SIZE);
      
      setReadings((prev) => refresh ? paged : [...prev, ...paged]);
      setHasMore(start + PAGE_SIZE < transformed.length);
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
    // Navigate to reading detail
    console.log("View reading:", reading.id);
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
      style={styles.readingCard}
    >
      <View style={styles.readingHeader}>
        <View style={styles.readingHeaderLeft}>
          <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood_tag)}</Text>
          <Text style={styles.readingDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        {item.ai_interpreted && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.readingSituation} numberOfLines={2}>
        {item.situation_text || "Không có tình huống"}
      </Text>
      
      <View style={styles.readingFooter}>
        <Text style={styles.readingMeta}>
          Biểu tượng: {item.symbol_chosen || "?"}
        </Text>
        {item.read_duration_s && (
          <Text style={styles.readingMeta}>
            {Math.floor(item.read_duration_s / 60)}p{item.read_duration_s % 60}s
          </Text>
        )}
      </View>
    </PressableCard>
  );

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-20">
      <Text className="text-4xl mb-4">📖</Text>
      <Text className="text-lg font-medium text-foreground mb-2">
        Chưa có lần đọc nào
      </Text>
      <Text className="text-sm text-muted text-center max-w-xs">
        Bắt đầu lần đọc đầu tiên của bạn. Mỗi lần đọc sẽ được lưu lại ở đây.
      </Text>
      <Pressable
        onPress={() => router.push("/reading/situation")}
        className="mt-6 px-6 py-3 rounded-xl"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-base font-medium text-white">Bắt đầu đọc</Text>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <View className="pb-4">
      <Text className="text-2xl font-bold text-foreground">Gương</Text>
      <Text className="text-sm text-muted mt-1">
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

const styles = StyleSheet.create({
  readingCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(55, 65, 81, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(55, 65, 81, 0.25)",
    marginBottom: 12,
  },
  readingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  readingHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodEmoji: {
    fontSize: 18,
  },
  readingDate: {
    fontSize: 14,
    color: "#9BA1A6",
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(10, 126, 164, 0.2)",
  },
  aiBadgeText: {
    fontSize: 12,
    color: "#0a7ea4",
    fontWeight: "600",
  },
  readingSituation: {
    fontSize: 14,
    color: "#ECEDEE",
    marginBottom: 8,
  },
  readingFooter: {
    flexDirection: "row",
    gap: 12,
  },
  readingMeta: {
    fontSize: 12,
    color: "#9BA1A6",
  },
});
