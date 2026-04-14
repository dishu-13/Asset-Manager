import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { fetchTailoredResume, parseUploadedResumeFile } from "@/utils/apiService";

type Template =
  | "classic"
  | "modern"
  | "timeline"
  | "minimal"
  | "executive"
  | "ats"
  | "creative"
  | "compact";
type ExportFormat = "word" | "pdf";

const MOCK_RESUME = `John Smith
john.smith@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 5+ years of experience building scalable web applications. Proficient in React, Node.js, TypeScript, and cloud infrastructure. Strong track record of leading cross-functional teams and delivering high-impact products.

EXPERIENCE

Senior Software Engineer — TechCorp Inc.
2021 – Present
• Led development of customer-facing dashboard used by 50K+ users
• Reduced page load time by 40% through performance optimization
• Mentored 3 junior engineers and conducted code reviews

Software Engineer — StartupXYZ
2019 – 2021
• Built RESTful APIs serving 1M+ daily requests
• Implemented CI/CD pipelines reducing deployment time by 60%
• Collaborated with product and design teams on feature roadmap

EDUCATION
B.S. Computer Science — State University, 2019

SKILLS
JavaScript, TypeScript, Python, SQL, React, Node.js, Express, Next.js, Docker, AWS, Git, PostgreSQL`;

function sanitizeResumeText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[•●▪◦]/g, "•")
    .replace(/[–—]/g, "-")
    .replace(/\uFFFD/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeRawBinaryDocument(text: string) {
  const sample = text.slice(0, 1600);
  return (
    /^%PDF-/i.test(sample) ||
    /\/Type\s*\/Page\b/.test(sample) ||
    /endobj/.test(sample) ||
    /stream[\s\S]{0,200}endstream/.test(sample) ||
    /Skia\/PDF/i.test(sample)
  );
}

function isLikelySectionHeading(line: string) {
  const clean = line.trim().replace(/[:\-]+$/, "");
  if (!clean || clean.length < 3 || clean.length > 60) return false;
  const normalized = clean.replace(/[^A-Za-z ]/g, "").trim();
  const commonHeadings = [
    "summary",
    "professional summary",
    "profile",
    "about",
    "experience",
    "work experience",
    "employment",
    "education",
    "projects",
    "internships",
    "certifications",
    "skills",
    "technical skills",
    "achievements",
    "positions of responsibility",
    "contact",
  ];
  if (commonHeadings.includes(normalized.toLowerCase())) return true;
  return clean === clean.toUpperCase();
}

function isLikelyDateLine(line: string) {
  return /(\b\d{1,2}[/-]\d{2,4}\b|\b\d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\bpresent\b)/i.test(
    line
  );
}

function isLikelyBullet(line: string) {
  return /^([•*-]|\d+\.)\s*/.test(line.trim());
}

function isLikelySubheading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return false;
  if (isLikelySectionHeading(trimmed) || isLikelyBullet(trimmed) || isLikelyDateLine(trimmed)) return false;
  return /^[A-Za-z0-9,&/().+\- ]+$/.test(trimmed) && /[A-Za-z]/.test(trimmed);
}

function normalizeResumeLayout(text: string) {
  const rawLines = sanitizeResumeText(text)
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);

  const merged: string[] = [];
  for (const line of rawLines) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(line);
      continue;
    }

    const previousEndsSoftly = !/[.!?:]$/.test(previous);
    const lineStartsLower = /^[a-z(]/.test(line);
    const lineLooksContinuation =
      previousEndsSoftly &&
      line.length < 120 &&
      !isLikelySectionHeading(line) &&
      !isLikelyDateLine(line) &&
      !isLikelySubheading(line) &&
      !isLikelyBullet(line);

    if (lineStartsLower || lineLooksContinuation) {
      merged[merged.length - 1] = `${previous} ${line}`.replace(/\s{2,}/g, " ");
      continue;
    }

    merged.push(line);
  }

  const blocks: string[] = [];
  for (let i = 0; i < merged.length; i++) {
    const line = merged[i];
    const next = merged[i + 1];

    if (isLikelySectionHeading(line)) {
      if (blocks.length && blocks[blocks.length - 1] !== "") blocks.push("");
      blocks.push(line.toUpperCase());
      continue;
    }

    blocks.push(line);

    if (next) {
      const shouldBreak =
        isLikelySectionHeading(next) ||
        (isLikelySubheading(line) && isLikelyDateLine(next)) ||
        (isLikelyDateLine(line) && isLikelySubheading(next)) ||
        (isLikelyBullet(line) && !isLikelyBullet(next)) ||
        (!isLikelyBullet(line) && isLikelySubheading(next) && !isLikelySubheading(line) && !isLikelyDateLine(line));

      if (shouldBreak && blocks[blocks.length - 1] !== "") {
        blocks.push("");
      }
    }
  }

  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikeReadableResume(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false;
  if (looksLikeRawBinaryDocument(trimmed)) return false;
  const readableChars = (trimmed.match(/[A-Za-z0-9\s.,:/+()\-@]/g) || []).length;
  return readableChars / Math.max(trimmed.length, 1) > 0.7;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function parseResumeSections(content: string) {
  const lines = normalizeResumeLayout(content).split("\n");
  const name = lines[0] || "Resume";
  const contact = lines[1] || "";
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line === line.toUpperCase() && line.length > 2 && !line.startsWith("•")) {
      if (current) sections.push(current);
      current = { heading: line, body: [] };
    } else {
      if (!current) current = { heading: "DETAILS", body: [] };
      current.body.push(line);
    }
  }

  if (current) sections.push(current);
  return { name, contact, sections };
}

function buildResumeHtml(content: string, template: Template) {
  const { name, contact, sections } = parseResumeSections(content);
  const sectionHtml = sections
    .map(
      (section) => `
        <section class="section">
          <h2>${escapeHtml(section.heading)}</h2>
          ${section.body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </section>
      `
    )
    .join("");

  const styles =
    template === "classic"
      ? `
        body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; margin: 0; padding: 40px; }
        .shell { max-width: 820px; margin: 0 auto; }
        h1 { margin: 0; font-size: 28px; text-align: center; }
        .contact { margin-top: 6px; font-size: 13px; text-align: center; color: #4b5563; }
        .rule { height: 1px; background: #111827; margin: 18px 0 20px; }
        h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: 1px; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
        .section { margin-bottom: 16px; }
      `
      : template === "timeline"
      ? `
        body { font-family: Arial, sans-serif; color: #0f172a; background: #eff6ff; margin: 0; padding: 32px; }
        .shell { max-width: 920px; margin: 0 auto; display: grid; grid-template-columns: 220px 1fr; background: #ffffff; border: 1px solid #dbeafe; border-radius: 24px; overflow: hidden; }
        .side { background: linear-gradient(180deg, #dbeafe, #eff6ff); padding: 28px 22px; }
        h1 { margin: 0; font-size: 28px; line-height: 1.1; }
        .contact { margin-top: 10px; font-size: 13px; color: #475569; white-space: pre-wrap; }
        .body { padding: 26px 30px; }
        .section { margin-bottom: 18px; display: grid; grid-template-columns: 22px 1fr; gap: 10px; }
        .rail { position: relative; }
        .dot { width: 10px; height: 10px; border-radius: 999px; background: #4f46e5; margin-top: 4px; }
        .line { position: absolute; left: 4px; top: 18px; bottom: -16px; width: 2px; background: #cbd5e1; }
        h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: 1px; color: #1d4ed8; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
      `
      : template === "minimal"
      ? `
        body { font-family: Arial, sans-serif; color: #111827; background: #fafaf9; margin: 0; padding: 38px; }
        .shell { max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 18px; padding: 32px; }
        h1 { margin: 0; font-size: 30px; letter-spacing: -0.6px; }
        .contact { margin-top: 8px; font-size: 13px; color: #57534e; }
        .section { margin-top: 20px; }
        h2 { margin: 0; font-size: 12px; letter-spacing: 1.4px; color: #44403c; }
        .rule { height: 1px; background: #111827; margin: 8px 0 12px; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.62; color: #292524; white-space: pre-wrap; }
      `
      : template === "executive"
      ? `
        body { font-family: Georgia, 'Times New Roman', serif; color: #111827; background: #f8fafc; margin: 0; padding: 36px; }
        .shell { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe4ee; border-radius: 22px; padding: 34px; }
        h1 { margin: 0; font-size: 34px; letter-spacing: -0.6px; }
        .contact { margin-top: 10px; font-size: 13px; color: #475569; white-space: pre-wrap; }
        .section { margin-top: 22px; }
        h2 { margin: 0; font-size: 12px; letter-spacing: 2px; color: #1e3a8a; text-transform: uppercase; }
        .rule { height: 1px; background: #cbd5e1; margin: 8px 0 12px; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.65; color: #1f2937; white-space: pre-wrap; }
      `
      : template === "ats"
      ? `
        body { font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 28px; }
        .shell { max-width: 860px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 26px; }
        h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
        .contact { margin-top: 8px; font-size: 12px; color: #475569; white-space: pre-wrap; }
        .section { margin-top: 18px; }
        .section-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        h2 { margin: 0; font-size: 12px; letter-spacing: 1.4px; color: #111827; text-transform: uppercase; }
        .line { height: 1px; background: #cbd5e1; flex: 1; }
        p { margin: 0 0 7px; font-size: 12px; line-height: 1.55; color: #334155; white-space: pre-wrap; }
      `
      : template === "creative"
      ? `
        body { font-family: Arial, sans-serif; color: #111827; background: #fff7ed; margin: 0; padding: 30px; }
        .shell { max-width: 860px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 26px; overflow: hidden; }
        .hero { padding: 30px 32px; background: linear-gradient(135deg, #f59e0b, #f97316, #ec4899); color: #ffffff; }
        h1 { margin: 0; font-size: 31px; letter-spacing: -0.5px; }
        .contact { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.92); white-space: pre-wrap; }
        .body { padding: 22px 28px 28px; }
        .section { margin-bottom: 18px; padding: 14px 16px; background: #fff7ed; border-radius: 16px; }
        h2 { margin: 0 0 8px; font-size: 13px; color: #9a3412; letter-spacing: 1px; text-transform: uppercase; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.58; color: #431407; white-space: pre-wrap; }
      `
      : template === "compact"
      ? `
        body { font-family: Arial, sans-serif; color: #111827; background: #f8fafc; margin: 0; padding: 28px; }
        .shell { max-width: 920px; margin: 0 auto; background: #ffffff; border: 1px solid #dbeafe; border-radius: 18px; padding: 24px; }
        h1 { margin: 0; font-size: 28px; }
        .contact { margin-top: 6px; font-size: 12px; color: #475569; white-space: pre-wrap; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
        .section { border: 1px solid #dbeafe; border-radius: 14px; padding: 14px; }
        h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: 1px; color: #1d4ed8; text-transform: uppercase; }
        p { margin: 0 0 7px; font-size: 12px; line-height: 1.55; color: #334155; white-space: pre-wrap; }
      `
      : `
        body { font-family: Arial, sans-serif; color: #111827; background: #eef2ff; margin: 0; padding: 32px; }
        .shell { max-width: 860px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe4ff; border-radius: 24px; overflow: hidden; }
        .hero { padding: 28px 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; }
        h1 { margin: 0; font-size: 30px; }
        .contact { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.85); }
        .body { padding: 24px 32px; }
        h2 { margin: 0 0 10px; font-size: 14px; color: #312e81; letter-spacing: 0.8px; }
        p { margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #374151; white-space: pre-wrap; }
        .section { margin-bottom: 18px; }
      `;

  const layout =
    template === "classic"
      ? `<main class="shell"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div><div class="rule"></div>${sectionHtml}</main>`
      : template === "timeline"
      ? `<main class="shell"><aside class="side"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div></aside><div class="body">${sections
          .map(
            (section) => `<section class="section"><div class="rail"><div class="dot"></div><div class="line"></div></div><div><h2>${escapeHtml(section.heading)}</h2>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</div></section>`
          )
          .join("")}</div></main>`
      : template === "minimal"
      ? `<main class="shell"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div>${sections
          .map(
            (section) => `<section class="section"><h2>${escapeHtml(section.heading)}</h2><div class="rule"></div>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</section>`
          )
          .join("")}</main>`
      : template === "executive"
      ? `<main class="shell"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div>${sections
          .map(
            (section) => `<section class="section"><h2>${escapeHtml(section.heading)}</h2><div class="rule"></div>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</section>`
          )
          .join("")}</main>`
      : template === "ats"
      ? `<main class="shell"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div>${sections
          .map(
            (section) => `<section class="section"><div class="section-row"><h2>${escapeHtml(section.heading)}</h2><div class="line"></div></div>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</section>`
          )
          .join("")}</main>`
      : template === "creative"
      ? `<main class="shell"><header class="hero"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div></header><div class="body">${sections
          .map(
            (section) => `<section class="section"><h2>${escapeHtml(section.heading)}</h2>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</section>`
          )
          .join("")}</div></main>`
      : template === "compact"
      ? `<main class="shell"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div><div class="grid">${sections
          .map(
            (section) => `<section class="section"><h2>${escapeHtml(section.heading)}</h2>${section.body
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")}</section>`
          )
          .join("")}</div></main>`
      : `<main class="shell"><header class="hero"><h1>${escapeHtml(name)}</h1><div class="contact">${escapeHtml(contact)}</div></header><div class="body">${sectionHtml}</div></main>`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(name)} Resume</title>
      <style>${styles}</style>
    </head>
    <body>${layout}</body>
  </html>`;
}

async function readPickedResume(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web") {
    if ("file" in asset && asset.file) {
      const text = sanitizeResumeText(await asset.file.text());
      if (looksLikeReadableResume(text)) return normalizeResumeLayout(text);

      const bytes = await asset.file.arrayBuffer();
      const base64 = arrayBufferToBase64(bytes);
      if (!base64) throw new Error("Selected file is empty.");

      const parsed = await parseUploadedResumeFile({
        fileName: asset.name,
        mimeType: asset.mimeType,
        base64,
      });
      return normalizeResumeLayout(parsed.text);
    }

    if (asset.uri) {
      if (asset.uri.startsWith("data:")) {
        const [, base64 = ""] = asset.uri.split(",");
        if (!base64) throw new Error("Selected file is empty.");
        const parsed = await parseUploadedResumeFile({
          fileName: asset.name,
          mimeType: asset.mimeType,
          base64,
        });
        return normalizeResumeLayout(parsed.text);
      }

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const text = sanitizeResumeText(await blob.text());
      if (looksLikeReadableResume(text)) return normalizeResumeLayout(text);

      const bytes = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(bytes);
      if (!base64) throw new Error("Selected file is empty.");

      const parsed = await parseUploadedResumeFile({
        fileName: asset.name,
        mimeType: asset.mimeType || blob.type,
        base64,
      });
      return normalizeResumeLayout(parsed.text);
    }
  }

  const text = sanitizeResumeText(await LegacyFileSystem.readAsStringAsync(asset.uri));
  if (looksLikeReadableResume(text)) return normalizeResumeLayout(text);

  const nativeBase64 = await LegacyFileSystem.readAsStringAsync(asset.uri, { encoding: LegacyFileSystem.EncodingType.Base64 });
  if (!nativeBase64) throw new Error("Selected file is empty.");

  const parsed = await parseUploadedResumeFile({
    fileName: asset.name,
    mimeType: asset.mimeType,
    base64: nativeBase64,
  });

  return normalizeResumeLayout(parsed.text);
}

// ── Preview components ─────────────────────────────────────────────────────

function ClassicPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const lines = content.split("\n");
  const name = lines[0] || "";
  const contact = lines[1] || "";
  const rest = lines.slice(3).join("\n");
  return (
    <View style={[styles.previewClassic, { backgroundColor: theme.card, borderColor: theme.separator }]}>
      <Text style={styles.previewClassicName}>{name}</Text>
      {contact ? <Text style={styles.previewClassicContact}>{contact}</Text> : null}
      <View style={styles.previewDivider} />
      <Text style={styles.previewClassicBody}>{rest}</Text>
    </View>
  );
}

function ModernPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const lines = content.split("\n");
  const name = lines[0] || "";
  const contact = lines[1] || "";
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line === line.toUpperCase() && line.trim().length > 2 && !line.startsWith("•")) {
      if (current) sections.push(current);
      current = { heading: line.trim(), body: [] };
    } else {
      if (!current) current = { heading: "", body: [] };
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return (
    <View style={[styles.previewModern, { borderColor: theme.separator }]}>
      <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.previewModernHeader}>
        <Text style={styles.previewModernName}>{name}</Text>
        {contact ? <Text style={styles.previewModernContact}>{contact}</Text> : null}
      </LinearGradient>
      <View style={styles.previewModernBody}>
        {sections.map((s, i) => (
          <View key={i} style={styles.previewModernSection}>
            <View style={styles.previewModernSectionHeader}>
              <View style={[styles.previewModernAccent, { backgroundColor: "#4F46E5" }]} />
              <Text style={styles.previewModernHeading}>{s.heading}</Text>
            </View>
            {s.body.map((line, j) => (
              <Text key={j} style={styles.previewModernLine}>{line}</Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function TimelinePreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewTimeline, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <View style={styles.previewTimelineSidebar}>
        <Text style={styles.previewTimelineName}>{name}</Text>
        {contact ? <Text style={styles.previewTimelineContact}>{contact}</Text> : null}
      </View>
      <View style={styles.previewTimelineBody}>
        {sections.map((section, i) => (
          <View key={i} style={styles.previewTimelineSection}>
            <View style={styles.previewTimelineRow}>
              <View style={styles.previewTimelineRail}>
                <View style={[styles.previewTimelineDot, { backgroundColor: "#4F46E5" }]} />
                <View style={[styles.previewTimelineLine, { backgroundColor: `${theme.separator}` }]} />
              </View>
              <View style={styles.previewTimelineContent}>
                <Text style={styles.previewTimelineHeading}>{section.heading}</Text>
                {section.body.map((line, j) => (
                  <Text key={j} style={styles.previewTimelineText}>{line}</Text>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MinimalPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewMinimal, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <Text style={styles.previewMinimalName}>{name}</Text>
      {contact ? <Text style={styles.previewMinimalContact}>{contact}</Text> : null}
      {sections.map((section, i) => (
        <View key={i} style={styles.previewMinimalSection}>
          <Text style={styles.previewMinimalHeading}>{section.heading}</Text>
          <View style={[styles.previewMinimalRule, { backgroundColor: "#111827" }]} />
          {section.body.map((line, j) => (
            <Text key={j} style={styles.previewMinimalText}>{line}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ExecutivePreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewExecutive, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <View style={styles.previewExecutiveHeader}>
        <Text style={styles.previewExecutiveName}>{name}</Text>
        {contact ? <Text style={styles.previewExecutiveContact}>{contact}</Text> : null}
      </View>
      {sections.map((section, i) => (
        <View key={i} style={styles.previewExecutiveSection}>
          <Text style={styles.previewExecutiveHeading}>{section.heading}</Text>
          <View style={styles.previewExecutiveRule} />
          {section.body.map((line, j) => (
            <Text key={j} style={styles.previewExecutiveText}>{line}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ATSPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewAts, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <Text style={styles.previewAtsName}>{name}</Text>
      {contact ? <Text style={styles.previewAtsContact}>{contact}</Text> : null}
      {sections.map((section, i) => (
        <View key={i} style={styles.previewAtsSection}>
          <View style={styles.previewAtsSectionRow}>
            <Text style={styles.previewAtsHeading}>{section.heading}</Text>
            <View style={styles.previewAtsSectionLine} />
          </View>
          {section.body.map((line, j) => (
            <Text key={j} style={styles.previewAtsText}>{line}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function CreativePreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewCreative, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <LinearGradient colors={["#F59E0B", "#F97316", "#EC4899"]} style={styles.previewCreativeHero}>
        <Text style={styles.previewCreativeName}>{name}</Text>
        {contact ? <Text style={styles.previewCreativeContact}>{contact}</Text> : null}
      </LinearGradient>
      <View style={styles.previewCreativeBody}>
        {sections.map((section, i) => (
          <View key={i} style={styles.previewCreativeSection}>
            <Text style={styles.previewCreativeHeading}>{section.heading}</Text>
            {section.body.map((line, j) => (
              <Text key={j} style={styles.previewCreativeText}>{line}</Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function CompactPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const { name, contact, sections } = parseResumeSections(content);
  return (
    <View style={[styles.previewCompact, { borderColor: theme.separator, backgroundColor: theme.card }]}>
      <View style={styles.previewCompactHeader}>
        <Text style={styles.previewCompactName}>{name}</Text>
        {contact ? <Text style={styles.previewCompactContact}>{contact}</Text> : null}
      </View>
      <View style={styles.previewCompactGrid}>
        {sections.map((section, i) => (
          <View key={i} style={styles.previewCompactSection}>
            <Text style={styles.previewCompactHeading}>{section.heading}</Text>
            {section.body.map((line, j) => (
              <Text key={j} style={styles.previewCompactText}>{line}</Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function TemplateThumbnail({
  template,
  label,
  selected,
  onPress,
}: {
  template: Template;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.templateThumb,
        {
          backgroundColor: theme.card,
          borderColor: selected ? theme.tint : theme.separator,
        },
      ]}
    >
      <View style={styles.templateThumbCanvas}>
        {template === "modern" ? (
          <>
            <View style={[styles.templateThumbHeader, { backgroundColor: "#4F46E5" }]} />
            <View style={styles.templateThumbLines}>
              <View style={[styles.templateThumbLine, { width: "55%" }]} />
              <View style={[styles.templateThumbLine, { width: "82%" }]} />
              <View style={[styles.templateThumbLine, { width: "78%" }]} />
            </View>
          </>
        ) : template === "timeline" ? (
          <View style={styles.templateThumbTimeline}>
            <View style={[styles.templateThumbSidebar, { backgroundColor: "#DBEAFE" }]} />
            <View style={styles.templateThumbTimelineBody}>
              <View style={styles.templateThumbDotLine} />
              <View style={styles.templateThumbDotLine} />
              <View style={styles.templateThumbDotLine} />
            </View>
          </View>
        ) : template === "minimal" ? (
          <>
            <View style={[styles.templateThumbLine, { width: "60%", height: 7 }]} />
            <View style={[styles.templateThumbRule, { marginTop: 8 }]} />
            <View style={[styles.templateThumbLine, { width: "88%" }]} />
            <View style={[styles.templateThumbLine, { width: "76%" }]} />
          </>
        ) : template === "executive" ? (
          <>
            <View style={[styles.templateThumbLine, { width: "58%", height: 7, backgroundColor: "#0F172A" }]} />
            <View style={[styles.templateThumbLine, { width: "72%", marginTop: 6 }]} />
            <View style={[styles.templateThumbRule, { marginTop: 10, backgroundColor: "#CBD5E1" }]} />
            <View style={[styles.templateThumbLine, { width: "86%" }]} />
          </>
        ) : template === "ats" ? (
          <>
            <View style={[styles.templateThumbLine, { width: "64%", height: 7, backgroundColor: "#111827" }]} />
            <View style={styles.templateThumbAtsRow}>
              <View style={[styles.templateThumbLine, { width: "34%", marginTop: 10 }]} />
              <View style={[styles.templateThumbRule, { flex: 1, marginTop: 10 }]} />
            </View>
            <View style={[styles.templateThumbLine, { width: "88%" }]} />
            <View style={[styles.templateThumbLine, { width: "74%" }]} />
          </>
        ) : template === "creative" ? (
          <>
            <LinearGradient colors={["#F59E0B", "#EC4899"]} style={styles.templateThumbHeader} />
            <View style={[styles.templateThumbPanel, { backgroundColor: "#FFF7ED" }]} />
            <View style={[styles.templateThumbPanel, { backgroundColor: "#FFF7ED" }]} />
          </>
        ) : template === "compact" ? (
          <View style={styles.templateThumbCompactGrid}>
            <View style={styles.templateThumbCompactCell} />
            <View style={styles.templateThumbCompactCell} />
            <View style={styles.templateThumbCompactCell} />
            <View style={styles.templateThumbCompactCell} />
          </View>
        ) : (
          <>
            <View style={[styles.templateThumbLine, { width: "58%", height: 7, backgroundColor: "#111827" }]} />
            <View style={[styles.templateThumbLine, { width: "70%", marginTop: 8 }]} />
            <View style={[styles.templateThumbRule, { marginTop: 10, backgroundColor: "#111827" }]} />
            <View style={[styles.templateThumbLine, { width: "84%" }]} />
          </>
        )}
      </View>
      <Text style={[styles.templateThumbLabel, { color: selected ? theme.tint : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function ResumeTemplatePreview({ template, content }: { template: Template; content: string }) {
  if (template === "classic") return <ClassicPreview content={content} />;
  if (template === "timeline") return <TimelinePreview content={content} />;
  if (template === "minimal") return <MinimalPreview content={content} />;
  if (template === "executive") return <ExecutivePreview content={content} />;
  if (template === "ats") return <ATSPreview content={content} />;
  if (template === "creative") return <CreativePreview content={content} />;
  if (template === "compact") return <CompactPreview content={content} />;
  return <ModernPreview content={content} />;
}

// ── ATS Score Ring ─────────────────────────────────────────────────────────

function ATSRing({ score, prev }: { score: number; prev: number | null }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score, duration: 900, useNativeDriver: false }).start();
  }, [score]);
  const color = score >= 75 ? theme.emerald : score >= 50 ? theme.warning : theme.danger;
  const label = score >= 75 ? "Strong Match" : score >= 50 ? "Good Match" : "Weak Match";
  const diff = prev !== null ? score - prev : null;

  return (
    <View style={[styles.atsRingCard, { backgroundColor: theme.card }]}>
      <View style={styles.atsRingLeft}>
        <View style={[styles.atsRingCircle, { borderColor: `${color}30` }]}>
          <View style={[styles.atsRingInner, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.atsRingScore, { color }]}>{score}</Text>
            <Text style={[styles.atsRingPct, { color }]}>%</Text>
          </View>
        </View>
      </View>
      <View style={styles.atsRingRight}>
        <Text style={[styles.atsRingLabel, { color: theme.text }]}>{label}</Text>
        <View style={[styles.atsBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Animated.View style={[styles.atsBarFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
        </View>
        {diff !== null && (
          <View style={styles.atsDiff}>
            <Feather name={diff >= 0 ? "arrow-up" : "arrow-down"} size={12} color={diff >= 0 ? theme.emerald : theme.danger} />
            <Text style={[styles.atsDiffText, { color: diff >= 0 ? theme.emerald : theme.danger }]}>
              {diff >= 0 ? "+" : ""}{diff} pts from original
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ATSBreakdownCard({
  matched,
  missing,
  suggestions,
}: {
  matched: string[];
  missing: string[];
  suggestions: string[];
}) {
  const { theme } = useTheme();
  const keywordCoverage = Math.min(100, Math.round((matched.length / Math.max(matched.length + missing.length, 1)) * 100));
  const readiness = Math.min(100, Math.round(keywordCoverage * 0.75 + Math.max(0, 100 - missing.length * 8) * 0.25));
  const contentStrength = Math.min(100, Math.round(65 + matched.length * 4 - missing.length * 3));

  const metrics = [
    { label: "Keyword Coverage", value: keywordCoverage, color: theme.violet },
    { label: "Readiness", value: readiness, color: theme.emerald },
    { label: "Content Strength", value: Math.max(0, contentStrength), color: theme.warning },
  ];

  return (
    <View style={[styles.atsBreakdownCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.atsBreakdownTitle, { color: theme.text }]}>ATS Scan Breakdown</Text>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.atsMetricRow}>
          <View style={styles.atsMetricHeader}>
            <Text style={[styles.atsMetricLabel, { color: theme.textSecondary }]}>{metric.label}</Text>
            <Text style={[styles.atsMetricValue, { color: metric.color }]}>{metric.value}%</Text>
          </View>
          <View style={[styles.atsMetricTrack, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.atsMetricFill, { backgroundColor: metric.color, width: `${metric.value}%` }]} />
          </View>
        </View>
      ))}
      <View style={[styles.atsSummaryBox, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.atsSummaryText, { color: theme.textSecondary }]}>
          {missing.length === 0
            ? "Your resume is closely aligned with this job description."
            : `Improve ATS by adding ${Math.min(missing.length, 5)} high-value missing keywords and tightening achievement bullets.`}
        </Text>
        {suggestions[0] ? (
          <Text style={[styles.atsSummaryHint, { color: theme.textTertiary }]}>{suggestions[0]}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Loading Steps ───────────────────────────────────────────────────────────

const STEPS = ["Analyzing job description...", "Identifying key skills...", "Rewriting resume...", "Calculating ATS score..."];

function TailoringLoader() {
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setStep((s) => (s + 1) % STEPS.length);
    };
    const interval = setInterval(cycle, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.loaderCard, { backgroundColor: theme.card, borderColor: `${theme.violet}30` }]}>
      <ActivityIndicator color={theme.violet} size="large" />
      <Animated.Text style={[styles.loaderStep, { color: theme.violet, opacity: fadeAnim }]}>
        {STEPS[step]}
      </Animated.Text>
      <View style={styles.loaderStepDots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.loaderDot, { backgroundColor: i <= step ? theme.violet : theme.backgroundSecondary }]} />
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ResumeScreen() {
  const { theme } = useTheme();
  const { resume, setResume, resumeVersions, addResumeVersion, removeResumeVersion, originalResume, setOriginalResume } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;
  const stackInputs = width < 760;
  const topPadding = isWeb ? 67 : insets.top;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const heroPulse = useRef(new Animated.Value(0)).current;
  const contentEntrance = useRef(new Animated.Value(0)).current;

  const [tab, setTab] = useState<"editor" | "preview" | "ai">("editor");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resume || "");
  const [template, setTemplate] = useState<Template>("ats");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // AI Tailor state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [baselineScore, setBaselineScore] = useState<number | null>(null);
  const [previewingTailored, setPreviewingTailored] = useState(false);
  const [tailoredResult, setTailoredResult] = useState<{
    tailoredResume: string;
    keywords: string[];
    suggestions: string[];
    atsScore: number;
    matched: string[];
    missing: string[];
    aiPowered?: boolean;
  } | null>(null);

  const wordCount = (resume || "").trim().split(/\s+/).filter(Boolean).length;
  const currentContent = resume || "";
  const exportContent = previewingTailored && tailoredResult ? tailoredResult.tailoredResume : currentContent;
  const originalContent = originalResume?.content || "";
  const templateOptions: { key: Template; label: string }[] = [
    { key: "classic", label: "Classic" },
    { key: "modern", label: "Modern" },
    { key: "timeline", label: "Timeline" },
    { key: "minimal", label: "Minimal" },
    { key: "executive", label: "Executive" },
    { key: "ats", label: "ATS" },
    { key: "creative", label: "Creative" },
    { key: "compact", label: "Compact" },
  ];

  useEffect(() => {
    if (!editing) {
      setDraft(resume || "");
    }
  }, [editing, resume]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentEntrance, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heroFloat, {
            toValue: 1,
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(heroFloat, {
            toValue: 0,
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heroPulse, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(heroPulse, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      });
      if (result.canceled) return;
      setUploading(true);
      const uploadedText = await readPickedResume(result.assets[0]);
      await setResume(uploadedText);
      await setOriginalResume({
        id: `${Date.now()}_original`,
        title: "Original Uploaded Resume",
        content: uploadedText,
        uploadedAt: new Date().toISOString(),
        fileName: result.assets[0]?.name,
      });
      setTailoredResult(null);
      setPreviewingTailored(false);
      setUploading(false);
      toast("Resume uploaded and updated!", "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setUploading(false);
      const message = error instanceof Error ? error.message : "";
      toast(message || "Upload failed. Please use PDF, DOCX, or TXT.", "error");
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!exportContent) { toast("No resume to export", "error"); return; }
    setExporting(true);
    try {
      const html = buildResumeHtml(exportContent, template);
      if (Platform.OS === "web") {
        if (format === "word") {
          const blob = new Blob([html], { type: "application/msword" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `resume-${template}.doc`;
          a.click();
          URL.revokeObjectURL(url);
          toast("Word resume downloaded!", "success");
        } else {
          const printWindow = window.open("", "_blank", "width=1000,height=900");
          if (!printWindow) throw new Error("Unable to open print window");
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          toast("Print dialog opened. Save it as PDF.", "success");
        }
      } else {
        if (format === "pdf") {
          toast("PDF export is available from the web preview. Word export works on device.", "error");
          setExporting(false);
          return;
        }
        const path = (LegacyFileSystem.cacheDirectory || LegacyFileSystem.documentDirectory || "file:///tmp/") + `resume-${template}.doc`;
        await LegacyFileSystem.writeAsStringAsync(path, html);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: "application/msword", dialogTitle: "Share Resume" });
          toast("Word resume shared!", "success");
        } else {
          toast("Word resume saved locally!", "success");
        }
      }
    } catch {
      toast("Export failed", "error");
    }
    setExportMenuOpen(false);
    setExporting(false);
  };

  const handleSave = () => {
    setResume(draft);
    setEditing(false);
    toast("Resume saved!", "success");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDiscard = () => {
    setDraft(resume || "");
    setEditing(false);
  };

  const tabStyle = (t: typeof tab) => [
    styles.tab,
    tab === t
      ? { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.22)" }
      : { backgroundColor: "transparent", borderColor: "transparent" },
  ];
  const tabTextStyle = (t: typeof tab) => [styles.tabText, { color: tab === t ? "#FFFFFF" : "rgba(255,255,255,0.78)" }];

  const handleAITailor = async () => {
    if (!currentContent.trim()) { toast("Please add your latest resume in the Editor tab first", "error"); return; }
    if (!jobDesc.trim()) { toast("Please paste a job description", "error"); return; }
    setTailoring(true);
    setTailoredResult(null);
    setPreviewingTailored(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Calculate baseline ATS score first (local fallback estimate)
    const jdWords = new Set(jobDesc.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const resumeWords = new Set(currentContent.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const overlap = [...jdWords].filter((w) => resumeWords.has(w));
    const localBaseline = Math.min(95, Math.round((overlap.length / Math.max(jdWords.size, 1)) * 100));

    try {
      const data = await fetchTailoredResume(currentContent, undefined, jobDesc.trim());
      setBaselineScore(localBaseline);
      setTailoredResult({
        tailoredResume: data.tailoredResume,
        keywords: data.keywords || [],
        suggestions: data.suggestions || [],
        atsScore: data.atsScore || localBaseline,
        matched: data.matched || [],
        missing: data.missing || [],
        aiPowered: data.aiPowered,
      });
      toast(data.aiPowered ? "AI tailored your uploaded resume!" : "Resume analyzed!", "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTailoring(false);
      return;
    } catch {}

    // Local fallback
    await new Promise((r) => setTimeout(r, 2500));
    const jdArr = [...jdWords];
    const matched = jdArr.filter((w) => resumeWords.has(w)).slice(0, 10);
    const missing = jdArr.filter((w) => !resumeWords.has(w)).slice(0, 8);
    const tailoredResume = currentContent + (missing.length > 0 ? `\n\nKEY COMPETENCIES\n${missing.slice(0, 6).join(" • ")}` : "");
    const newScore = Math.min(95, localBaseline + Math.floor(missing.length * 1.5));
    setBaselineScore(localBaseline);
    setTailoredResult({
      tailoredResume,
      keywords: matched,
      suggestions: [
        missing.length > 0 ? `Add these missing keywords: ${missing.slice(0, 4).join(", ")}` : "Your resume already contains most key terms",
        "Quantify achievements with specific numbers and percentages",
        `Target your Professional Summary toward ${jobTitle || "this role"}`,
        "Start each bullet with a strong action verb (Led, Built, Improved)",
        "Mirror the exact language used in the job description",
      ],
      atsScore: newScore,
      matched,
      missing,
    });
    toast("Resume analyzed!", "success");
    setTailoring(false);
  };

  const applyTailored = () => {
    if (!tailoredResult) return;
    addResumeVersion({
      title: `${jobTitle.trim() || "Tailored Resume"}${company.trim() ? ` - ${company.trim()}` : ""}`,
      content: tailoredResult.tailoredResume,
      source: "AI Tailor",
    });
    setResume("");
    toast("Tailored resume saved in Saved Resumes. Editor cleared.", "success");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTab("editor");
    setTailoredResult(null);
    setPreviewingTailored(false);
    setJobTitle("");
    setCompany("");
    setJobDesc("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroOrb,
            {
              transform: [
                { translateY: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                { translateX: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
                { scale: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
              opacity: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] }),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroOrbSecondary,
            {
              transform: [
                { translateY: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
                { translateX: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
                { scale: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
              opacity: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.42] }),
            },
          ]}
        />
        <View pointerEvents="none" style={styles.heroGrid} />
        <View style={[styles.headerInner, isWide && styles.headerInnerWide]}>
        <View style={[styles.headerRow, stackInputs && styles.headerRowCompact]}>
          <View>
            <Text style={styles.headerTitle}>Resume</Text>
            <Text style={styles.headerSub}>{wordCount > 0 ? `${wordCount} words` : "No resume yet"}</Text>
          </View>
          <View style={[styles.headerActions, stackInputs && styles.headerActionsCompact]}>
            {currentContent ? (
              <Pressable onPress={() => setExportMenuOpen((open) => !open)} disabled={exporting} style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="download" size={15} color="#fff" />}
                <Text style={styles.headerBtnText}>{exporting ? "..." : "Export"}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={handleUpload} disabled={uploading} style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload" size={15} color="#fff" />}
              <Text style={styles.headerBtnText}>{uploading ? "..." : "Upload"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.tabRow, stackInputs && styles.tabRowCompact]}>
          {(["editor", "preview", "ai"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={tabStyle(t)}>
              <Text style={tabTextStyle(t)}>
                {t === "editor" ? "Editor" : t === "preview" ? "Preview" : "AI Tailor"}
              </Text>
            </Pressable>
          ))}
        </View>
        {exportMenuOpen && currentContent ? (
          <View style={styles.exportMenu}>
            <Pressable onPress={() => handleExport("word")} style={[styles.exportOption, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
              <Feather name="file-text" size={14} color="#fff" />
              <Text style={styles.exportOptionText}>Word</Text>
            </Pressable>
            <Pressable onPress={() => handleExport("pdf")} style={[styles.exportOption, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
              <Feather name="printer" size={14} color="#fff" />
              <Text style={styles.exportOptionText}>PDF</Text>
            </Pressable>
          </View>
        ) : null}
        </View>
      </LinearGradient>

      {/* ── Editor ── */}
      {tab === "editor" && (
        <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide, { paddingBottom: insets.bottom + 108 }]} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              gap: 12,
              opacity: contentEntrance,
              transform: [
                { translateY: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                { scale: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
              ],
            }}
          >
          {!resume && !editing ? (
            <View style={[styles.emptyState, { borderColor: theme.separator, backgroundColor: theme.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: `${theme.tint}15` }]}>
                <Feather name="file-text" size={32} color={theme.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Resume Yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                Upload your resume or start writing one from scratch
              </Text>
              <Pressable onPress={handleUpload} disabled={uploading} style={[styles.primaryBtn, { backgroundColor: theme.tint }]}>
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="upload" size={16} color="#fff" />}
                <Text style={styles.primaryBtnText}>{uploading ? "Uploading..." : "Upload Resume"}</Text>
              </Pressable>
              <Pressable onPress={() => { setDraft(MOCK_RESUME); setEditing(true); }} style={[styles.secondaryBtn, { borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="edit-3" size={16} color={theme.textSecondary} />
                <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Write from scratch</Text>
              </Pressable>
            </View>
          ) : editing ? (
            <View style={[styles.editorCard, { backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.editor, { color: theme.text, borderColor: theme.separator }]}
                value={draft}
                onChangeText={setDraft}
                multiline
                textAlignVertical="top"
                placeholder="Paste or type your resume here..."
                placeholderTextColor={theme.textTertiary}
                autoFocus
              />
              <View style={styles.editorActions}>
                <Pressable onPress={handleDiscard} style={[styles.editorBtn, { borderColor: theme.separator }]}>
                  <Text style={[styles.editorBtnText, { color: theme.textSecondary }]}>Discard</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={[styles.editorBtn, { backgroundColor: theme.tint }]}>
                  <Text style={[styles.editorBtnText, { color: "#fff" }]}>Save Resume</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.editorSectionStack}>
              {resume ? (
                <View style={[styles.resumeCard, { backgroundColor: theme.card }]}>
                  <View style={styles.resumeCardHeader}>
                    <View style={[styles.resumeIconBox, { backgroundColor: `${theme.tint}15` }]}>
                      <Feather name="file-text" size={18} color={theme.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resumeCardTitle, { color: theme.text }]}>Current Resume</Text>
                      <Text style={[styles.resumeCardSub, { color: theme.textSecondary }]}>{wordCount} words</Text>
                    </View>
                    <Pressable onPress={() => { setDraft(resume || ""); setEditing(true); }} style={[styles.editBtn, { backgroundColor: `${theme.tint}15` }]}>
                      <Feather name="edit-2" size={14} color={theme.tint} />
                      <Text style={[styles.editBtnText, { color: theme.tint }]}>Edit</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.resumePreviewSnippet, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.resumeSnippetText, { color: theme.textSecondary }]} numberOfLines={6}>
                      {resume}
                    </Text>
                  </View>
                  <View style={styles.resumeCardActions}>
                    <Pressable onPress={() => setTab("ai")} style={[styles.actionChip, { backgroundColor: `${theme.violet}15` }]}>
                      <Feather name="zap" size={12} color={theme.violet} />
                      <Text style={[styles.actionChipText, { color: theme.violet }]}>AI Tailor</Text>
                    </Pressable>
                    <Pressable onPress={() => setTab("preview")} style={[styles.actionChip, { backgroundColor: `${theme.tint}15` }]}>
                      <Feather name="eye" size={12} color={theme.tint} />
                      <Text style={[styles.actionChipText, { color: theme.tint }]}>Preview</Text>
                    </Pressable>
                    <Pressable onPress={() => handleExport("word")} style={[styles.actionChip, { backgroundColor: `${theme.emerald}15` }]}>
                      <Feather name="download" size={12} color={theme.emerald} />
                      <Text style={[styles.actionChipText, { color: theme.emerald }]}>Word</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={[styles.resumeCard, { backgroundColor: theme.card }]}>
                <View style={styles.resumeCardHeader}>
                  <View style={[styles.resumeIconBox, { backgroundColor: `${theme.violet}15` }]}>
                    <Feather name="archive" size={18} color={theme.violet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resumeCardTitle, { color: theme.text }]}>Saved Resumes</Text>
                    <Text style={[styles.resumeCardSub, { color: theme.textSecondary }]}>{resumeVersions.length} saved</Text>
                  </View>
                </View>

                {resumeVersions.length === 0 ? (
                  <View style={[styles.savedResumeEmpty, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.resumeSnippetText, { color: theme.textSecondary }]}>
                      Tailored resumes will appear here after AI processing.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.savedResumeList}>
                    {resumeVersions.map((item) => (
                      <View key={item.id} style={[styles.savedResumeCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.separator }]}>
                        <View style={styles.savedResumeHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.savedResumeTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={[styles.savedResumeMeta, { color: theme.textSecondary }]}>
                              {new Date(item.createdAt).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.resumeSnippetText, { color: theme.textSecondary }]} numberOfLines={4}>
                          {item.content}
                        </Text>
                        <View style={styles.savedResumeActions}>
                          <Pressable
                            onPress={() => {
                              setResume(item.content);
                              setDraft(item.content);
                              setEditing(true);
                            }}
                            style={[styles.savedResumeBtn, { backgroundColor: `${theme.tint}15` }]}
                          >
                            <Feather name="edit-3" size={12} color={theme.tint} />
                            <Text style={[styles.savedResumeBtnText, { color: theme.tint }]}>Load</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => removeResumeVersion(item.id)}
                            style={[styles.savedResumeBtn, { backgroundColor: `${theme.danger}12` }]}
                          >
                            <Feather name="trash-2" size={12} color={theme.danger} />
                            <Text style={[styles.savedResumeBtnText, { color: theme.danger }]}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {originalResume ? (
                <View style={[styles.resumeCard, { backgroundColor: theme.card }]}>
                  <View style={styles.resumeCardHeader}>
                    <View style={[styles.resumeIconBox, { backgroundColor: `${theme.warning}15` }]}>
                      <Feather name="upload-cloud" size={18} color={theme.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resumeCardTitle, { color: theme.text }]}>Original Uploaded Resume</Text>
                      <Text style={[styles.resumeCardSub, { color: theme.textSecondary }]}>
                        {originalResume.fileName || "Uploaded file"} • {new Date(originalResume.uploadedAt).toLocaleString()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setDraft(originalResume.content);
                        setEditing(true);
                      }}
                      style={[styles.editBtn, { backgroundColor: `${theme.warning}15` }]}
                    >
                      <Feather name="corner-up-left" size={14} color={theme.warning} />
                      <Text style={[styles.editBtnText, { color: theme.warning }]}>Restore</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.resumePreviewSnippet, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.resumeSnippetText, { color: theme.textSecondary }]} numberOfLines={6}>
                      {originalResume.content}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Preview ── */}
      {tab === "preview" && (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 108 }]} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              gap: 12,
              opacity: contentEntrance,
              transform: [
                { translateY: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                { scale: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
              ],
            }}
          >
          <View style={styles.templateToggle}>
            <Text style={[styles.templateLabel, { color: theme.textSecondary }]}>Template:</Text>
            {templateOptions.map(({ key, label }) => (
              <Pressable key={key} onPress={() => setTemplate(key)} style={[styles.templateBtn, template === key && { backgroundColor: theme.tint }]}>
                <Text style={[styles.templateBtnText, { color: template === key ? "#fff" : theme.textSecondary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateThumbRow}>
            {templateOptions.map(({ key, label }) => (
              <TemplateThumbnail
                key={key}
                template={key}
                label={label}
                selected={template === key}
                onPress={() => setTemplate(key)}
              />
            ))}
          </ScrollView>
          {currentContent ? (
            <>
              <View style={styles.previewExportRow}>
                <Pressable onPress={() => handleExport("word")} style={[styles.previewExportBtn, { backgroundColor: theme.card, borderColor: theme.separator }]}>
                  <Feather name="file-text" size={14} color={theme.tint} />
                  <Text style={[styles.previewExportText, { color: theme.tint }]}>Download Word</Text>
                </Pressable>
                <Pressable onPress={() => handleExport("pdf")} style={[styles.previewExportBtn, { backgroundColor: theme.card, borderColor: theme.separator }]}>
                  <Feather name="printer" size={14} color={theme.violet} />
                  <Text style={[styles.previewExportText, { color: theme.violet }]}>Save as PDF</Text>
                </Pressable>
              </View>
              <ResumeTemplatePreview template={template} content={exportContent} />
            </>
          ) : (
            <View style={[styles.emptyState, { borderColor: theme.separator, backgroundColor: theme.card }]}>
              <Feather name="eye-off" size={32} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Resume to Preview</Text>
              <Pressable onPress={() => setTab("editor")} style={[styles.primaryBtn, { backgroundColor: theme.tint }]}>
                <Text style={styles.primaryBtnText}>Go to Editor</Text>
              </Pressable>
            </View>
          )}
          </Animated.View>
        </ScrollView>
      )}

      {/* ── AI Tailor ── */}
      {tab === "ai" && (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 116 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              gap: 12,
              opacity: contentEntrance,
              transform: [
                { translateY: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                { scale: contentEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
              ],
            }}
          >
          {/* Banner */}
          <View style={[styles.aiBanner, { backgroundColor: `${theme.violet}12`, borderColor: `${theme.violet}25` }]}>
            <LinearGradient colors={[theme.violet, "#4F46E5"]} style={styles.aiBannerIcon}>
              <Feather name="zap" size={14} color="#fff" />
            </LinearGradient>
            <Text style={[styles.aiBannerText, { color: theme.violet }]}>
              AI-powered tailoring using OpenAI. Get a fully rewritten resume optimized for any job.
            </Text>
          </View>

          {/* Job Title + Company row */}
          <View style={[styles.twoCol, stackInputs && styles.twoColCompact]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Job Title</Text>
              <TextInput
                style={[styles.inlineInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.separator }]}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="e.g. Senior Engineer"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Company</Text>
              <TextInput
                style={[styles.inlineInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.separator }]}
                value={company}
                onChangeText={setCompany}
                placeholder="e.g. Google"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Job Description */}
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            <View style={styles.inputCardHeader}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Job Description</Text>
              <Text style={[styles.charCount, { color: jobDesc.length > 2000 ? theme.danger : theme.textTertiary }]}>
                {jobDesc.length}/2000
              </Text>
            </View>
            <TextInput
              style={[styles.jdInput, { color: theme.text, borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}
              value={jobDesc}
              onChangeText={(t) => setJobDesc(t.slice(0, 2000))}
              multiline
              placeholder="Paste the full job description here for best results..."
              placeholderTextColor={theme.textTertiary}
              textAlignVertical="top"
            />
          </View>

          {/* Tailor Button */}
          <Pressable
            onPress={handleAITailor}
            disabled={tailoring || !resume || !jobDesc.trim()}
            style={({ pressed }) => [
              styles.tailorBtn,
              {
                backgroundColor: tailoring || !resume || !jobDesc.trim() ? theme.textTertiary : theme.violet,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {tailoring ? (
              <><ActivityIndicator color="#fff" size="small" /><Text style={styles.tailorBtnText}>AI is analyzing...</Text></>
            ) : (
              <><Feather name="zap" size={16} color="#fff" /><Text style={styles.tailorBtnText}>Tailor My Resume with AI</Text></>
            )}
          </Pressable>

          {!resume && (
            <Pressable onPress={() => setTab("editor")} style={[styles.noResumeHint, { backgroundColor: `${theme.danger}12`, borderColor: `${theme.danger}25` }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={[styles.noResumeHintText, { color: theme.danger }]}>No resume found — tap to add one in the Editor</Text>
            </Pressable>
          )}

          {/* Animated loader */}
          {tailoring && <TailoringLoader />}

          {/* Results */}
          {tailoredResult && !tailoring && (
            <View style={{ gap: 12 }}>
              {/* Divider */}
              <View style={styles.resultsDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
                <Text style={[styles.dividerLabel, { color: theme.textTertiary }]}>Results</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.separator }]} />
              </View>

              {/* ATS Score Ring */}
              <ATSRing score={tailoredResult.atsScore} prev={baselineScore} />

              {/* Matched Keywords */}
              {tailoredResult.matched.length > 0 && (
                <View style={[styles.kwCard, { backgroundColor: theme.card }]}>
                  <View style={styles.kwCardHeader}>
                    <View style={[styles.kwDot, { backgroundColor: theme.emerald }]} />
                    <Text style={[styles.kwCardTitle, { color: theme.text }]}>Matched Keywords</Text>
                    <View style={[styles.kwBadge, { backgroundColor: `${theme.emerald}20` }]}>
                      <Text style={[styles.kwBadgeText, { color: theme.emerald }]}>{tailoredResult.matched.length}</Text>
                    </View>
                  </View>
                  <View style={styles.chips}>
                    {tailoredResult.matched.map((k) => (
                      <View key={k} style={[styles.kwChip, { backgroundColor: `${theme.emerald}12`, borderColor: `${theme.emerald}25` }]}>
                        <Feather name="check" size={9} color={theme.emerald} />
                        <Text style={[styles.kwChipText, { color: theme.emerald }]}>{k}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Missing Keywords */}
              {tailoredResult.missing.length > 0 && (
                <View style={[styles.kwCard, { backgroundColor: theme.card }]}>
                  <View style={styles.kwCardHeader}>
                    <View style={[styles.kwDot, { backgroundColor: theme.warning }]} />
                    <Text style={[styles.kwCardTitle, { color: theme.text }]}>Missing Keywords</Text>
                    <View style={[styles.kwBadge, { backgroundColor: `${theme.warning}20` }]}>
                      <Text style={[styles.kwBadgeText, { color: theme.warning }]}>{tailoredResult.missing.length}</Text>
                    </View>
                  </View>
                  <View style={styles.chips}>
                    {tailoredResult.missing.map((k) => (
                      <View key={k} style={[styles.kwChip, { backgroundColor: `${theme.warning}12`, borderColor: `${theme.warning}25` }]}>
                        <Feather name="plus" size={9} color={theme.warning} />
                        <Text style={[styles.kwChipText, { color: theme.warning }]}>{k}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.kwHint, { color: theme.textTertiary }]}>
                    Add these to your resume to improve your ATS score
                  </Text>
                </View>
              )}

              {/* Suggestions */}
              <View style={[styles.suggestCard, { backgroundColor: theme.card }]}>
                <View style={styles.kwCardHeader}>
                  <Feather name="zap" size={14} color={theme.tint} />
                  <Text style={[styles.kwCardTitle, { color: theme.text }]}>AI Suggestions</Text>
                  {tailoredResult.aiPowered && (
                    <View style={[styles.aiPoweredBadge, { backgroundColor: `${theme.violet}20` }]}>
                      <Feather name="zap" size={9} color={theme.violet} />
                      <Text style={[styles.aiPoweredText, { color: theme.violet }]}>GPT</Text>
                    </View>
                  )}
                </View>
                {tailoredResult.suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestRow}>
                    <Text style={[styles.suggestNum, { color: theme.tint }]}>{i + 1}</Text>
                    <Text style={[styles.suggestText, { color: theme.textSecondary }]}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Preview tailored toggle */}
              <Pressable
                onPress={() => setPreviewingTailored((p) => !p)}
                style={[styles.previewToggleBtn, { backgroundColor: theme.card, borderColor: theme.separator }]}
              >
                <Feather name={previewingTailored ? "eye-off" : "eye"} size={15} color={theme.tint} />
                <Text style={[styles.previewToggleText, { color: theme.tint }]}>
                  {previewingTailored ? "Hide Tailored Preview" : "Preview Tailored Resume"}
                </Text>
              </Pressable>

              {previewingTailored && (
                <View style={styles.comparePreviewWrap}>
                  {originalContent ? (
                    <View style={styles.comparePreviewBlock}>
                      <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>Original Uploaded</Text>
                      <ResumeTemplatePreview template={template} content={originalContent} />
                    </View>
                  ) : null}
                  <View style={styles.comparePreviewBlock}>
                    <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>Before AI</Text>
                    <ResumeTemplatePreview template={template} content={currentContent || resume || ""} />
                  </View>
                  <View style={styles.comparePreviewBlock}>
                    <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>After AI</Text>
                    <ResumeTemplatePreview template={template} content={tailoredResult.tailoredResume} />
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.applyRow}>
                <Pressable
                  onPress={() => { setTailoredResult(null); setPreviewingTailored(false); }}
                  style={[styles.discardResultBtn, { borderColor: theme.separator, backgroundColor: theme.backgroundSecondary }]}
                >
                  <Text style={[styles.discardResultText, { color: theme.textSecondary }]}>Discard</Text>
                </Pressable>
                <Pressable onPress={applyTailored} style={[styles.applyBtn, { backgroundColor: theme.tint, flex: 1 }]}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply to Resume</Text>
                </Pressable>
              </View>
            </View>
          )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18, overflow: "hidden" },
  heroOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -30,
    right: -30,
  },
  heroOrbSecondary: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.24)",
    bottom: -32,
    left: -28,
  },
  heroGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerInner: { width: "100%" },
  headerInnerWide: { alignSelf: "center", maxWidth: 1120 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerRowCompact: { flexDirection: "column", alignItems: "flex-start", gap: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerActionsCompact: { width: "100%" },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#120727",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  headerBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  exportMenu: { flexDirection: "row", gap: 8, marginTop: 10 },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exportOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(35,18,88,0.34)",
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  tabRowCompact: { width: "100%" },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  tabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12 },
  contentWide: { alignSelf: "center", width: "100%", maxWidth: 1120 },
  editorSectionStack: { gap: 12 },

  // Empty state
  emptyState: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 28,
    padding: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 6,
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#312E81",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Editor
  editorCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  editor: { minHeight: 400, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  editorActions: { flexDirection: "row", gap: 10 },
  editorBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  editorBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Resume card
  resumeCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  resumeCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  resumeIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resumeCardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resumeCardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  resumePreviewSnippet: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)" },
  resumeSnippetText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resumeCardActions: { flexDirection: "row", gap: 8 },
  actionChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)" },
  actionChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  savedResumeEmpty: { borderRadius: 12, padding: 14 },
  savedResumeList: { gap: 10 },
  savedResumeCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 3 },
  savedResumeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedResumeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  savedResumeMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  savedResumeActions: { flexDirection: "row", gap: 8 },
  savedResumeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  savedResumeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Preview
  templateToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  templateLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  templateBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  templateBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateThumbRow: { gap: 10, paddingBottom: 4, paddingTop: 4 },
  templateThumb: { width: 122, borderRadius: 18, borderWidth: 1, padding: 10, gap: 8, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  templateThumbCanvas: { height: 110, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", padding: 10, overflow: "hidden" },
  templateThumbLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  templateThumbHeader: { height: 20, borderRadius: 8, marginBottom: 10 },
  templateThumbLines: { gap: 7 },
  templateThumbLine: { height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" },
  templateThumbRule: { height: 1, borderRadius: 1, backgroundColor: "#CBD5E1" },
  templateThumbTimeline: { flex: 1, flexDirection: "row", gap: 8 },
  templateThumbSidebar: { width: 26, borderRadius: 8 },
  templateThumbTimelineBody: { flex: 1, gap: 10, justifyContent: "center" },
  templateThumbDotLine: { height: 16, borderLeftWidth: 2, borderLeftColor: "#93C5FD", marginLeft: 6 },
  templateThumbAtsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  templateThumbPanel: { height: 22, borderRadius: 8, marginBottom: 8 },
  templateThumbCompactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateThumbCompactCell: { width: "46%", height: 34, borderRadius: 8, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  previewExportRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  previewExportBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 16, borderWidth: 1, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 3 },
  previewExportText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Classic preview
  previewClassic: { borderRadius: 16, padding: 24, borderWidth: 1 },
  previewClassicName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#111", textAlign: "center" },
  previewClassicContact: { fontSize: 11, color: "#555", textAlign: "center", marginTop: 4, fontFamily: "Inter_400Regular" },
  previewDivider: { height: 1, backgroundColor: "#333", marginVertical: 12 },
  previewClassicBody: { fontSize: 11, color: "#222", lineHeight: 17, fontFamily: "Inter_400Regular" },

  // Modern preview
  previewModern: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  previewModernHeader: { padding: 20 },
  previewModernName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  previewModernContact: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4, fontFamily: "Inter_400Regular" },
  previewModernBody: { padding: 16, gap: 12, backgroundColor: "#fff" },
  previewModernSection: { gap: 4 },
  previewModernSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  previewModernAccent: { width: 3, height: 14, borderRadius: 2 },
  previewModernHeading: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#1F2937", letterSpacing: 0.5 },
  previewModernLine: { fontSize: 11, color: "#374151", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewTimeline: { borderRadius: 16, overflow: "hidden", borderWidth: 1, flexDirection: "row" },
  previewTimelineSidebar: { width: 116, backgroundColor: "#DBEAFE", padding: 14, justifyContent: "flex-start" },
  previewTimelineName: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A", lineHeight: 21 },
  previewTimelineContact: { fontSize: 10, color: "#475569", marginTop: 8, lineHeight: 15, fontFamily: "Inter_400Regular" },
  previewTimelineBody: { flex: 1, padding: 14, gap: 10 },
  previewTimelineSection: { gap: 2 },
  previewTimelineRow: { flexDirection: "row", gap: 10 },
  previewTimelineRail: { width: 12, alignItems: "center" },
  previewTimelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  previewTimelineLine: { width: 2, flex: 1, marginTop: 4 },
  previewTimelineContent: { flex: 1, paddingBottom: 6 },
  previewTimelineHeading: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginBottom: 4, letterSpacing: 0.4 },
  previewTimelineText: { fontSize: 11, color: "#334155", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewMinimal: { borderRadius: 16, borderWidth: 1, padding: 18 },
  previewMinimalName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#111827", letterSpacing: -0.4 },
  previewMinimalContact: { fontSize: 11, color: "#57534E", marginTop: 6, fontFamily: "Inter_400Regular" },
  previewMinimalSection: { marginTop: 16 },
  previewMinimalHeading: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#44403C", letterSpacing: 1.2 },
  previewMinimalRule: { height: 1, marginVertical: 8 },
  previewMinimalText: { fontSize: 11, color: "#292524", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewExecutive: { borderRadius: 18, borderWidth: 1, padding: 22 },
  previewExecutiveHeader: { paddingBottom: 10, marginBottom: 6 },
  previewExecutiveName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#0F172A", letterSpacing: -0.5 },
  previewExecutiveContact: { fontSize: 11, color: "#475569", marginTop: 6, lineHeight: 16, fontFamily: "Inter_400Regular" },
  previewExecutiveSection: { marginTop: 16 },
  previewExecutiveHeading: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#1E3A8A", letterSpacing: 1.8 },
  previewExecutiveRule: { height: 1, backgroundColor: "#CBD5E1", marginVertical: 8 },
  previewExecutiveText: { fontSize: 11, color: "#1F2937", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewAts: { borderRadius: 16, borderWidth: 1, padding: 18 },
  previewAtsName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#111827", textTransform: "uppercase", letterSpacing: 0.8 },
  previewAtsContact: { fontSize: 11, color: "#475569", marginTop: 6, lineHeight: 16, fontFamily: "Inter_400Regular" },
  previewAtsSection: { marginTop: 16 },
  previewAtsSectionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  previewAtsHeading: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#111827", letterSpacing: 1.1 },
  previewAtsSectionLine: { flex: 1, height: 1, backgroundColor: "#CBD5E1" },
  previewAtsText: { fontSize: 11, color: "#334155", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewCreative: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  previewCreativeHero: { padding: 20 },
  previewCreativeName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  previewCreativeContact: { fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 6, lineHeight: 16, fontFamily: "Inter_400Regular" },
  previewCreativeBody: { padding: 16, gap: 12, backgroundColor: "#fff" },
  previewCreativeSection: { padding: 12, borderRadius: 14, backgroundColor: "#FFF7ED", gap: 4 },
  previewCreativeHeading: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#9A3412", letterSpacing: 1 },
  previewCreativeText: { fontSize: 11, color: "#431407", lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewCompact: { borderRadius: 16, borderWidth: 1, padding: 16 },
  previewCompactHeader: { marginBottom: 14 },
  previewCompactName: { fontSize: 21, fontFamily: "Inter_700Bold", color: "#0F172A" },
  previewCompactContact: { fontSize: 11, color: "#475569", marginTop: 5, lineHeight: 16, fontFamily: "Inter_400Regular" },
  previewCompactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewCompactSection: { width: "48%", borderRadius: 14, borderWidth: 1, borderColor: "#DBEAFE", padding: 12, gap: 4 },
  previewCompactHeading: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#1D4ED8", letterSpacing: 0.8 },
  previewCompactText: { fontSize: 11, color: "#334155", lineHeight: 17, fontFamily: "Inter_400Regular" },

  // AI Tailor
  aiBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 20, borderWidth: 1, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 22, elevation: 4 },
  aiBannerIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  aiBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  twoCol: { flexDirection: "row", gap: 10 },
  twoColCompact: { flexDirection: "column" },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  inlineInput: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 2 },
  inputCard: { borderRadius: 22, padding: 16, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.48)", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.07, shadowRadius: 22, elevation: 5 },
  inputCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  jdInput: { minHeight: 140, borderWidth: 1, borderRadius: 18, padding: 14, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 2 },
  tailorBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 18, shadowColor: "#5B21B6", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 8 },
  tailorBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  noResumeHint: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 16, borderWidth: 1 },
  noResumeHintText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Loader
  loaderCard: { alignItems: "center", gap: 14, padding: 28, borderRadius: 24, borderWidth: 1, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 5 },
  loaderStep: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  loaderStepDots: { flexDirection: "row", gap: 6 },
  loaderDot: { width: 6, height: 6, borderRadius: 3 },

  // Results
  resultsDivider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  // ATS Ring
  atsRingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  atsRingLeft: { alignItems: "center" },
  atsRingCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, alignItems: "center", justifyContent: "center" },
  atsRingInner: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", flexDirection: "row", alignContent: "flex-end" },
  atsRingScore: { fontSize: 22, fontFamily: "Inter_700Bold" },
  atsRingPct: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  atsRingRight: { flex: 1, gap: 8 },
  atsRingLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  atsBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  atsBarFill: { height: "100%", borderRadius: 3 },
  atsDiff: { flexDirection: "row", alignItems: "center", gap: 4 },
  atsDiffText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  atsBreakdownCard: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  atsBreakdownTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  atsMetricRow: { gap: 6 },
  atsMetricHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  atsMetricLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  atsMetricValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  atsMetricTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  atsMetricFill: { height: "100%", borderRadius: 999 },
  atsSummaryBox: { borderRadius: 14, padding: 12, gap: 6 },
  atsSummaryText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  atsSummaryHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  // Keywords
  kwCard: {
    borderRadius: 22,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  kwCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  kwDot: { width: 8, height: 8, borderRadius: 4 },
  kwCardTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  kwBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  kwBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kwChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  kwChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  kwHint: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  // Suggestions
  suggestCard: {
    borderRadius: 22,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  aiPoweredBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  aiPoweredText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  suggestRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  suggestNum: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 16 },
  suggestText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  // Preview tailored
  previewToggleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 18, borderWidth: 1, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 3 },
  previewToggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 8, textAlign: "center" },
  comparePreviewWrap: { gap: 14 },
  comparePreviewBlock: { gap: 8 },

  // Apply row
  applyRow: { flexDirection: "row", gap: 10 },
  discardResultBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  discardResultText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 18, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.24, shadowRadius: 22, elevation: 8 },
  applyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
