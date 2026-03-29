import { useRouter } from "expo-router";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleStartReading = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/reading/situation");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between gap-8">
          {/* Header */}
          <View className="items-center gap-4 pt-12">
            <Text className="text-4xl font-bold text-foreground">✦ ALETHEIA ✦</Text>
            <Text className="text-base text-muted text-center">Not a fortune. A mirror.</Text>
          </View>

          {/* Main CTA */}
          <View className="items-center gap-6">
            <Pressable
              onPress={handleStartReading}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  borderRadius: 12,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text className="text-lg font-semibold text-white text-center">Lật lá</Text>
            </Pressable>

            <Text className="text-sm text-muted text-center max-w-xs">
              Chọn một biểu tượng để bắt đầu lần đọc hôm nay
            </Text>
          </View>

          {/* Footer Info */}
          <View className="items-center gap-2 pb-12">
            <Text className="text-xs text-muted">Aletheia v1.0</Text>
            <Text className="text-xs text-muted">Offline-first reflection app</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
