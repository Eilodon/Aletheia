import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
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
import { RitualOrnament } from "@/components/ritual-ornament";
import { ScreenContainer } from "@/components/screen-container";
import { ToastContainer, useToast } from "@/components/toast";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { initSentry } from "@/lib/sentry";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

// Initialize Sentry crash reporting before app starts
initSentry();

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootGate({
  title,
  body,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();

  return (
    <ScreenContainer className="px-6 pb-6">
      <View style={styles.gateWrap}>
        <RitualOrnament variant="eye" size="lg" />
        <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: Fonts.serif }]}>{title}</Text>
        <Text style={[styles.gateBody, { color: colors.muted }]}>{body}</Text>
        {detail ? <Text style={[styles.gateDetail, { color: colors.muted }]}>{detail}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={[styles.gateButton, { backgroundColor: colors.surface + "F4", borderColor: colors.primary + "88" }]}
          >
            <Text style={[styles.gateButtonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function AppChrome({
  queryClient,
  trpcClient,
}: {
  queryClient: QueryClient;
  trpcClient: ReturnType<typeof createTRPCClient>;
}) {
  const { toasts, removeToast } = useToast();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ReadingProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
              <ToastContainer toasts={toasts} removeToast={removeToast} />
              <StatusBar style="light" />
            </ReadingProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

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
          <RootGate
            title="Đang mở Aletheia"
            body="Hệ thống đang đồng bộ safe area, trạng thái người dùng và nhịp khởi tạo cục bộ."
            detail="Mất vài nhịp đầu thôi."
          />
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
            <Stack.Screen name="onboarding/index" />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  const content = <AppChrome queryClient={queryClient} trpcClient={trpcClient} />;

  if (isIosHold) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <RootGate
            title="iOS đang tạm hold"
            body="Bản hiện tại chỉ hỗ trợ Android với Rust core là nguồn sự thật duy nhất, cùng web runtime riêng."
            detail="Khi iOS path sẵn sàng trở lại, shell này có thể được tháo bỏ."
          />
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

const styles = StyleSheet.create({
  gateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  gateTitle: {
    fontSize: 30,
    textAlign: "center",
  },
  gateBody: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: "center",
  },
  gateDetail: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 320,
    textAlign: "center",
  },
  gateButton: {
    marginTop: 6,
    borderRadius: 22,
    borderWidth: 1.2,
    paddingHorizontal: 22,
    paddingVertical: 16,
    alignItems: "center",
  },
  gateButtonText: {
    fontSize: 17,
  },
});
