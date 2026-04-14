import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { Job } from "@/data/mockJobs";
import { fetchLiveJobs } from "@/utils/apiService";

const CATEGORIES = ["All", "Engineering", "Design", "Product", "Marketing", "Data"];
const EXPERIENCE_LEVELS = ["All", "Internship", "Entry", "Mid", "Senior"];
const JOB_TYPES = ["All", "Full-time", "Internship", "Contract", "Remote"];
const SALARY_BANDS = [
  { key: "all", label: "Any Salary", min: undefined, max: undefined },
  { key: "0-6", label: "Up to 6 LPA", min: 0, max: 600000 },
  { key: "6-12", label: "6-12 LPA", min: 600000, max: 1200000 },
  { key: "12-20", label: "12-20 LPA", min: 1200000, max: 2000000 },
  { key: "20+", label: "20+ LPA", min: 2000000, max: undefined },
];
const SORTS = [
  { key: "recent", label: "Recent" },
  { key: "match", label: "Best Match" },
  { key: "salary", label: "Salary" },
];

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Remotive: { bg: "#10B98118", text: "#10B981" },
  Arbeitnow: { bg: "#6366F118", text: "#6366F1" },
  Himalayas: { bg: "#0EA5E918", text: "#0EA5E9" },
  "Remote OK": { bg: "#F9731618", text: "#F97316" },
  LinkedIn: { bg: "#0A66C218", text: "#0A66C2" },
  "Naukri.com": { bg: "#2563EB18", text: "#2563EB" },
  Indeed: { bg: "#4338CA18", text: "#4338CA" },
  JSearch: { bg: "#FF6B0018", text: "#FF6B00" },
  Glassdoor: { bg: "#00A36018", text: "#00A360" },
  "Monster India": { bg: "#7C3AED18", text: "#7C3AED" },
  Foundit: { bg: "#7C3AED18", text: "#7C3AED" },
  "Shine.com": { bg: "#2563EB18", text: "#2563EB" },
  Internshala: { bg: "#0EA5E918", text: "#0EA5E9" },
  Freshersworld: { bg: "#F59E0B18", text: "#F59E0B" },
  LetsIntern: { bg: "#EC489918", text: "#EC4899" },
  Wellfound: { bg: "#11182718", text: "#111827" },
  Hirect: { bg: "#14B8A618", text: "#14B8A6" },
  CutShort: { bg: "#DC262618", text: "#DC2626" },
  Instahyre: { bg: "#0891B218", text: "#0891B2" },
  Hirist: { bg: "#4F46E518", text: "#4F46E5" },
  Apna: { bg: "#1D4ED818", text: "#1D4ED8" },
  QuikrJobs: { bg: "#EA580C18", text: "#EA580C" },
  WorkIndia: { bg: "#16A34A18", text: "#16A34A" },
  Adzuna: { bg: "#FF5B5B18", text: "#FF5B5B" },
  "Stripe Careers": { bg: "#635BFF18", text: "#635BFF" },
  "Okta Careers": { bg: "#007DC118", text: "#007DC1" },
  "Abnormal Security Careers": { bg: "#EF444418", text: "#EF4444" },
  "Samsara Careers": { bg: "#0F766E18", text: "#0F766E" },
  "Coinbase Careers": { bg: "#0052FF18", text: "#0052FF" },
};

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const cfg = SOURCE_COLORS[source] || { bg: "#94a3b818", text: "#94a3b8" };
  return (
    <View style={[styles.sourceBadge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.sourceDot, { backgroundColor: cfg.text }]} />
      <Text style={[styles.sourceBadgeText, { color: cfg.text }]}>{source}</Text>
    </View>
  );
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive]);
  if (!isLive) return null;
  return (
    <View style={styles.liveRow}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.liveText}>Live</Text>
    </View>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days === 0) return hours <= 1 ? "Just now" : `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatLpa(value?: number) {
  if (!value) return null;
  return `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)} LPA`;
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { theme, isDark } = useTheme();
  const { savedJobs, saveJob, unsaveJob } = useApp();
  const isSaved = savedJobs.some((j) => j.id === job.id);
  const atsColor =
    job.atsScore >= 80 ? theme.emerald : job.atsScore >= 60 ? theme.warning : theme.danger;
  const atsLabel =
    job.atsScore >= 80 ? "Great" : job.atsScore >= 60 ? "Good" : "Fair";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.jobCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <BlurView
        intensity={isDark ? 18 : 36}
        tint={isDark ? "dark" : "light"}
        style={styles.jobCardBlur}
      />
      {job.featured && (
        <LinearGradient
          colors={["#4F46E5", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.featuredBanner}
        >
          <Feather name="star" size={9} color="#fff" />
          <Text style={styles.featuredText}>Featured</Text>
        </LinearGradient>
      )}

      <View style={styles.cardTop}>
        <View style={[styles.companyLogo, { backgroundColor: `${theme.tint}18` }]}>
          <Text style={[styles.logoChar, { color: theme.tint }]}>{job.company.charAt(0)}</Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Text style={[styles.companyName, { color: theme.textSecondary }]} numberOfLines={1}>
              {job.company}
            </Text>
            <SourceBadge source={job.source} />
          </View>
          <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={2}>
            {job.title}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            isSaved ? unsaveJob(job.id) : saveJob(job);
          }}
          hitSlop={12}
          style={[styles.saveBtn, { backgroundColor: isSaved ? `${theme.tint}15` : theme.backgroundSecondary }]}
        >
          <Feather name="bookmark" size={16} color={isSaved ? theme.tint : theme.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.cardDetails}>
        <View style={[styles.detailChip, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={11} color={theme.textTertiary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        <View style={[styles.detailChip, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="briefcase" size={11} color={theme.textTertiary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {job.type}
          </Text>
        </View>
        {job.isRemote && (
          <View style={[styles.detailChip, { backgroundColor: `${theme.emerald}15` }]}>
            <Feather name="wifi" size={11} color={theme.emerald} />
            <Text style={[styles.detailText, { color: theme.emerald }]}>Remote</Text>
          </View>
        )}
      </View>

      <View style={styles.cardTags}>
        {job.isVerifiedLive && (
          <View style={[styles.tag, { backgroundColor: `${theme.emerald}12` }]}>
            <Text style={[styles.tagText, { color: theme.emerald }]}>Verified Live</Text>
          </View>
        )}
        {job.tags.slice(0, 3).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: `${theme.tint}10` }]}>
            <Text style={[styles.tagText, { color: theme.tint }]}>{tag}</Text>
          </View>
        ))}
        {job.tags.length > 3 && (
          <View style={[styles.tag, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.tagText, { color: theme.textTertiary }]}>+{job.tags.length - 3}</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardFooter, { borderTopColor: theme.separator }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.salaryText, { color: theme.text }]}>{job.salary}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.postedAt, { color: theme.textTertiary }]}>{timeAgo(job.postedAt)}</Text>
          <View style={[styles.atsChip, { backgroundColor: `${atsColor}18` }]}>
            <View style={[styles.atsDot, { backgroundColor: atsColor }]} />
            <Text style={[styles.atsText, { color: atsColor }]}>{job.atsScore}% {atsLabel}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SkeletonCard() {
  const { theme } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <View style={[styles.jobCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Animated.View style={{ opacity, gap: 12 }}>
        <View style={styles.cardTop}>
          <View style={[styles.companyLogo, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: "40%", backgroundColor: theme.backgroundSecondary }]} />
            <View style={[styles.skeletonLine, { width: "75%", height: 18, backgroundColor: theme.backgroundSecondary }]} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[70, 55, 45].map((w, i) => (
            <View key={i} style={[styles.skeletonLine, { width: w, height: 28, borderRadius: 8, backgroundColor: theme.backgroundSecondary }]} />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[60, 50, 45].map((w, i) => (
            <View key={i} style={[styles.skeletonLine, { width: w, height: 24, borderRadius: 6, backgroundColor: theme.backgroundSecondary }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function FilterPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.catChip, { backgroundColor: active ? "#fff" : "#ffffff22", borderColor: active ? "#fff" : "#ffffff44" }]}>
      <Text style={[styles.catChipText, { color: active ? "#4F46E5" : "#ffffffdd" }]}>{label}</Text>
    </Pressable>
  );
}

function SelectMenu({
  label,
  value,
  isOpen,
  onPress,
  children,
  theme,
}: {
  label: string;
  value: string;
  isOpen: boolean;
  onPress: () => void;
  children?: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={[styles.selectMenuWrap, isOpen && styles.selectMenuWrapOpen]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.selectTrigger,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: isOpen ? theme.tint : theme.cardBorder,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectLabel, { color: theme.textTertiary }]}>{label}</Text>
          <Text style={[styles.selectValue, { color: theme.text }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>
      {isOpen ? (
        <View style={[styles.selectMenu, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function SelectOption({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.selectOption,
        { backgroundColor: active ? `${theme.tint}12` : "transparent" },
      ]}
    >
      <Text style={[styles.selectOptionText, { color: active ? theme.tint : theme.text }]}>
        {label}
      </Text>
      {active ? <Feather name="check" size={14} color={theme.tint} /> : null}
    </Pressable>
  );
}

export default function JobsScreen() {
  const { theme, isDark } = useTheme();
  const { setJobs } = useApp();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isCompactWeb = isWeb && width < 960;

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("All");
  const [experienceLevel, setExperienceLevel] = useState("All");
  const [salaryBand, setSalaryBand] = useState(SALARY_BANDS[0]);
  const [sort, setSort] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadJobs = useCallback(async (showRefreshLoader = false) => {
    if (showRefreshLoader) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await fetchLiveJobs({
        q: submittedQuery || undefined,
        category: category !== "All" ? category : undefined,
        location: location || undefined,
        type: jobType !== "All" && jobType !== "Remote" ? jobType : undefined,
        experienceLevel: experienceLevel !== "All" ? experienceLevel : undefined,
        salaryMin: salaryBand.min,
        salaryMax: salaryBand.max,
        remote: jobType === "Remote" ? true : undefined,
        sort,
        page: 1,
        limit: 100,
        refresh: showRefreshLoader,
      });
      startTransition(() => {
        setLiveJobs(result.jobs);
        setJobs(result.jobs);
        setSources(result.sources);
        setIsLive(result.jobs.length > 0);
        setLastFetched(new Date());
        setPage(result.page);
        setTotalPages(result.totalPages);
      });
      if (showRefreshLoader) toast("Jobs refreshed from live portals", "success");
    } catch {
      if (showRefreshLoader) toast("Could not refresh live jobs right now", "error");
      setIsLive(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [submittedQuery, category, location, jobType, experienceLevel, salaryBand, sort, setJobs, toast]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const loadMoreJobs = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchLiveJobs({
        q: submittedQuery || undefined,
        category: category !== "All" ? category : undefined,
        location: location || undefined,
        type: jobType !== "All" && jobType !== "Remote" ? jobType : undefined,
        experienceLevel: experienceLevel !== "All" ? experienceLevel : undefined,
        salaryMin: salaryBand.min,
        salaryMax: salaryBand.max,
        remote: jobType === "Remote" ? true : undefined,
        sort,
        page: nextPage,
        limit: 100,
      });
      startTransition(() => {
        const mergedJobs = [...liveJobs, ...result.jobs.filter((job) => !liveJobs.some((existing) => existing.id === job.id))];
        setLiveJobs(mergedJobs);
        setJobs(mergedJobs);
        setPage(result.page);
        setTotalPages(result.totalPages);
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isRefreshing, isLoadingMore, page, totalPages, submittedQuery, category, location, jobType, experienceLevel, salaryBand, sort, liveJobs, setJobs]);

  const displayJobs = useMemo(() => liveJobs, [liveJobs]);
  const searchInsights = useMemo(() => {
    if (!submittedQuery || displayJobs.length === 0) return null;

    const topLocations = [...new Map(
      displayJobs
        .map((job) => [job.location, (displayJobs.filter((item) => item.location === job.location).length)])
    ).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([location]) => location);

    const topSkills = [...new Map(
      displayJobs.flatMap((job) => job.tags.slice(0, 5)).map((tag) => [tag, displayJobs.filter((job) => job.tags.includes(tag)).length])
    ).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const salaryMins = displayJobs.map((job) => job.salaryMin).filter((value): value is number => typeof value === "number");
    const salaryMaxs = displayJobs.map((job) => job.salaryMax).filter((value): value is number => typeof value === "number");
    const verifiedCount = displayJobs.filter((job) => job.isVerifiedLive).length;

    return {
      total: displayJobs.length,
      verifiedCount,
      topLocations,
      topSkills,
      salaryRange:
        salaryMins.length && salaryMaxs.length
          ? `${formatLpa(Math.min(...salaryMins))} - ${formatLpa(Math.max(...salaryMaxs))}`
          : null,
    };
  }, [submittedQuery, displayJobs]);

  const topPad = isWeb ? 67 : insets.top;
  const botPad = isWeb ? 34 : insets.bottom;

  const gradientColors: [string, string] = isDark ? ["#3D2292", "#140A36"] : ["#4F46E5", "#7C3AED"];
  const xtractGradient: [string, string] = gradientColors;

  const renderTopFiltersBar = () => (
    <View style={[styles.webTopFiltersCard, isCompactWeb && styles.webTopFiltersCardCompact, { backgroundColor: isDark ? "rgba(33,20,66,0.72)" : "rgba(255,255,255,0.66)", borderColor: theme.cardBorder }]}>
      <BlurView
        intensity={isDark ? 22 : 44}
        tint={isDark ? "dark" : "light"}
        style={styles.webTopFiltersBlur}
      />
      <View style={[styles.webTopSearchRow, isCompactWeb && styles.webTopSearchRowCompact]}>
        <View style={[styles.webSearchInput, styles.webTopSearchInput, isCompactWeb && styles.webTopSearchInputCompact, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <Feather name="search" size={16} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSubmittedQuery(query.trim())}
            placeholder="Search by title, company, skill"
            placeholderTextColor={theme.textTertiary}
            style={[styles.webSearchField, { color: theme.text }]}
            returnKeyType="search"
          />
        </View>
        <View style={[styles.webSearchInput, styles.webTopLocationInput, isCompactWeb && styles.webTopLocationInputCompact, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <Feather name="map-pin" size={16} color={theme.textTertiary} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location"
            placeholderTextColor={theme.textTertiary}
            style={[styles.webSearchField, { color: theme.text }]}
          />
        </View>
        <Pressable onPress={() => setSubmittedQuery(query.trim())} style={[styles.webApplyBtn, styles.webTopSearchButton, isCompactWeb && styles.webTopSearchButtonCompact, { backgroundColor: theme.tint }]}>
          <Text style={styles.webApplyBtnText}>Search</Text>
        </Pressable>
      </View>

      <View style={[styles.webTopFilterGroups, isCompactWeb && styles.webTopFilterGroupsCompact]}>
        <View style={styles.selectGrid}>
          <SelectMenu label="Category" value={category} isOpen={openMenu === "category"} onPress={() => setOpenMenu(openMenu === "category" ? null : "category")} theme={theme}>
            {CATEGORIES.map((cat) => (
              <SelectOption key={cat} label={cat} active={category === cat} onPress={() => { setCategory(cat); setOpenMenu(null); }} theme={theme} />
            ))}
          </SelectMenu>
          <SelectMenu label="Job type" value={jobType} isOpen={openMenu === "type"} onPress={() => setOpenMenu(openMenu === "type" ? null : "type")} theme={theme}>
            {JOB_TYPES.map((type) => (
              <SelectOption key={type} label={type} active={jobType === type} onPress={() => { setJobType(type); setOpenMenu(null); }} theme={theme} />
            ))}
          </SelectMenu>
          <SelectMenu label="Experience" value={experienceLevel} isOpen={openMenu === "experience"} onPress={() => setOpenMenu(openMenu === "experience" ? null : "experience")} theme={theme}>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectOption key={level} label={level} active={experienceLevel === level} onPress={() => { setExperienceLevel(level); setOpenMenu(null); }} theme={theme} />
            ))}
          </SelectMenu>
          <SelectMenu label="Salary" value={salaryBand.label} isOpen={openMenu === "salary"} onPress={() => setOpenMenu(openMenu === "salary" ? null : "salary")} theme={theme}>
            {SALARY_BANDS.map((band) => (
              <SelectOption key={band.key} label={band.label} active={salaryBand.key === band.key} onPress={() => { setSalaryBand(band); setOpenMenu(null); }} theme={theme} />
            ))}
          </SelectMenu>
          <SelectMenu label="Sort by" value={SORTS.find((item) => item.key === sort)?.label || "Recent"} isOpen={openMenu === "sort"} onPress={() => setOpenMenu(openMenu === "sort" ? null : "sort")} theme={theme}>
            {SORTS.map((item) => (
              <SelectOption key={item.key} label={item.label} active={sort === item.key} onPress={() => { setSort(item.key); setOpenMenu(null); }} theme={theme} />
            ))}
          </SelectMenu>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      <LinearGradient colors={xtractGradient} style={[styles.header, { paddingTop: topPad + 20 }]}>
        <View pointerEvents="none" style={styles.headerBubbleLarge} />
        <View pointerEvents="none" style={styles.headerBubbleMedium} />
        <View pointerEvents="none" style={styles.headerBubbleSmall} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>Discover your next</Text>
            <Text style={styles.headerTitle}>Dream Job</Text>
          </View>
          <View style={styles.headerRight}>
            <LiveIndicator isLive={isLive} />
            <Text style={styles.jobCount}>{displayJobs.length} roles</Text>
            <Text style={styles.verifiedCount}>
              {displayJobs.filter((job) => job.isVerifiedLive).length} verified
            </Text>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: isDark ? "#ffffff15" : "#ffffff22" }]}>
          <Feather name="search" size={18} color="#ffffff99" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSubmittedQuery(query.trim())}
            placeholder="Job title, company, skill..."
            placeholderTextColor="#ffffff66"
            style={[styles.searchInput, { color: "#fff" }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setSubmittedQuery(""); }} hitSlop={10}>
              <Feather name="x-circle" size={16} color="#ffffff80" />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === cat ? "#fff" : "#ffffff22",
                    borderColor: category === cat ? "#fff" : "#ffffff44",
                  },
                ]}
              >
                <Text style={[styles.catChipText, { color: category === cat ? "#4F46E5" : "#ffffffdd" }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterBtn, { backgroundColor: showFilters ? "#fff" : "#ffffff22" }]}
          >
            <Feather name="sliders" size={16} color={showFilters ? "#4F46E5" : "#fff"} />
          </Pressable>
        </View>

        {showFilters && (
          <View style={styles.extraFilters}>
            <View style={[styles.searchBox, { backgroundColor: "#ffffff15", marginBottom: 0 }]}>
              <Feather name="map-pin" size={16} color="#ffffff99" />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Location: Bengaluru, Pune, Delhi..."
                placeholderTextColor="#ffffff66"
                style={[styles.searchInput, { color: "#fff" }]}
              />
            </View>
            <View style={styles.mobileSelectStack}>
              <SelectMenu label="Job type" value={jobType} isOpen={openMenu === "mobile-type"} onPress={() => setOpenMenu(openMenu === "mobile-type" ? null : "mobile-type")} theme={theme}>
                {JOB_TYPES.map((type) => (
                  <SelectOption key={type} label={type} active={jobType === type} onPress={() => { setJobType(type); setOpenMenu(null); }} theme={theme} />
                ))}
              </SelectMenu>
              <SelectMenu label="Experience" value={experienceLevel} isOpen={openMenu === "mobile-experience"} onPress={() => setOpenMenu(openMenu === "mobile-experience" ? null : "mobile-experience")} theme={theme}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectOption key={level} label={level} active={experienceLevel === level} onPress={() => { setExperienceLevel(level); setOpenMenu(null); }} theme={theme} />
                ))}
              </SelectMenu>
              <SelectMenu label="Salary" value={salaryBand.label} isOpen={openMenu === "mobile-salary"} onPress={() => setOpenMenu(openMenu === "mobile-salary" ? null : "mobile-salary")} theme={theme}>
                {SALARY_BANDS.map((band) => (
                  <SelectOption key={band.key} label={band.label} active={salaryBand.key === band.key} onPress={() => { setSalaryBand(band); setOpenMenu(null); }} theme={theme} />
                ))}
              </SelectMenu>
              <SelectMenu label="Sort by" value={SORTS.find((item) => item.key === sort)?.label || "Recent"} isOpen={openMenu === "mobile-sort"} onPress={() => setOpenMenu(openMenu === "mobile-sort" ? null : "mobile-sort")} theme={theme}>
                {SORTS.map((item) => (
                  <SelectOption key={item.key} label={item.label} active={sort === item.key} onPress={() => { setSort(item.key); setOpenMenu(null); }} theme={theme} />
                ))}
              </SelectMenu>
            </View>
          </View>
        )}
      </LinearGradient>

      {(isLive || sources.length > 0) && (
        <View style={[styles.sourcesBar, { backgroundColor: isDark ? "rgba(35,22,70,0.68)" : "rgba(255,255,255,0.62)", borderBottomColor: theme.cardBorder }]}>
          <BlurView
            intensity={isDark ? 18 : 36}
            tint={isDark ? "dark" : "light"}
            style={styles.sourcesBarBlur}
          />
          <Feather name="zap" size={12} color={theme.tint} />
          <Text style={[styles.sourcesLabel, { color: theme.textSecondary }]}>Live:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: "center" }}>
            {sources.map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
          </ScrollView>
          {lastFetched && (
            <Text style={[styles.lastFetched, { color: theme.textTertiary }]}>
              {lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
      )}

      {displayJobs.some((j) => j.featured) && !submittedQuery && (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: theme.tint }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured Roles</Text>
          <Text style={[styles.sectionCount, { color: theme.textTertiary }]}>
            {displayJobs.filter((j) => j.featured).length}
          </Text>
        </View>
      )}

      {searchInsights && (
        <View style={[styles.insightsCard, { backgroundColor: isDark ? "rgba(31,19,61,0.74)" : "rgba(255,255,255,0.64)", borderColor: theme.cardBorder }]}>
          <BlurView
            intensity={isDark ? 20 : 40}
            tint={isDark ? "dark" : "light"}
            style={styles.insightsBlur}
          />
          <View style={styles.insightsHeader}>
            <View>
              <Text style={[styles.insightsEyebrow, { color: theme.tint }]}>Role insights</Text>
              <Text style={[styles.insightsTitle, { color: theme.text }]}>
                Results for "{submittedQuery}"
              </Text>
            </View>
            <View style={[styles.insightsStatPill, { backgroundColor: `${theme.tint}12` }]}>
              <Text style={[styles.insightsStatText, { color: theme.tint }]}>{searchInsights.total} matches</Text>
            </View>
          </View>
          <Text style={[styles.insightsBody, { color: theme.textSecondary }]}>
            {searchInsights.verifiedCount} verified live roles found
            {searchInsights.salaryRange ? ` with salary signal around ${searchInsights.salaryRange}.` : "."}
          </Text>
          {searchInsights.topLocations.length > 0 && (
            <View style={styles.insightsRow}>
              <Text style={[styles.insightsLabel, { color: theme.text }]}>Top locations</Text>
              <View style={styles.insightsChips}>
                {searchInsights.topLocations.map((location) => (
                  <View key={location} style={[styles.insightsChip, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.insightsChipText, { color: theme.textSecondary }]}>{location}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {searchInsights.topSkills.length > 0 && (
            <View style={styles.insightsRow}>
              <Text style={[styles.insightsLabel, { color: theme.text }]}>Common skills</Text>
              <View style={styles.insightsChips}>
                {searchInsights.topSkills.map((skill) => (
                  <View key={skill} style={[styles.insightsChip, { backgroundColor: `${theme.emerald}12` }]}>
                    <Text style={[styles.insightsChipText, { color: theme.emerald }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient colors={gradientColors} style={[styles.header, { paddingTop: topPad + 20, paddingBottom: 24 }]}>
          <Text style={[styles.headerLabel, { marginBottom: 4 }]}>Discover your next</Text>
          <Text style={styles.headerTitle}>Dream Job</Text>
          <View style={[styles.searchBox, { backgroundColor: "#ffffff22", marginTop: 16 }]}>
            <Feather name="search" size={18} color="#ffffff99" />
            <Text style={{ color: "#ffffff80", flex: 1, marginLeft: 8, fontFamily: "Inter_400Regular" }}>
              Fetching live jobs...
            </Text>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        </LinearGradient>
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  if (isWeb) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 48 }}>
        <LinearGradient colors={xtractGradient} style={[styles.header, { paddingTop: topPad + 20 }]}>
          <View pointerEvents="none" style={styles.headerBubbleLarge} />
          <View pointerEvents="none" style={styles.headerBubbleMedium} />
          <View pointerEvents="none" style={styles.headerBubbleSmall} />
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerLabel}>Discover your next</Text>
              <Text style={styles.headerTitle}>Dream Job</Text>
            </View>
            <View style={styles.headerRight}>
              <LiveIndicator isLive={isLive} />
              <Text style={styles.jobCount}>{displayJobs.length} roles</Text>
              <Text style={styles.verifiedCount}>{displayJobs.filter((job) => job.isVerifiedLive).length} verified</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.webTopFiltersWrap}>
          {renderTopFiltersBar()}
        </View>

        <View style={styles.webPage}>
          <View style={[styles.webMain, isCompactWeb && styles.webMainCompact]}>
            <View style={styles.webJobsList}>
              {displayJobs.map((item) => (
                <JobCard
                  key={item.id}
                  job={item}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/job/${item.id}`);
                  }}
                />
              ))}
            </View>

            {page < totalPages && (
              <Pressable onPress={() => { void loadMoreJobs(); }} style={[styles.webLoadMore, { backgroundColor: isDark ? "rgba(35,22,70,0.72)" : "rgba(255,255,255,0.64)", borderColor: theme.cardBorder }]}>
                <BlurView
                  intensity={isDark ? 20 : 38}
                  tint={isDark ? "dark" : "light"}
                  style={styles.webLoadMoreBlur}
                />
                {isLoadingMore ? <ActivityIndicator size="small" color={theme.tint} /> : <Text style={[styles.webLoadMoreText, { color: theme.tint }]}>Load more jobs</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={displayJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/job/${item.id}`);
            }}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadJobs(true)}
            tintColor={theme.tint}
            title="Pulling from live portals..."
            titleColor={theme.textTertiary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${theme.tint}15` }]}>
              <Feather name="search" size={32} color={theme.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No jobs found</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Try a different search or pull down to refresh from live portals
            </Text>
            <Pressable
              onPress={() => { setQuery(""); setSubmittedQuery(""); setLocation(""); setCategory("All"); setJobType("All"); setExperienceLevel("All"); setSalaryBand(SALARY_BANDS[0]); }}
              style={[styles.clearBtn, { backgroundColor: `${theme.tint}15` }]}
            >
              <Text style={[styles.clearBtnText, { color: theme.tint }]}>Clear filters</Text>
            </Pressable>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={!isWeb}
        onEndReached={() => { void loadMoreJobs(); }}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={theme.tint} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webTopFiltersWrap: { paddingHorizontal: 20, marginTop: -10, marginBottom: 8, alignItems: "center", zIndex: 50 },
  webPage: { paddingHorizontal: 20, paddingTop: 12, alignItems: "center", zIndex: 1 },
  webMain: { minWidth: 0, width: "100%", maxWidth: 1120 },
  webMainCompact: { maxWidth: 920 },
  webTopFiltersCard: { borderWidth: 1, borderRadius: 34, padding: 18, gap: 14, width: "100%", maxWidth: 1120, overflow: "hidden", zIndex: 60, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 8 },
  webTopFiltersBlur: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  webTopFiltersCardCompact: { padding: 14 },
  webTopSearchRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  webTopSearchRowCompact: { flexWrap: "wrap", alignItems: "stretch" },
  webTopSearchInput: { flex: 1.6, marginBottom: 0 },
  webTopSearchInputCompact: { minWidth: 260, flexBasis: "100%" },
  webTopLocationInput: { flex: 1, marginBottom: 0 },
  webTopLocationInputCompact: { minWidth: 220, flexGrow: 1 },
  webTopSearchButton: { minWidth: 110 },
  webTopSearchButtonCompact: { width: "100%" },
  webTopFilterGroups: { flexDirection: "row", alignItems: "center", gap: 12 },
  webTopFilterGroupsCompact: { flexDirection: "column", alignItems: "stretch" },
  webTopFilterScroll: { gap: 8, paddingRight: 8, alignItems: "center" },
  selectGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  selectMenuWrap: { minWidth: 150, flexGrow: 1, flexBasis: 160, position: "relative", zIndex: 1 },
  selectMenuWrapOpen: { zIndex: 1000, elevation: 1000 },
  selectTrigger: { minHeight: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  selectLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  selectValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  selectMenu: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    zIndex: 1001,
    elevation: 20,
  },
  selectOption: { minHeight: 42, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  webSearchInput: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13 },
  webSearchField: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  webApplyBtn: { borderRadius: 22, alignItems: "center", paddingVertical: 14, shadowColor: "#6D95D8", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
  webApplyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  webJobsList: { gap: 12 },
  webLoadMore: { marginTop: 16, borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  webLoadMoreBlur: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  webLoadMoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: "hidden", borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  headerBubbleLarge: { position: "absolute", right: -16, top: 14, width: 136, height: 136, borderRadius: 68, backgroundColor: "rgba(255,255,255,0.28)" },
  headerBubbleMedium: { position: "absolute", right: 112, top: 84, width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(55,98,205,0.24)" },
  headerBubbleSmall: { position: "absolute", left: -12, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerLabel: { fontSize: 14, color: "rgba(244,248,255,0.82)", fontFamily: "Inter_400Regular", marginBottom: 2 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  headerRight: { alignItems: "flex-end", gap: 4 },
  jobCount: { fontSize: 13, color: "rgba(244,248,255,0.92)", fontFamily: "Inter_600SemiBold" },
  verifiedCount: { fontSize: 11, color: "#F4F8FF", fontFamily: "Inter_500Medium" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 11, color: "#10B981", fontFamily: "Inter_600SemiBold" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.34)", backgroundColor: "rgba(255,255,255,0.2)" },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  extraFilters: { marginTop: 12, gap: 10 },
  mobileSelectStack: { gap: 10 },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  sortText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sourcesBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderRadius: 24, overflow: "hidden" },
  sourcesBarBlur: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  sourcesLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  lastFetched: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  sourceBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  sourceDot: { width: 5, height: 5, borderRadius: 3 },
  sourceBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  insightsCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  insightsBlur: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  insightsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  insightsEyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  insightsTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  insightsStatPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  insightsStatText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  insightsBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  insightsRow: { gap: 8 },
  insightsLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  insightsChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  insightsChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  insightsChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8, paddingHorizontal: 8 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  jobCard: {
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#6B8FD0",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 6,
  },
  jobCardBlur: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  featuredBanner: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 12 },
  featuredText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  companyLogo: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  logoChar: { fontSize: 20, fontFamily: "Inter_700Bold" },
  cardMeta: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  companyName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  jobTitle: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  saveBtn: { padding: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.34)" },
  cardDetails: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  detailText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  salaryText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  postedAt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  atsChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  atsDot: { width: 5, height: 5, borderRadius: 3 },
  atsText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, marginTop: 12, borderRadius: 28, borderWidth: 1, borderColor: "rgba(148,163,184,0.14)", backgroundColor: "rgba(255,255,255,0.74)" },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  clearBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  clearBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  skeletonLine: { height: 14, borderRadius: 7 },
});
