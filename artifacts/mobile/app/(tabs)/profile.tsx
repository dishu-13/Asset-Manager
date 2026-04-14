import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, UserProfile, ExperienceEntry, EducationEntry } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function SectionCard({ title, icon, children, onAdd, addLabel }: {
  title: string;
  icon: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: `${theme.tint}15` }]}>
            <Feather name={icon as any} size={15} color={theme.tint} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        </View>
        {onAdd && (
          <Pressable onPress={onAdd} style={[styles.addBtn, { backgroundColor: `${theme.tint}15` }]}>
            <Feather name="plus" size={14} color={theme.tint} />
            <Text style={[styles.addBtnText, { color: theme.tint }]}>{addLabel || "Add"}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function SkillChip({ skill, onRemove }: { skill: string; onRemove: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: `${theme.tint}15` }]}>
      <Text style={[styles.chipText, { color: theme.tint }]}>{skill}</Text>
      <Pressable onPress={onRemove}>
        <Feather name="x" size={12} color={theme.tint} />
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const topPad = isWeb ? 67 : insets.top;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [profile, setProfile] = useState<UserProfile>({
    headline: "",
    location: "",
    bio: "",
    phone: "",
    website: "",
    linkedin: "",
    github: "",
    skills: [],
    experience: [],
    education: [],
    ...user?.profile,
  });
  const [newSkill, setNewSkill] = useState("");
  const [showExpForm, setShowExpForm] = useState(false);
  const [showEduForm, setShowEduForm] = useState(false);
  const [expDraft, setExpDraft] = useState<Omit<ExperienceEntry, "id">>({ title: "", company: "", startDate: "", current: false });
  const [eduDraft, setEduDraft] = useState<Omit<EducationEntry, "id">>({ degree: "", school: "", field: "", startDate: "" });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setProfile({ headline: "", location: "", bio: "", phone: "", website: "", linkedin: "", github: "", skills: [], experience: [], education: [], ...user.profile });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, profile });
      toast("Profile saved!", "success");
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      toast("Failed to save profile", "error");
    }
    setSaving(false);
  };

  const handleDiscard = () => {
    setName(user?.name || "");
    setProfile({ headline: "", location: "", bio: "", phone: "", website: "", linkedin: "", github: "", skills: [], experience: [], education: [], ...user?.profile });
    setEditing(false);
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || profile.skills.includes(s)) { setNewSkill(""); return; }
    setProfile((p) => ({ ...p, skills: [...p.skills, s] }));
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const addExperience = () => {
    if (!expDraft.title || !expDraft.company) { toast("Title and company are required", "error"); return; }
    setProfile((p) => ({ ...p, experience: [{ ...expDraft, id: generateId() }, ...p.experience] }));
    setExpDraft({ title: "", company: "", startDate: "", current: false });
    setShowExpForm(false);
  };

  const removeExperience = (id: string) => {
    setProfile((p) => ({ ...p, experience: p.experience.filter((e) => e.id !== id) }));
  };

  const addEducation = () => {
    if (!eduDraft.degree || !eduDraft.school) { toast("Degree and school are required", "error"); return; }
    setProfile((p) => ({ ...p, education: [{ ...eduDraft, id: generateId() }, ...p.education] }));
    setEduDraft({ degree: "", school: "", field: "", startDate: "" });
    setShowEduForm(false);
  };

  const removeEducation = (id: string) => {
    setProfile((p) => ({ ...p, education: p.education.filter((e) => e.id !== id) }));
  };

  const avatarLabel = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
          <View style={[styles.headerInner, isWide && styles.headerInnerWide]}>
          <View style={[styles.headerRow, isWide && styles.headerRowWide]}>
            <View style={styles.headerLeft}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={18} color="#fff" />
              </Pressable>
              <View>
                <Text style={styles.headerTitle}>Profile</Text>
                <Text style={styles.headerSub}>{editing ? "Edit mode" : "Your professional profile"}</Text>
              </View>
            </View>
            {editing ? (
              <View style={styles.headerActions}>
                <Pressable onPress={handleDiscard} style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <Text style={styles.headerBtnText}>Discard</Text>
                </Pressable>
                <Pressable onPress={handleSave} disabled={saving} style={[styles.headerBtn, { backgroundColor: "#fff" }]}>
                  <Text style={[styles.headerBtnText, { color: "#4F46E5" }]}>{saving ? "Saving..." : "Save"}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditing(true)} style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={styles.headerBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.avatarRow, isWide && styles.avatarRowWide]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLabel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <>
                  <TextInput style={[styles.nameInput, { color: "#fff", borderBottomColor: "rgba(255,255,255,0.4)" }]} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.5)" />
                  <TextInput style={[styles.headlineInput, { color: "rgba(255,255,255,0.8)", borderBottomColor: "rgba(255,255,255,0.3)" }]} value={profile.headline} onChangeText={(v) => setProfile((p) => ({ ...p, headline: v }))} placeholder="Professional headline" placeholderTextColor="rgba(255,255,255,0.4)" />
                </>
              ) : (
                <>
                  <Text style={styles.avatarName}>{name || "Your Name"}</Text>
                  <Text style={styles.avatarHeadline}>{profile.headline || "Add your professional headline"}</Text>
                </>
              )}
              {profile.location ? (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={11} color="rgba(255,255,255,0.7)" />
                  {editing ? (
                    <TextInput style={[styles.locationInput, { color: "rgba(255,255,255,0.8)" }]} value={profile.location} onChangeText={(v) => setProfile((p) => ({ ...p, location: v }))} placeholder="City, Country" placeholderTextColor="rgba(255,255,255,0.4)" />
                  ) : (
                    <Text style={styles.locationText}>{profile.location}</Text>
                  )}
                </View>
              ) : editing ? (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={11} color="rgba(255,255,255,0.7)" />
                  <TextInput style={[styles.locationInput, { color: "rgba(255,255,255,0.8)" }]} value={profile.location} onChangeText={(v) => setProfile((p) => ({ ...p, location: v }))} placeholder="City, Country" placeholderTextColor="rgba(255,255,255,0.4)" />
                </View>
              ) : null}
            </View>
          </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <SectionCard title="About" icon="user">
            {editing ? (
              <TextInput
                style={[styles.bioInput, { color: theme.text, borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}
                value={profile.bio}
                onChangeText={(v) => setProfile((p) => ({ ...p, bio: v }))}
                placeholder="Tell recruiters about yourself..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={[styles.bio, { color: profile.bio ? theme.text : theme.textTertiary }]}>
                {profile.bio || "No bio yet. Add one to stand out!"}
              </Text>
            )}
          </SectionCard>

          <SectionCard title="Contact" icon="at-sign">
            {editing ? (
              <View style={styles.contactFields}>
                {[
                  { key: "phone", placeholder: "Phone", icon: "phone" },
                  { key: "website", placeholder: "Website URL", icon: "globe" },
                  { key: "linkedin", placeholder: "LinkedIn URL", icon: "linkedin" },
                  { key: "github", placeholder: "GitHub URL", icon: "github" },
                ].map(({ key, placeholder, icon }) => (
                  <View key={key} style={[styles.contactRow, { borderBottomColor: theme.separator }]}>
                    <Feather name={icon as any} size={14} color={theme.textSecondary} />
                    <TextInput
                      style={[styles.contactInput, { color: theme.text }]}
                      value={(profile as any)[key]}
                      onChangeText={(v) => setProfile((p) => ({ ...p, [key]: v }))}
                      placeholder={placeholder}
                      placeholderTextColor={theme.textTertiary}
                      autoCapitalize="none"
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.contactDisplay}>
                {[
                  { key: "phone", icon: "phone" },
                  { key: "website", icon: "globe" },
                  { key: "linkedin", icon: "linkedin" },
                  { key: "github", icon: "github" },
                ].map(({ key, icon }) => (profile as any)[key] ? (
                  <View key={key} style={styles.contactDisplayRow}>
                    <Feather name={icon as any} size={13} color={theme.textSecondary} />
                    <Text style={[styles.contactDisplayText, { color: theme.text }]} numberOfLines={1}>{(profile as any)[key]}</Text>
                  </View>
                ) : null)}
                {!profile.phone && !profile.website && !profile.linkedin && !profile.github && (
                  <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No contact info yet</Text>
                )}
              </View>
            )}
          </SectionCard>

          <SectionCard
            title="Skills"
            icon="zap"
            onAdd={editing ? () => {} : undefined}
          >
            {editing && (
              <View style={[styles.addSkillRow, { borderColor: theme.separator }]}>
                <TextInput
                  style={[styles.skillInput, { color: theme.text }]}
                  value={newSkill}
                  onChangeText={setNewSkill}
                  placeholder="Add a skill (e.g. React, Python)"
                  placeholderTextColor={theme.textTertiary}
                  onSubmitEditing={addSkill}
                  returnKeyType="done"
                />
                <Pressable onPress={addSkill} style={[styles.skillAddBtn, { backgroundColor: theme.tint }]}>
                  <Feather name="plus" size={14} color="#fff" />
                </Pressable>
              </View>
            )}
            <View style={styles.chips}>
              {profile.skills.map((s) => (
                editing
                  ? <SkillChip key={s} skill={s} onRemove={() => removeSkill(s)} />
                  : <View key={s} style={[styles.chip, { backgroundColor: `${theme.tint}15` }]}><Text style={[styles.chipText, { color: theme.tint }]}>{s}</Text></View>
              ))}
              {profile.skills.length === 0 && (
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>{editing ? "Add your first skill above" : "No skills added yet"}</Text>
              )}
            </View>
          </SectionCard>

          <SectionCard title="Experience" icon="briefcase" onAdd={editing ? () => setShowExpForm(true) : undefined} addLabel="Add Role">
            {editing && showExpForm && (
              <View style={[styles.formBox, { borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.formTitle, { color: theme.text }]}>New Experience</Text>
                {[
                  { key: "title", placeholder: "Job Title*", val: expDraft.title, set: (v: string) => setExpDraft((d) => ({ ...d, title: v })) },
                  { key: "company", placeholder: "Company*", val: expDraft.company, set: (v: string) => setExpDraft((d) => ({ ...d, company: v })) },
                  { key: "startDate", placeholder: "Start Date (e.g. Jan 2022)", val: expDraft.startDate, set: (v: string) => setExpDraft((d) => ({ ...d, startDate: v })) },
                  { key: "endDate", placeholder: "End Date (or 'Present')", val: expDraft.endDate || "", set: (v: string) => setExpDraft((d) => ({ ...d, endDate: v })) },
                ].map(({ key, placeholder, val, set }) => (
                  <TextInput key={key} style={[styles.formInput, { color: theme.text, borderColor: theme.separator }]} value={val} onChangeText={set} placeholder={placeholder} placeholderTextColor={theme.textTertiary} />
                ))}
                <View style={styles.formActions}>
                  <Pressable onPress={() => setShowExpForm(false)} style={[styles.formBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.separator, borderWidth: 1 }]}>
                    <Text style={[styles.formBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={addExperience} style={[styles.formBtn, { backgroundColor: theme.tint }]}>
                    <Text style={[styles.formBtnText, { color: "#fff" }]}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {profile.experience.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>{editing ? "Tap '+ Add Role' to add experience" : "No experience added yet"}</Text>
            ) : profile.experience.map((exp, idx) => (
              <View key={exp.id} style={[styles.entryRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.separator }]}>
                <View style={[styles.entryDot, { backgroundColor: theme.tint }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryTitle, { color: theme.text }]}>{exp.title}</Text>
                  <Text style={[styles.entrySub, { color: theme.textSecondary }]}>{exp.company}</Text>
                  {exp.startDate && <Text style={[styles.entrySub, { color: theme.textTertiary }]}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : exp.current ? " – Present" : ""}</Text>}
                </View>
                {editing && (
                  <Pressable onPress={() => removeExperience(exp.id)} style={[styles.removeBtn, { backgroundColor: `${theme.danger}15` }]}>
                    <Feather name="trash-2" size={13} color={theme.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </SectionCard>

          <SectionCard title="Education" icon="book" onAdd={editing ? () => setShowEduForm(true) : undefined} addLabel="Add School">
            {editing && showEduForm && (
              <View style={[styles.formBox, { borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.formTitle, { color: theme.text }]}>New Education</Text>
                {[
                  { key: "degree", placeholder: "Degree* (e.g. B.S. Computer Science)", val: eduDraft.degree, set: (v: string) => setEduDraft((d) => ({ ...d, degree: v })) },
                  { key: "school", placeholder: "School*", val: eduDraft.school, set: (v: string) => setEduDraft((d) => ({ ...d, school: v })) },
                  { key: "field", placeholder: "Field of Study", val: eduDraft.field || "", set: (v: string) => setEduDraft((d) => ({ ...d, field: v })) },
                  { key: "startDate", placeholder: "Year (e.g. 2018 – 2022)", val: eduDraft.startDate, set: (v: string) => setEduDraft((d) => ({ ...d, startDate: v })) },
                ].map(({ key, placeholder, val, set }) => (
                  <TextInput key={key} style={[styles.formInput, { color: theme.text, borderColor: theme.separator }]} value={val} onChangeText={set} placeholder={placeholder} placeholderTextColor={theme.textTertiary} />
                ))}
                <View style={styles.formActions}>
                  <Pressable onPress={() => setShowEduForm(false)} style={[styles.formBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.separator, borderWidth: 1 }]}>
                    <Text style={[styles.formBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={addEducation} style={[styles.formBtn, { backgroundColor: theme.tint }]}>
                    <Text style={[styles.formBtnText, { color: "#fff" }]}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {profile.education.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>{editing ? "Tap '+ Add School' to add education" : "No education added yet"}</Text>
            ) : profile.education.map((edu, idx) => (
              <View key={edu.id} style={[styles.entryRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.separator }]}>
                <View style={[styles.entryDot, { backgroundColor: theme.violet }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryTitle, { color: theme.text }]}>{edu.degree}</Text>
                  <Text style={[styles.entrySub, { color: theme.textSecondary }]}>{edu.school}</Text>
                  {edu.startDate && <Text style={[styles.entrySub, { color: theme.textTertiary }]}>{edu.startDate}</Text>}
                </View>
                {editing && (
                  <Pressable onPress={() => removeEducation(edu.id)} style={[styles.removeBtn, { backgroundColor: `${theme.danger}15` }]}>
                    <Feather name="trash-2" size={13} color={theme.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </SectionCard>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerInner: { width: "100%" },
  headerInnerWide: { alignSelf: "center", maxWidth: 1120 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerRowWide: { alignItems: "flex-start" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  headerBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  avatarRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  avatarRowWide: { maxWidth: 760 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarHeadline: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  nameInput: { fontSize: 18, fontFamily: "Inter_700Bold", borderBottomWidth: 1, paddingBottom: 2, marginBottom: 4 },
  headlineInput: { fontSize: 12, fontFamily: "Inter_400Regular", borderBottomWidth: 1, paddingBottom: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  locationText: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  locationInput: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  content: { padding: 16, gap: 12 },
  contentWide: { alignSelf: "center", width: "100%", maxWidth: 1120 },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bioInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, lineHeight: 22 },
  contactFields: { gap: 2 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  contactInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  contactDisplay: { gap: 8 },
  contactDisplayRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactDisplayText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  addSkillRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, overflow: "hidden", marginBottom: 4 },
  skillInput: { flex: 1, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  skillAddBtn: { width: 40, alignItems: "center", justifyContent: "center", height: 42 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  entryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  entryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entrySub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  removeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  formBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 4 },
  formTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, padding: 9, fontSize: 13, fontFamily: "Inter_400Regular" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  formBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  formBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
