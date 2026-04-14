import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { SOCIAL_BUTTONS } from "@/utils/socialAuth";
import type { SocialProvider } from "@/utils/supabase";

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const { login, socialLogin } = useAuth();
  const { success } = useToast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const topPadding = isWeb ? 67 : insets.top;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email, password);
      success("Welcome back!");
    } catch (err: any) {
      const msg = err.message || "Invalid email or password";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    setError("");
    setSocialLoading(provider);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await socialLogin(provider);
    } catch (err: any) {
      const msg = err?.message || "Social login failed.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ["#0B1020", "#151C2C", "#101426"] : ["#EEF2FF", "#F8FAFC", "#F5F3FF"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bgOrbLarge, { backgroundColor: `${theme.tint}18` }]} />
      <View style={[styles.bgOrbSmall, { backgroundColor: `${theme.violet}16` }]} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPadding + 20, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
            <LinearGradient colors={[theme.tint, theme.violet]} style={styles.logoMark}>
              <Feather name="zap" size={26} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brand, { color: theme.tint }]}>AutoHire AI</Text>
            <Text style={[styles.headline, { color: theme.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.subheadline, { color: theme.textSecondary }]}>
              Sign in to your account
            </Text>
          </View>

          <View style={styles.socialRow}>
            {SOCIAL_BUTTONS.map((button) => {
              const palette = button.getTheme(isDark, theme.card, theme.cardBorder);
              return (
                <Pressable
                  key={button.provider}
                  onPress={() => handleSocial(button.provider)}
                  disabled={!!socialLoading}
                  style={({ pressed }) => [
                    styles.socialButton,
                    {
                      backgroundColor: palette.backgroundColor,
                      borderColor: palette.borderColor,
                      shadowColor: theme.cardShadow,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  {socialLoading === button.provider ? (
                    <ActivityIndicator
                      size="small"
                      color={button.provider === "google" ? theme.tint : palette.textColor}
                    />
                  ) : (
                    <>
                      {palette.textIcon ? (
                        <Text style={[styles.socialIcon, { color: palette.iconColor }]}>
                          {palette.textIcon}
                        </Text>
                      ) : (
                        <Feather name={palette.iconName as any} size={16} color={palette.iconColor} />
                      )}
                      <Text style={[styles.socialLabel, { color: palette.textColor }]}>
                        {button.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
            <Text style={[styles.dividerText, { color: theme.textTertiary }]}>
              or continue with email
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
          </View>

          <View style={[styles.form, { backgroundColor: isDark ? "rgba(17,24,39,0.84)" : "rgba(255,255,255,0.84)", borderColor: theme.cardBorder }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${theme.danger}15`, borderColor: `${theme.danger}40` }]}>
                <Feather name="alert-circle" size={14} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: email ? theme.tint : theme.inputBorder,
                  },
                ]}
              >
                <Feather name="mail" size={16} color={theme.textTertiary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: password ? theme.tint : theme.inputBorder,
                  },
                ]}
              >
                <Feather name="lock" size={16} color={theme.textTertiary} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: theme.text }]}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={theme.textTertiary}
                  />
                </Pressable>
              </View>
              <Pressable style={styles.forgotRow}>
                <Text style={[styles.forgotText, { color: theme.tint }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                {
                  backgroundColor: theme.tint,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.signupRow}>
            <Text style={[styles.signupPrompt, { color: theme.textSecondary }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text style={[styles.signupLink, { color: theme.tint }]}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgOrbLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -40,
    right: -40,
  },
  bgOrbSmall: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 999,
    bottom: 80,
    left: -55,
  },
  scroll: { paddingHorizontal: 24 },
  brandSection: { alignItems: "center", marginBottom: 36 },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  brand: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  headline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 24,
  },
  socialButton: {
    minWidth: 132,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  socialIcon: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#EA4335",
  },
  socialLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  form: {
    gap: 18,
    marginBottom: 28,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  forgotRow: { alignItems: "flex-end", marginTop: 8 },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  signupRow: { flexDirection: "row", justifyContent: "center" },
  signupPrompt: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupLink: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
