import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Animated, Pressable, StyleSheet } from "react-native";

type ToastKind = "success" | "warn" | "error" | "info";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

let toastCallback: ((toast: Omit<Toast, "id">) => void) | null = null;

export function showToast(kind: ToastKind, message: string) {
  if (toastCallback) {
    toastCallback({ kind, message });
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  useEffect(() => {
    toastCallback = addToast;
    return () => {
      toastCallback = null;
    };
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, removeToast };
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onClose());
    }, 4000);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, onClose]);

  const colors: Record<ToastKind, { bg: string; text: string; border: string }> = {
    success: { bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "#22C55E" },
    warn: { bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "#F59E0B" },
    error: { bg: "rgba(239, 68, 68, 0.15)", text: "#F87171", border: "#EF4444" },
    info: { bg: "rgba(156, 163, 175, 0.15)", text: "#D1D5DB", border: "#6B7280" },
  };

  const icons: Record<ToastKind, string> = {
    success: "✓",
    warn: "⚠",
    error: "✕",
    info: "ℹ",
  };

  const style = colors[toast.kind];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={[
          styles.toastContainer,
          { backgroundColor: style.bg, borderColor: style.border },
        ]}
      >
        <Text style={[styles.toastIcon, { color: style.text }]}>
          {icons[toast.kind]}
        </Text>
        <Text style={[styles.toastMessage, { color: style.text }]}>
          {toast.message}
        </Text>
        <Pressable onPress={onClose} style={styles.toastClose}>
          <Text style={[styles.toastCloseText, { color: style.text }]}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  toastContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 12,
    fontWeight: "600",
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  toastClose: {
    padding: 4,
    marginLeft: 8,
  },
  toastCloseText: {
    fontSize: 12,
    opacity: 0.7,
  },
});
