import { pgTable, text, varchar, timestamp, uuid, jsonb, index, primaryKey, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const applicationsTable = pgTable(
  "applications",
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
    status: varchar("status", { length: 50 }).default("applied").notNull(), // applied, interview, offer, rejected
    salary: text("salary"),
    jobType: varchar("job_type", { length: 50 }),
    applyUrl: text("apply_url"),
    notes: text("notes"),
    jobData: jsonb("job_data"),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
    interviewDate: timestamp("interview_date"),
    offerDate: timestamp("offer_date"),
    rejectionDate: timestamp("rejection_date"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userJobUnique: primaryKey({ columns: [table.userId, table.jobId] }),
    userIdIdx: index("applications_user_id_idx").on(table.userId),
    statusIdx: index("applications_status_idx").on(table.status),
    appliedAtIdx: index("applications_applied_at_idx").on(table.appliedAt),
  })
);

export const applicationNotesTable = pgTable(
  "application_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applicationsTable.id, { onDelete: "cascade" })
      .notNull(),
    note: text("note").notNull(),
    noteType: varchar("note_type", { length: 50 }), // interview_feedback, rejection_reason, etc
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    applicationIdIdx: index("application_notes_app_id_idx").on(table.applicationId),
  })
);

export const applicationActivityTable = pgTable(
  "application_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    activityType: varchar("activity_type", { length: 50 }).notNull(), // applied, saved, visited, etc
    jobId: varchar("job_id", { length: 500 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("activity_user_id_idx").on(table.userId),
    createdAtIdx: index("activity_created_at_idx").on(table.createdAt),
  })
);

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, appliedAt: true, updatedAt: true }) as unknown as z.ZodType<any, any, any>;
export const selectApplicationSchema = createSelectSchema(applicationsTable) as unknown as z.ZodType<any, any, any>;

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
export type ApplicationNote = typeof applicationNotesTable.$inferSelect;
export type ApplicationActivity = typeof applicationActivityTable.$inferSelect;
