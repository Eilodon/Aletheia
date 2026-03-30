import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { ReadingProvider } from "@/lib/context/reading-context";
import { dbInit } from "@/lib/services/db-init";
import { runAletheiaNativeProbe } from "@/lib/native/runtime-probe";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/manus-runtime";
import { ErrorBoundary } from "@/components/error-boundary";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const isIosHold = Platform.OS === "ios";
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  // Check onboarding status on mount
  useEffect(() => {
    if (isIosHold) {
      setIsOnboardingComplete(true);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const userId = await getCurrentUserId();
        const userState = await coreStore.getUserState(userId);
        setIsOnboardingComplete(userState.onboarding_complete);
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        setIsOnboardingComplete(false);
      }
    };

    checkOnboarding();
  }, [isIosHold]);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Initialize database on app launch
  useEffect(() => {
    if (isIosHold) return;
    dbInit.initialize().catch((err) => {
      console.error("Failed to initialize database:", err);
    });
  }, [isIosHold]);

  useEffect(() => {
    if (isIosHold) return;
    runAletheiaNativeProbe().catch((err) => {
      console.error("Aletheia native probe failed:", err);
    });
  }, [isIosHold]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const shouldOverrideSafeArea = Platform.OS === "web";

  // Show loading while checking onboarding
  if (isOnboardingComplete === null) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16, color: "#888" }}>Loading...</Text>
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  // Redirect to onboarding if not complete
  if (!isOnboardingComplete && !isIosHold) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ReadingProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
              <StatusBar style="auto" />
            </ReadingProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );

  if (isIosHold) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 28, marginBottom: 16 }}>Aletheia</Text>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10, textAlign: "center" }}>
              iOS đang tạm hold
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 320 }}>
              Bản hiện tại chỉ hỗ trợ Android với Rust core làm nguồn sự thật duy nhất, cùng bản web dùng đường chạy riêng.
            </Text>
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
