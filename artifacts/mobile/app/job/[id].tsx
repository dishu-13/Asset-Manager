import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { computeATSBreakdown, getATSLevel } from "@/utils/atsUtils";
import { generateTailoredResume } from "@/utils/aiUtils";
import { fetchJobById } from "@/utils/apiService";

const SOURCE_COLORS: Record<string, string> = {
  Remotive: "#10B981",
  Arbeitnow: "#6366F1",
  Himalayas: "#0EA5E9",
  "Remote OK": "#F97316",
  LinkedIn: "#0A66C2",
  "Naukri.com": "#2563EB",
  Indeed: "#4338CA",
  JSearch: "#FF6B00",
  Glassdoor: "#00A360",
  "Monster India": "#7C3AED",
  Foundit: "#7C3AED",
  "Shine.com": "#2563EB",
  Internshala: "#0EA5E9",
  Freshersworld: "#F59E0B",
  LetsIntern: "#EC4899",
  Wellfound: "#111827",
  Hirect: "#14B8A6",
  CutShort: "#DC2626",
  Instahyre: "#0891B2",
  Hirist: "#4F46E5",
  Apna: "#1D4ED8",
  QuikrJobs: "#EA580C",
  WorkIndia: "#16A34A",
  Adzuna: "#FF5B5B",
  Internal: "#8B5CF6",
  "Stripe Careers": "#635BFF",
  "Okta Careers": "#007DC1",
  "Abnormal Security Careers": "#EF4444",
  "Samsara Careers": "#0F766E",
  "Coinbase Careers": "#0052FF",
};

type Section = "description" | "requirements" | "benefits";

function formatDescriptionBlocks(description: string) {
  return description
    .split(/\n{2,}|\n(?=•)|(?<=[.:])\s+(?=[A-Z][a-z])/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { jobs, resume, savedJobs, saveJob, unsaveJob, applications, addApplication, setJobs } = useApp();
  const { success, error: toastError, loading, dismiss } = useToast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [remoteJob, setRemoteJob] = useState<(typeof jobs)[number] | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const job = jobs.find((j) => j.id === id) || remoteJob;
  const isSaved = savedJobs.some((j) => j.id === id);
  const isApplied = applications.some((a) => a.jobId === id);

  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<string | null>(null);
  const [showTailored, setShowTailored] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("description");
  const [showKeywords, setShowKeywords] = useState(false);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 20 : insets.bottom;

  const atsBreakdown = useMemo(() => {
    if (!job || !resume) return null;
    return computeATSBreakdown(resume, job);
  }, [resume, job]);

  const atsLevel = useMemo(() => {
    const score = atsBreakdown?.score ?? job?.atsScore ?? 0;
    return getATSLevel(score);
  }, [atsBreakdown, job]);

  const displayScore = atsBreakdown?.score ?? job?.atsScore ?? 0;

  useEffect(() => {
    if (!id || job) return;

    setLoadingJob(true);
    fetchJobById(id, true)
      .then((fetchedJob) => {
        if (!fetchedJob) return;
        setRemoteJob(fetchedJob);
        setJobs([...jobs.filter((existingJob) => existingJob.id !== fetchedJob.id), fetchedJob]);
      })
      .finally(() => setLoadingJob(false));
  }, [id, job, jobs, setJobs]);

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPadding + 20 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.navBtn, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.notFound}>
          {loadingJob ? <ActivityIndicator size="large" color={theme.tint} /> : <Feather name="alert-circle" size={48} color={theme.textTertiary} />}
          <Text style={[styles.notFoundText, { color: theme.text }]}>
            {loadingJob ? "Loading job..." : "Job not found"}
          </Text>
          <Text style={[styles.notFoundSub, { color: theme.textSecondary }]}>
            {loadingJob ? "Fetching the latest listing details" : "This listing may have been removed"}
          </Text>
        </View>
      </View>
    );
  }

  const sourceColor = SOURCE_COLORS[job.source || ""] || theme.tint;

  const handleTailor = async () => {
    if (!resume) return;
    setTailoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toastId = loading("Tailoring your resume with AI...");
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const result = generateTailoredResume(
        resume,
        `${job.description} ${(job.requirements || []).join(" ")} ${job.tags.join(" ")}`,
        job.title,
        job.company
      );
      dismiss(toastId);
      setTailoredResume(result);
      setShowTailored(true);
      success("Resume tailored for " + job.company + "!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      dismiss(toastId);
      toastError("Could not tailor resume. Try again.");
    } finally {
      setTailoring(false);
    }
  };

  const handleApply = async () => {
    if (!job.applyLink) {
      toastError("This listing does not have a valid application link.");
      return;
    }

    try {
      if (Platform.OS === "web") await Linking.openURL(job.applyLink);
      else await WebBrowser.openBrowserAsync(job.applyLink);

      if (!isApplied) {
        addApplication({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          status: "Applied",
          appliedAt: new Date().toISOString(),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      success(`Opened ${job.company} application portal`);
    } catch {
      toastError("Could not open the job portal.");
    }
  };

  const sectionContent: Record<Section, string[]> = {
    description: job.description ? formatDescriptionBlocks(job.description) : ["No description available."],
    requirements: job.requirements?.length ? job.requirements : ["No requirements listed."],
    benefits: job.benefits?.length ? job.benefits : ["Benefits not specified."],
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPadding + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.navBtn, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.navActions}>
          {job.isVerifiedLive && (
            <View style={[styles.sourcePill, { backgroundColor: `${theme.emerald}18` }]}>
              <View style={[styles.sourceDot, { backgroundColor: theme.emerald }]} />
              <Text style={[styles.sourcePillText, { color: theme.emerald }]}>Verified Live</Text>
            </View>
          )}
          {job.source && (
            <View style={[styles.sourcePill, { backgroundColor: `${sourceColor}18` }]}>
              <View style={[styles.sourceDot, { backgroundColor: sourceColor }]} />
              <Text style={[styles.sourcePillText, { color: sourceColor }]}>{job.source}</Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              isSaved ? unsaveJob(job.id) : saveJob(job);
            }}
            style={[styles.navBtn, { backgroundColor: isSaved ? `${theme.tint}18` : theme.backgroundSecondary }]}
          >
            <Feather name="bookmark" size={18} color={isSaved ? theme.tint : theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 120 }]}
      >
        <View style={styles.heroSection}>
          <View style={[styles.companyLogo, { backgroundColor: `${theme.tint}18` }]}>
            <Text style={[styles.companyLogoText, { color: theme.tint }]}>{job.company.charAt(0)}</Text>
          </View>
          <Text style={[styles.company, { color: theme.textSecondary }]}>{job.company}</Text>
          <Text style={[styles.jobTitle, { color: theme.text }]}>{job.title}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="map-pin" size={12} color={theme.textTertiary} />
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{job.location}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="briefcase" size={12} color={theme.textTertiary} />
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{job.type}</Text>
            </View>
            {job.isRemote && (
              <View style={[styles.metaChip, { backgroundColor: `${theme.emerald}15` }]}>
                <Feather name="wifi" size={12} color={theme.emerald} />
                <Text style={[styles.metaChipText, { color: theme.emerald }]}>Remote</Text>
              </View>
            )}
          </View>
          <Text style={[styles.salary, { color: theme.text }]}>{job.salary}</Text>
        </View>

        <Pressable
          style={[styles.atsCard, { backgroundColor: `${atsLevel.color}12`, borderColor: `${atsLevel.color}35` }]}
          onPress={() => {
            if (resume) setShowKeywords(!showKeywords);
          }}
        >
          <View style={styles.atsCardLeft}>
            <Text style={[styles.atsCardTitle, { color: theme.text }]}>ATS Match Score</Text>
            <Text style={[styles.atsCardDesc, { color: theme.textSecondary }]}>
              {displayScore >= 80
                ? "Excellent match! Apply with confidence."
                : displayScore >= 65
                ? "Good match. A few tweaks will boost your odds."
                : displayScore >= 45
                ? "Fair match. Tailoring will improve visibility."
                : "Low match. Use AI tailoring before applying."}
            </Text>
            {resume && (
              <View style={styles.atsActions}>
                <Text style={[styles.atsToggle, { color: atsLevel.color }]}>
                  {showKeywords ? "Hide keywords ▲" : "View keywords ▼"}
                </Text>
                {atsBreakdown && (
                  <Text style={[styles.atsBreakdownSummary, { color: theme.textTertiary }]}>
                    {atsBreakdown.matched.length}/{atsBreakdown.total} matched
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.atsCircle}>
            <View style={[styles.atsCircleInner, { borderColor: atsLevel.color }]}>
              <Text style={[styles.atsScore, { color: atsLevel.color }]}>{displayScore}</Text>
              <Text style={[styles.atsPercent, { color: atsLevel.color }]}>%</Text>
            </View>
            <Text style={[styles.atsLevelLabel, { color: atsLevel.color }]}>{atsLevel.label}</Text>
          </View>
        </Pressable>

        {showKeywords && atsBreakdown && (
          <View style={[styles.keywordsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.keywordsSection}>
              <View style={styles.keywordsSectionHeader}>
                <View style={[styles.kwDot, { backgroundColor: theme.emerald }]} />
                <Text style={[styles.kwSectionTitle, { color: theme.text }]}>
                  Matched ({atsBreakdown.matched.length})
                </Text>
              </View>
              <View style={styles.keywordsList}>
                {atsBreakdown.matched.slice(0, 12).map((kw) => (
                  <View key={kw} style={[styles.kwChip, { backgroundColor: `${theme.emerald}15` }]}>
                    <Feather name="check" size={10} color={theme.emerald} />
                    <Text style={[styles.kwText, { color: theme.emerald }]}>{kw}</Text>
                  </View>
                ))}
              </View>
            </View>
            {atsBreakdown.missing.length > 0 && (
              <View style={[styles.keywordsSection, { marginTop: 12 }]}>
                <View style={styles.keywordsSectionHeader}>
                  <View style={[styles.kwDot, { backgroundColor: theme.danger }]} />
                  <Text style={[styles.kwSectionTitle, { color: theme.text }]}>
                    Missing ({Math.min(atsBreakdown.missing.length, 10)}) — Add to resume
                  </Text>
                </View>
                <View style={styles.keywordsList}>
                  {atsBreakdown.missing.slice(0, 10).map((kw) => (
                    <View key={kw} style={[styles.kwChip, { backgroundColor: `${theme.danger}12` }]}>
                      <Feather name="plus" size={10} color={theme.danger} />
                      <Text style={[styles.kwText, { color: theme.danger }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {resume ? (
          <View style={styles.aiSection}>
            {!showTailored ? (
              <Pressable
                onPress={handleTailor}
                disabled={tailoring}
                style={({ pressed }) => [
                  styles.tailorBtn,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <LinearGradient
                  colors={["#4F46E5", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tailorGradient}
                >
                  {tailoring ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.tailorBtnText}>Tailoring with AI...</Text>
                    </>
                  ) : (
                    <>
                      <Feather name="zap" size={16} color="#fff" />
                      <Text style={styles.tailorBtnText}>AI Tailor Resume for {job.company}</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={[styles.tailoredCard, { backgroundColor: theme.card, borderColor: `${theme.emerald}40` }]}>
                <View style={styles.tailoredHeader}>
                  <View style={styles.tailoredBadgeRow}>
                    <View style={[styles.tailoredBadge, { backgroundColor: `${theme.emerald}18` }]}>
                      <Feather name="check-circle" size={13} color={theme.emerald} />
                      <Text style={[styles.tailoredBadgeText, { color: theme.emerald }]}>AI Tailored for {job.company}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setShowTailored(false)} hitSlop={10}>
                    <Feather name="x" size={16} color={theme.textTertiary} />
                  </Pressable>
                </View>
                <ScrollView style={styles.tailoredScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Text style={[styles.tailoredText, { color: theme.text }]}>{tailoredResume}</Text>
                </ScrollView>
                <Pressable
                  onPress={() => setShowTailored(false)}
                  style={[styles.reTailorBtn, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Feather name="refresh-cw" size={13} color={theme.textSecondary} />
                  <Text style={[styles.reTailorText, { color: theme.textSecondary }]}>Re-tailor</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(tabs)/resume")}
            style={[styles.noResumeCard, { backgroundColor: `${theme.warning}12`, borderColor: `${theme.warning}35` }]}
          >
            <Feather name="file-text" size={18} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noResumeTitle, { color: theme.text }]}>Add resume for AI tailoring</Text>
              <Text style={[styles.noResumeBody, { color: theme.textSecondary }]}>
                Tap to go to Resume → get ATS analysis &amp; one-click tailoring
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.warning} />
          </Pressable>
        )}

        <View style={styles.sectionTabs}>
          {(["description", "requirements", "benefits"] as Section[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveSection(tab)}
              style={[
                styles.sectionTab,
                { backgroundColor: activeSection === tab ? theme.tint : theme.backgroundSecondary },
              ]}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  { color: activeSection === tab ? "#fff" : theme.textSecondary },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sectionContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {sectionContent[activeSection].map((item, i) => (
            <View key={i} style={[styles.sectionItem, i > 0 && { marginTop: 10 }]}>
              {activeSection !== "description" && (
                <View style={[styles.bullet, { backgroundColor: theme.tint }]} />
              )}
              <Text style={[styles.sectionText, { color: theme.textSecondary, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.skillsRow}>
          {job.tags.map((tag) => (
            <View key={tag} style={[styles.skillChip, { backgroundColor: `${theme.tint}12` }]}>
              <Text style={[styles.skillChipText, { color: theme.tint }]}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.companyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.companyCardLogo, { backgroundColor: `${theme.tint}15` }]}>
            <Text style={[styles.companyCardLogoText, { color: theme.tint }]}>{job.company.charAt(0)}</Text>
          </View>
          <View style={styles.companyCardInfo}>
            <Text style={[styles.companyCardName, { color: theme.text }]}>{job.company}</Text>
            <Text style={[styles.companyCardType, { color: theme.textSecondary }]}>
              {job.category} Company
            </Text>
          </View>
          <View style={[styles.followBtn, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.followBtnText, { color: theme.textSecondary }]}>Follow</Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: bottomPadding + 8,
            backgroundColor: theme.background,
            borderTopColor: theme.separator,
          },
        ]}
      >
        {isApplied ? (
          <View style={[styles.appliedBadge, { backgroundColor: `${theme.emerald}15` }]}>
            <Feather name="check-circle" size={18} color={theme.emerald} />
            <Text style={[styles.appliedText, { color: theme.emerald }]}>Application Submitted</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.applyBtn,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  navBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  sourcePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourcePillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, gap: 14 },
  heroSection: { alignItems: "center", paddingVertical: 8, gap: 8 },
  companyLogo: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  companyLogoText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  company: { fontSize: 14, fontFamily: "Inter_500Medium" },
  jobTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3, lineHeight: 30 },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  salary: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  atsCard: { flexDirection: "row", alignItems: "flex-start", padding: 16, borderRadius: 18, borderWidth: 1, gap: 12 },
  atsCardLeft: { flex: 1, gap: 6 },
  atsCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  atsCardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  atsActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  atsToggle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  atsBreakdownSummary: { fontSize: 11, fontFamily: "Inter_400Regular" },
  atsCircle: { alignItems: "center", gap: 4 },
  atsCircleInner: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  atsScore: { fontSize: 20, fontFamily: "Inter_700Bold" },
  atsPercent: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  atsLevelLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  keywordsCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  keywordsSection: {},
  keywordsSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  kwDot: { width: 8, height: 8, borderRadius: 4 },
  kwSectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  keywordsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kwChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  kwText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  aiSection: {},
  tailorBtn: { borderRadius: 16, overflow: "hidden" },
  tailorGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  tailorBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  tailoredCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  tailoredHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tailoredBadgeRow: { flexDirection: "row", gap: 8 },
  tailoredBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tailoredBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tailoredScroll: { maxHeight: 200 },
  tailoredText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  reTailorBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  reTailorText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  noResumeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  noResumeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  noResumeBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionTabs: { flexDirection: "row", gap: 8 },
  sectionTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  sectionTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionContent: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  sectionItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  skillChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  companyCardLogo: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  companyCardLogoText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  companyCardInfo: { flex: 1 },
  companyCardName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  companyCardType: { fontSize: 12, fontFamily: "Inter_400Regular" },
  followBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  applyBtn: { borderRadius: 16, overflow: "hidden" },
  applyGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  applyBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  appliedBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  appliedText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
