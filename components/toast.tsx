import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Animated, Pressable, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

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

  const colors: Record<ToastKind, { bg: string; text: string; border: string; glyph: string }> = {
    success: { bg: "rgba(22, 40, 31, 0.92)", text: "#E5F5E9", border: "#5FA97A", glyph: "✦" },
    warn: { bg: "rgba(33, 26, 19, 0.94)", text: "#F6E7BC", border: "#D7B46A", glyph: "◈" },
    error: { bg: "rgba(39, 18, 18, 0.94)", text: "#FFD8D8", border: "#C97979", glyph: "✕" },
    info: { bg: "rgba(23, 21, 32, 0.94)", text: "#F2EADB", border: "#8E816F", glyph: "✧" },
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
          {style.glyph}
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
    bottom: 112,
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
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.2,
    marginBottom: 8,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 7,
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 12,
    fontFamily: Fonts.display,
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bodyItalic,
  },
  toastClose: {
    padding: 4,
    marginLeft: 8,
  },
  toastCloseText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: Fonts.display,
  },
});
