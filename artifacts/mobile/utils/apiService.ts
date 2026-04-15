import { Job } from "@/data/mockJobs";
import { Platform } from "react-native";

function resolveBaseUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:8080`;
    }
    // On Replit: Expo runs on *.expo.picard.replit.dev
    // The API server is on the main domain *.picard.replit.dev
    if (hostname.includes(".expo.picard.replit.dev")) {
      return `${protocol}//${hostname.replace(".expo.picard.replit.dev", ".picard.replit.dev")}`;
    }
    // Generic: same origin
    return `${protocol}//${hostname}`;
  }

  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;

  return "http://localhost:8080";
}

const BASE_URL = resolveBaseUrl();

async function apiFetch(path: string, options?: RequestInit) {
  if (!BASE_URL) throw new Error("No API URL configured");
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    signal: AbortSignal.timeout(12000),
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    if (typeof data === "object" && data && "error" in data && typeof data.error === "string") {
      throw new Error(data.error);
    }
    if (typeof data === "string" && data.trim()) {
      throw new Error(data);
    }
    throw new Error(`API error ${res.status}`);
  }
  return data;
}

export interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  tags: string[];
  requirements: string[];
  benefits: string[];
  isRemote: boolean;
  type: string;
  experienceLevel?: string;
  category: string;
  source: string;
  applyUrl: string;
  postedAt: string;
  atsScore?: number;
  featured?: boolean;
  logoUrl?: string;
  isVerifiedLive?: boolean;
  listingKind?: "verified_live" | "structured";
}

function liveJobToJob(j: LiveJob): Job {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    description: j.description,
    tags: j.tags,
    requirements: j.requirements,
    benefits: j.benefits,
    isRemote: j.isRemote,
    type: j.type,
    experienceLevel: j.experienceLevel,
    category: j.category,
    atsScore: j.atsScore || 70,
    postedAt: j.postedAt,
    applyLink: j.applyUrl,
    source: j.source,
    isVerifiedLive: j.isVerifiedLive,
    listingKind: j.listingKind,
  };
}

export async function fetchLiveJobs(params?: {
  q?: string; category?: string; location?: string; type?: string; experienceLevel?: string; salaryMin?: number; salaryMax?: number; remote?: boolean; sort?: string; page?: number; limit?: number; refresh?: boolean;
}): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number; sources: string[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category && params.category !== "All") qs.set("category", params.category);
  if (params?.location) qs.set("location", params.location);
  if (params?.type && params.type !== "All") qs.set("type", params.type);
  if (params?.experienceLevel && params.experienceLevel !== "All") qs.set("experienceLevel", params.experienceLevel);
  if (typeof params?.salaryMin === "number") qs.set("salaryMin", String(params.salaryMin));
  if (typeof params?.salaryMax === "number") qs.set("salaryMax", String(params.salaryMax));
  if (params?.remote) qs.set("remote", "true");
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.refresh) qs.set("refresh", "true");

  const data = await apiFetch(`/jobs?${qs.toString()}`);
  return {
    jobs: (data.jobs || []).map(liveJobToJob),
    total: data.total || 0,
    page: data.page || 1,
    totalPages: data.totalPages || 1,
    sources: data.sources || [],
  };
}

export async function fetchJobById(id: string, refresh = false): Promise<Job | null> {
  const data = await apiFetch(`/jobs/${id}${refresh ? "?refresh=true" : ""}`);
  return data.job ? liveJobToJob(data.job) : null;
}

export async function fetchATSScore(resume: string, jobDescription: string) {
  return apiFetch("/ats-score", { method: "POST", body: JSON.stringify({ resume, jobDescription }) });
}

export async function fetchTailoredResume(resume: string, jobId?: string, jobDescription?: string) {
  return apiFetch("/tailor-resume", { method: "POST", body: JSON.stringify({ resume, jobId, jobDescription }) });
}

export async function parseUploadedResumeFile(input: {
  fileName?: string;
  mimeType?: string;
  base64: string;
}): Promise<{ text: string; fileName: string; mimeType: string; characters: number }> {
  return apiFetch("/parse-resume", { method: "POST", body: JSON.stringify(input) });
}

export async function fetchRecommendations(resume: string, limit = 6): Promise<Job[]> {
  const data = await apiFetch("/recommendations", { method: "POST", body: JSON.stringify({ resume, limit }) });
  return (data.jobs || []).map(liveJobToJob);
}
