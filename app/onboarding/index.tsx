import { useState, useRef } from "react";
import { View, Text, Pressable, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserIntent } from "@/lib/types";

const ONBOARDING_COMPLETED_KEY = "@aletheia_onboarding_completed";
const USER_INTENT_KEY = "@aletheia_user_intent";
const { width } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  icon: string;
  isIntentStep?: boolean;
}

const intents = [
  { intent: UserIntent.Clarity, label: "Sự rõ ràng", emoji: "🔍", desc: "Cần hiểu rõ hơn về tình huống" },
  { intent: UserIntent.Comfort, label: "Sự an ủi", emoji: "💛", desc: "Cần được chữa lành" },
  { intent: UserIntent.Challenge, label: "Một thách thức", emoji: "⚔️", desc: "Sẵn sàng đối mặt sự thật" },
  { intent: UserIntent.Guidance, label: "Để vũ trụ dẫn lối", emoji: "🌙", desc: "Không cần gì cụ thể" },
];

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Aletheia",
    subtitle: "Not a fortune. A mirror.",
    content:
      "Aletheia không dự đoán tương lai. Đây là không gian để bạn phản chiếu — qua những đoạn trích triết lý từ khắp nơi trên thế giới.",
    icon: "✦",
  },
  {
    id: "which-mirror",
    title: "Gương nào?",
    subtitle: "Hôm nay bạn đang cần gì?",
    content: "Chọn gương phản chiếu phù hợp với tâm trạng của bạn",
    icon: "🪞",
    isIntentStep: true,
  },
  {
    id: "how-it-works",
    title: "Lật một lá",
    subtitle: "Chọn biểu tượng, nhận đoạn trích",
    content:
      "Mỗi lần đọc, bạn chọn 1 trong 3 biểu tượng. Mỗi biểu tượng dẫn đến một đoạn trích ngẫu nhiên từ các nguồn triết lý: I Ching, Rumi, Marcus Aurelius...",
    icon: "🎴",
  },
  {
    id: "ai-interpretation",
    title: "Diễn giải AI",
    subtitle: "Không bắt buộc, không phán xét",
    content:
      "Bạn có thể yêu cầu AI diễn giải đoạn trích theo ngữ cảnh của mình. Hoặc không. Offline hoàn toàn nếu bạn muốn.",
    icon: "✨",
  },
  {
    id: "privacy",
    title: "Riêng tư",
    subtitle: "Dữ liệu của bạn, trên máy bạn",
    content:
      "Mọi lần đọc đều lưu local. Không tài khoản. Không theo dõi. Chỉ bạn và những suy ngẫm của mình.",
    icon: "🔒",
  },
  {
    id: "ready",
    title: "Sẵn sàng",
    subtitle: "Bắt đầu lần đọc đầu tiên?",
    content:
      "Chọn một biểu tượng. Để đoạn trích nói với bạn. Không cần hiểu ngay — chỉ cần đọc.",
    icon: "🌟",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<UserIntent | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isIntentStep = step?.isIntentStep;

  const animateTransition = (direction: "next" | "prev") => {
    const toValue = direction === "next" ? -width : width;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep((prev) =>
        direction === "next" ? Math.min(prev + 1, steps.length - 1) : Math.max(prev - 1, 0)
      );
      
      slideAnim.setValue(direction === "next" ? width : -width);
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isLastStep) {
      completeOnboarding();
    } else {
      animateTransition("next");
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      
      // Save user intent if selected
      if (selectedIntent) {
        await AsyncStorage.setItem(USER_INTENT_KEY, selectedIntent);
      }
      
      // Initialize user state
      const userId = await getCurrentUserId();
      await store.getUserState(userId);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main app
      router.replace("/");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition("prev");
    }
  };

  return (
    <ScreenContainer className="p-6">
      <View className="flex-1">
        {/* Progress - Ceremonial line */}
        <View className="pt-6 pb-2">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {steps.map((_, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: index === currentStep ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index <= currentStep ? colors.primary : colors.border + "40",
                  }}
                />
                {index < steps.length - 1 && (
                  <View style={{ width: 8, height: 1, backgroundColor: index < currentStep ? colors.primary + "40" : "transparent" }} />
                )}
              </View>
            ))}
          </View>
          <Text style={{ textAlign: "center", fontSize: 11, color: colors.muted, marginTop: 8 }}>
            bước {currentStep + 1} / {steps.length}
          </Text>
        </View>

        {/* Skip button */}
        {!isLastStep && (
          <Pressable
            onPress={handleSkip}
            className="absolute top-6 right-6 py-2 px-4"
          >
            <Text className="text-sm text-muted">Bỏ qua</Text>
          </Pressable>
        )}

        {/* Content - Chapter card style */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
          className="flex-1 justify-center"
        >
          {isIntentStep ? (
            <View className="w-full gap-4">
              <View className="items-center gap-2 mb-6">
                <Text style={{ fontSize: 28, fontWeight: "300", color: colors.foreground, textAlign: "center" }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 15, color: colors.primary, textAlign: "center" }}>
                  {step.subtitle}
                </Text>
              </View>
              {intents.map((item) => (
                <Pressable
                  key={item.intent}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedIntent(item.intent);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: selectedIntent === item.intent ? colors.surface + "20" : colors.surface + "08",
                    padding: 18,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: selectedIntent === item.intent ? colors.primary : colors.border + "30",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View className="flex-row items-center gap-4">
                    <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                    <View className="flex-1">
                      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>{item.label}</Text>
                      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    {selectedIntent === item.intent && (
                      <Text style={{ fontSize: 20, color: colors.primary }}>✓</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="items-center px-4">
              {/* Icon - Chapter seal style */}
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: colors.surface + "15",
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontSize: 40 }}>{step.icon}</Text>
              </View>

              {/* Title - Chapter heading */}
              <View className="items-center gap-2 mb-4">
                <Text style={{ fontSize: 26, fontWeight: "300", color: colors.foreground, textAlign: "center", letterSpacing: 1 }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 14, color: colors.primary, textAlign: "center" }}>
                  {step.subtitle}
                </Text>
              </View>

              {/* Content - Chapter body */}
              <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 24, maxWidth: 280 }}>
                {step.content}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Navigation - Premium buttons */}
        <View className="gap-4 pb-6">
          <Pressable
            onPress={handleNext}
            disabled={isCompleting || (isIntentStep && !selectedIntent)}
            style={({ pressed }) => ({
              backgroundColor: (isIntentStep && !selectedIntent) ? colors.surface + "40" : colors.primary,
              paddingHorizontal: 40,
              paddingVertical: 18,
              borderRadius: 28,
              opacity: pressed || isCompleting ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF", textAlign: "center" }}>
              {isCompleting
                ? "Đang khởi tạo..."
                : isLastStep
                ? "Bước vào"
                : isIntentStep && !selectedIntent
                ? "Chọn một gương"
                : "Tiếp tục"}
            </Text>
          </Pressable>

          {currentStep > 0 && (
            <Pressable onPress={handleBack} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>Quay lại</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
