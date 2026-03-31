import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useState } from "react";
import { coreStore } from "@/lib/services/core-store";
import { Reading } from "@/lib/types";
import * as Haptics from "expo-haptics";

export default function ReadingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [reading, setReading] = useState<Reading | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReading = async () => {
      try {
        const found = await coreStore.getReadingById(id);
        setReading(found);
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

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.muted }}>Đang tải...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!reading) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
          <Text style={{ fontSize: 18, color: colors.foreground, marginBottom: 8 }}>
            Không tìm thấy lần đọc
          </Text>
          <Pressable onPress={handleBack}>
            <Text style={{ color: colors.primary }}>Quay lại</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="items-center pt-4 pb-6">
          <Pressable onPress={handleBack} className="absolute left-0 top-4">
            <Text style={{ fontSize: 24, color: colors.muted }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 11, color: colors.primary, letterSpacing: 2, textTransform: "uppercase" }}>
            Phản chiếu
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "300", color: colors.foreground, marginTop: 8 }}>
            {reading.source_id}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            {new Date(reading.created_at).toLocaleDateString("vi", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Situation */}
        {reading.situation_text && (
          <View className="mb-6">
            <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Tình huống
            </Text>
            <Text style={{ fontSize: 15, color: colors.foreground, lineHeight: 22 }}>
              {reading.situation_text}
            </Text>
          </View>
        )}

        {/* Symbol */}
        <View className="mb-6">
          <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Biểu tượng
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 24 }}>✦</Text>
            <Text style={{ fontSize: 18, color: colors.foreground }}>{reading.symbol_chosen}</Text>
          </View>
        </View>

        {/* AI Interpretation indicator */}
        {reading.ai_interpreted && (
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Text style={{ fontSize: 14 }}>✨</Text>
              <Text style={{ fontSize: 12, color: colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>
                Đã có diễn giải AI
              </Text>
              {reading.ai_used_fallback && (
                <Text style={{ fontSize: 10, color: colors.muted }}>(fallback)</Text>
              )}
            </View>
          </View>
        )}

        {/* Mood Tag */}
        {reading.mood_tag && (
          <View className="mb-6">
            <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Cảm xúc
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: colors.primary + "20",
                }}
              >
                <Text style={{ fontSize: 14, color: colors.primary }}>#{reading.mood_tag}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Duration */}
        {reading.read_duration_s && (
          <View className="mb-6">
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Thời gian đọc: {Math.floor(reading.read_duration_s / 60)}p {reading.read_duration_s % 60}s
            </Text>
          </View>
        )}

        {/* Back button */}
        <View className="gap-3 pt-4 pb-8">
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => ({
              backgroundColor: colors.surface + "20",
              paddingVertical: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border + "30",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>
              Quay lại
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
