import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const config: Record<ToastType, { icon: string; bg: string; color: string }> = {
    success: { icon: "check-circle", bg: theme.emerald, color: "#fff" },
    error: { icon: "x-circle", bg: theme.danger, color: "#fff" },
    info: { icon: "info", bg: theme.tint, color: "#fff" },
    loading: { icon: "loader", bg: theme.violet, color: "#fff" },
  };

  const cfg = config[toast.type];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();

    if (toast.type !== "loading" && (toast.duration || 3000) > 0) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true }),
        ]).start(onDismiss);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Animated.View style={[styles.toastItem, { opacity, transform: [{ translateY }], backgroundColor: cfg.bg }]}>
      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
      <Text style={[styles.toastText, { color: cfg.color }]} numberOfLines={2}>{toast.message}</Text>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Feather name="x" size={14} color={cfg.color} style={{ opacity: 0.8 }} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);
    return id;
  }, []);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);
  const loading = useCallback((msg: string) => toast(msg, "loading", 0), [toast]);

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <ToastContext.Provider value={{ toast, success, error, info, loading, dismiss }}>
      {children}
      <View style={[styles.container, { top: topPadding + 8 }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    pointerEvents: "box-none",
  },
  toastItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
});
