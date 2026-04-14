import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/utils/supabase";

export default function AuthCallbackScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[] }>();

  useEffect(() => {
    const finish = async () => {
      const code = Array.isArray(params.code) ? params.code[0] : params.code;
      if (code && supabase) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {}
      }
      router.replace("/");
    };

    finish();
  }, [params.code]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.tint} />
      <Text style={[styles.title, { color: theme.text }]}>Completing sign in...</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Please wait while we finish your account login.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
