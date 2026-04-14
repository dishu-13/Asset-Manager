/**
 * ATS (Applicant Tracking System) Utilities
 * Calculates ATS scoring and breakdown for resumes against job descriptions
 */

export interface ATSScore {
  score: number;
  breakdown: {
    keywords: number;
    skills: number;
    experience: number;
    education: number;
  };
  matchedKeywords: string[];
}

export interface ResumeData {
  text: string;
  skills?: string[];
  experience?: string;
  education?: string;
}

export interface JobData {
  title?: string;
  description: string;
  skills?: string[];
  keywords?: string[];
}

/**
 * Compute ATS breakdown and score for a resume against a job
 */
export function computeATSBreakdown(
  resume: ResumeData | string,
  job: JobData | string
): ATSScore {
  const resumeText =
    typeof resume === "string" ? resume : resume?.text || "";
  const jobText = typeof job === "string" ? job : job?.description || "";

  if (!resumeText || !jobText) {
    return {
      score: 0,
      breakdown: {
        keywords: 0,
        skills: 0,
        experience: 0,
        education: 0,
      },
      matchedKeywords: [],
    };
  }

  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobText.toLowerCase();

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobLower);
  const matchedKeywords: string[] = [];

  // Score various factors
  let keywordScore = 0;
  let skillScore = 0;
  let experienceScore = 0;
  let educationScore = 0;

  // 1. Keyword matching (40%)
  jobKeywords.forEach((keyword) => {
    if (resumeLower.includes(keyword)) {
      matchedKeywords.push(keyword);
      keywordScore += 1;
    }
  });
  keywordScore = Math.min(100, (keywordScore / Math.max(jobKeywords.length, 1)) * 100);

  // 2. Skill matching (30%)
  const commonSkills = getCommonSkills(resumeLower, jobLower);
  skillScore = commonSkills.length > 0 ? (commonSkills.length / 10) * 100 : 0;

  // 3. Experience indicators (20%)
  experienceScore = hasExperienceIndicators(resumeLower, jobLower) ? 100 : 0;

  // 4. Education indicators (10%)
  educationScore = hasEducationMatch(resumeLower, jobLower) ? 100 : 0;

  // Calculate weighted score
  const score =
    keywordScore * 0.4 +
    skillScore * 0.3 +
    experienceScore * 0.2 +
    educationScore * 0.1;

  return {
    score: Math.round(score),
    breakdown: {
      keywords: Math.round(keywordScore),
      skills: Math.round(skillScore),
      experience: Math.round(experienceScore),
      education: Math.round(educationScore),
    },
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 10),
  };
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();

  // Technical terms and frameworks
  const techTerms = [
    "javascript",
    "typescript",
    "react",
    "nodejs",
    "python",
    "java",
    "go",
    "rust",
    "kotlin",
    "swift",
    "asm",
    "c#",
    "vb.net",
    "php",
    "ruby",
    "rails",
    "django",
    "flask",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "sql",
    "mongodb",
    "postgresql",
    "redis",
    "elasticsearch",
    "graphql",
    "rest",
    "api",
    "html",
    "css",
    "sass",
    "webpack",
    "babel",
    "jest",
    "testing",
    "ci/cd",
    "devops",
    "machine learning",
    "ml",
    "ai",
    "deep learning",
    "nlp",
    "cv",
    "computer vision",
    "agile",
    "scrum",
    "jira",
    "figma",
    "ui",
    "ux",
  ];

  // Look for tech terms
  techTerms.forEach((term) => {
    if (text.includes(term)) {
      keywords.add(term);
    }
  });

  // Look for years of experience pattern
  const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/gi);
  if (yearsMatch) {
    keywords.add("experience");
  }

  // Look for degree patterns
  if (text.match(/\b(ba|bs|bsc|ma|ms|msc|phd|mba|diploma)\b/gi)) {
    keywords.add("education");
  }

  // Extract skill-like words (capitalized nouns or specific patterns)
  const words = text.split(/[\s,.()\-+/]+/).filter((w) => w.length > 3);
  const skillPatterns = [
    /^[a-z]+\.js$/i, // Something.js
    /^[a-z]+#$/i, // C#
    /^[a-z]{2,}[A-Z]/i, // camelCase or PascalCase
  ];

  words.forEach((word) => {
    if (skillPatterns.some((p) => p.test(word))) {
      keywords.add(word.toLowerCase());
    }
  });

  return Array.from(keywords);
}

/**
 * Get common skills between resume and job
 */
function getCommonSkills(resume: string, job: string): string[] {
  const skills = [
    "leadership",
    "communication",
    "problem solving",
    "analytical",
    "teamwork",
    "project management",
    "strategic thinking",
    "critical thinking",
    "creativity",
    "time management",
  ];

  return skills.filter((skill) => resume.includes(skill) && job.includes(skill));
}

/**
 * Check if resume has relevant experience indicators
 */
function hasExperienceIndicators(resume: string, job: string): boolean {
  const experienceKeywords = ["worked", "managed", "led", "developed", "designed", "implemented"];

  // Check if resume has experience keywords
  const hasResumeExperience = experienceKeywords.some((kw) => resume.includes(kw));

  // Check if job needs experience
  const jobNeedsExperience =
    job.includes("experience") ||
    job.includes("years") ||
    job.match(/\d+\+?\s*(?:years?|yrs?)/);

  // Score high if both have it, medium if only one
  return hasResumeExperience || jobNeedsExperience;
}

/**
 * Check if education matches between resume and job
 */
function hasEducationMatch(resume: string, job: string): boolean {
  const degrees = ["bachelor", "master", "phd", "diploma", "degree"];
  const fields = [
    "computer science",
    "engineering",
    "information technology",
    "mathematics",
    "physics",
  ];

  const hasDegree = degrees.some((d) => resume.includes(d));
  const hasField = fields.some((f) => resume.includes(f) && job.includes(f));

  return hasDegree || hasField;
}

/**
 * Format ATS score for display
 */
export function formatATSScore(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}

/**
 * Get color for ATS score
 */
export function getATSScoreColor(score: number): string {
  if (score >= 80) return "#10B981"; // Green
  if (score >= 60) return "#3B82F6"; // Blue
  if (score >= 40) return "#F59E0B"; // Amber
  return "#EF4444"; // Red
}
