import { pgTable, text, varchar, timestamp, uuid, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const resumesTable = pgTable(
  "resumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull().default("My Resume"),
    originalText: text("original_text").notNull(),
    parsedData: jsonb("parsed_data"),
    atsScore: text("ats_score"),
    isSaved: text("is_saved").default("false"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("resumes_user_id_idx").on(table.userId),
    createdAtIdx: index("resumes_created_at_idx").on(table.createdAt),
  })
);

export const tailoredResumesTable = pgTable(
  "tailored_resumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resumeId: uuid("resume_id")
      .references(() => resumesTable.id, { onDelete: "cascade" })
      .notNull(),
    jobId: varchar("job_id", { length: 500 }).notNull(),
    jobTitle: varchar("job_title", { length: 255 }),
    company: varchar("company", { length: 255 }),
    tailoredText: text("tailored_text").notNull(),
    atsScore: text("ats_score"),
    matchedKeywords: jsonb("matched_keywords"),
    suggestions: jsonb("suggestions"),
    aiPowered: text("ai_powered").default("false"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    resumeIdIdx: index("tailored_resumes_resume_id_idx").on(table.resumeId),
    jobIdIdx: index("tailored_resumes_job_id_idx").on(table.jobId),
  })
);

export const savedJobsTable = pgTable(
  "saved_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    jobId: varchar("job_id", { length: 500 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    salary: text("salary"),
    jobType: varchar("job_type", { length: 50 }),
    applyUrl: text("apply_url"),
    jobData: jsonb("job_data"),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (table) => ({
    userJobUnique: primaryKey({ columns: [table.userId, table.jobId] }),
    userIdIdx: index("saved_jobs_user_id_idx").on(table.userId),
  })
);

export const insertResumeSchema = createInsertSchema(resumesTable).omit({ id: true, createdAt: true, updatedAt: true }) as unknown as z.ZodType<any, any, any>;
export const selectResumeSchema = createSelectSchema(resumesTable) as unknown as z.ZodType<any, any, any>;

export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumesTable.$inferSelect;
export type TailoredResume = typeof tailoredResumesTable.$inferSelect;
export type SavedJob = typeof savedJobsTable.$inferSelect;
