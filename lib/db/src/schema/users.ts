import { pgTable, text, varchar, timestamp, uuid, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    fullName: varchar("full_name", { length: 255 }),
    avatar: text("avatar"),
    bio: text("bio"),
    phone: varchar("phone", { length: 20 }),
    location: varchar("location", { length: 255 }),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    portfolioUrl: text("portfolio_url"),
    preferredJobCategory: varchar("preferred_job_category", { length: 100 }),
    preferredJobType: varchar("preferred_job_type", { length: 100 }),
    preferredLocation: varchar("preferred_location", { length: 255 }),
    darkMode: boolean("dark_mode").default(false),
    emailVerified: boolean("email_verified").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  })
);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(usersTable);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
