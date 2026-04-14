import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Provider, type User as SupabaseUser } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { User } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env["EXPO_PUBLIC_SUPABASE_URL"];
const supabaseAnonKey = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"];

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;

export function getOAuthRedirectUrl(): string {
  return Linking.createURL("/auth/callback");
}

export type SocialProvider = "google" | "apple" | "linkedin" | "github";

export function mapSocialProvider(provider: SocialProvider): Provider {
  switch (provider) {
    case "linkedin":
      return "linkedin_oidc";
    case "github":
      return "github";
    case "apple":
      return "apple";
    case "google":
    default:
      return "google";
  }
}

export function getSocialScopes(provider: SocialProvider): string | undefined {
  if (provider === "linkedin") {
    return "openid profile email";
  }
  return undefined;
}

export function mapSupabaseUser(user: SupabaseUser): User {
  const metadata = user.user_metadata ?? {};
  const fullName =
    metadata["full_name"] ||
    metadata["name"] ||
    [metadata["first_name"], metadata["last_name"]].filter(Boolean).join(" ").trim();

  return {
    id: user.id,
    name: typeof fullName === "string" && fullName ? fullName : user.email?.split("@")[0] || "User",
    email: user.email || "",
    createdAt: user.created_at,
    profile: {
      skills: [],
      experience: [],
      education: [],
      avatar:
        typeof metadata["avatar_url"] === "string"
          ? metadata["avatar_url"]
          : typeof metadata["picture"] === "string"
            ? metadata["picture"]
            : undefined,
    },
  };
}
