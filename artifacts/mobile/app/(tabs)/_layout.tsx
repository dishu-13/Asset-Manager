import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>Jobs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resume">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Resume</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="applications">
        <Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} />
        <Label>Tracker</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isDark } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.82)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isDark ? "#3B2392" : "#7B5CF6",
          borderTopWidth: 0,
          elevation: 0,
          left: 14,
          right: 14,
          bottom: isWeb ? 14 : Math.max(safeAreaInsets.bottom, 10),
          height: isWeb ? 62 : 50 + safeAreaInsets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(safeAreaInsets.bottom, 5),
          borderRadius: 32,
          overflow: "hidden",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: isDark ? 0.36 : 0.12,
          shadowRadius: 30,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 2,
          paddingVertical: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          marginBottom: 2,
          marginTop: 3,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: 0.15,
          textAlign: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="briefcase.fill" tintColor={color} size={24} /> : <Feather name="briefcase" size={23} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="resume"
        options={{
          title: "Resume",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="doc.text.fill" tintColor={color} size={24} /> : <Feather name="file-text" size={23} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Tracker",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="list.clipboard.fill" tintColor={color} size={24} /> : <Feather name="check-square" size={23} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.bar.fill" tintColor={color} size={24} /> : <Feather name="bar-chart-2" size={23} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="gearshape.fill" tintColor={color} size={24} /> : <Feather name="settings" size={23} color={color} strokeWidth={2.6} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});

export default function TabLayout() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
