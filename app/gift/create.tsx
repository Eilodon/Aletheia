import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, TextInput, Share } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import * as Haptics from "expo-haptics";

interface GiftSource {
  id: string;
  name: string;
  tradition: string;
  selected: boolean;
}

export default function GiftCreateScreen() {
  const colors = useColors();
  const router = useRouter();
  const [sources, setSources] = useState<GiftSource[]>([]);
  const [buyerNote, setBuyerNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [giftResult, setGiftResult] = useState<{ token: string; deepLink: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    coreStore.getGiftableSources()
      .then((giftableSources) => {
        setSources(giftableSources.map((source) => ({
          id: source.id,
          name: source.name,
          tradition: source.tradition,
          selected: false,
        })));
      })
      .catch((error) => {
        console.error("Failed to load giftable sources:", error);
      });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const toggleSource = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSources((prev) =>
      prev.map((s) => ({
        ...s,
        selected: s.id === id ? !s.selected : false, // Single selection
      }))
    );
  };

  const selectedSourceId = sources.find((s) => s.selected)?.id;

  const handleCreateGift = async () => {
    if (!selectedSourceId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreating(true);

    try {
      const userId = await getCurrentUserId();
      const userState = await coreStore.getUserState(userId);

      // Check Pro tier (only Pro can create gifts)
      if (userState.subscription_tier !== "pro") {
        // Navigate to paywall
        router.push("/paywall");
        return;
      }

      const gift = await coreStore.createGift(selectedSourceId, buyerNote.trim() || undefined);
      setGiftResult({
        token: gift.token,
        deepLink: gift.deep_link,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to create gift:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareGift = async () => {
    if (!giftResult) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await Share.share({
        title: "Một khoảnh khắc từ Aletheia",
        message: `Tôi muốn tặng bạn một khoảnh khắc phản chiếu: ${giftResult.deepLink}`,
        url: giftResult.deepLink,
      });
    } catch {
      // Fallback: copy to clipboard
      console.log("Share cancelled or failed, link:", giftResult.deepLink);
    }
  };

  const handleClose = () => {
    router.back();
  };

  // Success state
  if (giftResult) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 justify-center items-center">
          <View className="items-center gap-6">
            <View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + "20" }}
            >
              <Text className="text-4xl">🎁</Text>
            </View>

            <View className="items-center gap-2">
              <Text className="text-xl font-semibold text-foreground">
                Quà đã được tạo!
              </Text>
              <Text className="text-sm text-muted text-center max-w-xs">
                Mã quà: {" "}
                <Text className="font-mono font-bold text-primary">
                  {giftResult.token}
                </Text>
              </Text>
            </View>

            <View className="w-full max-w-xs p-4 rounded-xl bg-muted/20">
              <Text className="text-xs text-muted mb-1">Link chia sẻ:</Text>
              <Text className="text-sm text-foreground font-mono">
                {giftResult.deepLink}
              </Text>
            </View>

            <View className="gap-3 w-full max-w-xs">
              <Pressable
                onPress={handleShareGift}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text className="text-lg font-semibold text-white text-center">
                  Chia sẻ quà
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} className="py-3">
                <Text className="text-sm text-muted text-center">Đóng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center gap-2 pt-4 pb-6">
            <Text className="text-3xl">🎁</Text>
            <Text className="text-xl font-semibold text-foreground">
              Gửi một khoảnh khắc
            </Text>
            <Text className="text-sm text-muted text-center max-w-xs">
              Chia sẻ khoảnh khắc triết lý đến người thân
            </Text>
          </View>

          {/* Source Selection */}
          <View className="gap-3 mb-6">
            <Text className="text-sm font-medium text-foreground mb-2">
              Chọn nguồn:
            </Text>
            {sources.map((source) => (
              <Pressable
                key={source.id}
                onPress={() => toggleSource(source.id)}
                className={`p-4 rounded-xl border ${
                  source.selected
                    ? "border-primary bg-primary/5"
                    : "border-muted/30"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text
                      className={`font-medium ${
                        source.selected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {source.name}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {source.tradition}
                    </Text>
                  </View>
                  {source.selected && (
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Buyer Note */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-foreground mb-2">
              Lời nhắn (tùy chọn):
            </Text>
            <TextInput
              value={buyerNote}
              onChangeText={setBuyerNote}
              placeholder="Gửi lời nhắn cho người nhận..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              className="bg-muted/20 rounded-xl p-4 text-base text-foreground"
              maxLength={200}
            />
            <Text className="text-xs text-muted text-right mt-2">
              {buyerNote.length}/200
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions */}
          <View className="gap-3 pb-4">
            <Pressable
              onPress={handleCreateGift}
              disabled={!selectedSourceId || isCreating}
              style={({ pressed }) => ({
                backgroundColor: !selectedSourceId ? colors.surface + "60" : colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 12,
                opacity: pressed || !selectedSourceId ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text className="text-lg font-semibold text-white text-center">
                {isCreating ? "Đang tạo..." : "Tạo quà"}
              </Text>
            </Pressable>

            <Text className="text-xs text-muted text-center">
              Chỉ thành viên Pro mới có thể tạo quà
            </Text>

            <Pressable onPress={handleClose} className="py-3">
              <Text className="text-sm text-muted text-center">Hủy</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
