import { ErrorBoundary as ReactErrorBoundary, ErrorFallbackProps } from "react-error-boundary";
import { View, Text, Button, StyleSheet } from "react-native";

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đã xảy ra lỗi</Text>
      <Text style={styles.message}>Xin lỗi, có lỗi không mong muốn xảy ra.</Text>
      <Button title="Thử lại" onPress={resetErrorBoundary} />
    </View>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error("ErrorBoundary caught:", error, errorInfo);
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
    backgroundColor: "#fafafa",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
});
