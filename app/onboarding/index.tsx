import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { store } from "@/lib/services/store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "@aletheia_onboarding_completed";
const { width } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  icon: string;
}

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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

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
        {/* Progress dots */}
        <View className="flex-row justify-center gap-2 pt-8 pb-4">
          {steps.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
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

        {/* Content */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
          className="flex-1 justify-center items-center"
        >
          <View className="items-center gap-6 max-w-xs">
            {/* Icon */}
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + "15" }}
            >
              <Text className="text-5xl">{step.icon}</Text>
            </View>

            {/* Title */}
            <View className="items-center gap-1">
              <Text className="text-2xl font-bold text-foreground text-center">
                {step.title}
              </Text>
              <Text
                className="text-base text-center"
                style={{ color: colors.primary }}
              >
                {step.subtitle}
              </Text>
            </View>

            {/* Content */}
            <Text className="text-base text-muted text-center leading-relaxed">
              {step.content}
            </Text>
          </View>
        </Animated.View>

        {/* Navigation */}
        <View className="gap-4 pb-8">
          <Pressable
            onPress={handleNext}
            disabled={isCompleting}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 12,
              opacity: pressed || isCompleting ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text className="text-lg font-semibold text-white text-center">
              {isCompleting
                ? "Đang khởi tạo..."
                : isLastStep
                ? "Bắt đầu"
                : "Tiếp tục"}
            </Text>
          </Pressable>

          {currentStep > 0 && (
            <Pressable onPress={handleBack} className="py-3">
              <Text className="text-sm text-muted text-center">Quay lại</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
