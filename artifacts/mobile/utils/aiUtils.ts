/**
 * AI Utility Functions for Resume Tailoring
 */

export interface TailorRequest {
  resume: string;
  jobDescription: string;
  targetRole?: string;
}

export interface TailorResponse {
  tailoredResume: string;
  changes: string[];
  highlights: string[];
}

/**
 * Tailor resume content to match job description
 */
export function tailorResumeContent(
  resume: string,
  jobDescription: string
): TailorResponse {
  const changes: string[] = [];
  const highlights: string[] = [];

  // Extract key terms from job description
  const jobKeywords = extractJobKeywords(jobDescription);
  let tailoredResume = resume;

  // 1. Identify missing skills/keywords in resume that are in job
  const resumeLower = resume.toLowerCase();
  const missingKeywords = jobKeywords.filter(
    (kw) => !resumeLower.includes(kw)
  );

  if (missingKeywords.length > 0) {
    changes.push(
      `Consider adding these key skills: ${missingKeywords.slice(0, 5).join(", ")}`
    );
  }

  // 2. Reorder sections to highlight relevant experience
  tailoredResume = reorderSections(tailoredResume, jobKeywords);
  changes.push("Reordered experience sections to highlight relevant roles");

  // 3. Enhance descriptions with action verbs
  tailoredResume = enhanceWithActionVerbs(tailoredResume, jobKeywords);
  changes.push("Enhanced descriptions with strong action verbs");

  // 4. Identify and highlight matching keywords
  jobKeywords.forEach((keyword) => {
    if (resumeLower.includes(keyword)) {
      highlights.push(keyword);
    }
  });

  return {
    tailoredResume,
    changes: Array.from(new Set(changes)),
    highlights: Array.from(new Set(highlights)).slice(0, 10),
  };
}

/**
 * Extract job-specific keywords and requirements
 */
function extractJobKeywords(jobDescription: string): string[] {
  const keywords = new Set<string>();

  // Technical skills
  const techSkills = [
    "javascript",
    "typescript",
    "react",
    "nodejs",
    "python",
    "java",
    "aws",
    "docker",
    "kubernetes",
    "sql",
    "mongodb",
    "git",
    "rest api",
    "graphql",
    "agile",
    "scrum",
    "ci/cd",
  ];

  techSkills.forEach((skill) => {
    if (jobDescription.toLowerCase().includes(skill)) {
      keywords.add(skill);
    }
  });

  // Soft skills
  const softSkills = [
    "leadership",
    "communication",
    "teamwork",
    "problem solving",
    "critical thinking",
    "project management",
  ];

  softSkills.forEach((skill) => {
    if (jobDescription.toLowerCase().includes(skill)) {
      keywords.add(skill);
    }
  });

  return Array.from(keywords);
}

/**
 * Reorder resume sections to prioritize job-relevant experience
 */
function reorderSections(resume: string, jobKeywords: string[]): string {
  // Find sections
  const experienceSection = resume.match(
    /(?:experience|professional experience)([\s\S]*?)(?=\n\n|education|skills|$)/i
  );
  const skillsSection = resume.match(/skills?([\s\S]*?)(?=\n\n|experience|$)/i);
  const educationSection = resume.match(/education([\s\S]*?)(?=\n\n|experience|$)/i);

  if (!experienceSection) return resume;

  // Score experience entries based on keyword matches
  const entries = experienceSection[1].split(/\n(?=[A-Z])/);
  const scoredEntries = entries.map((entry) => ({
    entry,
    score: jobKeywords.filter((kw) =>
      entry.toLowerCase().includes(kw)
    ).length,
  }));

  // Sort by score (highest first)
  scoredEntries.sort((a, b) => b.score - a.score);

  // Reconstruct resume with reordered experience
  const reorderedExperience = scoredEntries
    .map((e) => e.entry)
    .join("\n");
  return resume.replace(experienceSection[1], reorderedExperience);
}

/**
 * Enhance descriptions with strong action verbs
 */
function enhanceWithActionVerbs(resume: string, jobKeywords: string[]): string {
  const actionVerbs = [
    "Spearheaded",
    "Orchestrated",
    "Architected",
    "Engineered",
    "Optimized",
    "Accelerated",
    "Transformed",
    "Pioneered",
    "Leveraged",
    "Streamlined",
    "Amplified",
    "Elevated",
  ];

  let result = resume;
  let verbIndex = 0;

  // Replace weaker verbs with stronger ones
  const weakVerbs = ["did", "worked", "helped", "made", "used"];
  weakVerbs.forEach((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, "gi");
    result = result.replace(regex, () => {
      const replacement = actionVerbs[verbIndex % actionVerbs.length];
      verbIndex++;
      return replacement;
    });
  });

  return result;
}

/**
 * Calculate similarity between resume and job description
 */
export function calculateResumeJobMatch(
  resume: string,
  jobDescription: string
): number {
  const resumeLower = resume.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  const jobKeywords = extractJobKeywords(jobDescription);
  const matchedKeywords = jobKeywords.filter((kw) =>
    resumeLower.includes(kw)
  ).length;

  return Math.round((matchedKeywords / Math.max(jobKeywords.length, 1)) * 100);
}

/**
 * Generate tailoring suggestions
 */
export function generateTailoringSuggestions(
  resume: string,
  jobDescription: string
): string[] {
  const suggestions: string[] = [];

  const jobKeywords = extractJobKeywords(jobDescription);
  const resumeLower = resume.toLowerCase();
  const missingKeywords = jobKeywords.filter(
    (kw) => !resumeLower.includes(kw)
  );

  if (missingKeywords.length > 0) {
    suggestions.push(
      `Add experience with: ${missingKeywords.slice(0, 3).join(", ")}`
    );
  }

  if (!resumeLower.includes("metric") && jobDescription.toLowerCase().includes("metric")) {
    suggestions.push("Include quantifiable achievements and metrics");
  }

  if (
    resumeLower.match(/\b(managed|led|directed)\b/i) &&
    jobDescription.toLowerCase().includes("leadership")
  ) {
    suggestions.push("Highlight your leadership experience more prominently");
  }

  if (jobDescription.toLowerCase().includes("remote")) {
    suggestions.push(
      "Consider adding remote work or distributed team experience"
    );
  }

  return suggestions;
}

/**
 * Generate tailored resume with job details
 */
export function generateTailoredResume(
  resume: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): TailorResponse {
  return tailorResumeContent(resume, jobDescription);
}
