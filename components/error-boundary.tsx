import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Fonts } from "@/constants/theme";
import { RitualOrnament } from "@/components/ritual-ornament";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { captureException } from "@/lib/sentry";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const colors = useColors();

  return (
    <ScreenContainer className="px-6 pb-6">
      <View style={styles.container}>
        <RitualOrnament variant="eye" size="lg" />
        <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.serif }]}>Đã xảy ra lỗi</Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          Có điều gì đó đã đứt nhịp trong luồng hiện tại. Bạn có thể thử lại để quay về trạng thái ổn định.
        </Text>
        {error?.message ? (
          <Text style={[styles.detail, { color: colors.muted }]} numberOfLines={3}>
            {error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={resetErrorBoundary}
          style={[styles.button, { backgroundColor: colors.surface + "F4", borderColor: colors.primary + "88" }]}
        >
          <Text style={[styles.buttonText, { color: colors.foreground, fontFamily: Fonts.serif }]}>Thử lại</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error("ErrorBoundary caught:", error, errorInfo);
        captureException(error, { errorInfo, componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 30,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  detail: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  button: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minWidth: 180,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
  },
});
