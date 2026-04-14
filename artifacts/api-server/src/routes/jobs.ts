import { Router } from "express";
import { aiTailorResume } from "../services/aiService";
import { optionalAuth } from "../middleware/auth";
import { calculateATSScore, getAllJobs, getAvailableSources, getJobById, getRecommendations } from "../services/jobService";
import { parseResumeFile } from "../services/resumeParseService";

const router = Router();

router.get("/jobs", async (req, res) => {
  try {
    const { q, category, location, type, experienceLevel, salaryMin, salaryMax, remote, source, sort, page, limit, refresh } = req.query;
    const result = await getAllJobs({
      q: q as string,
      category: category as string,
      location: location as string,
      type: type as string,
      experienceLevel: experienceLevel as string,
      salaryMin: salaryMin ? parseInt(salaryMin as string, 10) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax as string, 10) : undefined,
      isRemote: remote === "true" ? true : undefined,
      source: source as string,
      sort: sort as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 100,
      forceRefresh: refresh === "true",
    });

    res.json({ success: true, ...result, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await getJobById(req.params.id, { forceRefresh: req.query.refresh === "true" });
    if (!job) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/tailor-resume", optionalAuth, async (req, res) => {
  try {
    const { resume, jobId, jobDescription, jobTitle, company, useAI } = req.body;
    if (!resume) {
      res.status(400).json({ success: false, error: "Resume is required" });
      return;
    }

    const job = jobId ? await getJobById(jobId) : null;
    const desc = jobDescription || job?.description || "";
    const title = jobTitle || job?.title;
    const comp = company || job?.company;

    if (useAI !== false && desc) {
      const result = await aiTailorResume(resume, desc, title, comp);
      res.json({ success: true, ...result, aiPowered: true });
      return;
    }

    const ats = calculateATSScore(resume, desc);
    res.json({
      success: true,
      tailoredResume: resume,
      atsScore: ats.score,
      matched: ats.matched,
      missing: ats.missing,
      keywords: ats.matched.slice(0, 8),
      suggestions: [
        `Add missing keywords: ${ats.missing.slice(0, 5).join(", ")}`,
        "Add quantifiable achievements to bullet points",
        "Include a targeted professional summary",
      ],
      aiPowered: false,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/parse-resume", async (req, res) => {
  try {
    const { fileName, mimeType, base64 } = req.body;
    if (!base64) {
      res.status(400).json({ success: false, error: "Resume file is required" });
      return;
    }

    const parsed = await parseResumeFile({ fileName, mimeType, base64 });
    res.json({ success: true, ...parsed });
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ats-score", (req, res) => {
  try {
    const { resume, jobDescription } = req.body;
    if (!resume || !jobDescription) {
      res.status(400).json({ success: false, error: "Both resume and job description are required" });
      return;
    }

    res.json({ success: true, ...calculateATSScore(resume, jobDescription) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/recommendations", async (req, res) => {
  try {
    const { resume, limit } = req.body;
    const jobs = await getRecommendations(resume || "", limit ? parseInt(limit, 10) : 6);
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/sources", async (req, res) => {
  try {
    const sources = await getAvailableSources({ forceRefresh: req.query.refresh === "true" });
    res.json({ success: true, sources, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
