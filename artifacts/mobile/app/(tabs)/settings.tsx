import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
  tintColor?: string;
  danger?: boolean;
  rightEl?: React.ReactNode;
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onToggle,
  onPress,
  tintColor,
  danger,
  rightEl,
}: SettingRowProps) {
  const { theme } = useTheme();
  const color = danger ? theme.danger : tintColor || theme.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !onToggle}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: "transparent",
          opacity: onPress && pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: danger ? theme.danger : theme.text }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {rightEl}
      {onToggle && (
        <Switch
          value={value}
          onValueChange={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          trackColor={{ false: theme.backgroundTertiary, true: `${theme.tint}88` }}
          thumbColor={value ? theme.tint : theme.textTertiary}
        />
      )}
      {onPress && !rightEl && (
        <Feather name="chevron-right" size={16} color={theme.textTertiary} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        styles.sectionHeaderWrap,
        {
          borderColor: isDark ? "rgba(167,139,250,0.16)" : "rgba(148,163,184,0.18)",
          backgroundColor: isDark ? "#221447" : "#F5F1FF",
        },
      ]}
    >
      <Text style={[styles.sectionHeader, { color: theme.textTertiary }]}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const topPadding = isWeb ? 67 : insets.top;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AU";

  const skillCount = user?.profile?.skills?.length ?? 0;
  const expCount = user?.profile?.experience?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (isWeb ? 84 : 80) },
        ]}
      >
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor: isDark ? "#5B39C6" : "#B89AFB",
              borderColor: isDark ? "#6E4AE0" : "#8B5CF6",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: `${theme.tint}20` }]}>
            <Text style={[styles.avatarText, { color: theme.tint }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: "#FFFFFF" }]}>
              {user?.name || "Guest User"}
            </Text>
            <Text style={[styles.profileEmail, { color: "rgba(255,255,255,0.82)" }]}>
              {user?.email || "Not signed in"}
            </Text>
            {(skillCount > 0 || expCount > 0) && (
              <View style={styles.profileStats}>
                {skillCount > 0 && (
                  <View style={[styles.statBadge, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
                    <Feather name="zap" size={9} color="#FFFFFF" />
                    <Text style={[styles.statBadgeText, { color: "#FFFFFF" }]}>{skillCount} skills</Text>
                  </View>
                )}
                {expCount > 0 && (
                  <View style={[styles.statBadge, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
                    <Feather name="briefcase" size={9} color="#FFFFFF" />
                    <Text style={[styles.statBadgeText, { color: "#FFFFFF" }]}>{expCount} roles</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={[styles.editProfileBtn, { backgroundColor: "rgba(255,255,255,0.14)" }]}>
            <Feather name="edit-2" size={13} color="#FFFFFF" />
            <Text style={[styles.editProfileText, { color: "#FFFFFF" }]}>Edit</Text>
          </View>
        </Pressable>

        <SectionHeader title="APPEARANCE" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow
            icon="moon"
            label="Dark Mode"
            description={isDark ? "Currently dark" : "Currently light"}
            value={isDark}
            onToggle={toggleTheme}
          />
        </View>

        <SectionHeader title="NOTIFICATIONS" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow
            icon="bell"
            label="Job Alerts"
            description="New matching jobs"
            value={true}
            onToggle={() => {}}
            tintColor={theme.emerald}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon="trending-up"
            label="Application Updates"
            description="Status changes"
            value={true}
            onToggle={() => {}}
            tintColor={theme.violet}
          />
        </View>

        <SectionHeader title="JOB PREFERENCES" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow
            icon="map-pin"
            label="Job Location"
            onPress={() => {}}
            rightEl={
              <Text style={[styles.rightValue, { color: theme.textSecondary }]}>Anywhere</Text>
            }
            tintColor={theme.accent}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon="dollar-sign"
            label="Salary Expectation"
            onPress={() => {}}
            rightEl={
              <Text style={[styles.rightValue, { color: theme.textSecondary }]}>$100K+</Text>
            }
            tintColor={theme.emerald}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon="wifi"
            label="Remote Only"
            value={false}
            onToggle={() => {}}
            tintColor={theme.violet}
          />
        </View>

        <SectionHeader title="PRIVACY & SECURITY" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow icon="shield" label="Privacy Policy" onPress={() => {}} />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow icon="file-text" label="Terms of Service" onPress={() => {}} />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow icon="lock" label="Change Password" onPress={() => {}} />
        </View>

        <SectionHeader title="SUPPORT" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow
            icon="help-circle"
            label="Help & FAQ"
            onPress={() => {}}
            tintColor={theme.accent}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon="message-circle"
            label="Send Feedback"
            onPress={() => {}}
            tintColor={theme.violet}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon="star"
            label="Rate the App"
            onPress={() => {}}
            tintColor={theme.warning}
          />
        </View>

        <SectionHeader title="ACCOUNT" />
        <View style={[styles.section, { borderColor: isDark ? "#3F2A78" : "#E4D8FF", backgroundColor: isDark ? "#1F143D" : "#FFFFFF" }]}>
          <SettingRow
            icon="log-out"
            label="Sign Out"
            onPress={logout}
            danger
          />
        </View>

        <Text style={[styles.version, { color: theme.textTertiary }]}>
          AutoHire AI · Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", fontWeight: "700", letterSpacing: -0.5 },
  content: { paddingHorizontal: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 29,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "700" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold", fontWeight: "700" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  profileStats: { flexDirection: "row", gap: 6, marginTop: 5 },
  statBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  editProfileText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 0,
    marginLeft: 0,
    marginTop: 0,
  },
  sectionHeaderWrap: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  section: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 5,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  settingContent: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rightValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowDivider: { height: 1, marginLeft: 64 },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
});
