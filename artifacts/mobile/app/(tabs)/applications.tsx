import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";

const STATUS_TABS = ["All", "Applied", "Interview", "Offer", "Rejected"];

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  Applied: { color: "#4F46E5", icon: "send", label: "Applied" },
  Interview: { color: "#F59E0B", icon: "calendar", label: "Interview" },
  Offer: { color: "#10B981", icon: "check-circle", label: "Offer" },
  Rejected: { color: "#F43F5E", icon: "x-circle", label: "Rejected" },
  Pending: { color: "#6B7280", icon: "clock", label: "Pending" },
};

export default function ApplicationsScreen() {
  const { theme, isDark } = useTheme();
  const { applications, updateApplicationStatus } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const topPadding = isWeb ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState("All");

  const filtered =
    activeTab === "All" ? applications : applications.filter((a) => a.status === activeTab);

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = tab === "All" ? applications.length : applications.filter((a) => a.status === tab).length;
    return acc;
  }, {} as Record<string, number>);

  const totalOffer = applications.filter((a) => a.status === "Offer").length;
  const totalInterview = applications.filter((a) => a.status === "Interview").length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerGlowWrap}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(139,92,246,0.24)", "rgba(28,15,58,0.14)", "rgba(11,7,24,0)"]
              : ["rgba(255,255,255,0.42)", "rgba(214,232,255,0.26)", "rgba(221,238,255,0)"]
          }
          style={styles.headerGlow}
        />
      </View>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View pointerEvents="none" style={styles.headerBubblePrimary} />
        <View pointerEvents="none" style={styles.headerBubbleSecondary} />
        <View style={[styles.headerInner, isWide && styles.headerInnerWide]}>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your journey</Text>
          <Text style={[styles.title, { color: theme.text }]}>Applications</Text>

          {applications.length > 0 && (
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? "rgba(92,61,214,0.18)" : "rgba(255,255,255,0.58)",
                    borderColor: isDark ? "rgba(167,139,250,0.26)" : "rgba(99,102,241,0.2)",
                  },
                ]}
              >
                <BlurView
                  intensity={isDark ? 30 : 55}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statNum, { color: theme.tint }]}>{applications.length}</Text>
                <Text style={[styles.statLabel, { color: theme.tint }]}>Total</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.56)",
                    borderColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.22)",
                  },
                ]}
              >
                <BlurView
                  intensity={isDark ? 30 : 55}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statNum, { color: theme.warning }]}>{totalInterview}</Text>
                <Text style={[styles.statLabel, { color: theme.warning }]}>Interviews</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.56)",
                    borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.2)",
                  },
                ]}
              >
                <BlurView
                  intensity={isDark ? 30 : 55}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statNum, { color: theme.emerald }]}>{totalOffer}</Text>
                <Text style={[styles.statLabel, { color: theme.emerald }]}>Offers</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.tabsOuter, isWide && styles.tabsOuterWide]}>
        <View
          style={[
            styles.tabsBar,
            {
              borderBottomColor: theme.separator,
              backgroundColor: isDark ? "rgba(52,33,100,0.34)" : "rgba(255,255,255,0.74)",
              borderColor: isDark ? "rgba(167,139,250,0.18)" : "rgba(148,163,184,0.14)",
            },
          ]}
        >
        <BlurView
          intensity={isDark ? 28 : 50}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => { setActiveTab(tab); Haptics.selectionAsync(); }}
            style={[
              styles.tabItem,
              activeTab === tab && [
                styles.tabItemActive,
                {
                  borderBottomColor: theme.tint,
                  backgroundColor: isDark ? "rgba(92,61,214,0.24)" : "rgba(255,255,255,0.72)",
                },
              ],
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.tint : theme.textSecondary }]}>
              {tab}
            </Text>
            {counts[tab] > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab ? theme.tint : theme.backgroundSecondary }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === tab ? "#fff" : theme.textSecondary }]}>
                  {counts[tab]}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, isWide && styles.listWide, { paddingBottom: insets.bottom + 90 }]}
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              {
                backgroundColor: isDark ? "rgba(45,29,86,0.4)" : "rgba(255,255,255,0.62)",
                borderColor: isDark ? "rgba(167,139,250,0.14)" : "rgba(148,163,184,0.18)",
              },
            ]}
          >
            <BlurView
              intensity={isDark ? 24 : 42}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.cardBorder }]}>
              <Feather name="inbox" size={32} color={theme.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No applications yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Apply to jobs to track them here
            </Text>
            <Pressable
              onPress={() => router.push("/")}
              style={[styles.browseBtn, { backgroundColor: theme.tint }]}
            >
              <Text style={styles.browseBtnText}>Browse Jobs</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] || STATUS_CONFIG["Applied"];
          return (
            <Pressable
              onPress={() => router.push(`/job/${item.jobId}`)}
              style={({ pressed }) => [
                styles.appCard,
                {
                  backgroundColor: isDark ? "rgba(24,15,50,0.78)" : "rgba(255,255,255,0.66)",
                  borderColor: isDark ? theme.cardBorder : "rgba(148,163,184,0.16)",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <BlurView
                intensity={isDark ? 22 : 40}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.appTop}>
                <View style={[styles.appLogo, { backgroundColor: isDark ? "rgba(139,92,246,0.22)" : "rgba(99,102,241,0.12)" }]}>
                  <Text style={[styles.appLogoText, { color: theme.tint }]}>
                    {item.company?.charAt(0) || "?"}
                  </Text>
                </View>
                <View style={styles.appMeta}>
                  <Text style={[styles.appCompany, { color: theme.textSecondary }]}>{item.company}</Text>
                  <Text style={[styles.appTitle, { color: theme.text }]} numberOfLines={1}>{item.jobTitle}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isDark ? `${status.color}15` : "rgba(255,255,255,0.52)",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : `${status.color}22`,
                    },
                  ]}
                >
                  <Feather name={status.icon as any} size={11} color={status.color} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.appBottom}>
                <View style={styles.appInfo}>
                  <Feather name="calendar" size={11} color={theme.textTertiary} />
                  <Text style={[styles.appDate, { color: theme.textTertiary }]}>
                    Applied {new Date(item.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={styles.statusActions}>
                  {["Interview", "Offer", "Rejected"].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateApplicationStatus(item.id, s as any);
                      }}
                      style={[
                        styles.actionChip,
                        {
                          backgroundColor:
                            item.status === s
                              ? `${STATUS_CONFIG[s].color}20`
                              : isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.52)",
                          borderColor:
                            item.status === s
                              ? STATUS_CONFIG[s].color
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(148,163,184,0.14)",
                        },
                      ]}
                    >
                      <Text style={[styles.actionChipText, { color: item.status === s ? STATUS_CONFIG[s].color : theme.textTertiary }]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGlowWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 210,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 210,
  },
  header: { paddingHorizontal: 16, paddingBottom: 16, overflow: "hidden" },
  headerBubblePrimary: { position: "absolute", right: -26, top: 8, width: 118, height: 118, borderRadius: 59, backgroundColor: "rgba(255,255,255,0.18)" },
  headerBubbleSecondary: { position: "absolute", left: -18, top: 72, width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(95,139,228,0.22)" },
  headerInner: { width: "100%" },
  headerInnerWide: { alignSelf: "center", maxWidth: 1120 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", fontWeight: "700", letterSpacing: -0.5, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 15, borderRadius: 26, borderWidth: 1, shadowColor: "#7EA7DF", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 5, overflow: "hidden" },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  tabsOuter: { paddingHorizontal: 16 },
  tabsOuterWide: { alignItems: "center" },
  tabsBar: { flexDirection: "row", borderBottomWidth: 1, borderWidth: 1, width: "100%", maxWidth: 1120, borderRadius: 26, paddingHorizontal: 8, paddingVertical: 7, overflow: "hidden", shadowColor: "#7EA7DF", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 4 },
  listWide: { alignSelf: "center", width: "100%", maxWidth: 1120 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, flexDirection: "row", justifyContent: "center", gap: 5, borderRadius: 16 },
  tabItemActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12, marginTop: 12, borderRadius: 32, paddingHorizontal: 20, paddingBottom: 24, borderWidth: 1, shadowColor: "#7EA7DF", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 5, overflow: "hidden" },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "700" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  browseBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, shadowColor: "#312E81", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6 },
  browseBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  appCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
  appTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  appLogo: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appLogoText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  appMeta: { flex: 1 },
  appCompany: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  appTitle: { fontSize: 15, fontFamily: "Inter_700Bold", fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  appBottom: { gap: 10 },
  appInfo: { flexDirection: "row", alignItems: "center", gap: 5 },
  appDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusActions: { flexDirection: "row", gap: 6 },
  actionChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  actionChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
