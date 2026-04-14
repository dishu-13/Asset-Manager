import type { SocialProvider } from "@/utils/supabase";

export interface SocialButtonTheme {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  iconName?: string;
  textIcon?: string;
}

export interface SocialButtonConfig {
  provider: SocialProvider;
  label: string;
  getTheme: (isDark: boolean, fallbackCard: string, fallbackBorder: string) => SocialButtonTheme;
}

export const SOCIAL_LOGIN_CONFIG_ERROR =
  "Social login is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.";

export const SOCIAL_BUTTONS: SocialButtonConfig[] = [
  {
    provider: "google",
    label: "Google",
    getTheme: (_isDark, fallbackCard, fallbackBorder) => ({
      backgroundColor: fallbackCard,
      borderColor: fallbackBorder,
      textColor: "#111827",
      iconColor: "#EA4335",
      textIcon: "G",
    }),
  },
  {
    provider: "apple",
    label: "Apple",
    getTheme: (isDark) => ({
      backgroundColor: isDark ? "#FFFFFF" : "#000000",
      borderColor: isDark ? "#FFFFFF" : "#000000",
      textColor: isDark ? "#000000" : "#FFFFFF",
      iconColor: isDark ? "#000000" : "#FFFFFF",
      iconName: "smartphone",
    }),
  },
  {
    provider: "linkedin",
    label: "LinkedIn",
    getTheme: () => ({
      backgroundColor: "#0A66C2",
      borderColor: "#0A66C2",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
      iconName: "linkedin",
    }),
  },
  {
    provider: "github",
    label: "GitHub",
    getTheme: (isDark) => ({
      backgroundColor: isDark ? "#171717" : "#111827",
      borderColor: isDark ? "#262626" : "#111827",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
      iconName: "github",
    }),
  },
];
