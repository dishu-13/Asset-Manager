import OpenAI from "openai";
import { calculateATSScore } from "./jobService";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
    const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] || "placeholder";
    if (!baseURL) throw new Error("OpenAI integration not configured.");
    openaiClient = new OpenAI({ baseURL, apiKey });
  }
  return openaiClient;
}

export async function aiTailorResume(
  resume: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): Promise<{ tailoredResume: string; keywords: string[]; suggestions: string[]; atsScore: number; matched: string[]; missing: string[] }> {
  const ats = calculateATSScore(resume, jobDescription);

  try {
    const ai = getOpenAI();
    const prompt = `You are an expert resume writer and ATS optimization specialist.

${jobTitle && company ? `Target Role: ${jobTitle} at ${company}` : ""}

ORIGINAL RESUME:
${resume.slice(0, 3000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

MISSING KEYWORDS: ${ats.missing.slice(0, 15).join(", ")}

Your tasks:
1. Rewrite the resume to target this specific role, incorporating missing keywords naturally
2. Strengthen impact statements with quantifiable achievements  
3. Reorganize to highlight the most relevant experience first
4. Add a targeted professional summary if missing
5. Ensure ATS-friendly formatting

Respond in JSON with this exact structure:
{
  "tailoredResume": "the full rewritten resume",
  "keywords": ["keyword1", "keyword2"],
  "suggestions": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
}`;

    const response = await ai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const tailoredResume = parsed.tailoredResume || resume;
    const newAts = calculateATSScore(tailoredResume, jobDescription);

    return {
      tailoredResume,
      keywords: parsed.keywords || ats.matched.slice(0, 8),
      suggestions: parsed.suggestions || defaultSuggestions(ats.missing),
      atsScore: newAts.score,
      matched: newAts.matched,
      missing: newAts.missing,
    };
  } catch {
    const tailored = localTailor(resume, jobDescription, jobTitle, company, ats.missing);
    const newAts = calculateATSScore(tailored, jobDescription);
    return {
      tailoredResume: tailored,
      keywords: ats.matched.slice(0, 8),
      suggestions: defaultSuggestions(ats.missing),
      atsScore: newAts.score,
      matched: newAts.matched,
      missing: newAts.missing,
    };
  }
}

function defaultSuggestions(missing: string[]): string[] {
  const suggestions = [
    `Add these missing keywords to your resume: ${missing.slice(0, 5).join(", ")}`,
    "Quantify your achievements with specific numbers and percentages",
    "Add a targeted Professional Summary tailored to this role",
    "Ensure each bullet point starts with a strong action verb",
    "Include measurable impact (e.g., 'improved performance by 40%')",
  ];
  return suggestions.slice(0, 5);
}

function localTailor(resume: string, _jd: string, title?: string, company?: string, missing: string[] = []): string {
  const summaryLine = title && company
    ? `PROFESSIONAL SUMMARY\nResults-driven professional targeting the ${title} role at ${company}. ${missing.slice(0, 3).join(", ")} expertise with a track record of delivering measurable results.\n\n`
    : "";

  let tailored = resume.trim();
  if (!tailored.toLowerCase().includes("summary") && !tailored.toLowerCase().includes("objective")) {
    tailored = summaryLine + tailored;
  }

  if (missing.length > 0) {
    tailored += `\n\nKEY COMPETENCIES\n${missing.slice(0, 8).join(" • ")}`;
  }

  return tailored;
}
