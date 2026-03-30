import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, FlatList, Animated, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonList } from "@/components/skeleton";
import { PressableCard } from "@/components/pressable-card";
import { coreStore } from "@/lib/services/core-store";
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
      style={{
        padding: 18,
        borderRadius: 20,
        backgroundColor: colors.surface + "20",
        borderWidth: 1,
        borderColor: colors.border + "30",
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{getMoodEmoji(item.mood_tag)}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        {item.ai_interpreted && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.primary + "20" }}>
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>AI</Text>
          </View>
        )}
      </View>
      
      <Text style={{ fontSize: 15, color: colors.foreground, marginBottom: 10, lineHeight: 22 }} numberOfLines={2}>
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
