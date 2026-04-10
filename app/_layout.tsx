import "@/global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
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
import { flushAnalytics, identify, track } from "@/lib/analytics";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

// Initialize Sentry crash reporting before app starts
initSentry();
void SplashScreen.preventAutoHideAsync();

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
        <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: Fonts.display }]}>{title}</Text>
        <Text style={[styles.gateBody, { color: colors.muted }]}>{body}</Text>
        {detail ? <Text style={[styles.gateDetail, { color: colors.muted }]}>{detail}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={[styles.gateButton, { backgroundColor: colors.surface + "F4", borderColor: colors.primary + "88" }]}
          >
            <Text style={[styles.gateButtonText, { color: colors.foreground, fontFamily: Fonts.display }]}>{actionLabel}</Text>
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
  const [bootstrapDetail, setBootstrapDetail] = useState("Đang dựng nhịp khởi tạo cốt lõi.");
  const [fontsLoaded] = useFonts({
    "AletheiaDisplay-Regular": require("../assets/fonts/Cinzel-Regular.ttf"),
    "AletheiaDisplay-SemiBold": require("../assets/fonts/Cinzel-SemiBold.ttf"),
    "AletheiaBody-Regular": require("../assets/fonts/EBGaramond-Regular.ttf"),
    "AletheiaBody-Medium": require("../assets/fonts/EBGaramond-Medium.ttf"),
    "AletheiaBody-Italic": require("../assets/fonts/EBGaramond-Italic.ttf"),
  });

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

  useEffect(() => {
    if (isIosHold) {
      setIsOnboardingComplete(true);
      return;
    }

    let cancelled = false;
    let probeTimeout: ReturnType<typeof setTimeout> | null = null;
    const bootstrapStart = Date.now();

    const bootstrapApp = async () => {
      try {
        setBootstrapDetail("Đang khởi tạo kho cục bộ và runtime cốt lõi.");
        await dbInit.initialize();

        const afterDbInitMs = Date.now() - bootstrapStart;
        setBootstrapDetail("Đang nạp hồ sơ người dùng và gate onboarding.");

        const userId = await getCurrentUserId();
        const userState = await coreStore.getUserState(userId);

        if (cancelled) {
          return;
        }

        setIsOnboardingComplete(userState.onboarding_complete);
        identify(userId, {
          onboarding_complete: userState.onboarding_complete,
          subscription_tier: userState.subscription_tier,
          preferred_language: userState.preferred_language,
        });
        track("app_bootstrap_completed", {
          onboarding_complete: userState.onboarding_complete,
          native_probe_expected: Platform.OS === "android",
          db_init_ms: afterDbInitMs,
          total_ms: Date.now() - bootstrapStart,
        });

        probeTimeout = setTimeout(() => {
          runAletheiaNativeProbe()
            .then(() =>
              track("native_probe_completed", {
                total_ms: Date.now() - bootstrapStart,
              }),
            )
            .catch((error) => {
              const reason = error instanceof Error ? error.message : String(error);
              console.error("Aletheia native probe failed:", error);
              track("native_probe_failed", { reason });
            });
        }, 0);
      } catch (error) {
        console.error("Failed to bootstrap app shell:", error);
        track("app_bootstrap_failed", {
          reason: error instanceof Error ? error.message : String(error),
          total_ms: Date.now() - bootstrapStart,
        });
        if (!cancelled) {
          setIsOnboardingComplete(false);
          setBootstrapDetail("Không thể hoàn tất khởi tạo cục bộ.");
        }
      }
    };

    bootstrapApp();

    return () => {
      cancelled = true;
      if (probeTimeout) {
        clearTimeout(probeTimeout);
      }
      void flushAnalytics();
    };
  }, [isIosHold]);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

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

  if (!fontsLoaded) {
    return null;
  }

  // Show loading while checking onboarding
  if (isOnboardingComplete === null) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <RootGate
            title="Đang mở Aletheia"
            body="Hệ thống đang đồng bộ safe area, trạng thái người dùng và nhịp khởi tạo cục bộ."
            detail={bootstrapDetail}
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
