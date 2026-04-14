import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

function normalizeExtractedText(text: string) {
  return text
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
  const normalized = clean.replace(/[^A-Za-z ]/g, "").trim().toLowerCase();
  const commonHeadings = new Set([
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
  ]);
  return commonHeadings.has(normalized) || clean === clean.toUpperCase();
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

function normalizeResumeStructure(text: string) {
  const rawLines = normalizeExtractedText(text)
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

function looksReadable(text: string) {
  if (text.trim().length < 80) return false;
  if (looksLikeRawBinaryDocument(text)) return false;
  const readableChars = (text.match(/[A-Za-z0-9\s.,:/+()\-@]/g) || []).length;
  return readableChars / Math.max(text.length, 1) > 0.55;
}

export async function parseResumeFile(input: {
  fileName?: string;
  mimeType?: string;
  base64: string;
}) {
  const mimeType = input.mimeType?.toLowerCase() || "";
  const fileName = input.fileName?.toLowerCase() || "";
  const buffer = Buffer.from(input.base64, "base64");

  let extracted = "";

  if (
    mimeType.includes("text/plain") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    extracted = buffer.toString("utf8");
  } else if (
    mimeType.includes("application/pdf") ||
    fileName.endsWith(".pdf")
  ) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    extracted = parsed.text || "";
  } else if (
    mimeType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
    fileName.endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    extracted = parsed.value || "";
  } else if (
    mimeType.includes("application/msword") ||
    fileName.endsWith(".doc")
  ) {
    throw new Error("Legacy .doc files are not supported yet. Please use PDF, DOCX, or TXT.");
  } else {
    extracted = buffer.toString("utf8");
  }

  if (looksLikeRawBinaryDocument(extracted)) {
    throw new Error("The uploaded file looks like raw PDF data instead of extracted resume text. Please re-upload the PDF so it can be parsed properly.");
  }

  const normalized = normalizeResumeStructure(extracted);
  if (!looksReadable(normalized)) {
    throw new Error("Could not extract readable resume text from this file.");
  }

  return {
    text: normalized,
    fileName: input.fileName || "resume",
    mimeType: input.mimeType || "application/octet-stream",
    characters: normalized.length,
  };
}
