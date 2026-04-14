import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { computeATSBreakdown } from "@/utils/atsUtils";

const SOURCE_COLORS: Record<string, string> = {
  Remotive: "#10B981",
  Arbeitnow: "#6366F1",
  LinkedIn: "#0A66C2",
  JSearch: "#FF6B00",
  Glassdoor: "#00A360",
  Adzuna: "#FF5B5B",
  Internal: "#8B5CF6",
};

function BentoCard({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const { theme, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.bentoCard,
        { backgroundColor: theme.card, borderColor: theme.cardBorder, transform: [{ scale: onPress && pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      <BlurView
        intensity={isDark ? 24 : 44}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Pressable>
  );
}

function StatBento({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  const { theme } = useTheme();
  return (
    <BentoCard style={styles.halfBento}>
      <View style={[styles.bentoIconWrap, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.bentoValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>{label}</Text>
      {sub && <Text style={[styles.bentoSub, { color: color }]}>{sub}</Text>}
    </BentoCard>
  );
}

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { applications, savedJobs, jobs, resume } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const topPadding = isWeb ? 67 : insets.top;

  const totalApps = applications.length;
  const interviews = applications.filter((a) => a.status === "Interview").length;
  const offers = applications.filter((a) => a.status === "Offer").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;
  const responseRate = totalApps > 0 ? Math.round(((interviews + offers) / totalApps) * 100) : 0;

  const recommendations = useMemo(() => {
    if (!resume || jobs.length === 0) return [];
    return [...jobs]
      .map((j) => ({ job: j, score: computeATSBreakdown(resume, j).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ job, score }) => ({ ...job, atsScore: score }));
  }, [resume, jobs]);

  const avgAts = resume && jobs.length > 0
    ? Math.round(recommendations.slice(0, jobs.length).reduce((s, j) => s + j.atsScore, 0) / Math.max(recommendations.length, 1))
    : jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + j.atsScore, 0) / jobs.length)
    : 0;

  const topJobs = jobs.filter((j) => j.atsScore >= 80).slice(0, 3);

  const firstName = user?.name?.split(" ")[0] || "there";

  const funnel = [
    { label: "Applied", count: totalApps, color: theme.tint },
    { label: "Interview", count: interviews, color: theme.warning },
    { label: "Offer", count: offers, color: theme.emerald },
  ];

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
          { paddingTop: topPadding + 12, paddingBottom: insets.bottom + 90 },
        ]}
      >
        <View style={styles.greeting}>
          <View>
            <Text style={[styles.greetingSmall, { color: theme.textSecondary }]}>Good day,</Text>
            <Text style={[styles.greetingName, { color: theme.text }]}>
              {firstName} 👋
            </Text>
          </View>
          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={[styles.notifBtn, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="bell" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <LinearGradient
          colors={["#4F46E5", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroBanner}
        >
          <BlurView
            intensity={32}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.heroBubbleLarge} />
          <View pointerEvents="none" style={styles.heroBubbleSmall} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroSmall}>{resume ? "Your resume match avg" : "Avg ATS score"}</Text>
            <Text style={styles.heroScore}>{avgAts}%</Text>
            <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="trending-up" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>
                {avgAts >= 70 ? "Strong profile" : "Needs improvement"}
              </Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.heroRing}>
              <Text style={styles.heroRingText}>{avgAts}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.bentoRow, isWide && styles.bentoRowWide]}>
          <StatBento label="Applications" value={totalApps} icon="send" color={theme.tint} sub={totalApps === 0 ? "Start applying" : undefined} />
          <StatBento label="Interviews" value={interviews} icon="calendar" color={theme.warning} />
        </View>
        <View style={[styles.bentoRow, isWide && styles.bentoRowWide]}>
          <StatBento label="Offers" value={offers} icon="award" color={theme.emerald} />
          <StatBento label="Saved Jobs" value={savedJobs.length} icon="bookmark" color={theme.violet} />
        </View>

        {totalApps > 0 && (
          <BentoCard style={styles.fullBento}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Application Funnel</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              {responseRate}% response rate
            </Text>
            <View style={styles.funnelContainer}>
              {funnel.map((item) => (
                <View key={item.label} style={styles.funnelRow}>
                  <Text style={[styles.funnelLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                  <View style={[styles.funnelTrack, { backgroundColor: theme.backgroundSecondary }]}>
                    <View
                      style={[
                        styles.funnelBar,
                        {
                          backgroundColor: item.color,
                          width: `${Math.max((item.count / maxFunnel) * 100, item.count > 0 ? 8 : 0)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.funnelCount, { color: theme.text }]}>{item.count}</Text>
                </View>
              ))}
            </View>
          </BentoCard>
        )}

        {recommendations.length > 0 && (
          <BentoCard style={styles.fullBento}>
            <View style={styles.cardHeader}>
              <View>
                <View style={styles.sectionLabelRow}>
                  <Feather name="zap" size={14} color={theme.violet} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Recommended For You</Text>
                </View>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  AI-matched to your resume
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/")}
                style={[styles.seeAllBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>See all</Text>
              </Pressable>
            </View>
            {recommendations.map((job, idx) => {
              const atsColor = job.atsScore >= 80 ? theme.emerald : job.atsScore >= 60 ? theme.warning : theme.danger;
              const srcColor = SOURCE_COLORS[job.source || ""] || theme.textTertiary;
              return (
                <Pressable
                  key={job.id}
                  onPress={() => router.push(`/job/${job.id}`)}
                  style={[
                    styles.topJobRow,
                    idx < recommendations.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.separator },
                  ]}
                >
                  <View style={[styles.topJobLogo, { backgroundColor: `${theme.tint}15` }]}>
                    <Text style={[styles.topJobLogoText, { color: theme.tint }]}>{job.company.charAt(0)}</Text>
                  </View>
                  <View style={styles.topJobMeta}>
                    <Text style={[styles.topJobTitle, { color: theme.text }]} numberOfLines={1}>{job.title}</Text>
                    <View style={styles.topJobSubRow}>
                      <Text style={[styles.topJobCompany, { color: theme.textSecondary }]}>{job.company}</Text>
                      {job.source && (
                        <View style={[styles.miniSource, { backgroundColor: `${srcColor}15` }]}>
                          <Text style={[styles.miniSourceText, { color: srcColor }]}>{job.source}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.atsChip, { backgroundColor: `${atsColor}15` }]}>
                    <Text style={[styles.atsChipText, { color: atsColor }]}>{job.atsScore}%</Text>
                  </View>
                </Pressable>
              );
            })}
          </BentoCard>
        )}

        {topJobs.length > 0 && !resume && (
          <BentoCard style={styles.fullBento}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Top Matches</Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>80%+ ATS score</Text>
              </View>
              <Pressable
                onPress={() => router.push("/")}
                style={[styles.seeAllBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>See all</Text>
              </Pressable>
            </View>
            {topJobs.map((job, idx) => (
              <Pressable
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                style={[
                  styles.topJobRow,
                  idx < topJobs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.separator },
                ]}
              >
                <View style={[styles.topJobLogo, { backgroundColor: `${theme.tint}15` }]}>
                  <Text style={[styles.topJobLogoText, { color: theme.tint }]}>{job.company.charAt(0)}</Text>
                </View>
                <View style={styles.topJobMeta}>
                  <Text style={[styles.topJobTitle, { color: theme.text }]} numberOfLines={1}>{job.title}</Text>
                  <Text style={[styles.topJobCompany, { color: theme.textSecondary }]}>{job.company}</Text>
                </View>
                <View style={[styles.atsChip, { backgroundColor: `${theme.emerald}15` }]}>
                  <Text style={[styles.atsChipText, { color: theme.emerald }]}>{job.atsScore}%</Text>
                </View>
              </Pressable>
            ))}
          </BentoCard>
        )}

        {totalApps === 0 && (
          <BentoCard style={styles.fullBento} onPress={() => router.push("/")}>
            <View style={styles.ctaContent}>
              <View style={[styles.ctaIcon, { backgroundColor: `${theme.tint}15` }]}>
                <Feather name="briefcase" size={28} color={theme.tint} />
              </View>
              <Text style={[styles.ctaTitle, { color: theme.text }]}>Start Your Search</Text>
              <Text style={[styles.ctaDesc, { color: theme.textSecondary }]}>
                Browse jobs and track applications here
              </Text>
              <View style={[styles.ctaButton, { backgroundColor: theme.tint }]}>
                <Text style={styles.ctaButtonText}>Browse Jobs</Text>
                <Feather name="arrow-right" size={14} color="#fff" />
              </View>
            </View>
          </BentoCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },
  contentWide: { alignSelf: "center", width: "100%", maxWidth: 1120 },
  greeting: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  greetingSmall: { fontSize: 13, fontFamily: "Inter_400Regular" },
  greetingName: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700", letterSpacing: -0.5 },
  notifBtn: { width: 44, height: 44, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(255,255,255,0.22)" },
  heroBanner: {
    borderRadius: 34,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    overflow: "hidden",
    shadowColor: "#7EA7DF",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  heroBubbleLarge: { position: "absolute", right: -18, top: -8, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.24)" },
  heroBubbleSmall: { position: "absolute", right: 92, bottom: -18, width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(76,115,203,0.22)" },
  heroLeft: { gap: 6 },
  heroSmall: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  heroScore: { fontSize: 42, color: "#fff", fontFamily: "Inter_700Bold", fontWeight: "700", letterSpacing: -1 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  heroBadgeText: { fontSize: 11, color: "#fff", fontFamily: "Inter_600SemiBold" },
  heroRight: { alignItems: "center", justifyContent: "center" },
  heroRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  heroRingText: { fontSize: 22, color: "#fff", fontFamily: "Inter_700Bold", fontWeight: "700" },
  bentoRow: { flexDirection: "row", gap: 10 },
  bentoRowWide: { maxWidth: 760 },
  halfBento: { flex: 1, padding: 18, gap: 4 },
  fullBento: { padding: 18, marginBottom: 4 },
  bentoCard: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#7EA7DF",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  bentoIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  bentoValue: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700", letterSpacing: -0.5 },
  bentoLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bentoSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", fontWeight: "700" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  seeAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  seeAllText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  funnelContainer: { gap: 12, marginTop: 14 },
  funnelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  funnelLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 64 },
  funnelTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  funnelBar: { height: 8, borderRadius: 4 },
  funnelCount: { fontSize: 13, fontFamily: "Inter_700Bold", fontWeight: "700", width: 24, textAlign: "right" },
  topJobRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  topJobLogo: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  topJobLogoText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  topJobMeta: { flex: 1 },
  topJobTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  topJobSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  topJobCompany: { fontSize: 11, fontFamily: "Inter_400Regular" },
  atsChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  atsChipText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniSource: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniSourceText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  ctaContent: { alignItems: "center", paddingVertical: 16, gap: 10 },
  ctaIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  ctaTitle: { fontSize: 20, fontFamily: "Inter_700Bold", fontWeight: "700" },
  ctaDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  ctaButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 6 },
  ctaButtonText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
