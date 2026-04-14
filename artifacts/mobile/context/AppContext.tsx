import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Job } from "@/data/mockJobs";

export type ApplicationStatus = "Applied" | "Interview" | "Offer" | "Rejected" | "Pending";

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string;
}

export interface SavedResumeVersion {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  source?: string;
}

export interface OriginalResumeSnapshot {
  id: string;
  title: string;
  content: string;
  uploadedAt: string;
  fileName?: string;
}

interface AppContextType {
  jobs: Job[];
  savedJobs: Job[];
  applications: Application[];
  resume: string;
  resumeVersions: SavedResumeVersion[];
  originalResume: OriginalResumeSnapshot | null;
  setJobs: (jobs: Job[]) => void;
  saveJob: (job: Job) => void;
  unsaveJob: (jobId: string) => void;
  addApplication: (app: Application) => void;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
  setResume: (content: string) => void;
  setOriginalResume: (resume: OriginalResumeSnapshot | null) => Promise<void>;
  addResumeVersion: (resume: Omit<SavedResumeVersion, "id" | "createdAt"> & Partial<Pick<SavedResumeVersion, "id" | "createdAt">>) => Promise<void>;
  removeResumeVersion: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  savedJobs: "autohire_saved_jobs_v2",
  applications: "autohire_applications_v2",
  resume: "autohire_current_resume",
  resumeVersions: "autohire_resume_versions_v1",
  originalResume: "autohire_original_resume_v1",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobsState] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [resume, setResumeState] = useState<string>("");
  const [resumeVersions, setResumeVersions] = useState<SavedResumeVersion[]>([]);
  const [originalResume, setOriginalResumeState] = useState<OriginalResumeSnapshot | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [jobs, apps, res, versions, original] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.savedJobs),
          AsyncStorage.getItem(STORAGE_KEYS.applications),
          AsyncStorage.getItem(STORAGE_KEYS.resume),
          AsyncStorage.getItem(STORAGE_KEYS.resumeVersions),
          AsyncStorage.getItem(STORAGE_KEYS.originalResume),
        ]);
        if (jobs) setSavedJobs(JSON.parse(jobs));
        if (apps) setApplications(JSON.parse(apps));
        if (res) setResumeState(res);
        if (versions) setResumeVersions(JSON.parse(versions));
        if (original) setOriginalResumeState(JSON.parse(original));
      } catch {}
    })();
  }, []);

  const saveJob = useCallback(
    async (job: Job) => {
      const updated = [...savedJobs.filter((j) => j.id !== job.id), job];
      setSavedJobs(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.savedJobs, JSON.stringify(updated));
    },
    [savedJobs]
  );

  const unsaveJob = useCallback(
    async (jobId: string) => {
      const updated = savedJobs.filter((j) => j.id !== jobId);
      setSavedJobs(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.savedJobs, JSON.stringify(updated));
    },
    [savedJobs]
  );

  const addApplication = useCallback(
    async (app: Application) => {
      const existing = applications.find((a) => a.jobId === app.jobId);
      if (existing) return;
      const updated = [app, ...applications];
      setApplications(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(updated));
    },
    [applications]
  );

  const updateApplicationStatus = useCallback(
    async (appId: string, status: ApplicationStatus) => {
      const updated = applications.map((a) => (a.id === appId ? { ...a, status } : a));
      setApplications(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(updated));
    },
    [applications]
  );

  const setResume = useCallback(async (content: string) => {
    setResumeState(content);
    await AsyncStorage.setItem(STORAGE_KEYS.resume, content);
  }, []);

  const setOriginalResume = useCallback(async (resumeSnapshot: OriginalResumeSnapshot | null) => {
    setOriginalResumeState(resumeSnapshot);
    if (resumeSnapshot) {
      await AsyncStorage.setItem(STORAGE_KEYS.originalResume, JSON.stringify(resumeSnapshot));
      return;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.originalResume);
  }, []);

  const addResumeVersion = useCallback(async (resumeVersion: Omit<SavedResumeVersion, "id" | "createdAt"> & Partial<Pick<SavedResumeVersion, "id" | "createdAt">>) => {
    const nextVersion: SavedResumeVersion = {
      id: resumeVersion.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: resumeVersion.createdAt || new Date().toISOString(),
      title: resumeVersion.title,
      content: resumeVersion.content,
      source: resumeVersion.source,
    };
    const updated = [nextVersion, ...resumeVersions];
    setResumeVersions(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.resumeVersions, JSON.stringify(updated));
  }, [resumeVersions]);

  const removeResumeVersion = useCallback(async (id: string) => {
    const updated = resumeVersions.filter((item) => item.id !== id);
    setResumeVersions(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.resumeVersions, JSON.stringify(updated));
  }, [resumeVersions]);

  const setJobs = useCallback((nextJobs: Job[]) => {
    setJobsState(nextJobs);
  }, []);

  return (
    <AppContext.Provider
      value={{
        jobs,
        savedJobs,
        applications,
        resume,
        resumeVersions,
        originalResume,
        setJobs,
        saveJob,
        unsaveJob,
        addApplication,
        updateApplicationStatus,
        setResume,
        setOriginalResume,
        addResumeVersion,
        removeResumeVersion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
