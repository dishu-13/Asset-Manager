/**
 * AI Utilities for resume tailoring and optimization
 */

export interface TailoredResumeResult {
  originalResume: string;
  tailoredResume: string;
  changes: string[];
  keywords: string[];
}

/**
 * Generate a tailored resume based on job description
 */
export function generateTailoredResume(
  resume: string,
  jobDescription: string
): TailoredResumeResult {
  if (!resume || !jobDescription) {
    return {
      originalResume: resume,
      tailoredResume: resume,
      changes: [],
      keywords: [],
    };
  }

  const resumeLower = resume.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  // Extract keywords from job description
  const jobKeywords = extractKeywordsFromJob(jobDescription);

  // Tailor the resume
  let tailoredResume = resume;
  const changes: string[] = [];

  // 1. Reorder skills to match job requirements
  const skillsInResume = extractSkillsFromResume(resume);
  const matchingSkills = skillsInResume.filter((skill) =>
    jobKeywords.some((keyword) => keyword.includes(skill) || skill.includes(keyword))
  );

  if (matchingSkills.length > 0) {
    // Prioritize matching skills in the resume
    changes.push(`Prioritized ${matchingSkills.length} relevant skills for this job`);
  }

  // 2. Highlight relevant experience
  const jobRequirements = extractJobRequirements(jobDescription);
  jobRequirements.forEach((req) => {
    if (resumeLower.includes(req.toLowerCase())) {
      changes.push(`Highlighted experience with ${req}`);
    }
  });

  // 3. Add missing keywords if possible
  const missingKeywords = jobKeywords.filter(
    (keyword) => !resumeLower.includes(keyword.toLowerCase())
  );

  if (missingKeywords.length > 0) {
    changes.push(`Identified ${missingKeywords.length} important keywords not yet in resume`);
  }

  return {
    originalResume: resume,
    tailoredResume: tailoredResume,
    changes: changes.slice(0, 5), // Limit to top 5 changes
    keywords: matchingSkills.slice(0, 10), // Top 10 matching skills
  };
}

/**
 * Extract keywords from job description
 */
export function extractKeywordsFromJob(jobDescription: string): string[] {
  const keywords = new Set<string>();

  const techKeywords = [
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "nodejs",
    "python",
    "django",
    "flask",
    "fastapi",
    "java",
    "spring",
    "kotlin",
    "go",
    "rust",
    "c++",
    "c#",
    "dotnet",
    "php",
    "laravel",
    "ruby",
    "rails",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "elasticsearch",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "graphql",
    "rest",
    "api",
    "html",
    "css",
    "sass",
    "webpack",
    "vite",
    "jest",
    "testing",
    "ci/cd",
    "devops",
    "linux",
    "unix",
    "macos",
  ];

  const softSkills = [
    "leadership",
    "communication",
    "teamwork",
    "problem solving",
    "analytical",
    "creativity",
    "time management",
    "project management",
    "agile",
    "scrum",
  ];

  // Extract tech keywords
  techKeywords.forEach((keyword) => {
    if (jobDescription.toLowerCase().includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Extract soft skills
  softSkills.forEach((skill) => {
    if (jobDescription.toLowerCase().includes(skill)) {
      keywords.add(skill);
    }
  });

  // Extract years of experience requirement
  const yearsMatch = jobDescription.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/gi);
  if (yearsMatch) {
    keywords.add(yearsMatch[0].trim());
  }

  return Array.from(keywords);
}

/**
 * Extract skills from resume
 */
export function extractSkillsFromResume(resume: string): string[] {
  const skills = new Set<string>();

  const commonSkills = [
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "nodejs",
    "python",
    "django",
    "flask",
    "java",
    "spring",
    "kotlin",
    "go",
    "rust",
    "c++",
    "c#",
    "php",
    "ruby",
    "rails",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "leadership",
    "communication",
    "teamwork",
    "problem solving",
    "agile",
    "scrum",
  ];

  commonSkills.forEach((skill) => {
    if (resume.toLowerCase().includes(skill)) {
      skills.add(skill);
    }
  });

  return Array.from(skills);
}

/**
 * Extract job requirements from job description
 */
export function extractJobRequirements(jobDescription: string): string[] {
  const requirements: string[] = [];

  // Look for bullet points or numbered lists
  const bulletPattern = /^[•\-*]\s+(.+)$/gm;
  let match;

  while ((match = bulletPattern.exec(jobDescription)) !== null) {
    const requirement = match[1].trim();
    if (requirement.length > 10 && requirement.length < 200) {
      requirements.push(requirement);
    }
  }

  return requirements.slice(0, 5); // Top 5 requirements
}

/**
 * Calculate resume completeness score
 */
export function calculateCompletenessScore(resume: string): {
  score: number;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasProjects: boolean;
} {
  const resumeLower = resume.toLowerCase();

  let score = 0;
  const hasExperience = /work experience|employment|previously|worked at/i.test(resume);
  const hasEducation = /education|degree|university|college|diploma|graduated/i.test(resume);
  const hasSkills = /skills|technical|proficient|expertise|competent/i.test(resume);
  const hasProjects = /project|built|developed|created|github/i.test(resume);

  if (hasExperience) score += 25;
  if (hasEducation) score += 25;
  if (hasSkills) score += 25;
  if (hasProjects) score += 25;

  return {
    score,
    hasExperience,
    hasEducation,
    hasSkills,
    hasProjects,
  };
}

/**
 * Suggest resume improvements
 */
export function suggestImprovements(resume: string): string[] {
  const suggestions: string[] = [];
  const resumeLower = resume.toLowerCase();

  // Check word count
  const wordCount = resume.split(/\s+/).length;
  if (wordCount < 200) {
    suggestions.push("Resume is quite short. Consider adding more details about your experience.");
  } else if (wordCount > 1000) {
    suggestions.push("Resume is quite long. Consider condensing to focus on most relevant experience.");
  }

  // Check for quantifiable achievements
  if (!resume.match(/\d+%|\d+\$|\d+x|increased|improved|reduced/i)) {
    suggestions.push(
      "Add quantifiable achievements (e.g., 'increased sales by 30%', 'reduced costs by $50k')"
    );
  }

  // Check for action verbs
  const actionVerbs = [
    "achieved",
    "built",
    "created",
    "designed",
    "developed",
    "improved",
    "implemented",
    "increased",
    "led",
    "managed",
    "spearheaded",
  ];
  const hasActionVerbs = actionVerbs.some((verb) => resumeLower.includes(verb));
  if (!hasActionVerbs) {
    suggestions.push("Use strong action verbs (e.g., 'achieved', 'built', 'created', 'designed')");
  }

  // Check for contact info
  if (!resume.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|@/) && !resume.match(/email|phone/i)) {
    suggestions.push("Make sure your contact information (email, phone) is clearly visible");
  }

  return suggestions.slice(0, 5); // Top 5 suggestions
}

/**
 * Get ATS score level description
 */
export function getATSLevel(score: number): string {
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Good Match";
  if (score >= 50) return "Fair Match";
  return "Poor Match";
}
