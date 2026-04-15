import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import {
  getOAuthRedirectUrl,
  getSocialScopes,
  isSupabaseConfigured,
  mapSocialProvider,
  mapSupabaseUser,
  SocialProvider,
  supabase,
} from "@/utils/supabase";
import { SOCIAL_LOGIN_CONFIG_ERROR } from "@/utils/socialAuth";

const TOKEN_KEY = "autohire_token";
const USER_KEY = "autohire_user";

export interface UserProfile {
  headline?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  bio?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  avatar?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  school: string;
  field?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  socialLogin: (provider: SocialProvider) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string; profile?: Partial<UserProfile> }) => Promise<void>;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getApiBase(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:8080`;
    }
    // On Replit: Expo runs on *.expo.picard.replit.dev
    // The API server is on the main domain *.picard.replit.dev
    if (hostname.includes(".expo.picard.replit.dev")) {
      return `${protocol}//${hostname.replace(".expo.picard.replit.dev", ".picard.replit.dev")}`;
    }
    // Generic: same origin
    return `${protocol}//${hostname}`;
  }

  const configured = process.env["EXPO_PUBLIC_API_URL"];
  if (configured) return configured;

  return "http://localhost:8080";
}

async function apiCall(path: string, options: RequestInit = {}): Promise<any> {
  const base = getApiBase();
  if (!base) throw new Error("API not configured");
  const normalizedPath = path.startsWith("/api/") ? path : `/api${path}`;
  const url = `${base}${normalizedPath}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    if (typeof data === "object" && data && "error" in data && typeof data.error === "string") {
      throw new Error(data.error);
    }
    if (typeof data === "string" && data.trim()) {
      throw new Error(data);
    }
    throw new Error(`API error ${res.status}`);
  }

  if (typeof data !== "object" || !data || !("success" in data)) {
    throw new Error("Unexpected API response.");
  }
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            await saveSession(mapSupabaseUser(session.user), session.access_token);
          }
        }

        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          try {
            // Add 5-second timeout on auth validation to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const data = await apiCall("/auth/me", {
              headers: { Authorization: `Bearer ${storedToken}` },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            setUser(data.user);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } catch (err) {
            // If auth validation fails or times out, continue with stored user
            console.log("Auth validation skipped (timeout or error)");
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await saveSession(mapSupabaseUser(session.user), session.access_token);
        router.replace("/");
        return;
      }

      setUser(null);
      setToken(null);
      await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveSession = async (u: User, t: string) => {
    setUser(u);
    setToken(t);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, t),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(u)),
    ]);
  };

  const getAuthHeader = useCallback((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await saveSession(data.user, data.token);
      router.replace("/");
    } catch (err: any) {
      const msg = err.message || "Login failed";
      if (msg.includes("API not configured") || msg.includes("fetch")) {
        const u: User = {
          id: "local_" + Date.now().toString(36),
          name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          email,
          profile: { skills: [], experience: [], education: [] },
        };
        await saveSession(u, "local_token");
        router.replace("/");
        return;
      }
      throw new Error(msg);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const data = await apiCall("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await saveSession(data.user, data.token);
      router.replace("/");
    } catch (err: any) {
      const msg = err.message || "Signup failed";
      if (msg.includes("API not configured") || msg.includes("fetch")) {
        const u: User = {
          id: "local_" + Date.now().toString(36),
          name,
          email,
          profile: { skills: [], experience: [], education: [] },
        };
        await saveSession(u, "local_token");
        router.replace("/");
        return;
      }
      throw new Error(msg);
    }
  }, []);

  const socialLogin = useCallback(async (provider: SocialProvider) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(SOCIAL_LOGIN_CONFIG_ERROR);
    }

    const redirectTo = getOAuthRedirectUrl();
    const supabaseProvider = mapSocialProvider(provider);
    const scopes = getSocialScopes(provider);

    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo,
          scopes,
        },
      });
      if (error) throw error;
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("Could not start the OAuth login flow.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      throw new Error("Social login was cancelled.");
    }

    const { queryParams } = Linking.parse(result.url);
    const code = typeof queryParams?.code === "string" ? queryParams.code : null;

    if (!code) {
      throw new Error("Login callback did not return an authorization code.");
    }

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    if (!exchangeData.session?.user) throw new Error("Login completed, but no session was returned.");
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    if (token && !token.startsWith("local_") && !token.startsWith("social_")) {
      try {
        await apiCall("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }
    setUser(null);
    setToken(null);
    await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
    router.replace("/login");
  }, [token]);

  const updateProfile = useCallback(async (updates: { name?: string; profile?: Partial<UserProfile> }) => {
    if (!user) return;
    if (token && !token.startsWith("local_") && !token.startsWith("social_")) {
      try {
        const data = await apiCall("/auth/profile", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(updates),
        });
        const updated = data.user;
        setUser(updated);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
        return;
      } catch {}
    }
    const updated: User = {
      ...user,
      name: updates.name ?? user.name,
      profile: updates.profile
        ? {
            skills: [],
            experience: [],
            education: [],
            ...user.profile,
            ...updates.profile,
          }
        : user.profile,
    };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, [user, token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!user, isLoading, login, signup, socialLogin, logout, updateProfile, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
